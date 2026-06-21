// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ObscuraCore
 * @notice Protocol configuration registry for the confidential Obscura credit protocol.
 * @dev DESIGN NOTE (confidentiality boundary): Core stays intentionally PLAINTEXT.
 *      Risk parameters (LTV/threshold/bonus/decimals) and oracle prices (priceUsd6) are the
 *      cleartext scalars used by the encrypted contracts to compute LTV/value via
 *      `FHE.mul(amount, priceScalar)` and cross-multiplied comparisons. FHE has no
 *      euint/euint division, so these MUST remain public. The result: position SIZE is
 *      private (euint64 in Lending/GAD), while the risk curve is public — standard for
 *      confidential lending.
 */
contract ObscuraCore is Ownable {
    struct Protocol {
        address treasury;
        bool paused;
    }

    struct CollateralConfig {
        bool isActive;
        uint16 maxLtvBps; // e.g. 7500 = 75%
        uint16 liquidationThresholdBps;
        uint16 liquidationBonusBps;
        uint8 decimals;
    }

    struct BorrowableConfig {
        bool isActive;
        uint16 interestRateBps; // simple fixed rate for demo
        uint8 decimals;
    }

    struct PriceFeed {
        uint256 priceUsd6; // price in 6 decimals
        uint256 lastUpdate;
    }

    Protocol public protocol;

    mapping(address => CollateralConfig) public collateralConfigs; // token => config
    mapping(address => BorrowableConfig) public borrowableConfigs; // token => config
    mapping(address => PriceFeed) public priceFeeds; // token => price

    event ProtocolInitialized(address admin, address treasury);
    event CollateralRegistered(address token, uint16 maxLtvBps);
    event BorrowableRegistered(address token, uint16 rateBps);
    event PriceUpdated(address token, uint256 priceUsd6, uint256 timestamp);
    event Paused(bool paused);

    constructor(address _treasury) Ownable(msg.sender) {
        protocol.treasury = _treasury;
        protocol.paused = false;
        emit ProtocolInitialized(msg.sender, _treasury);
    }

    function setPaused(bool _paused) external onlyOwner {
        protocol.paused = _paused;
        emit Paused(_paused);
    }

    function registerCollateral(
        address token,
        uint16 maxLtvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationBonusBps,
        uint8 decimals
    ) external onlyOwner {
        collateralConfigs[token] = CollateralConfig({
            isActive: true,
            maxLtvBps: maxLtvBps,
            liquidationThresholdBps: liquidationThresholdBps,
            liquidationBonusBps: liquidationBonusBps,
            decimals: decimals
        });
        emit CollateralRegistered(token, maxLtvBps);
    }

    function registerBorrowable(
        address token,
        uint16 interestRateBps,
        uint8 decimals
    ) external onlyOwner {
        borrowableConfigs[token] = BorrowableConfig({
            isActive: true,
            interestRateBps: interestRateBps,
            decimals: decimals
        });
        emit BorrowableRegistered(token, interestRateBps);
    }

    function updatePrice(address token, uint256 priceUsd6) external onlyOwner {
        // Bounded so the encrypted contracts can safely cast price to a plaintext scalar.
        require(priceUsd6 <= type(uint64).max, "price too large");
        priceFeeds[token] = PriceFeed({priceUsd6: priceUsd6, lastUpdate: block.timestamp});
        emit PriceUpdated(token, priceUsd6, block.timestamp);
    }

    // ---- convenience views (cleartext scalars used by the encrypted contracts) ----

    function priceOf(address token) external view returns (uint256) {
        return priceFeeds[token].priceUsd6;
    }

    function maxLtvBpsOf(address token) external view returns (uint16) {
        return collateralConfigs[token].maxLtvBps;
    }

    function decimalsOf(address token) external view returns (uint8) {
        uint8 d = collateralConfigs[token].decimals;
        return d != 0 ? d : borrowableConfigs[token].decimals;
    }

    function treasury() external view returns (address) {
        return protocol.treasury;
    }
}
