// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SafeExitRebalancer
 * @dev Safe Exit / One-Tap Rebalance — "Hepsini S'ye park et" ve tek-tık yeniden dengeleme
 */
contract SafeExitRebalancer is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    struct SafeExitOrder {
        uint256 orderId;
        address user;
        uint256 totalAmount; // Total amount being moved to Senior
        uint256 fromJuniorAmount; // Amount coming from Junior
        uint256 fromOtherSources; // Amount from other sources
        uint256 executionDeadline;
        bool isExecuted;
        bool isCancelled;
        uint256 estimatedGas;
        uint256 slippageTolerance; // BPS
        SafeExitReason reason;
    }
    
    enum SafeExitReason {
        MARKET_VOLATILITY,
        PERSONAL_RISK_REDUCTION, 
        PORTFOLIO_REBALANCING,
        EMERGENCY_EXIT,
        REGULATORY_COMPLIANCE
    }
    
    struct RebalanceOrder {
        uint256 orderId;
        address user;
        uint256 targetSeniorRatio; // BPS (0-10000)
        uint256 targetJuniorRatio; // BPS (0-10000)
        uint256 currentSeniorAmount;
        uint256 currentJuniorAmount;
        uint256 moveAmount; // Amount to move between tranches
        bool movingToSenior; // True if moving to Senior, false if to Junior
        uint256 executionDeadline;
        bool isExecuted;
        bool isCancelled;
        RebalanceStrategy strategy;
    }
    
    enum RebalanceStrategy {
        IMMEDIATE,           // Execute immediately
        TIME_WEIGHTED,       // Execute over time (TWAP)
        VOLATILITY_BASED,    // Execute based on volatility windows
        COST_OPTIMIZED      // Minimize transaction costs
    }
    
    struct UserPreferences {
        uint256 defaultSlippageTolerance; // BPS
        bool autoRebalanceEnabled;
        uint256 rebalanceThreshold; // BPS deviation that triggers rebalance
        uint256 emergencyExitThreshold; // Volatility level that triggers emergency exit
        RebalanceStrategy preferredStrategy;
        uint256 maxGasPrice; // Max gas price user is willing to pay
    }
    
    struct MarketConditions {
        uint256 volatilityIndex; // Current market volatility (BPS)
        uint256 liquiditySpread; // Bid-ask spread (BPS)
        uint256 gasPrice; // Current gas price
        bool isStressedMarket; // Market stress indicator
        uint256 timestamp;
    }
    
    address public trancheVault;
    IERC20 public seniorToken;
    IERC20 public juniorToken;
    IERC20 public baseAsset;
    
    mapping(address => UserPreferences) public userPreferences;
    mapping(uint256 => SafeExitOrder) public safeExitOrders;
    mapping(uint256 => RebalanceOrder) public rebalanceOrders;
    mapping(address => uint256[]) public userSafeExitHistory;
    mapping(address => uint256[]) public userRebalanceHistory;
    
    uint256 public safeExitCounter;
    uint256 public rebalanceCounter;
    MarketConditions public currentMarketConditions;
    
    // Emergency parameters
    bool public emergencyMode;
    uint256 public emergencyExitDiscount; // BPS discount for emergency exits
    uint256 public maxEmergencyExitPerUser = 1000000 * 10**6; // $1M per user
    
    event SafeExitInitiated(uint256 indexed orderId, address indexed user, uint256 amount, SafeExitReason reason);
    event SafeExitExecuted(uint256 indexed orderId, uint256 actualAmount, uint256 gasUsed);
    event RebalanceInitiated(uint256 indexed orderId, address indexed user, uint256 targetSeniorRatio, uint256 moveAmount);
    event RebalanceExecuted(uint256 indexed orderId, uint256 finalSeniorRatio, uint256 finalJuniorRatio);
    event EmergencyModeActivated(uint256 timestamp, uint256 volatilityTrigger);
    event MarketConditionsUpdated(uint256 volatility, uint256 liquidity, bool stressed);
    event OneClickRebalanceCompleted(address indexed user, uint256 newSeniorRatio, uint256 gasUsed);
    
    constructor(
        address _trancheVault,
        address _seniorToken,
        address _juniorToken,
        address _baseAsset
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        trancheVault = _trancheVault;
        seniorToken = IERC20(_seniorToken);
        juniorToken = IERC20(_juniorToken);
        baseAsset = IERC20(_baseAsset);
        
        emergencyExitDiscount = 50; // 0.5% discount for emergency exits
    }
    
    function initiateSafeExit(
        uint256 amountToMove,
        uint256 slippageTolerance,
        SafeExitReason reason
    ) external returns (uint256 orderId) {
        require(amountToMove > 0, "Invalid amount");
        require(slippageTolerance <= 1000, "Slippage too high"); // Max 10%
        
        safeExitCounter++;
        orderId = safeExitCounter;
        
        // Get user's current Junior balance
        uint256 juniorBalance = juniorToken.balanceOf(msg.sender);
        uint256 fromJunior = amountToMove > juniorBalance ? juniorBalance : amountToMove;
        uint256 fromOther = amountToMove - fromJunior;
        
        safeExitOrders[orderId] = SafeExitOrder({
            orderId: orderId,
            user: msg.sender,
            totalAmount: amountToMove,
            fromJuniorAmount: fromJunior,
            fromOtherSources: fromOther,
            executionDeadline: block.timestamp + 1 hours,
            isExecuted: false,
            isCancelled: false,
            estimatedGas: _estimateGasForSafeExit(amountToMove),
            slippageTolerance: slippageTolerance,
            reason: reason
        });
        
        userSafeExitHistory[msg.sender].push(orderId);
        
        emit SafeExitInitiated(orderId, msg.sender, amountToMove, reason);
        
        // Execute immediately if conditions are favorable
        if (_shouldExecuteImmediately()) {
            _executeSafeExit(orderId);
        }
        
        return orderId;
    }
    
    function oneClickSafeExit() external nonReentrant returns (uint256 orderId) {
        // Move all Junior assets to Senior in one transaction
        uint256 juniorBalance = juniorToken.balanceOf(msg.sender);
        require(juniorBalance > 0, "No Junior balance");
        
        orderId = initiateSafeExit(
            juniorBalance,
            userPreferences[msg.sender].defaultSlippageTolerance,
            SafeExitReason.PERSONAL_RISK_REDUCTION
        );
        
        // Force immediate execution
        _executeSafeExit(orderId);
    }
    
    function initiateRebalance(
        uint256 targetSeniorRatio,
        RebalanceStrategy strategy
    ) external returns (uint256 orderId) {
        require(targetSeniorRatio <= 10000, "Invalid ratio");
        
        rebalanceCounter++;
        orderId = rebalanceCounter;
        
        uint256 seniorBalance = seniorToken.balanceOf(msg.sender);
        uint256 juniorBalance = juniorToken.balanceOf(msg.sender);
        uint256 totalBalance = seniorBalance + juniorBalance;
        
        require(totalBalance > 0, "No balance to rebalance");
        
        uint256 targetSeniorAmount = (totalBalance * targetSeniorRatio) / 10000;
        uint256 targetJuniorAmount = totalBalance - targetSeniorAmount;
        
        bool movingToSenior = targetSeniorAmount > seniorBalance;
        uint256 moveAmount = movingToSenior ? 
            targetSeniorAmount - seniorBalance : 
            seniorBalance - targetSeniorAmount;
        
        rebalanceOrders[orderId] = RebalanceOrder({
            orderId: orderId,
            user: msg.sender,
            targetSeniorRatio: targetSeniorRatio,
            targetJuniorRatio: 10000 - targetSeniorRatio,
            currentSeniorAmount: seniorBalance,
            currentJuniorAmount: juniorBalance,
            moveAmount: moveAmount,
            movingToSenior: movingToSenior,
            executionDeadline: block.timestamp + 2 hours,
            isExecuted: false,
            isCancelled: false,
            strategy: strategy
        });
        
        userRebalanceHistory[msg.sender].push(orderId);
        
        emit RebalanceInitiated(orderId, msg.sender, targetSeniorRatio, moveAmount);
        
        // Execute immediately for IMMEDIATE strategy
        if (strategy == RebalanceStrategy.IMMEDIATE) {
            _executeRebalance(orderId);
        }
        
        return orderId;
    }
    
    function oneClickRebalance(uint256 targetSeniorRatio) external nonReentrant {
        uint256 orderId = initiateRebalance(targetSeniorRatio, RebalanceStrategy.IMMEDIATE);
        _executeRebalance(orderId);
        
        emit OneClickRebalanceCompleted(msg.sender, targetSeniorRatio, tx.gasprice);
    }
    
    function parkAllInSenior() external nonReentrant {
        oneClickRebalance(10000); // 100% Senior
    }
    
    function balancedRebalance() external nonReentrant {
        oneClickRebalance(5000); // 50/50 split
    }
    
    function aggressiveRebalance() external nonReentrant {
        oneClickRebalance(2000); // 20% Senior, 80% Junior
    }
    
    function _executeSafeExit(uint256 orderId) internal {
        SafeExitOrder storage order = safeExitOrders[orderId];
        require(!order.isExecuted && !order.isCancelled, "Order not executable");
        require(block.timestamp <= order.executionDeadline, "Order expired");
        
        uint256 gasStart = gasleft();
        
        // Transfer Junior tokens to this contract
        if (order.fromJuniorAmount > 0) {
            juniorToken.safeTransferFrom(order.user, address(this), order.fromJuniorAmount);
            
            // Convert Junior to base asset (simplified - in production would use DEX)
            // juniorToken.transfer(trancheVault, order.fromJuniorAmount);
        }
        
        // Convert base asset to Senior tokens
        if (order.totalAmount > 0) {
            seniorToken.safeTransfer(order.user, order.totalAmount);
        }
        
        order.isExecuted = true;
        uint256 gasUsed = gasStart - gasleft();
        
        emit SafeExitExecuted(orderId, order.totalAmount, gasUsed);
    }
    
    function _executeRebalance(uint256 orderId) internal {
        RebalanceOrder storage order = rebalanceOrders[orderId];
        require(!order.isExecuted && !order.isCancelled, "Order not executable");
        require(block.timestamp <= order.executionDeadline, "Order expired");
        
        if (order.movingToSenior) {
            // Move from Junior to Senior
            juniorToken.safeTransferFrom(order.user, address(this), order.moveAmount);
            seniorToken.safeTransfer(order.user, order.moveAmount);
        } else {
            // Move from Senior to Junior
            seniorToken.safeTransferFrom(order.user, address(this), order.moveAmount);
            juniorToken.safeTransfer(order.user, order.moveAmount);
        }
        
        order.isExecuted = true;
        
        // Calculate final ratios
        uint256 finalSeniorBalance = seniorToken.balanceOf(order.user);
        uint256 finalJuniorBalance = juniorToken.balanceOf(order.user);
        uint256 totalBalance = finalSeniorBalance + finalJuniorBalance;
        
        uint256 finalSeniorRatio = totalBalance > 0 ? (finalSeniorBalance * 10000) / totalBalance : 0;
        uint256 finalJuniorRatio = 10000 - finalSeniorRatio;
        
        emit RebalanceExecuted(orderId, finalSeniorRatio, finalJuniorRatio);
    }
    
    function updateUserPreferences(
        uint256 defaultSlippage,
        bool autoRebalance,
        uint256 rebalanceThreshold,
        uint256 emergencyThreshold,
        RebalanceStrategy strategy,
        uint256 maxGasPrice
    ) external {
        userPreferences[msg.sender] = UserPreferences({
            defaultSlippageTolerance: defaultSlippage,
            autoRebalanceEnabled: autoRebalance,
            rebalanceThreshold: rebalanceThreshold,
            emergencyExitThreshold: emergencyThreshold,
            preferredStrategy: strategy,
            maxGasPrice: maxGasPrice
        });
    }
    
    function updateMarketConditions(
        uint256 volatility,
        uint256 liquiditySpread,
        uint256 gasPrice,
        bool isStressed
    ) external onlyRole(KEEPER_ROLE) {
        currentMarketConditions = MarketConditions({
            volatilityIndex: volatility,
            liquiditySpread: liquiditySpread,
            gasPrice: gasPrice,
            isStressedMarket: isStressed,
            timestamp: block.timestamp
        });
        
        // Check if emergency mode should be activated
        if (volatility > 5000 && !emergencyMode) { // 50% volatility threshold
            emergencyMode = true;
            emit EmergencyModeActivated(block.timestamp, volatility);
        } else if (volatility < 2500 && emergencyMode) { // 25% volatility threshold to deactivate
            emergencyMode = false;
        }
        
        emit MarketConditionsUpdated(volatility, liquiditySpread, isStressed);
    }
    
    function emergencyExitAll(SafeExitReason reason) external nonReentrant {
        require(emergencyMode, "Not in emergency mode");
        
        uint256 juniorBalance = juniorToken.balanceOf(msg.sender);
        require(juniorBalance > 0, "No Junior balance");
        require(juniorBalance <= maxEmergencyExitPerUser, "Exceeds emergency limit");
        
        // Apply emergency exit discount
        uint256 discountAmount = (juniorBalance * emergencyExitDiscount) / 10000;
        uint256 netAmount = juniorBalance - discountAmount;
        
        // Execute emergency exit
        juniorToken.safeTransferFrom(msg.sender, address(this), juniorBalance);
        seniorToken.safeTransfer(msg.sender, netAmount);
        
        // Record as safe exit order
        safeExitCounter++;
        safeExitOrders[safeExitCounter] = SafeExitOrder({
            orderId: safeExitCounter,
            user: msg.sender,
            totalAmount: netAmount,
            fromJuniorAmount: juniorBalance,
            fromOtherSources: 0,
            executionDeadline: block.timestamp,
            isExecuted: true,
            isCancelled: false,
            estimatedGas: 0,
            slippageTolerance: 0,
            reason: reason
        });
        
        emit SafeExitExecuted(safeExitCounter, netAmount, tx.gasprice);
    }
    
    function batchRebalance(
        address[] calldata users,
        uint256[] calldata targetRatios
    ) external onlyRole(KEEPER_ROLE) {
        require(users.length == targetRatios.length, "Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (userPreferences[users[i]].autoRebalanceEnabled) {
                // Create rebalance order for user
                rebalanceCounter++;
                // Implementation would create and execute rebalance order
            }
        }
    }
    
    function _shouldExecuteImmediately() internal view returns (bool) {
        return !currentMarketConditions.isStressedMarket && 
               currentMarketConditions.gasPrice <= 100 gwei &&
               currentMarketConditions.liquiditySpread <= 100; // 1% spread
    }
    
    function _estimateGasForSafeExit(uint256 amount) internal pure returns (uint256) {
        // Simplified gas estimation
        return 150000 + (amount / 1000000) * 1000; // Base gas + amount-based gas
    }
    
    function cancelSafeExit(uint256 orderId) external {
        SafeExitOrder storage order = safeExitOrders[orderId];
        require(order.user == msg.sender, "Not your order");
        require(!order.isExecuted && !order.isCancelled, "Cannot cancel");
        
        order.isCancelled = true;
    }
    
    function cancelRebalance(uint256 orderId) external {
        RebalanceOrder storage order = rebalanceOrders[orderId];
        require(order.user == msg.sender, "Not your order");
        require(!order.isExecuted && !order.isCancelled, "Cannot cancel");
        
        order.isCancelled = true;
    }
    
    function getUserPortfolioBalance(address user) external view returns (
        uint256 seniorBalance,
        uint256 juniorBalance,
        uint256 totalBalance,
        uint256 seniorRatio,
        uint256 juniorRatio
    ) {
        seniorBalance = seniorToken.balanceOf(user);
        juniorBalance = juniorToken.balanceOf(user);
        totalBalance = seniorBalance + juniorBalance;
        
        if (totalBalance > 0) {
            seniorRatio = (seniorBalance * 10000) / totalBalance;
            juniorRatio = 10000 - seniorRatio;
        }
    }
    
    function getRebalanceRecommendation(address user) external view returns (
        uint256 recommendedSeniorRatio,
        string memory reasoning,
        uint256 confidence
    ) {
        // Simplified recommendation logic
        if (currentMarketConditions.volatilityIndex > 3000) {
            return (8000, "High volatility favors Senior allocation", 85);
        } else if (currentMarketConditions.volatilityIndex < 1500) {
            return (3000, "Low volatility supports Junior allocation", 75);
        } else {
            return (5000, "Balanced allocation recommended", 70);
        }
    }
}