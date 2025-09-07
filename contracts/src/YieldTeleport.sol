// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title YieldTeleport
 * @dev Yield Teleport — İlerideki faiz gelirini şimdi advance olarak al
 */
contract YieldTeleport is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant YIELD_MANAGER_ROLE = keccak256("YIELD_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct TeleportPosition {
        uint256 positionId;
        address owner;
        uint256 principal; // Initial stake amount
        uint256 advanceAmount; // Amount of future yield taken now
        uint256 futureYieldPledged; // Total future yield pledged
        uint256 yieldRepaid; // How much yield has been repaid so far
        TeleportConfig config;
        PositionStatus status;
        uint256 createdAt;
        uint256 maturityTime;
        uint256 lastYieldUpdate;
    }
    
    struct TeleportConfig {
        uint256 advanceRatio; // BPS - how much of future yield to advance (e.g., 5000 = 50%)
        uint256 discountRate; // BPS - discount applied to advanced yield
        uint256 targetYieldRate; // BPS - expected annual yield rate
        uint256 teleportPeriod; // How far into future to teleport (seconds)
        uint256 repaymentPeriod; // Period over which to repay (seconds)
        uint256 collateralRatio; // BPS - collateral required for advance
        bool autoCompounding; // Whether to compound repaid yield
        uint256 maxAdvanceMultiplier; // Max advance as multiple of principal
    }
    
    enum PositionStatus {
        ACTIVE,        // Position active, earning yield
        ADVANCING,     // Advance taken, repaying from yield
        DEFAULTED,     // Failed to generate sufficient yield
        MATURED,       // Fully repaid advance
        LIQUIDATED,    // Position liquidated due to default
        CLOSED         // Position closed by user
    }
    
    struct YieldAdvanceEvent {
        uint256 timestamp;
        uint256 positionId;
        uint256 advanceAmount;
        uint256 futureYieldPledged;
        uint256 discountApplied;
        uint256 effectiveRate;
    }
    
    struct RepaymentEvent {
        uint256 timestamp;
        uint256 positionId;
        uint256 yieldGenerated;
        uint256 repaymentAmount;
        uint256 remainingDebt;
        bool positionMatured;
    }
    
    struct YieldForecast {
        uint256 projectedYield; // Expected yield for period
        uint256 confidence; // Confidence level in BPS
        uint256 timeHorizon; // Period covered by forecast
        uint256 riskAdjustment; // Risk adjustment factor
        string modelUsed; // AI model used for forecast
    }
    
    mapping(uint256 => TeleportPosition) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(uint256 => YieldAdvanceEvent[]) public advanceHistory;
    mapping(uint256 => RepaymentEvent[]) public repaymentHistory;
    mapping(uint256 => YieldForecast) public yieldForecasts;
    
    uint256 public positionCounter;
    uint256 public totalAdvancesOutstanding;
    uint256 public totalPrincipalStaked;
    address public trancheVault;
    IERC20 public baseAsset;
    
    // Risk management parameters
    uint256 public maxTotalAdvanceRatio = 3000; // 30% of TVL max
    uint256 public defaultThreshold = 500; // 5% - yield shortfall triggering default
    uint256 public liquidationDiscount = 1000; // 10% discount on liquidation
    uint256 public platformFee = 100; // 1% platform fee on advances
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_STAKE = 1000 * 10**6; // $1000 minimum
    uint256 public constant MAX_ADVANCE_RATIO = 8000; // 80% max advance
    uint256 public constant MIN_TELEPORT_PERIOD = 30 days;
    uint256 public constant MAX_TELEPORT_PERIOD = 365 days;
    
    event PositionCreated(uint256 indexed positionId, address indexed owner, uint256 principal);
    event YieldAdvanced(uint256 indexed positionId, uint256 advanceAmount, uint256 discountRate);
    event YieldRepaid(uint256 indexed positionId, uint256 repaymentAmount, uint256 remainingDebt);
    event PositionDefaulted(uint256 indexed positionId, uint256 yieldShortfall);
    event PositionLiquidated(uint256 indexed positionId, uint256 recoveryAmount);
    event ForecastUpdated(uint256 indexed positionId, uint256 projectedYield, uint256 confidence);
    
    constructor(address _baseAsset, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(YIELD_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        baseAsset = IERC20(_baseAsset);
        trancheVault = _trancheVault;
    }
    
    function createPosition(
        uint256 stakeAmount,
        TeleportConfig calldata config
    ) external returns (uint256 positionId) {
        require(stakeAmount >= MIN_STAKE, "Stake too low");
        require(config.advanceRatio <= MAX_ADVANCE_RATIO, "Advance ratio too high");
        require(config.teleportPeriod >= MIN_TELEPORT_PERIOD, "Teleport period too short");
        require(config.teleportPeriod <= MAX_TELEPORT_PERIOD, "Teleport period too long");
        require(config.collateralRatio >= config.advanceRatio, "Insufficient collateral");
        
        positionCounter++;
        positionId = positionCounter;
        
        uint256 maturityTime = block.timestamp + config.repaymentPeriod;
        
        positions[positionId] = TeleportPosition({
            positionId: positionId,
            owner: msg.sender,
            principal: stakeAmount,
            advanceAmount: 0,
            futureYieldPledged: 0,
            yieldRepaid: 0,
            config: config,
            status: PositionStatus.ACTIVE,
            createdAt: block.timestamp,
            maturityTime: maturityTime,
            lastYieldUpdate: block.timestamp
        });
        
        userPositions[msg.sender].push(positionId);
        totalPrincipalStaked += stakeAmount;
        
        // Transfer stake from user
        baseAsset.safeTransferFrom(msg.sender, address(this), stakeAmount);
        
        // Allocate to tranches for yield generation
        _allocateToTranches(positionId);
        
        emit PositionCreated(positionId, msg.sender, stakeAmount);
        return positionId;
    }
    
    function requestYieldAdvance(uint256 positionId) external nonReentrant {
        TeleportPosition storage position = positions[positionId];
        require(position.owner == msg.sender, "Not position owner");
        require(position.status == PositionStatus.ACTIVE, "Position not active");
        require(position.advanceAmount == 0, "Advance already taken");
        
        // Calculate future yield projection
        YieldForecast memory forecast = _generateYieldForecast(positionId);
        
        // Calculate advance amount with discount
        uint256 projectedYield = forecast.projectedYield;
        uint256 advanceAmount = (projectedYield * position.config.advanceRatio) / BPS;
        uint256 discountAmount = (advanceAmount * position.config.discountRate) / BPS;
        uint256 netAdvance = advanceAmount - discountAmount;
        uint256 platformFeeAmount = (netAdvance * platformFee) / BPS;
        uint256 finalAdvance = netAdvance - platformFeeAmount;
        
        // Validate advance limits
        require(finalAdvance <= (position.principal * position.config.maxAdvanceMultiplier) / 100, "Advance too large");
        require(totalAdvancesOutstanding + finalAdvance <= (totalPrincipalStaked * maxTotalAdvanceRatio) / BPS, "Global advance limit exceeded");
        
        // Update position
        position.advanceAmount = finalAdvance;
        position.futureYieldPledged = projectedYield;
        position.status = PositionStatus.ADVANCING;
        
        totalAdvancesOutstanding += finalAdvance;
        
        // Store forecast and advance event
        yieldForecasts[positionId] = forecast;
        
        advanceHistory[positionId].push(YieldAdvanceEvent({
            timestamp: block.timestamp,
            positionId: positionId,
            advanceAmount: finalAdvance,
            futureYieldPledged: projectedYield,
            discountApplied: discountAmount,
            effectiveRate: (finalAdvance * BPS) / projectedYield
        }));
        
        // Transfer advance to user
        baseAsset.safeTransfer(msg.sender, finalAdvance);
        
        emit YieldAdvanced(positionId, finalAdvance, position.config.discountRate);
    }
    
    function updatePositionYield(uint256 positionId, uint256 currentValue) external onlyRole(ORACLE_ROLE) {
        TeleportPosition storage position = positions[positionId];
        require(position.status == PositionStatus.ADVANCING, "Not advancing");
        
        // Calculate yield generated since last update
        uint256 yieldGenerated = currentValue > position.principal ? 
            currentValue - position.principal : 0;
        
        uint256 newYield = yieldGenerated > position.yieldRepaid ?
            yieldGenerated - position.yieldRepaid : 0;
        
        if (newYield > 0) {
            // Apply yield to repay advance
            uint256 repaymentAmount = newYield;
            uint256 outstandingDebt = position.futureYieldPledged > position.yieldRepaid ?
                position.futureYieldPledged - position.yieldRepaid : 0;
            
            if (repaymentAmount >= outstandingDebt) {
                // Fully repaid
                repaymentAmount = outstandingDebt;
                position.status = PositionStatus.MATURED;
                totalAdvancesOutstanding -= position.advanceAmount;
            }
            
            position.yieldRepaid += repaymentAmount;
            position.lastYieldUpdate = block.timestamp;
            
            // Record repayment event
            repaymentHistory[positionId].push(RepaymentEvent({
                timestamp: block.timestamp,
                positionId: positionId,
                yieldGenerated: yieldGenerated,
                repaymentAmount: repaymentAmount,
                remainingDebt: outstandingDebt - repaymentAmount,
                positionMatured: position.status == PositionStatus.MATURED
            }));
            
            emit YieldRepaid(positionId, repaymentAmount, outstandingDebt - repaymentAmount);
        }
        
        // Check for default conditions
        _checkDefaultConditions(positionId);
    }
    
    function _checkDefaultConditions(uint256 positionId) internal {
        TeleportPosition storage position = positions[positionId];
        
        if (position.status != PositionStatus.ADVANCING) return;
        
        uint256 timeElapsed = block.timestamp - position.createdAt;
        uint256 expectedProgress = (timeElapsed * BPS) / position.config.repaymentPeriod;
        uint256 actualProgress = position.futureYieldPledged > 0 ?
            (position.yieldRepaid * BPS) / position.futureYieldPledged : 0;
        
        // Check if significantly behind schedule
        if (expectedProgress > actualProgress + defaultThreshold && timeElapsed > position.config.teleportPeriod / 2) {
            _defaultPosition(positionId);
        }
        
        // Check if past maturity with outstanding debt
        if (block.timestamp >= position.maturityTime && position.yieldRepaid < position.futureYieldPledged) {
            _defaultPosition(positionId);
        }
    }
    
    function _defaultPosition(uint256 positionId) internal {
        TeleportPosition storage position = positions[positionId];
        
        position.status = PositionStatus.DEFAULTED;
        
        uint256 yieldShortfall = position.futureYieldPledged > position.yieldRepaid ?
            position.futureYieldPledged - position.yieldRepaid : 0;
        
        emit PositionDefaulted(positionId, yieldShortfall);
        
        // Initiate liquidation process
        _liquidatePosition(positionId);
    }
    
    function _liquidatePosition(uint256 positionId) internal {
        TeleportPosition storage position = positions[positionId];
        
        position.status = PositionStatus.LIQUIDATED;
        
        // Calculate recovery amount (principal minus outstanding advance minus discount)
        uint256 outstandingDebt = position.futureYieldPledged > position.yieldRepaid ?
            position.futureYieldPledged - position.yieldRepaid : 0;
        
        uint256 liquidationPenalty = (position.principal * liquidationDiscount) / BPS;
        uint256 recoveryAmount = position.principal > (outstandingDebt + liquidationPenalty) ?
            position.principal - outstandingDebt - liquidationPenalty : 0;
        
        totalAdvancesOutstanding -= position.advanceAmount;
        totalPrincipalStaked -= position.principal;
        
        if (recoveryAmount > 0) {
            baseAsset.safeTransfer(position.owner, recoveryAmount);
        }
        
        emit PositionLiquidated(positionId, recoveryAmount);
    }
    
    function _generateYieldForecast(uint256 positionId) internal view returns (YieldForecast memory) {
        TeleportPosition storage position = positions[positionId];
        
        // Simple yield projection based on target rate
        // In production, would use AI models and market data
        uint256 timeHorizon = position.config.teleportPeriod;
        uint256 annualizedYield = (position.principal * position.config.targetYieldRate) / BPS;
        uint256 projectedYield = (annualizedYield * timeHorizon) / 365 days;
        
        // Apply risk adjustment based on market conditions
        uint256 riskAdjustment = 9000; // 90% confidence adjustment
        projectedYield = (projectedYield * riskAdjustment) / BPS;
        
        return YieldForecast({
            projectedYield: projectedYield,
            confidence: 8500, // 85% confidence
            timeHorizon: timeHorizon,
            riskAdjustment: riskAdjustment,
            modelUsed: "Simple Linear Model"
        });
    }
    
    function _allocateToTranches(uint256 positionId) internal {
        TeleportPosition storage position = positions[positionId];
        
        // Conservative allocation for yield generation
        uint256 seniorAllocation = 7000; // 70%
        uint256 juniorAllocation = 3000; // 30%
        
        // In full implementation, would interact with tranche vault
        // TrancheVault(trancheVault).deposit(seniorAmount, juniorAmount);
    }
    
    function closePosition(uint256 positionId) external nonReentrant {
        TeleportPosition storage position = positions[positionId];
        require(position.owner == msg.sender, "Not position owner");
        require(position.status == PositionStatus.MATURED || position.status == PositionStatus.ACTIVE, "Cannot close");
        
        // If advance was taken, must be fully repaid
        if (position.advanceAmount > 0) {
            require(position.yieldRepaid >= position.futureYieldPledged, "Advance not fully repaid");
        }
        
        position.status = PositionStatus.CLOSED;
        totalPrincipalStaked -= position.principal;
        
        // Return principal plus any excess yield
        uint256 totalReturn = position.principal;
        // Add any excess yield beyond what was needed to repay advance
        
        baseAsset.safeTransfer(msg.sender, totalReturn);
    }
    
    function getPositionInfo(uint256 positionId) external view returns (
        TeleportPosition memory position,
        uint256 outstandingDebt,
        uint256 repaymentProgress,
        uint256 timeRemaining
    ) {
        position = positions[positionId];
        
        outstandingDebt = position.futureYieldPledged > position.yieldRepaid ?
            position.futureYieldPledged - position.yieldRepaid : 0;
        
        repaymentProgress = position.futureYieldPledged > 0 ?
            (position.yieldRepaid * BPS) / position.futureYieldPledged : BPS;
        
        timeRemaining = position.maturityTime > block.timestamp ?
            position.maturityTime - block.timestamp : 0;
    }
    
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    function getAdvanceHistory(uint256 positionId, uint256 limit) external view returns (YieldAdvanceEvent[] memory) {
        YieldAdvanceEvent[] storage history = advanceHistory[positionId];
        uint256 length = history.length > limit ? limit : history.length;
        
        YieldAdvanceEvent[] memory recentHistory = new YieldAdvanceEvent[](length);
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i];
        }
        
        return recentHistory;
    }
    
    function getRepaymentHistory(uint256 positionId, uint256 limit) external view returns (RepaymentEvent[] memory) {
        RepaymentEvent[] storage history = repaymentHistory[positionId];
        uint256 length = history.length > limit ? limit : history.length;
        
        RepaymentEvent[] memory recentHistory = new RepaymentEvent[](length);
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i];
        }
        
        return recentHistory;
    }
    
    function getPositionsAtRisk() external view returns (uint256[] memory) {
        uint256[] memory atRisk = new uint256[](positionCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= positionCounter; i++) {
            TeleportPosition storage position = positions[i];
            
            if (position.status == PositionStatus.ADVANCING) {
                uint256 timeElapsed = block.timestamp - position.createdAt;
                uint256 expectedProgress = (timeElapsed * BPS) / position.config.repaymentPeriod;
                uint256 actualProgress = position.futureYieldPledged > 0 ?
                    (position.yieldRepaid * BPS) / position.futureYieldPledged : 0;
                
                if (expectedProgress > actualProgress + (defaultThreshold / 2)) {
                    atRisk[count] = i;
                    count++;
                }
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = atRisk[i];
        }
        
        return result;
    }
    
    function updateRiskParameters(
        uint256 _maxTotalAdvanceRatio,
        uint256 _defaultThreshold,
        uint256 _liquidationDiscount,
        uint256 _platformFee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxTotalAdvanceRatio = _maxTotalAdvanceRatio;
        defaultThreshold = _defaultThreshold;
        liquidationDiscount = _liquidationDiscount;
        platformFee = _platformFee;
    }
}