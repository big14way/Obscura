// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, euint128, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ObscuraCore} from "./ObscuraCore.sol";
import {ReputationRegistry} from "./ReputationRegistry.sol";
import {IConfToken} from "./interfaces/IConfToken.sol";

interface IObscuraGAD {
    function syncPosition(address user, address collToken, euint64 coll, address debtToken, euint64 debt) external;
}

/**
 * @title ObscuraLending
 * @notice Confidential agentic credit. An agent's collateral, debt and daily borrow limit
 *         are euint64 ciphertexts; only the agent can decrypt them. The protocol still
 *         computes LTV/health and daily-limit checks HOMOMORPHICALLY.
 *
 * @dev Headline privacy property: in `borrow`, approval and denial write the SAME ciphertext
 *      bytes (`FHE.select(ok, req, 0)`), so on-chain they are computationally
 *      indistinguishable — competitors cannot see who got credit or copy a strategy.
 *
 *      Structural change vs the original: per-token positions are a single euint64 aggregate
 *      per (agent, token) instead of arrays (array-of-select loops would exceed the HCU budget).
 *
 *      Correctness hardening (post-review):
 *        - ALL value math (amount*price, value*bps) is done in euint128 to avoid silent
 *          euint64 wraparound (reachable with the seeded high-priced markets).
 *        - borrow records the amount ACTUALLY transferred (`sent`), not the requested amount,
 *          since ERC-7984 transfers clamp to balance and cannot revert.
 *        - repay refunds any overpayment beyond the outstanding debt.
 *        - GAD shares Lending's `globalMaxLtvBps` so a healthy position is never instantly
 *          GAD-eligible, and applyGadSeizure re-syncs GAD with the post-seizure position.
 */
