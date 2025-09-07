// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStrategyAdapter.sol";

contract StrategyRegistry is Ownable {
    struct StrategyInfo {
        bool enabled;
        uint256 cap;
        uint256 currentAllocation;
        uint256 maxLeverage;
        uint256 performanceFee;
        address adapter;
    }

    mapping(address => StrategyInfo) public strategies;
    address[] public strategyList;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_STRATEGIES = 10;

    event StrategyAdded(address indexed strategy, address adapter, uint256 cap);
    event StrategyUpdated(address indexed strategy, uint256 cap, bool enabled);
    event StrategyRemoved(address indexed strategy);
    event AllocationUpdated(address indexed strategy, uint256 newAllocation);

    error StrategyNotFound();
    error TooManyStrategies();
    error InvalidStrategy();
    error CapExceeded();
    error StrategyDisabled();

    constructor(address _owner) Ownable(_owner) {}

    function addStrategy(
        address strategy,
        address adapter,
        uint256 cap,
        uint256 maxLeverage
    ) external onlyOwner {
        if (strategyList.length >= MAX_STRATEGIES) revert TooManyStrategies();
        if (strategies[strategy].adapter != address(0)) revert InvalidStrategy();
        
        strategies[strategy] = StrategyInfo({
            enabled: true,
            cap: cap,
            currentAllocation: 0,
            maxLeverage: maxLeverage,
            performanceFee: 500, // 5% default
            adapter: adapter
        });
        
        strategyList.push(strategy);
        emit StrategyAdded(strategy, adapter, cap);
    }

    function updateStrategy(
        address strategy,
        uint256 cap,
        bool enabled
    ) external onlyOwner {
        if (strategies[strategy].adapter == address(0)) revert StrategyNotFound();
        
        strategies[strategy].cap = cap;
        strategies[strategy].enabled = enabled;
        
        emit StrategyUpdated(strategy, cap, enabled);
    }

    function removeStrategy(address strategy) external onlyOwner {
        if (strategies[strategy].adapter == address(0)) revert StrategyNotFound();
        if (strategies[strategy].currentAllocation > 0) revert InvalidStrategy();
        
        delete strategies[strategy];
        
        // Remove from list
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategyList[i] == strategy) {
                strategyList[i] = strategyList[strategyList.length - 1];
                strategyList.pop();
                break;
            }
        }
        
        emit StrategyRemoved(strategy);
    }

    function allocateToStrategy(
        address strategy,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        StrategyInfo storage info = strategies[strategy];
        if (info.adapter == address(0)) revert StrategyNotFound();
        if (!info.enabled) revert StrategyDisabled();
        if (info.currentAllocation + amount > info.cap) revert CapExceeded();
        
        info.currentAllocation += amount;
        emit AllocationUpdated(strategy, info.currentAllocation);
        
        return IStrategyAdapter(info.adapter).requestFunds(amount);
    }

    function deallocateFromStrategy(
        address strategy,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        StrategyInfo storage info = strategies[strategy];
        if (info.adapter == address(0)) revert StrategyNotFound();
        
        uint256 returned = IStrategyAdapter(info.adapter).returnFunds(amount);
        info.currentAllocation = info.currentAllocation > returned 
            ? info.currentAllocation - returned 
            : 0;
            
        emit AllocationUpdated(strategy, info.currentAllocation);
        
        return returned;
    }

    function getStrategyReport(address strategy) external view returns (
        uint256 totalAssets,
        int256 pnl,
        bool isActive
    ) {
        StrategyInfo memory info = strategies[strategy];
        if (info.adapter == address(0)) revert StrategyNotFound();
        
        IStrategyAdapter adapter = IStrategyAdapter(info.adapter);
        (totalAssets, pnl) = adapter.report();
        isActive = adapter.isActive() && info.enabled;
        
        return (totalAssets, pnl, isActive);
    }

    function getActiveStrategies() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].enabled) {
                count++;
            }
        }
        
        address[] memory active = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategies[strategyList[i]].enabled) {
                active[index++] = strategyList[i];
            }
        }
        
        return active;
    }

    function getTotalAllocation() external view returns (uint256 total) {
        for (uint256 i = 0; i < strategyList.length; i++) {
            total += strategies[strategyList[i]].currentAllocation;
        }
    }
}