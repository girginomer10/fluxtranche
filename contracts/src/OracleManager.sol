// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOracle.sol";

contract OracleManager is IOracle, Ownable {
    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }

    struct OracleConfig {
        address dexOracle;
        address referenceOracle;
        uint256 maxDeviationBps;
        uint256 twapWindow;
    }

    mapping(address => PriceData) public prices;
    mapping(address => uint256[]) public priceHistory;
    mapping(address => OracleConfig) public oracleConfigs;

    uint256 public constant BPS = 10_000;
    uint256 public defaultMaxDeviationBps = 500; // 5%
    uint256 public defaultTwapWindow = 3600; // 1 hour

    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event OracleConfigUpdated(address indexed token, OracleConfig config);
    event DeviationDetected(address indexed token, uint256 deviation);

    error StalePrice();
    error InvalidPrice();
    error ExcessiveDeviation();
    error NoOracle();

    constructor(address _owner) Ownable(_owner) {}

    function setOracleConfig(
        address token,
        address dexOracle,
        address referenceOracle,
        uint256 maxDeviationBps
    ) external onlyOwner {
        oracleConfigs[token] = OracleConfig({
            dexOracle: dexOracle,
            referenceOracle: referenceOracle,
            maxDeviationBps: maxDeviationBps,
            twapWindow: defaultTwapWindow
        });
        emit OracleConfigUpdated(token, oracleConfigs[token]);
    }

    function updatePrice(address token, uint256 price) external onlyOwner {
        if (price == 0) revert InvalidPrice();
        
        prices[token] = PriceData({
            price: price,
            timestamp: block.timestamp
        });
        
        priceHistory[token].push(price);
        if (priceHistory[token].length > 100) {
            // Keep only last 100 prices for TWAP
            for (uint i = 0; i < priceHistory[token].length - 100; i++) {
                priceHistory[token][i] = priceHistory[token][i + 1];
            }
            // Resize array to 100 elements
            assembly {
                let slot := priceHistory.slot
                let key := token
                mstore(0x00, key)
                mstore(0x20, slot)
                let location := keccak256(0x00, 0x40)
                sstore(location, 100)
            }
        }
        
        emit PriceUpdated(token, price, block.timestamp);
    }

    function getPrice(address token) external view override returns (uint256 price, uint256 timestamp) {
        PriceData memory data = prices[token];
        if (data.price == 0) revert InvalidPrice();
        if (block.timestamp - data.timestamp > 3600) revert StalePrice();
        return (data.price, data.timestamp);
    }

    function getTwap(address token, uint256 window) external view override returns (uint256) {
        uint256[] memory history = priceHistory[token];
        if (history.length == 0) revert InvalidPrice();
        
        uint256 sum = 0;
        uint256 count = 0;
        uint256 cutoff = block.timestamp - window;
        
        // Simple average for MVP - in production would use time-weighted
        for (uint256 i = history.length > 20 ? history.length - 20 : 0; i < history.length; i++) {
            sum += history[i];
            count++;
        }
        
        return count > 0 ? sum / count : prices[token].price;
    }

    function checkDeviation(
        address token,
        uint256 maxDeviationBps
    ) external view override returns (bool isValid, uint256 deviation) {
        PriceData memory data = prices[token];
        if (data.price == 0) revert InvalidPrice();
        
        // Mock check - in production would compare DEX vs Reference oracle
        uint256 twap = this.getTwap(token, defaultTwapWindow);
        
        uint256 diff = data.price > twap ? data.price - twap : twap - data.price;
        deviation = (diff * BPS) / data.price;
        
        isValid = deviation <= maxDeviationBps;
        
        return (isValid, deviation);
    }

    function setDefaultParams(uint256 _maxDeviationBps, uint256 _twapWindow) external onlyOwner {
        defaultMaxDeviationBps = _maxDeviationBps;
        defaultTwapWindow = _twapWindow;
    }
}