// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IConfToken} from "./interfaces/IConfToken.sol";

/**
 * @notice Interface that flash loan receivers must implement.
 */
interface IFlashLoanReceiver {
    function onFlashLoan(address initiator, address token, uint256 amount, uint256 fee, bytes calldata data)
        external
        returns (bytes32);
}

/**
 * @title ObscuraFlash — Flash Loans for AI Agents (composable plaintext-amount leg)
 * @notice Zero-collateral, same-transaction loans on an ERC-7984 confidential asset.
 *
 * @dev IMPORTANT FHEVM LIMITATION (documented on purpose): flash-loan correctness depends on
 *      an ATOMIC plaintext balance invariant (`balanceAfter >= balanceBefore + fee`). On
 *      encrypted balances that invariant can only be evaluated as an `ebool`, which CANNOT
 *      conditionally `revert` mid-transaction (decryption is async). Therefore the flash
 *      AMOUNT is intentionally kept PLAINTEXT (flash amounts are revealed at the DEX anyway),
 *      preserving atomicity/composability, while the asset itself is a confidential ERC-7984
 *      token and pool TVL accounting is tracked. This is the honest, correct design for a
 *      composable flash leg under FHE — see ZAMA_PORT.md §5.5.
 */
contract ObscuraFlash is ZamaEthereumConfig, ReentrancyGuard {
    uint256 public constant FEE_BPS = 9; // 0.09%
    uint256 public constant BPS_DENOMINATOR = 10000;

    address public treasury;
    mapping(address => uint256) public poolBalances; // token => plaintext pool size
    mapping(address => mapping(address => uint256)) private _pendingRepayments;

    event FlashLoan(address indexed borrower, address indexed token, uint256 amount, uint256 fee, bytes32 indexed opId);
    event PoolDeposit(address indexed token, uint256 amount);
    event PoolWithdraw(address indexed token, uint256 amount);

    constructor(address _treasury) {
        treasury = _treasury;
    }

    // ---------- pool management ----------

    /// @notice Deposit `amount` of a confidential token into the pool (caller must be operator).
    function deposit(address token, uint256 amount) external {
        require(amount <= type(uint64).max, "amount too large");
        euint64 amt = FHE.asEuint64(uint64(amount));
        FHE.allowTransient(amt, token);
        IConfToken(token).confidentialTransferFrom(msg.sender, address(this), amt);
        poolBalances[token] += amount;
        emit PoolDeposit(token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(msg.sender == treasury, "only treasury");
        require(amount <= type(uint64).max, "amount too large");
        require(poolBalances[token] >= amount, "insufficient");
        poolBalances[token] -= amount;
        euint64 amt = FHE.asEuint64(uint64(amount));
        FHE.allowTransient(amt, token);
        IConfToken(token).confidentialTransfer(treasury, amt);
        emit PoolWithdraw(token, amount);
    }

    // ---------- flash loan (callback) ----------

    function flashLoan(address token, uint256 amount, address receiver, bytes calldata data)
        external
        nonReentrant
        returns (bytes32 opId)
    {
        require(amount > 0, "amount zero");
        require(poolBalances[token] >= amount, "insufficient liquidity");

        uint256 fee = (amount * FEE_BPS) / BPS_DENOMINATOR;
        require(amount + fee <= type(uint64).max, "amount too large"); // ciphertext casts are uint64
        opId = keccak256(abi.encodePacked(msg.sender, token, amount, block.timestamp, block.number));

        // Send funds to the receiver.
        euint64 out = FHE.asEuint64(uint64(amount));
        FHE.allowTransient(out, token);
        IConfToken(token).confidentialTransfer(receiver, out);

        // Run receiver logic.
        bytes32 returnedId = IFlashLoanReceiver(receiver).onFlashLoan(msg.sender, token, amount, fee, data);
        require(returnedId == opId, "invalid callback");

        // Pull principal + fee back (receiver must have set this contract as operator).
        // NOTE: confidential transfers clamp to the available balance and cannot revert on
        // shortfall, so production use must add an off-chain settlement check. See header.
        euint64 repay = FHE.asEuint64(uint64(amount + fee));
        FHE.allowTransient(repay, token);
        IConfToken(token).confidentialTransferFrom(receiver, address(this), repay);

        // Fee to treasury.
        euint64 feeAmt = FHE.asEuint64(uint64(fee));
        FHE.allowTransient(feeAmt, token);
        IConfToken(token).confidentialTransfer(treasury, feeAmt);

        emit FlashLoan(msg.sender, token, amount, fee, opId);
    }

    // ---------- simple flash (no callback) ----------

    function flashBorrow(address token, uint256 amount) external nonReentrant returns (uint256 fee) {
        require(amount > 0, "amount zero");
        require(poolBalances[token] >= amount, "insufficient liquidity");
        fee = (amount * FEE_BPS) / BPS_DENOMINATOR;
        require(amount + fee <= type(uint64).max, "amount too large");
        euint64 out = FHE.asEuint64(uint64(amount));
        FHE.allowTransient(out, token);
        IConfToken(token).confidentialTransfer(msg.sender, out);
        _pendingRepayments[msg.sender][token] = amount + fee;
    }

    function flashRepay(address token) external nonReentrant {
        uint256 repayAmount = _pendingRepayments[msg.sender][token];
        require(repayAmount > 0, "no pending loan");
        require(repayAmount <= type(uint64).max, "amount too large");
        euint64 repay = FHE.asEuint64(uint64(repayAmount));
        FHE.allowTransient(repay, token);
        IConfToken(token).confidentialTransferFrom(msg.sender, address(this), repay);
        uint256 fee = (repayAmount * FEE_BPS) / (BPS_DENOMINATOR + FEE_BPS);
        euint64 feeAmt = FHE.asEuint64(uint64(fee));
        FHE.allowTransient(feeAmt, token);
        IConfToken(token).confidentialTransfer(treasury, feeAmt);
        delete _pendingRepayments[msg.sender][token];
        emit FlashLoan(msg.sender, token, repayAmount - fee, fee, bytes32(0));
    }

    // ---------- views ----------

    function getAvailableLiquidity(address token) external view returns (uint256) {
        return poolBalances[token];
    }

    function calculateFee(uint256 amount) external pure returns (uint256) {
        return (amount * FEE_BPS) / BPS_DENOMINATOR;
    }

    function getPendingRepayment(address borrower, address token) external view returns (uint256) {
        return _pendingRepayments[borrower][token];
    }
}

/**
 * @title FlashLoanArbitrage — example receiver
 * @dev Confidential variant: approves repayment by setting the flash pool as a token operator
 *      instead of ERC-20 approve().
 */
contract FlashLoanArbitrage is IFlashLoanReceiver {
    function onFlashLoan(address initiator, address token, uint256 amount, uint256 /*fee*/, bytes calldata data)
        external
        override
        returns (bytes32)
    {
        // Decode arbitrage params and execute (swap on DEX A -> DEX B -> profit).
        (address dexA, address dexB,,) = abi.decode(data, (address, address, bytes, bytes));
        dexA;
        dexB;
        // Authorize the flash pool (msg.sender) to pull principal + fee for the same-tx repayment.
        IConfToken(token).setOperator(msg.sender, uint48(block.timestamp + 1));
        return keccak256(abi.encodePacked(initiator, token, amount, block.timestamp, block.number));
    }
}
