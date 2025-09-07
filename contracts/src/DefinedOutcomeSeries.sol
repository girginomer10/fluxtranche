// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DefinedOutcomeSeries
 * @dev Defined-Outcome Series — +%X ile -%Y arasında garanti getiri
 */
contract DefinedOutcomeSeries is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant SERIES_MANAGER_ROLE = keccak256("SERIES_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct OutcomeSeries {
        uint256 seriesId;
        address owner;
        uint256 principal; // Initial investment
        uint256 currentValue; // Current estimated value
        SeriesConfig config;
        SeriesStatus status;
        uint256 createdAt;
        uint256 maturityTime;
        uint256 lastUpdateTime;
        OutcomeResult finalResult;
    }
    
    struct SeriesConfig {
        uint256 upperBound; // Max return in BPS (e.g., 2000 = 20%)
        uint256 lowerBound; // Max loss in BPS (e.g., 1500 = -15%)  
        uint256 duration; // Duration in seconds
        string underlyingAsset; // "ETH", "BTC", "SPY", etc.
        OutcomeType outcomeType;
        uint256 participationRate; // BPS - how much of upside to capture
        uint256 bufferLevel; // BPS - protection level
        bool knockOutFeature; // Can be knocked out early
        uint256 knockOutBarrier; // BPS - knock-out level if enabled
    }
    
    enum SeriesStatus {
        ACTIVE,        // Series is active
        MATURED,       // Reached maturity, calculating outcome
        SETTLED,       // Final payout calculated
        PAID_OUT,      // Payout completed
        KNOCKED_OUT,   // Knocked out early
        CANCELLED      // Cancelled before maturity
    }
    
    enum OutcomeType {
        RANGE_ACCRUAL,     // Accrues return when in range
        DIGITAL_BARRIER,   // Binary payout based on barrier
        AUTOCALLABLE,      // Callable at various levels
        LOOKBACK,          // Based on best/worst performance
        ASIAN,             // Based on average performance
        CLIQUET            // Lock in gains periodically
    }
    
    struct OutcomeResult {
        uint256 finalPrice; // Final underlying price (BPS relative to start)
        uint256 payoutAmount; // Final payout amount
        uint256 returnRate; // Return rate in BPS
        bool upperBoundHit; // Did we hit the upper bound
        bool lowerBoundHit; // Did we hit the lower bound
        uint256 settlementTime; // When the outcome was determined
        string settlementReason; // Why this outcome occurred
    }
    
    struct PriceObservation {
        uint256 timestamp;
        uint256 price; // Price in BPS relative to initial (10000 = 100%, no change)
        bool inRange; // Is price within defined bounds
        uint256 accruedReturn; // Return accrued up to this point
    }
    
    struct SeriesTemplate {
        string name;
        OutcomeType outcomeType;
        uint256 upperBound;
        uint256 lowerBound;
        uint256 participationRate;
        uint256 duration;
        uint256 minInvestment;
        string description;
    }
    
    mapping(uint256 => OutcomeSeries) public series;
    mapping(address => uint256[]) public userSeries;
    mapping(uint256 => PriceObservation[]) public priceHistory;
    mapping(string => uint256) public currentPrices; // asset name -> price
    
    SeriesTemplate[] public templates;
    uint256 public seriesCounter;
    uint256 public totalValueLocked;
    
    IERC20 public baseAsset;
    address public trancheVault;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_INVESTMENT = 1000 * 10**6; // $1000 minimum
    uint256 public constant MAX_UPPER_BOUND = 10000; // 100% max gain
    uint256 public constant MAX_LOWER_BOUND = 5000; // 50% max loss
    uint256 public constant MIN_DURATION = 7 days;
    uint256 public constant MAX_DURATION = 365 days;
    
    event SeriesCreated(uint256 indexed seriesId, address indexed owner, uint256 principal, OutcomeType outcomeType);
    event PriceObserved(uint256 indexed seriesId, uint256 price, bool inRange, uint256 accruedReturn);
    event SeriesMatured(uint256 indexed seriesId, uint256 finalPrice, uint256 payoutAmount);
    event SeriesKnockedOut(uint256 indexed seriesId, uint256 knockOutPrice, uint256 earlyPayout);
    event PayoutExecuted(uint256 indexed seriesId, uint256 amount);
    event ReturnAccrued(uint256 indexed seriesId, uint256 newAccrual, uint256 totalAccrual);
    
    constructor(address _baseAsset, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SERIES_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        baseAsset = IERC20(_baseAsset);
        trancheVault = _trancheVault;
        
        _initializeTemplates();
    }
    
    function createSeries(
        uint256 investment,
        uint256 upperBound,
        uint256 lowerBound,
        uint256 durationDays,
        string calldata underlyingAsset,
        OutcomeType outcomeType,
        uint256 participationRate
    ) public returns (uint256 seriesId) {
        require(investment >= MIN_INVESTMENT, "Investment too low");
        require(upperBound <= MAX_UPPER_BOUND, "Upper bound too high");
        require(lowerBound <= MAX_LOWER_BOUND, "Lower bound too high");
        require(durationDays >= MIN_DURATION / 1 days, "Duration too short");
        require(durationDays <= MAX_DURATION / 1 days, "Duration too long");
        require(participationRate <= BPS, "Invalid participation rate");
        
        seriesCounter++;
        seriesId = seriesCounter;
        
        uint256 duration = durationDays * 1 days;
        uint256 maturityTime = block.timestamp + duration;
        
        SeriesConfig memory config = SeriesConfig({
            upperBound: upperBound,
            lowerBound: lowerBound,
            duration: duration,
            underlyingAsset: underlyingAsset,
            outcomeType: outcomeType,
            participationRate: participationRate,
            bufferLevel: lowerBound,
            knockOutFeature: false,
            knockOutBarrier: 0
        });
        
        series[seriesId] = OutcomeSeries({
            seriesId: seriesId,
            owner: msg.sender,
            principal: investment,
            currentValue: investment,
            config: config,
            status: SeriesStatus.ACTIVE,
            createdAt: block.timestamp,
            maturityTime: maturityTime,
            lastUpdateTime: block.timestamp,
            finalResult: OutcomeResult(0, 0, 0, false, false, 0, "")
        });
        
        userSeries[msg.sender].push(seriesId);
        totalValueLocked += investment;
        
        // Transfer investment from user
        baseAsset.safeTransferFrom(msg.sender, address(this), investment);
        
        // Initial allocation based on outcome type
        _allocateToTranches(seriesId);
        
        emit SeriesCreated(seriesId, msg.sender, investment, outcomeType);
        return seriesId;
    }
    
    function createSeriesFromTemplate(
        uint256 templateId,
        uint256 investment,
        string calldata underlyingAsset
    ) external returns (uint256 seriesId) {
        require(templateId < templates.length, "Invalid template");
        require(investment >= templates[templateId].minInvestment, "Investment too low");
        
        SeriesTemplate memory template = templates[templateId];
        
        return createSeries(
            investment,
            template.upperBound,
            template.lowerBound,
            template.duration / 1 days,
            underlyingAsset,
            template.outcomeType,
            template.participationRate
        );
    }
    
    function updatePrice(string calldata asset, uint256 price) external onlyRole(ORACLE_ROLE) {
        currentPrices[asset] = price;
        
        // Check all active series for this asset
        for (uint256 i = 1; i <= seriesCounter; i++) {
            OutcomeSeries storage s = series[i];
            
            if (s.status == SeriesStatus.ACTIVE && 
                keccak256(bytes(s.config.underlyingAsset)) == keccak256(bytes(asset))) {
                _processSeriesUpdate(i, price);
            }
        }
    }
    
    function _processSeriesUpdate(uint256 seriesId, uint256 currentPrice) internal {
        OutcomeSeries storage s = series[seriesId];
        
        // Calculate return relative to initial price (assuming started at 10000 BPS = 100%)
        uint256 initialPrice = 10000; // Base price
        uint256 returnBps = currentPrice > initialPrice ? 
            ((currentPrice - initialPrice) * BPS) / initialPrice :
            ((initialPrice - currentPrice) * BPS) / initialPrice;
        
        bool inRange = true;
        uint256 accruedReturn = 0;
        
        // Calculate outcome based on series type
        if (s.config.outcomeType == OutcomeType.RANGE_ACCRUAL) {
            // Accrue return only when in range
            inRange = (returnBps <= s.config.upperBound && returnBps <= s.config.lowerBound);
            if (inRange) {
                uint256 timeElapsed = block.timestamp - s.lastUpdateTime;
                uint256 dailyAccrual = (s.config.upperBound * timeElapsed) / (365 days);
                accruedReturn = dailyAccrual;
            }
        } else if (s.config.outcomeType == OutcomeType.DIGITAL_BARRIER) {
            // Binary payout at maturity
            inRange = (returnBps >= s.config.lowerBound);
            accruedReturn = inRange ? s.config.upperBound : 0;
        } else if (s.config.outcomeType == OutcomeType.LOOKBACK) {
            // Track best performance
            accruedReturn = returnBps > 0 ? 
                (returnBps * s.config.participationRate) / BPS : 0;
        }
        
        // Record observation
        priceHistory[seriesId].push(PriceObservation({
            timestamp: block.timestamp,
            price: currentPrice,
            inRange: inRange,
            accruedReturn: accruedReturn
        }));
        
        // Update current value
        if (accruedReturn > 0) {
            s.currentValue = s.principal + (s.principal * accruedReturn / BPS);
            emit ReturnAccrued(seriesId, accruedReturn, accruedReturn);
        }
        
        s.lastUpdateTime = block.timestamp;
        
        emit PriceObserved(seriesId, currentPrice, inRange, accruedReturn);
        
        // Check for knock-out
        if (s.config.knockOutFeature && returnBps >= s.config.knockOutBarrier) {
            _knockOutSeries(seriesId, currentPrice);
        }
        
        // Check for maturity
        if (block.timestamp >= s.maturityTime) {
            _matureSeries(seriesId, currentPrice);
        }
    }
    
    function _matureSeries(uint256 seriesId, uint256 finalPrice) internal {
        OutcomeSeries storage s = series[seriesId];
        
        s.status = SeriesStatus.MATURED;
        
        uint256 finalPayout = _calculateFinalPayout(seriesId, finalPrice);
        
        s.finalResult = OutcomeResult({
            finalPrice: finalPrice,
            payoutAmount: finalPayout,
            returnRate: finalPayout > s.principal ? 
                ((finalPayout - s.principal) * BPS) / s.principal : 0,
            upperBoundHit: finalPayout >= s.principal + (s.principal * s.config.upperBound / BPS),
            lowerBoundHit: finalPayout <= s.principal - (s.principal * s.config.lowerBound / BPS),
            settlementTime: block.timestamp,
            settlementReason: "Maturity reached"
        });
        
        s.currentValue = finalPayout;
        s.status = SeriesStatus.SETTLED;
        
        emit SeriesMatured(seriesId, finalPrice, finalPayout);
        
        // Auto-execute payout
        _executePayout(seriesId);
    }
    
    function _knockOutSeries(uint256 seriesId, uint256 knockOutPrice) internal {
        OutcomeSeries storage s = series[seriesId];
        
        s.status = SeriesStatus.KNOCKED_OUT;
        
        // Early payout calculation (typically favorable)
        uint256 earlyPayout = s.principal + (s.principal * s.config.upperBound / BPS);
        
        s.finalResult = OutcomeResult({
            finalPrice: knockOutPrice,
            payoutAmount: earlyPayout,
            returnRate: (earlyPayout - s.principal) * BPS / s.principal,
            upperBoundHit: true,
            lowerBoundHit: false,
            settlementTime: block.timestamp,
            settlementReason: "Knocked out early"
        });
        
        s.currentValue = earlyPayout;
        
        emit SeriesKnockedOut(seriesId, knockOutPrice, earlyPayout);
        
        // Auto-execute payout
        _executePayout(seriesId);
    }
    
    function _calculateFinalPayout(uint256 seriesId, uint256 finalPrice) internal view returns (uint256) {
        OutcomeSeries storage s = series[seriesId];
        
        // Calculate total accrued return based on series type
        uint256 totalAccrual = 0;
        PriceObservation[] storage history = priceHistory[seriesId];
        
        if (s.config.outcomeType == OutcomeType.RANGE_ACCRUAL) {
            // Sum all accruals when in range
            for (uint256 i = 0; i < history.length; i++) {
                if (history[i].inRange) {
                    totalAccrual += history[i].accruedReturn;
                }
            }
        } else if (s.config.outcomeType == OutcomeType.DIGITAL_BARRIER) {
            // Digital payout
            uint256 initialPrice = 10000;
            uint256 finalReturn = finalPrice > initialPrice ? 
                ((finalPrice - initialPrice) * BPS) / initialPrice : 0;
            
            totalAccrual = finalReturn >= s.config.lowerBound ? s.config.upperBound : 0;
        } else if (s.config.outcomeType == OutcomeType.LOOKBACK) {
            // Best performance during period
            uint256 bestPerformance = 0;
            for (uint256 i = 0; i < history.length; i++) {
                if (history[i].accruedReturn > bestPerformance) {
                    bestPerformance = history[i].accruedReturn;
                }
            }
            totalAccrual = bestPerformance;
        }
        
        // Apply upper and lower bounds
        if (totalAccrual > s.config.upperBound) {
            totalAccrual = s.config.upperBound;
        }
        
        uint256 payout = s.principal + (s.principal * totalAccrual / BPS);
        
        // Apply lower bound protection
        uint256 minPayout = s.principal - (s.principal * s.config.lowerBound / BPS);
        if (payout < minPayout) {
            payout = minPayout;
        }
        
        return payout;
    }
    
    function _executePayout(uint256 seriesId) internal {
        OutcomeSeries storage s = series[seriesId];
        require(s.status == SeriesStatus.SETTLED || s.status == SeriesStatus.KNOCKED_OUT, "Not ready for payout");
        
        uint256 payoutAmount = s.currentValue;
        
        s.status = SeriesStatus.PAID_OUT;
        totalValueLocked -= s.principal;
        
        // Transfer payout to owner
        baseAsset.safeTransfer(s.owner, payoutAmount);
        
        emit PayoutExecuted(seriesId, payoutAmount);
    }
    
    function _allocateToTranches(uint256 seriesId) internal {
        OutcomeSeries storage s = series[seriesId];
        
        // Allocation strategy based on outcome type
        uint256 seniorAllocation;
        uint256 juniorAllocation;
        
        if (s.config.outcomeType == OutcomeType.DIGITAL_BARRIER) {
            // More conservative for binary outcomes
            seniorAllocation = 8000; // 80%
            juniorAllocation = 2000; // 20%
        } else if (s.config.outcomeType == OutcomeType.RANGE_ACCRUAL) {
            // Balanced for range accrual
            seniorAllocation = 6000; // 60%
            juniorAllocation = 4000; // 40%
        } else {
            // Default allocation
            seniorAllocation = 7000; // 70%
            juniorAllocation = 3000; // 30%
        }
        
        // In full implementation, would interact with tranche vault
        // TrancheVault(trancheVault).deposit(seniorAmount, juniorAmount);
    }
    
    function _initializeTemplates() internal {
        // Conservative Range Template
        templates.push(SeriesTemplate({
            name: "Conservative Range",
            outcomeType: OutcomeType.RANGE_ACCRUAL,
            upperBound: 800, // 8% max gain
            lowerBound: 300, // 3% max loss
            participationRate: 8000, // 80% participation
            duration: 90 days,
            minInvestment: MIN_INVESTMENT,
            description: "Steady accrual when underlying stays in range"
        }));
        
        // Digital Barrier Template
        templates.push(SeriesTemplate({
            name: "Digital Protection",
            outcomeType: OutcomeType.DIGITAL_BARRIER,
            upperBound: 1500, // 15% max gain
            lowerBound: 1000, // 10% max loss
            participationRate: 10000, // 100% participation
            duration: 180 days,
            minInvestment: MIN_INVESTMENT,
            description: "Full upside if barrier not breached"
        }));
        
        // Lookback Template
        templates.push(SeriesTemplate({
            name: "Best Performance",
            outcomeType: OutcomeType.LOOKBACK,
            upperBound: 2000, // 20% max gain
            lowerBound: 500, // 5% max loss
            participationRate: 7500, // 75% participation
            duration: 365 days,
            minInvestment: MIN_INVESTMENT,
            description: "Capture best performance during period"
        }));
    }
    
    function getSeriesInfo(uint256 seriesId) external view returns (
        OutcomeSeries memory seriesData,
        uint256 timeToMaturity,
        uint256 unrealizedReturn,
        uint256 probabilityInRange
    ) {
        seriesData = series[seriesId];
        
        timeToMaturity = seriesData.maturityTime > block.timestamp ?
            seriesData.maturityTime - block.timestamp : 0;
        
        unrealizedReturn = seriesData.currentValue > seriesData.principal ?
            ((seriesData.currentValue - seriesData.principal) * BPS) / seriesData.principal : 0;
        
        // Simple probability calculation (would be more sophisticated in production)
        probabilityInRange = 5000; // 50% default
    }
    
    function getUserSeries(address user) external view returns (uint256[] memory) {
        return userSeries[user];
    }
    
    function getPriceHistory(uint256 seriesId, uint256 limit) external view returns (PriceObservation[] memory) {
        PriceObservation[] storage history = priceHistory[seriesId];
        uint256 length = history.length > limit ? limit : history.length;
        
        PriceObservation[] memory recentHistory = new PriceObservation[](length);
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i]; // Latest first
        }
        
        return recentHistory;
    }
    
    function getTemplates() external view returns (SeriesTemplate[] memory) {
        return templates;
    }
    
    function addTemplate(
        string calldata name,
        OutcomeType outcomeType,
        uint256 upperBound,
        uint256 lowerBound,
        uint256 participationRate,
        uint256 duration,
        uint256 minInvestment,
        string calldata description
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        templates.push(SeriesTemplate({
            name: name,
            outcomeType: outcomeType,
            upperBound: upperBound,
            lowerBound: lowerBound,
            participationRate: participationRate,
            duration: duration,
            minInvestment: minInvestment,
            description: description
        }));
    }
}