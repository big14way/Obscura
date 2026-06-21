// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, euint128, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ObscuraCore} from "./ObscuraCore.sol";

interface IReputationGad {
    function updateOnGad(address agent, ebool eligible) external;
}

interface IObscuraLendingGad {
    function applyGadSeizure(
        address user,
        address collToken,
        euint64 toTreasury,
        euint64 reward,
        address cranker,
        address debtToken,
        euint64 debtReduce
    ) external;

    function globalMaxLtvBps() external view returns (uint16);
}

/**
 * @title ObscuraGAD — Confidential Gradual Auto-Deleveraging
 * @notice Replaces sudden liquidations with gradual, MEV-resistant unwinding — on ENCRYPTED
 *         positions. `crank` is permissionless (anyone can call for a 0.5% reward) but leaks
 *         nothing: eligibility is an `ebool`, the seizure delta is `FHE.select(eligible, …, 0)`,
 *         and the reputation penalty is applied homomorphically (a healthy crank is a true
 *         no-op — it cannot grief the agent's score).
 *
 * @dev All value math uses euint128 to avoid silent euint64 wraparound (value = amount*price).
 *      Uses the SAME LTV threshold as Lending (lending.globalMaxLtvBps) so a position Lending
 *      deems healthy is never immediately GAD-eligible. Seizes a fixed GAD_FRACTION_BPS slice
 *      per eligible crank; getGadRateBps is kept as a pure off-chain helper. Tracks one primary
 *      (collateral, debt) pair per user, synced from Lending.
 */