contract ObscuraLending is ZamaEthereumConfig {
    uint64 internal constant DENOM = 10000;
    // All collateral/debt values are compared in a common SCALED unit (USD6 * 10**SCALE_DEC)
    // computed with a SINGLE multiply and NO homomorphic division (div is the most expensive
    // FHE op and blows the HCU depth budget). Registered tokens must have <= SCALE_DEC decimals.
    uint64 internal constant SCALE_DEC = 8;

    ObscuraCore public core;
    ReputationRegistry public reputation;
    address public admin;
    address public gad;
    uint16 public globalMaxLtvBps = 7500; // 75% — shared health threshold (also read by GAD)

    struct AgentConfig {
        euint128 dailyBorrowLimitUsd6; // euint128 to match the euint128 health/limit math (no wrap)
        euint128 dailyBorrowedUsd6;
        uint256 periodStart;
        bool autoRepayEnabled;
        bool x402Enabled;
        bool configured;
    }

    mapping(address => bool) public initialized;
    mapping(address => mapping(address => euint64)) internal _collateral; // user => token => amount
    mapping(address => mapping(address => euint64)) internal _debt; // user => token => amount
    mapping(address => address[]) internal _collTokens;
    mapping(address => address[]) internal _debtTokens;
    mapping(address => mapping(address => bool)) internal _hasColl;
    mapping(address => mapping(address => bool)) internal _hasDebt;
    mapping(address => AgentConfig) internal agentConfigs;

    event PositionCreated(address indexed owner);
    event Deposited(address indexed owner, address indexed token);
    event Borrowed(address indexed owner, address indexed token);
    event Repaid(address indexed owner, address indexed token);
    event Withdrawn(address indexed owner, address indexed token);
    event AgentConfigured(address indexed owner, bool autoRepay, bool x402);
    event GadSeizure(address indexed user, address indexed collToken, address indexed debtToken, address cranker);
    event GadSet(address indexed gad);
    event GlobalMaxLtvSet(uint16 bps);

    constructor(address _core, address _reputation) {
        core = ObscuraCore(_core);
        reputation = ReputationRegistry(_reputation);
        admin = msg.sender;
    }

    function setGad(address _gad) external {
        require(msg.sender == admin, "not admin");
        gad = _gad;
        emit GadSet(_gad);
    }

    function setGlobalMaxLtvBps(uint16 bps) external {
        require(msg.sender == admin, "not admin");
        require(bps <= 10000, "bps");
        globalMaxLtvBps = bps;
        emit GlobalMaxLtvSet(bps);
    }

    function initializePosition() external {
        require(!initialized[msg.sender], "exists");
        initialized[msg.sender] = true;
        emit PositionCreated(msg.sender);
    }

    // ---------------- agent config ----------------

    function configureAgent(externalEuint64 encLimit, bytes calldata inputProof, bool autoRepay, bool x402) external {
        AgentConfig storage cfg = agentConfigs[msg.sender];
        euint64 limit = FHE.fromExternal(encLimit, inputProof);
        require(FHE.isSenderAllowed(limit), "bad input");

        // store the limit in the same scaled unit the borrow gate compares against
        cfg.dailyBorrowLimitUsd6 = FHE.mul(FHE.asEuint128(limit), uint128(10 ** SCALE_DEC));
        if (!FHE.isInitialized(cfg.dailyBorrowedUsd6)) cfg.dailyBorrowedUsd6 = FHE.asEuint128(0);
        cfg.periodStart = block.timestamp;
        cfg.autoRepayEnabled = autoRepay;
        cfg.x402Enabled = x402;
        cfg.configured = true;

        FHE.allowThis(cfg.dailyBorrowLimitUsd6);
        FHE.allow(cfg.dailyBorrowLimitUsd6, msg.sender);
        FHE.allowThis(cfg.dailyBorrowedUsd6);
        FHE.allow(cfg.dailyBorrowedUsd6, msg.sender);

        emit AgentConfigured(msg.sender, autoRepay, x402);
    }

    // ---------------- core actions ----------------

    function deposit(address token, externalEuint64 enc, bytes calldata inputProof) external {
        _notPaused();
        euint64 amt = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(amt), "bad input");

        // Pull tokens (caller must have called token.setOperator(thisLending, until)).
        FHE.allowTransient(amt, token);
        euint64 sent = IConfToken(token).confidentialTransferFrom(msg.sender, address(this), amt);

        _addCollToken(msg.sender, token);
        euint64 bal = FHE.add(_coll(msg.sender, token), sent);
        _collateral[msg.sender][token] = bal;
        _allow(bal, msg.sender);

        _syncGad(msg.sender);
        emit Deposited(msg.sender, token);
    }

    function borrow(address token, externalEuint64 enc, bytes calldata inputProof) external {
        _notPaused();
        euint64 req = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(req), "bad input");

        AgentConfig storage cfg = agentConfigs[msg.sender];
        _maybeResetPeriod(cfg, msg.sender);

        euint128 reqUsd6 = _value(token, req);

        // Daily-limit gate (euint128 throughout; only enforced if the agent configured a limit).
        euint128 borrowedSoFar = _ensureBorrowed(cfg, msg.sender);
        ebool underLimit;
        if (cfg.configured && FHE.isInitialized(cfg.dailyBorrowLimitUsd6)) {
            underLimit = FHE.le(FHE.add(borrowedSoFar, reqUsd6), cfg.dailyBorrowLimitUsd6);
        } else {
            underLimit = FHE.asEbool(true);
        }

        // Aggregate health gate (euint128): (debtValue + reqUsd6) * DENOM <= collValue * maxLtv.
        euint128 collValue = _totalCollateralValue(msg.sender);
        euint128 newDebtValue = FHE.add(_totalDebtValue(msg.sender), reqUsd6);
        ebool healthy = FHE.le(FHE.mul(newDebtValue, uint128(DENOM)), FHE.mul(collValue, uint128(globalMaxLtvBps)));

        ebool ok = FHE.and(underLimit, healthy);
        euint64 grant = FHE.select(ok, req, FHE.asEuint64(0)); // 0 if denied — indistinguishable on-chain
        euint128 grantVal = FHE.select(ok, reqUsd6, FHE.asEuint128(0)); // scaled value, reuses reqUsd6 (no extra div)

        // Pay out and record the amount ACTUALLY sent (clamped to pool liquidity).
        _addDebtToken(msg.sender, token);
        FHE.allowTransient(grant, token);
        euint64 sent = IConfToken(token).confidentialTransfer(msg.sender, grant);

        euint64 newDebt = FHE.add(_dbt(msg.sender, token), sent);
        _debt[msg.sender][token] = newDebt;
        _allow(newDebt, msg.sender);

        cfg.dailyBorrowedUsd6 = FHE.add(borrowedSoFar, grantVal); // euint128, scaled (no wrap, no extra _value)
        FHE.allowThis(cfg.dailyBorrowedUsd6);
        FHE.allow(cfg.dailyBorrowedUsd6, msg.sender);

        _syncGad(msg.sender);
        emit Borrowed(msg.sender, token);
    }

    function repay(address token, externalEuint64 enc, bytes calldata inputProof) external {
        euint64 pay = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(pay), "bad input");

        FHE.allowTransient(pay, token);
        euint64 received = IConfToken(token).confidentialTransferFrom(msg.sender, address(this), pay);

        euint64 debt = _dbt(msg.sender, token);
        ebool over = FHE.gt(received, debt);
        euint64 applied = FHE.select(over, debt, received); // never reduce below zero
        euint64 newDebt = FHE.sub(debt, applied);
        _debt[msg.sender][token] = newDebt;
        _allow(newDebt, msg.sender);

        // Reputation gets the (scaled) value of the applied repayment.
        euint128 appliedVal = _value(token, applied);
        FHE.allowTransient(appliedVal, address(reputation));
        reputation.updateOnRepay(msg.sender, appliedVal);

        // Refund any overpayment beyond the outstanding debt (value conservation).
        euint64 refund = FHE.sub(received, applied);
        FHE.allowTransient(refund, token);
        IConfToken(token).confidentialTransfer(msg.sender, refund);

        _syncGad(msg.sender);
        emit Repaid(msg.sender, token);
    }

    function withdraw(address token, externalEuint64 enc, bytes calldata inputProof) external {
        euint64 want = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(want), "bad input");

        euint64 avail = _coll(msg.sender, token);
        ebool tooMuch = FHE.gt(want, avail);
        euint64 capped = FHE.select(tooMuch, avail, want);

        // Post-withdraw health (euint128): debtValue * DENOM <= (collValue - cappedValue) * maxLtv.
        euint128 collValue = _totalCollateralValue(msg.sender);
        euint128 cappedValue = _value(token, capped);
        euint128 newCollValue = FHE.sub(collValue, cappedValue);
        euint128 debtValue = _totalDebtValue(msg.sender);
        ebool healthy = FHE.le(FHE.mul(debtValue, uint128(DENOM)), FHE.mul(newCollValue, uint128(globalMaxLtvBps)));
        euint64 grant = FHE.select(healthy, capped, FHE.asEuint64(0));

        euint64 newColl = FHE.sub(avail, grant);
        _collateral[msg.sender][token] = newColl;
        _allow(newColl, msg.sender);

        FHE.allowTransient(grant, token);
        IConfToken(token).confidentialTransfer(msg.sender, grant);

        _syncGad(msg.sender);
        emit Withdrawn(msg.sender, token);
    }

    // ---------------- GAD hook ----------------

    function applyGadSeizure(
        address user,
        address collToken,
        euint64 toTreasury,
        euint64 reward,
        address cranker,
        address debtToken,
        euint64 debtReduce
    ) external {
        require(msg.sender == gad, "only gad");

        euint64 coll = _coll(user, collToken);
        euint64 totalSeize = FHE.add(toTreasury, reward);
        ebool over = FHE.gt(totalSeize, coll);
        euint64 appliedSeize = FHE.select(over, coll, totalSeize);
        euint64 appliedReward = FHE.select(over, FHE.asEuint64(0), reward); // defensive; GAD seizes a fraction
        euint64 appliedTreasury = FHE.sub(appliedSeize, appliedReward);
        _collateral[user][collToken] = FHE.sub(coll, appliedSeize);
        _allow(_collateral[user][collToken], user);

        euint64 debt = _dbt(user, debtToken);
        ebool dOver = FHE.gt(debtReduce, debt);
        euint64 appliedDebt = FHE.select(dOver, debt, debtReduce);
        _debt[user][debtToken] = FHE.sub(debt, appliedDebt);
        _allow(_debt[user][debtToken], user);

        address treasuryAddr = core.treasury();
        FHE.allowTransient(appliedTreasury, collToken);
        IConfToken(collToken).confidentialTransfer(treasuryAddr, appliedTreasury);
        FHE.allowTransient(appliedReward, collToken);
        IConfToken(collToken).confidentialTransfer(cranker, appliedReward);

        _syncGad(user); // refresh GAD with the post-seizure position
        emit GadSeizure(user, collToken, debtToken, cranker);
    }

    // ---------------- views (return encrypted handles) ----------------

    function totalCollateralOf(address owner, address token) external view returns (euint64) {
        return _collateral[owner][token];
    }

    function totalBorrowOf(address owner, address token) external view returns (euint64) {
        return _debt[owner][token];
    }

    function getCollateralTokens(address owner) external view returns (address[] memory) {
        return _collTokens[owner];
    }

    function getBorrowTokens(address owner) external view returns (address[] memory) {
        return _debtTokens[owner];
    }

    function agentLimit(address owner) external view returns (euint128) {
        return agentConfigs[owner].dailyBorrowLimitUsd6;
    }

    function agentBorrowed(address owner) external view returns (euint128) {
        return agentConfigs[owner].dailyBorrowedUsd6;
    }

    function agentFlags(address owner) external view returns (bool autoRepay, bool x402, bool configured) {
        AgentConfig storage c = agentConfigs[owner];
        return (c.autoRepayEnabled, c.x402Enabled, c.configured);
    }

    // ---------------- internal ----------------

    function _notPaused() internal view {
        (, bool paused) = core.protocol();
        require(!paused, "paused");
    }

    /// @dev Scaled value (euint128) = amount * price * 10**(SCALE_DEC-dec). One multiply, NO
    ///      homomorphic division (HCU-cheap). Equals USD6value * 10**SCALE_DEC; positions are
    ///      always compared in this same scale, so all LTV/limit ratio math is exact.
    function _value(address token, euint64 amount) internal returns (euint128) {
        uint256 price = core.priceOf(token);
        uint8 dec = core.decimalsOf(token);
        if (price == 0 || dec == 0 || dec > SCALE_DEC) return FHE.asEuint128(0);
        uint256 scalar = price * (10 ** (uint256(SCALE_DEC) - dec));
        return FHE.mul(FHE.asEuint128(amount), uint128(scalar));
    }

    function _totalCollateralValue(address user) internal returns (euint128) {
        euint128 total = FHE.asEuint128(0);
        address[] storage toks = _collTokens[user];
        for (uint256 i = 0; i < toks.length; i++) {
            total = FHE.add(total, _value(toks[i], _collateral[user][toks[i]]));
        }
        return total;
    }

    function _totalDebtValue(address user) internal returns (euint128) {
        euint128 total = FHE.asEuint128(0);
        address[] storage toks = _debtTokens[user];
        for (uint256 i = 0; i < toks.length; i++) {
            total = FHE.add(total, _value(toks[i], _debt[user][toks[i]]));
        }
        return total;
    }

    function _coll(address user, address token) internal returns (euint64) {
        if (!FHE.isInitialized(_collateral[user][token])) {
            _collateral[user][token] = FHE.asEuint64(0);
            FHE.allowThis(_collateral[user][token]);
        }
        return _collateral[user][token];
    }

    function _dbt(address user, address token) internal returns (euint64) {
        if (!FHE.isInitialized(_debt[user][token])) {
            _debt[user][token] = FHE.asEuint64(0);
            FHE.allowThis(_debt[user][token]);
        }
        return _debt[user][token];
    }

    function _ensureBorrowed(AgentConfig storage cfg, address user) internal returns (euint128) {
        if (!FHE.isInitialized(cfg.dailyBorrowedUsd6)) {
            cfg.dailyBorrowedUsd6 = FHE.asEuint128(0);
            FHE.allowThis(cfg.dailyBorrowedUsd6);
            FHE.allow(cfg.dailyBorrowedUsd6, user);
        }
        return cfg.dailyBorrowedUsd6;
    }

    function _maybeResetPeriod(AgentConfig storage cfg, address user) internal {
        if (cfg.periodStart == 0) cfg.periodStart = block.timestamp;
        if (block.timestamp >= cfg.periodStart + 1 days) {
            cfg.periodStart = block.timestamp;
            cfg.dailyBorrowedUsd6 = FHE.asEuint128(0);
            FHE.allowThis(cfg.dailyBorrowedUsd6);
            FHE.allow(cfg.dailyBorrowedUsd6, user);
        }
    }

    function _allow(euint64 h, address user) internal {
        FHE.allowThis(h);
        FHE.allow(h, user);
    }

    function _addCollToken(address user, address token) internal {
        if (!_hasColl[user][token]) {
            _hasColl[user][token] = true;
            _collTokens[user].push(token);
        }
    }

    function _addDebtToken(address user, address token) internal {
        if (!_hasDebt[user][token]) {
            _hasDebt[user][token] = true;
            _debtTokens[user].push(token);
        }
    }

    /// @dev Push the user's primary (collateral, debt) position to GAD for permissionless cranking.
    function _syncGad(address user) internal {
        if (gad == address(0)) return;
        if (_collTokens[user].length == 0 || _debtTokens[user].length == 0) return;
        address ct = _collTokens[user][0];
        address dt = _debtTokens[user][0];
        euint64 c = _coll(user, ct);
        euint64 d = _dbt(user, dt);
        FHE.allowTransient(c, gad);
        FHE.allowTransient(d, gad);
        IObscuraGAD(gad).syncPosition(user, ct, c, dt, d);
    }
}
