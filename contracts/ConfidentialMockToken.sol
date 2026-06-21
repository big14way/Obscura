// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfToken} from "./interfaces/IConfToken.sol";

/**
 * @title ConfidentialMockToken
 * @notice A minimal, self-contained ERC-7984-style confidential fungible token for LOCAL
 *         tests and the demo faucet. Balances are euint64 ciphertexts; transfers move
 *         encrypted amounts; approvals use the time-bounded operator model.
 * @dev Self-contained on purpose: it depends only on the fhevm/solidity lib (not on a specific
 *      openzeppelin/confidential-contracts version), so the protocol's IConfToken usage is
 *      guaranteed to match. On Sepolia, prefer the OFFICIAL cTokenMocks + Wrappers Registry
 *      (see ZAMA_PORT.md §5.8) — this mock is for local Hardhat runs.
 */
contract ConfidentialMockToken is IConfToken, ZamaEthereumConfig {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    mapping(address => euint64) internal _balances;
    mapping(address => mapping(address => uint48)) public operatorUntil; // holder => spender => expiry

    event Mint(address indexed to, uint64 amount);
    event OperatorSet(address indexed holder, address indexed operator, uint48 until);

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    // ---------- operator model (replaces ERC-20 approve) ----------

    function setOperator(address operator, uint48 until) external {
        operatorUntil[msg.sender][operator] = until;
        emit OperatorSet(msg.sender, operator, until);
    }

    function isOperator(address holder, address spender) public view returns (bool) {
        return operatorUntil[holder][spender] >= block.timestamp && operatorUntil[holder][spender] != 0;
    }

    // ---------- balances ----------

    function confidentialBalanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Faucet: mint a cleartext amount as a confidential balance.
    function mint(address to, uint64 amount) external {
        euint64 bal = _ensure(to);
        bal = FHE.add(bal, FHE.asEuint64(amount));
        _balances[to] = bal;
        FHE.allowThis(bal);
        FHE.allow(bal, to);
        emit Mint(to, amount);
    }

    // ---------- transfers ----------

    function confidentialTransfer(address to, euint64 amount) external returns (euint64) {
        require(FHE.isSenderAllowed(amount), "bad amount acl");
        return _transfer(msg.sender, to, amount);
    }

    /// @notice Transfer using a fresh encrypted input (handles its own fromExternal).
    function confidentialTransfer(address to, externalEuint64 enc, bytes calldata inputProof) external returns (euint64) {
        euint64 amount = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(amount), "bad input");
        return _transfer(msg.sender, to, amount);
    }

    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64) {
        require(isOperator(from, msg.sender), "not operator");
        require(FHE.isSenderAllowed(amount), "bad amount acl");
        return _transfer(from, to, amount);
    }

    function confidentialTransferFrom(address from, address to, externalEuint64 enc, bytes calldata inputProof)
        external
        returns (euint64)
    {
        require(isOperator(from, msg.sender), "not operator");
        euint64 amount = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(amount), "bad input");
        return _transfer(from, to, amount);
    }

    /**
     * @dev Confidential transfer: clamps to the sender's balance (never reverts on
     *      insufficient funds — ERC-7984 semantics; the actual moved amount is encrypted).
     */
    function _transfer(address from, address to, euint64 amount) internal returns (euint64 sent) {
        euint64 fromBal = _ensure(from);
        euint64 toBal = _ensure(to);

        ebool enough = FHE.le(amount, fromBal);
        sent = FHE.select(enough, amount, FHE.asEuint64(0));

        fromBal = FHE.sub(fromBal, sent);
        toBal = FHE.add(toBal, sent);
        _balances[from] = fromBal;
        _balances[to] = toBal;

        FHE.allowThis(fromBal);
        FHE.allow(fromBal, from);
        FHE.allowThis(toBal);
        FHE.allow(toBal, to);

        // ACL on the moved amount goes to the actual counterparties only — NOT to a generic
        // operator/msg.sender (a mover should not gain decrypt rights on the transfer size).
        // Protocol callers are always `from` or `to` in our flows, so they remain covered.
        FHE.allowThis(sent);
        FHE.allow(sent, from);
        FHE.allow(sent, to);
        return sent;
    }

    function _ensure(address a) internal returns (euint64) {
        if (!FHE.isInitialized(_balances[a])) {
            _balances[a] = FHE.asEuint64(0);
            FHE.allowThis(_balances[a]);
        }
        return _balances[a];
    }
}
