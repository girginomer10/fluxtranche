// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CPPIAutopilot
 * @dev CPPI Autopilot — Kullanıcı "floor" belirler; floor üstü kısım risk alır (m çarpanı)
 */
contract CPPIAutopilot is AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    
    struct CPPIStrategy {
        uint256 strategyId;
        address user;
        uint256 floorValue; // Minimum guaranteed amount
        uint256 totalValue; // Current total portfolio value
        uint256 cushion; // Amount above floor (totalValue - floorValue)
        uint256 multiplier; // Risk multiplier (m)
        uint256 riskyAllocation; // Amount allocated to risky assets
        uint256 safeAllocation; // Amount allocated to safe assets
        uint256 lastRebalanceTime;
        bool isActive;
        CPPIParameters params;
    }
    
    struct CPPIParameters {
        uint256 maxMultiplier; // Maximum allowed multiplier
        uint256 minMultiplier; // Minimum multiplier
        uint256 rebalanceThreshold; // BPS change that triggers rebalance
        uint256 timeThreshold; // Minimum time between rebalances
        bool dynamicFloor; // Whether floor adjusts over time
        uint256 floorGrowthRate; // Annual growth rate for floor (BPS)
    }
    
    struct RebalanceEvent {
        uint256 timestamp;
        uint256 strategyId;
        uint256 oldRiskyAllocation;
        uint256 newRiskyAllocation;
        uint256 portfolioValue;
        uint256 multiplierUsed;
        RebalanceReason reason;
    }
    
    enum RebalanceReason {
        PORTFOLIO_DRIFT,
        TIME_BASED,
        FLOOR_BREACH_RISK,
        MULTIPLIER_ADJUSTMENT,
        MANUAL_TRIGGER
    }
    
    mapping(uint256 => CPPIStrategy) public strategies;
    mapping(address => uint256[]) public userStrategies;
    mapping(uint256 => RebalanceEvent[]) public rebalanceHistory;
    
    uint256 public strategyCounter;
    address public trancheVault;
    IERC20 public baseAsset;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_MULTIPLIER = 600; // 6x max
    uint256 public constant MIN_FLOOR_RATIO = 5000; // 50% minimum floor
    
    event CPPIStrategyCreated(uint256 indexed strategyId, address indexed user, uint256 floorValue, uint256 multiplier);
    event CPPIRebalanced(uint256 indexed strategyId, uint256 newRiskyAllocation, uint256 newSafeAllocation, uint256 multiplier);
    event FloorBreach(uint256 indexed strategyId, uint256 portfolioValue, uint256 floorValue);
    event MultiplierAdjusted(uint256 indexed strategyId, uint256 oldMultiplier, uint256 newMultiplier);
    
    constructor(address _trancheVault, address _baseAsset) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        _grantRole(RISK_MANAGER_ROLE, msg.sender);
        
        trancheVault = _trancheVault;
        baseAsset = IERC20(_baseAsset);
    }
    
    function createCPPIStrategy(
        uint256 initialInvestment,
        uint256 floorRatio, // BPS of initial investment
        uint256 initialMultiplier,
        CPPIParameters calldata params
    ) external returns (uint256 strategyId) {
        require(initialInvestment > 0, "Invalid investment amount");
        require(floorRatio >= MIN_FLOOR_RATIO && floorRatio <= BPS, "Invalid floor ratio");
        require(initialMultiplier >= params.minMultiplier && initialMultiplier <= params.maxMultiplier, "Invalid multiplier");
        require(params.maxMultiplier <= MAX_MULTIPLIER, "Multiplier too high");
        
        strategyCounter++;
        strategyId = strategyCounter;
        
        uint256 floorValue = (initialInvestment * floorRatio) / BPS;
        uint256 cushion = initialInvestment - floorValue;
        uint256 riskyAllocation = (cushion * initialMultiplier) / 100;
        uint256 safeAllocation = initialInvestment - riskyAllocation;
        
        strategies[strategyId] = CPPIStrategy({
            strategyId: strategyId,
            user: msg.sender,
            floorValue: floorValue,
            totalValue: initialInvestment,
            cushion: cushion,
            multiplier: initialMultiplier,
            riskyAllocation: riskyAllocation,
            safeAllocation: safeAllocation,
            lastRebalanceTime: block.timestamp,
            isActive: true,
            params: params
        });
        
        userStrategies[msg.sender].push(strategyId);
        
        // Transfer initial investment
        baseAsset.safeTransferFrom(msg.sender, address(this), initialInvestment);
        
        // Initial allocation to tranches
        _executeAllocation(strategyId, riskyAllocation, safeAllocation);
        
        emit CPPIStrategyCreated(strategyId, msg.sender, floorValue, initialMultiplier);
        return strategyId;
    }
    
    function rebalanceStrategy(uint256 strategyId) public {
        CPPIStrategy storage strategy = strategies[strategyId];
        require(strategy.isActive, "Strategy not active");
        require(
            strategy.user == msg.sender || hasRole(KEEPER_ROLE, msg.sender),
            "Not authorized"
        );
        
        // Update portfolio value from current tranche values
        uint256 currentValue = _getCurrentPortfolioValue(strategyId);
        strategy.totalValue = currentValue;
        
        // Update floor if dynamic
        if (strategy.params.dynamicFloor) {
            strategy.floorValue = _calculateDynamicFloor(strategy);
        }
        
        // Calculate new cushion
        if (currentValue > strategy.floorValue) {
            strategy.cushion = currentValue - strategy.floorValue;
        } else {
            strategy.cushion = 0;
            // Floor breach handling
            emit FloorBreach(strategyId, currentValue, strategy.floorValue);
        }
        
        // Calculate optimal allocation
        uint256 optimalRiskyAllocation = (strategy.cushion * strategy.multiplier) / 100;
        uint256 optimalSafeAllocation = currentValue - optimalRiskyAllocation;
        
        // Check if rebalance is needed
        uint256 allocationDrift = _calculateDrift(strategy.riskyAllocation, optimalRiskyAllocation);
        bool timeThresholdMet = block.timestamp >= strategy.lastRebalanceTime + strategy.params.timeThreshold;
        
        if (allocationDrift >= strategy.params.rebalanceThreshold || timeThresholdMet || strategy.cushion == 0) {
            _executeRebalance(strategyId, optimalRiskyAllocation, optimalSafeAllocation, RebalanceReason.PORTFOLIO_DRIFT);
        }
    }
    
    function adjustMultiplier(uint256 strategyId, uint256 newMultiplier) external {
        CPPIStrategy storage strategy = strategies[strategyId];
        require(strategy.user == msg.sender, "Not your strategy");
        require(strategy.isActive, "Strategy not active");
        require(newMultiplier >= strategy.params.minMultiplier && newMultiplier <= strategy.params.maxMultiplier, "Invalid multiplier");
        
        uint256 oldMultiplier = strategy.multiplier;
        strategy.multiplier = newMultiplier;
        
        // Trigger immediate rebalance with new multiplier
        uint256 optimalRiskyAllocation = (strategy.cushion * newMultiplier) / 100;
        uint256 optimalSafeAllocation = strategy.totalValue - optimalRiskyAllocation;
        
        _executeRebalance(strategyId, optimalRiskyAllocation, optimalSafeAllocation, RebalanceReason.MULTIPLIER_ADJUSTMENT);
        
        emit MultiplierAdjusted(strategyId, oldMultiplier, newMultiplier);
    }
    
    function _executeRebalance(
        uint256 strategyId,
        uint256 targetRiskyAllocation,
        uint256 targetSafeAllocation,
        RebalanceReason reason
    ) internal {
        CPPIStrategy storage strategy = strategies[strategyId];
        
        // Record rebalance event
        rebalanceHistory[strategyId].push(RebalanceEvent({
            timestamp: block.timestamp,
            strategyId: strategyId,
            oldRiskyAllocation: strategy.riskyAllocation,
            newRiskyAllocation: targetRiskyAllocation,
            portfolioValue: strategy.totalValue,
            multiplierUsed: strategy.multiplier,
            reason: reason
        }));
        
        // Execute the allocation
        _executeAllocation(strategyId, targetRiskyAllocation, targetSafeAllocation);
        
        // Update strategy state
        strategy.riskyAllocation = targetRiskyAllocation;
        strategy.safeAllocation = targetSafeAllocation;
        strategy.lastRebalanceTime = block.timestamp;
        
        emit CPPIRebalanced(strategyId, targetRiskyAllocation, targetSafeAllocation, strategy.multiplier);
    }
    
    function _executeAllocation(uint256 strategyId, uint256 riskyAmount, uint256 safeAmount) internal {
        // In production, this would interact with the actual tranche vault
        // For now, we simulate the allocation
        
        // Move funds to Junior (risky) and Senior (safe) tranches
        // TrancheVault(trancheVault).allocate(riskyAmount, safeAmount);
    }
    
    function _getCurrentPortfolioValue(uint256 strategyId) internal view returns (uint256) {
        CPPIStrategy storage strategy = strategies[strategyId];
        
        // In production, would get actual values from tranche tokens
        // For now, simulate based on stored allocations
        return strategy.riskyAllocation + strategy.safeAllocation;
    }
    
    function _calculateDynamicFloor(CPPIStrategy memory strategy) internal view returns (uint256) {
        if (!strategy.params.dynamicFloor) return strategy.floorValue;
        
        uint256 timeElapsed = block.timestamp - strategy.lastRebalanceTime;
        uint256 annualGrowth = (strategy.floorValue * strategy.params.floorGrowthRate) / BPS;
        uint256 timeGrowth = (annualGrowth * timeElapsed) / 365 days;
        
        return strategy.floorValue + timeGrowth;
    }
    
    function _calculateDrift(uint256 current, uint256 target) internal pure returns (uint256) {
        if (target == 0) return current == 0 ? 0 : BPS;
        
        uint256 diff = current > target ? current - target : target - current;
        return (diff * BPS) / target;
    }
    
    function getCPPIMetrics(uint256 strategyId) external view returns (
        uint256 portfolioValue,
        uint256 floorValue,
        uint256 cushion,
        uint256 riskyAllocation,
        uint256 safeAllocation,
        uint256 currentMultiplier,
        uint256 utilizationRatio // How much of max possible risk is used
    ) {
        CPPIStrategy storage strategy = strategies[strategyId];
        
        portfolioValue = strategy.totalValue;
        floorValue = strategy.floorValue;
        cushion = strategy.cushion;
        riskyAllocation = strategy.riskyAllocation;
        safeAllocation = strategy.safeAllocation;
        currentMultiplier = strategy.multiplier;
        
        // Calculate utilization ratio
        uint256 maxPossibleRisk = (cushion * strategy.params.maxMultiplier) / 100;
        utilizationRatio = maxPossibleRisk > 0 ? (riskyAllocation * BPS) / maxPossibleRisk : 0;
    }
    
    function getStrategyPerformance(uint256 strategyId) external view returns (
        uint256 totalReturn,
        uint256 floorProtectionUsed,
        uint256 maxDrawdown,
        uint256 rebalanceCount
    ) {
        CPPIStrategy storage strategy = strategies[strategyId];
        RebalanceEvent[] storage history = rebalanceHistory[strategyId];
        
        // Calculate total return (simplified)
        totalReturn = strategy.totalValue > strategy.floorValue ? 
            ((strategy.totalValue - strategy.floorValue) * BPS) / strategy.floorValue : 0;
        
        // Floor protection metric
        floorProtectionUsed = strategy.totalValue <= strategy.floorValue ? BPS : 0;
        
        // Max drawdown (simplified - would need price history)
        maxDrawdown = 0;
        
        rebalanceCount = history.length;
    }
    
    function batchRebalance(uint256[] calldata strategyIds) external onlyRole(KEEPER_ROLE) {
        for (uint256 i = 0; i < strategyIds.length; i++) {
            if (strategies[strategyIds[i]].isActive) {
                rebalanceStrategy(strategyIds[i]);
            }
        }
    }
    
    function emergencyStop(uint256 strategyId) external {
        CPPIStrategy storage strategy = strategies[strategyId];
        require(
            strategy.user == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        strategy.isActive = false;
        
        // Move all to safe allocation
        _executeAllocation(strategyId, 0, strategy.totalValue);
        strategy.riskyAllocation = 0;
        strategy.safeAllocation = strategy.totalValue;
    }
    
    function withdrawStrategy(uint256 strategyId) external {
        CPPIStrategy storage strategy = strategies[strategyId];
        require(strategy.user == msg.sender, "Not your strategy");
        require(!strategy.isActive, "Strategy still active");
        
        // Withdraw all funds back to user
        baseAsset.safeTransfer(msg.sender, strategy.totalValue);
        
        strategy.totalValue = 0;
        strategy.safeAllocation = 0;
        strategy.riskyAllocation = 0;
    }
    
    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }
    
    function getRebalanceHistory(uint256 strategyId, uint256 limit) external view returns (RebalanceEvent[] memory) {
        RebalanceEvent[] storage history = rebalanceHistory[strategyId];
        uint256 length = history.length > limit ? limit : history.length;
        
        RebalanceEvent[] memory recentHistory = new RebalanceEvent[](length);
        
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i]; // Latest first
        }
        
        return recentHistory;
    }
}