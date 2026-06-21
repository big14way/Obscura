// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IConfToken
 * @notice Minimal local interface for an ERC-7984 confidential fungible token.
 * @dev We declare only the methods Obscura uses so the protocol does not depend on a
 *      specific openzeppelin/confidential-contracts version layout. Signatures match
 *      ERC-7984 / OpenZeppelin ConfidentialFungibleToken (confidentialTransfer*,
 *      confidentialBalanceOf, setOperator). Approvals use the time-bounded operator
 *      model (setOperator) instead of ERC-20 approve().
 */
interface IConfToken {
    /// @notice Move `amount` from caller to `to`. Amount is an encrypted handle.
    function confidentialTransfer(address to, euint64 amount) external returns (euint64);

    /// @notice Move `amount` from `from` to `to`. Caller must be an operator of `from`.
    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64);

    /// @notice Encrypted balance handle of `account` (decryptable only by allowed parties).
    function confidentialBalanceOf(address account) external view returns (euint64);

    /// @notice Authorize `operator` to move the caller's tokens until `until` (unix ts).
    function setOperator(address operator, uint48 until) external;

    /// @notice Whether `spender` is currently an operator for `holder`.
    function isOperator(address holder, address spender) external view returns (bool);
}
