// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TravelVault
 * @dev Tatil hedefinde FX oynakılığına duyarlı risk ayarı sistemi
 */
contract TravelVault is AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct TravelPlan {
        uint256 planId;
        address traveler;
        string destination;          // "EUR", "JPY", "GBP"
        uint256 targetAmount;        // Hedef tutar (USD)
        uint256 travelDate;          // Seyahat tarihi
        uint256 currentBalance;      // Mevcut bakiye
        uint256 fxHedgeRatio;        // FX hedge oranı (BPS)
        bool isActive;
        FXStrategy fxStrategy;
    }
    
    enum FXStrategy {
        CONSERVATIVE_HEDGE,   // %80+ hedge
        BALANCED_EXPOSURE,    // %50 hedge
        OPPORTUNISTIC,        // %20 hedge, FX kazancı bekle
        DYNAMIC_REBALANCE     // Volatiliteye göre otomatik
    }
    
    IERC20 public baseToken;
    
    uint256 public planCounter;
    mapping(uint256 => TravelPlan) public travelPlans;
    mapping(address => uint256[]) public userPlans;
    
    uint256 public constant BPS = 10_000;
    
    event TravelPlanCreated(uint256 indexed planId, address indexed traveler, string destination, uint256 targetAmount);
    event FXHedgeAdjusted(uint256 indexed planId, uint256 oldRatio, uint256 newRatio, uint256 fxVolatility);
    
    constructor(address _baseToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        baseToken = IERC20(_baseToken);
    }
    
    function createTravelPlan(
        string calldata destination,
        uint256 targetAmount,
        uint256 travelDate,
        FXStrategy fxStrategy
    ) external returns (uint256 planId) {
        planCounter++;
        planId = planCounter;
        
        travelPlans[planId] = TravelPlan({
            planId: planId,
            traveler: msg.sender,
            destination: destination,
            targetAmount: targetAmount,
            travelDate: travelDate,
            currentBalance: 0,
            fxHedgeRatio: _getInitialHedgeRatio(fxStrategy),
            isActive: true,
            fxStrategy: fxStrategy
        });
        
        userPlans[msg.sender].push(planId);
        emit TravelPlanCreated(planId, msg.sender, destination, targetAmount);
        return planId;
    }
    
    function depositToTravel(uint256 planId, uint256 amount) external {
        TravelPlan storage plan = travelPlans[planId];
        require(plan.traveler == msg.sender, "Not your plan");
        require(plan.isActive, "Plan not active");
        
        baseToken.safeTransferFrom(msg.sender, address(this), amount);
        plan.currentBalance += amount;
    }
    
    function adjustHedgeRatio(uint256 planId, uint256 fxVolatility) external onlyRole(KEEPER_ROLE) {
        TravelPlan storage plan = travelPlans[planId];
        require(plan.isActive, "Plan not active");
        
        uint256 oldRatio = plan.fxHedgeRatio;
        uint256 newRatio = _calculateOptimalHedgeRatio(plan.fxStrategy, fxVolatility);
        
        if (newRatio != oldRatio) {
            plan.fxHedgeRatio = newRatio;
            emit FXHedgeAdjusted(planId, oldRatio, newRatio, fxVolatility);
        }
    }
    
    function _calculateOptimalHedgeRatio(FXStrategy strategy, uint256 fxVolatility) internal pure returns (uint256) {
        if (strategy == FXStrategy.DYNAMIC_REBALANCE) {
            if (fxVolatility > 2000) return 8500; // 85% hedge for high vol
            if (fxVolatility > 1000) return 6500; // 65% for medium vol
            return 4000; // 40% for low vol
        }
        
        return _getInitialHedgeRatio(strategy);
    }
    
    function _getInitialHedgeRatio(FXStrategy strategy) internal pure returns (uint256) {
        if (strategy == FXStrategy.CONSERVATIVE_HEDGE) return 8000; // 80%
        if (strategy == FXStrategy.BALANCED_EXPOSURE) return 5000; // 50%
        if (strategy == FXStrategy.OPPORTUNISTIC) return 2000; // 20%
        return 5000; // Dynamic starts balanced
    }
    
    function withdrawForTravel(uint256 planId) external {
        TravelPlan storage plan = travelPlans[planId];
        require(plan.traveler == msg.sender, "Not your plan");
        require(plan.isActive, "Plan not active");
        require(block.timestamp >= plan.travelDate, "Travel date not reached");
        
        uint256 amount = plan.currentBalance;
        plan.currentBalance = 0;
        plan.isActive = false;
        
        baseToken.safeTransfer(msg.sender, amount);
    }
}