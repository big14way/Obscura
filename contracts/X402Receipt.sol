// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title X402Receipt
 * @notice Confidential on-chain receipts for HTTP-402 machine-to-machine payments.
 * @dev The payment AMOUNT is encrypted (euint64) and decryptable ONLY by the payer and the
 *      recipient. paymentId / payer / recipient / paidAt stay plaintext for indexing,
 *      idempotency and replay protection. The original emitted the amount in plaintext —
 *      that leak is removed (the event no longer carries the amount).
 */
contract X402Receipt is ZamaEthereumConfig {
    struct Receipt {
        bytes32 paymentId;
        address payer;
        address recipient;
        euint64 amount;
        uint256 paidAt;
    }

    mapping(bytes32 => Receipt) internal _receipts;

    event X402Paid(bytes32 indexed paymentId, address indexed payer, address indexed recipient, uint256 paidAt);

    /// @notice Record a confidential payment receipt. `enc`+`inputProof` come from the relayer SDK.
    function record(
        bytes32 paymentId,
        address payer,
        address recipient,
        externalEuint64 enc,
        bytes calldata inputProof
    ) external {
        require(_receipts[paymentId].paidAt == 0, "exists"); // idempotency / replay guard
        require(msg.sender == payer || msg.sender == recipient, "unauthorized"); // only a counterparty can record

        euint64 amount = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(amount), "bad input");

        _receipts[paymentId] = Receipt(paymentId, payer, recipient, amount, block.timestamp);

        // Only the two counterparties (and this contract) can decrypt the amount.
        FHE.allowThis(amount);
        FHE.allow(amount, payer);
        FHE.allow(amount, recipient);

        emit X402Paid(paymentId, payer, recipient, block.timestamp);
    }

    function getReceipt(bytes32 paymentId) external view returns (Receipt memory) {
        return _receipts[paymentId];
    }

    function amountOf(bytes32 paymentId) external view returns (euint64) {
        return _receipts[paymentId].amount;
    }
}
