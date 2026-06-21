// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfToken} from "./interfaces/IConfToken.sol";

/**
 * @title ObscuraLP
 * @notice Confidential liquidity vault. An LP deposits a confidential ERC-7984 asset (cUSDT)
 *         and receives confidential shares; each LP's position size is private (euint64).
 *
 * @dev Demo simplification: a 1:1 share model (shares == deposited amount). FHE has no
 *      euint/euint division, so a private per-share price cannot be computed purely
 *      homomorphically with private aggregates. A production vault would either keep pool
 *      totals cleartext (TVL public, positions private) and divide by the plaintext scalar,
 *      or use the ERC7984ERC20Wrapper rate() model (see ZAMA_PORT.md §5.3). The 1:1 model
 *      keeps shares fully private and correct for the demo.
 */
contract ObscuraLP is ZamaEthereumConfig {
    IConfToken public asset;
    string public name;
    string public symbol;

    mapping(address => euint64) internal _shares;
    euint64 internal _totalShares;

    event LpDeposit(address indexed user);
    event LpWithdraw(address indexed user);

    constructor(address asset_, string memory name_, string memory symbol_) {
        asset = IConfToken(asset_);
        name = name_;
        symbol = symbol_;
        _totalShares = FHE.asEuint64(0);
        FHE.allowThis(_totalShares);
    }

    function deposit(externalEuint64 enc, bytes calldata inputProof) external {
        euint64 amt = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(amt), "bad input");

        // Pull asset (caller must have called asset.setOperator(thisVault, until)).
        FHE.allowTransient(amt, address(asset));
        euint64 sent = asset.confidentialTransferFrom(msg.sender, address(this), amt);

        euint64 bal = FHE.add(_shareBal(msg.sender), sent);
        _shares[msg.sender] = bal;
        _totalShares = FHE.add(_totalShares, sent);

        FHE.allowThis(bal);
        FHE.allow(bal, msg.sender);
        FHE.allowThis(_totalShares);

        emit LpDeposit(msg.sender);
    }

    function withdraw(externalEuint64 enc, bytes calldata inputProof) external {
        euint64 want = FHE.fromExternal(enc, inputProof);
        require(FHE.isSenderAllowed(want), "bad input");

        euint64 bal = _shareBal(msg.sender);
        ebool tooMuch = FHE.gt(want, bal);
        euint64 capped = FHE.select(tooMuch, bal, want);

        _shares[msg.sender] = FHE.sub(bal, capped);
        _totalShares = FHE.sub(_totalShares, capped);
        FHE.allowThis(_shares[msg.sender]);
        FHE.allow(_shares[msg.sender], msg.sender);
        FHE.allowThis(_totalShares);

        FHE.allowTransient(capped, address(asset));
        asset.confidentialTransfer(msg.sender, capped);

        emit LpWithdraw(msg.sender);
    }

    function sharesOf(address user) external view returns (euint64) {
        return _shares[user];
    }

    function totalShares() external view returns (euint64) {
        return _totalShares;
    }

    function _shareBal(address user) internal returns (euint64) {
        if (!FHE.isInitialized(_shares[user])) {
            _shares[user] = FHE.asEuint64(0);
            FHE.allowThis(_shares[user]);
        }
        return _shares[user];
    }
}