contract ObscuraGAD is ZamaEthereumConfig {
    uint64 internal constant DENOM = 10000;
    uint64 public constant CRANKER_REWARD_BPS = 50; // 0.5%
    uint64 public constant GAD_FRACTION_BPS = 500; // 5% of collateral seized per eligible crank
    uint256 public constant MIN_CRANK_INTERVAL = 1 hours;
    uint64 internal constant SCALE_DEC = 8; // matches ObscuraLending: values compared in USD6 * 10**SCALE_DEC

    ObscuraCore public core;
    IReputationGad public reputation;
    address public lending;
    address public admin;

    struct GadConfig {
        bool enabled;
        uint16 customThresholdBps;
        uint256 lastCrank;
        euint128 totalLiquidatedUsd6; // encrypted (scaled); only meaningfully grows on an eligible crank
    }

    struct Position {
        address collToken;
        address debtToken;
        euint64 coll;
        euint64 debt;
        bool set;
    }

    mapping(address => GadConfig) public gadConfigs;
    mapping(address => Position) internal positions;

    event GadConfigured(address indexed user, bool enabled, uint16 thresholdBps);
    event GadCranked(address indexed user, address indexed cranker); // does NOT reveal eligibility/amount

    constructor(address _core, address _reputation, address _lending) {
        core = ObscuraCore(_core);
        reputation = IReputationGad(_reputation);
        lending = _lending;
        admin = msg.sender;
    }

    function setLending(address _lending) external {
        require(msg.sender == admin, "not admin");
        lending = _lending;
    }

    function configureGad(bool enabled, uint16 customThresholdBps) external {
        require(customThresholdBps <= 10000, "bps");
        gadConfigs[msg.sender].enabled = enabled;
        gadConfigs[msg.sender].customThresholdBps = customThresholdBps;
        emit GadConfigured(msg.sender, enabled, customThresholdBps);
    }

    /// @notice Pushed by Lending on every position change (encrypted handles passed transiently).
    function syncPosition(address user, address collToken, euint64 coll, address debtToken, euint64 debt) external {
        require(msg.sender == lending, "only lending");
        Position storage p = positions[user];
        p.collToken = collToken;
        p.debtToken = debtToken;
        p.coll = coll;
        p.debt = debt;
        p.set = true;
        FHE.allowThis(p.coll);
        FHE.allowThis(p.debt);
    }

    /// @notice Pure quadratic rate helper (cleartext) — for off-chain risk display only.
    function getGadRateBps(uint256 currentLtvBps, uint256 maxLtvBps) public pure returns (uint256) {
        if (currentLtvBps <= maxLtvBps) return 0;
        uint256 excessBps = currentLtvBps - maxLtvBps;
        uint256 rate = (excessBps * excessBps) / 100;
        return rate > 1000 ? 1000 : rate; // cap 10%/day
    }

    /**
     * @notice Permissionless crank. Seizes an encrypted slice of collateral IF the encrypted
     *         LTV exceeds the threshold; otherwise seizes 0 and applies no penalty. Leaks nothing.
     */
    function crank(address user) external {
        GadConfig storage cfg = gadConfigs[user];
        Position storage p = positions[user];
        require(cfg.enabled, "GAD disabled");
        require(p.set, "no position");
        require(block.timestamp >= cfg.lastCrank + MIN_CRANK_INTERVAL, "cooldown");

        // Same threshold Lending enforces (per-user override allowed).
        uint16 maxLtv = cfg.customThresholdBps > 0
            ? cfg.customThresholdBps
            : IObscuraLendingGad(lending).globalMaxLtvBps();

        // Encrypted LTV-overshoot test (euint128 to avoid overflow): debtValue*DENOM > collValue*maxLtv.
        euint128 collValue = _value(p.collToken, p.coll);
        euint128 debtValue = _value(p.debtToken, p.debt);
        ebool eligible = FHE.gt(FHE.mul(debtValue, uint128(DENOM)), FHE.mul(collValue, uint128(maxLtv)));

        // Seize a fixed fraction of collateral when eligible, else 0 (euint128 then downcast).
        euint64 seize = FHE.asEuint64(
            FHE.select(eligible, FHE.div(FHE.mul(FHE.asEuint128(p.coll), GAD_FRACTION_BPS), DENOM), FHE.asEuint128(0))
        );
        euint64 reward = FHE.div(FHE.mul(seize, CRANKER_REWARD_BPS), DENOM);
        euint64 toTreasury = FHE.sub(seize, reward);

        // Debt reduced ≈ USD6 value of the seized collateral, converted to debt-token units.
        euint128 seizeUsd6 = _value(p.collToken, seize);
        euint64 debtReduce = _usd6ToToken(p.debtToken, seizeUsd6);

        FHE.allowTransient(toTreasury, lending);
        FHE.allowTransient(reward, lending);
        FHE.allowTransient(debtReduce, lending);
        IObscuraLendingGad(lending).applyGadSeizure(
            user, p.collToken, toTreasury, reward, msg.sender, p.debtToken, debtReduce
        );

        // Encrypted accounting (0 when not eligible — no leak).
        if (!FHE.isInitialized(cfg.totalLiquidatedUsd6)) cfg.totalLiquidatedUsd6 = FHE.asEuint128(0);
        cfg.totalLiquidatedUsd6 = FHE.add(cfg.totalLiquidatedUsd6, seizeUsd6);
        FHE.allowThis(cfg.totalLiquidatedUsd6);
        FHE.allow(cfg.totalLiquidatedUsd6, user);

        cfg.lastCrank = block.timestamp;

        // Penalty applied homomorphically — a healthy crank is a no-op on the score.
        FHE.allowTransient(eligible, address(reputation));
        reputation.updateOnGad(user, eligible);

        emit GadCranked(user, msg.sender);
    }

    /// @notice Plaintext readiness (enabled + cooldown only). LTV eligibility stays encrypted.
    function canCrank(address user) external view returns (bool ready, string memory reason) {
        GadConfig storage cfg = gadConfigs[user];
        if (!cfg.enabled) return (false, "GAD disabled");
        if (!positions[user].set) return (false, "no position");
        if (block.timestamp < cfg.lastCrank + MIN_CRANK_INTERVAL) return (false, "cooldown");
        return (true, "ready (LTV eligibility checked on-chain, encrypted)");
    }

    function getGadStats(address user)
        external
        view
        returns (bool enabled, uint256 lastCrank, euint128 totalLiquidatedUsd6)
    {
        GadConfig storage cfg = gadConfigs[user];
        return (cfg.enabled, cfg.lastCrank, cfg.totalLiquidatedUsd6);
    }

    // ---------------- internal (euint128 value math) ----------------

    /// @dev Scaled value (USD6 * 10**SCALE_DEC) via a single multiply — no homomorphic division.
    function _value(address token, euint64 amount) internal returns (euint128) {
        uint256 price = core.priceOf(token);
        uint8 dec = core.decimalsOf(token);
        if (price == 0 || dec == 0 || dec > SCALE_DEC) return FHE.asEuint128(0);
        uint256 scalar = price * (10 ** (uint256(SCALE_DEC) - dec));
        return FHE.mul(FHE.asEuint128(amount), uint128(scalar));
    }

    /// @dev Convert a scaled value back to debt-token units: scaledVal / (price * 10**(SCALE_DEC-dec)).
    function _usd6ToToken(address token, euint128 scaledVal) internal returns (euint64) {
        uint256 price = core.priceOf(token);
        uint8 dec = core.decimalsOf(token);
        if (price == 0 || dec > SCALE_DEC) return FHE.asEuint64(0);
        uint256 scalar = price * (10 ** (uint256(SCALE_DEC) - dec));
        return FHE.asEuint64(FHE.div(scaledVal, uint128(scalar)));
    }
}
