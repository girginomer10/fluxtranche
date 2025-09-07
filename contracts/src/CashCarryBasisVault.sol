// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CashCarryBasisVault
 * @dev Cash-&-Carry Basis Vault — Spot vs Future arasındaki farktan kazanç
 */
contract CashCarryBasisVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct BasisPosition {
        uint256 positionId;
        address owner;
        uint256 spotAmount; // Amount in spot market
        uint256 futureAmount; // Amount in futures market
        uint256 totalInvestment; // Total capital invested
        BasisConfig config;
        PositionStatus status;
        uint256 openTime;
        uint256 closeTime;
        uint256 targetCloseTime;
        BasisMetrics metrics;
    }
    
    struct BasisConfig {
        string underlyingAsset; // "ETH", "BTC", etc.
        uint256 leverageRatio; // BPS - leverage used (e.g., 200 = 2x)
        uint256 targetBasisBps; // Target basis in BPS
        uint256 stopLossBps; // Stop loss threshold in BPS
        uint256 takeProfitBps; // Take profit threshold in BPS
        uint256 maturityTime; // Futures contract expiry
        bool autoRoll; // Auto-roll to next contract
        uint256 maxHoldingPeriod; // Max time to hold position
        BasisStrategy strategy;
    }
    
    enum PositionStatus {
        OPEN,          // Position is open
        CONVERGING,    // Basis converging to zero
        PROFITABLE,    // Position is profitable
        STOPPED_OUT,   // Hit stop loss
        MATURED,       // Futures contract matured
        CLOSED         // Position closed
    }
    
    enum BasisStrategy {
        CLASSIC_CARRY,     // Buy spot, sell future
        REVERSE_CARRY,     // Sell spot, buy future
        CALENDAR_SPREAD,   // Different expiry dates
        VOLATILITY_CARRY,  // Basis + volatility component
        FUNDING_ARBITRAGE  // Perpetual funding rate arb
    }
    
    struct BasisMetrics {
        uint256 currentBasis; // Current basis (future - spot)
        uint256 impliedRate; // Annualized implied rate
        uint256 carryPnL; // P&L from carry trade
        uint256 spotPnL; // P&L from spot position
        uint256 futurePnL; // P&L from futures position
        uint256 totalPnL; // Total unrealized P&L
        uint256 realizedPnL; // Realized P&L on close
        uint256 fundingReceived; // Funding received (for perps)
        uint256 rollCosts; // Costs from rolling positions
    }
    
    struct MarketData {
        uint256 spotPrice;
        uint256 futurePrice;
        uint256 impliedVolatility;
        uint256 fundingRate; // For perpetual swaps
        uint256 timeToExpiry;
        uint256 riskFreeRate;
        uint256 timestamp;
    }
    
    struct CarryOpportunity {
        string asset;
        uint256 basis; // BPS
        uint256 impliedRate; // Annualized in BPS
        uint256 confidence; // Confidence level
        uint256 expectedPnL; // Expected P&L
        uint256 riskScore; // Risk assessment
        bool recommended; // AI recommendation
    }
    
    mapping(uint256 => BasisPosition) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(string => MarketData) public marketData;
    mapping(string => CarryOpportunity) public opportunities;
    
    uint256 public positionCounter;
    uint256 public totalValueLocked;
    uint256 public totalPnL;
    
    IERC20 public baseAsset;
    address public trancheVault;
    address public futuresExchange; // Mock futures exchange
    
    // Risk management
    uint256 public maxLeverage = 500; // 5x max leverage
    uint256 public maxPositionSize = 1000000 * 10**6; // $1M max per position
    uint256 public emergencyStopBasis = 500; // 5% emergency stop
    uint256 public minBasisThreshold = 50; // 0.5% minimum basis to trade
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_INVESTMENT = 10000 * 10**6; // $10k minimum
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    event PositionOpened(uint256 indexed positionId, address indexed owner, uint256 investment, uint256 targetBasis);
    event BasisUpdated(uint256 indexed positionId, uint256 newBasis, uint256 impliedRate);
    event PositionClosed(uint256 indexed positionId, uint256 realizedPnL, PositionStatus status);
    event CarryEarned(uint256 indexed positionId, uint256 carryAmount);
    event PositionRolled(uint256 indexed positionId, uint256 rollCost, uint256 newExpiry);
    event OpportunityDetected(string asset, uint256 basis, uint256 impliedRate);
    
    constructor(
        address _baseAsset,
        address _trancheVault,
        address _futuresExchange
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        baseAsset = IERC20(_baseAsset);
        trancheVault = _trancheVault;
        futuresExchange = _futuresExchange;
    }
    
    function openBasisPosition(
        uint256 investment,
        BasisConfig calldata config
    ) external returns (uint256 positionId) {
        require(investment >= MIN_INVESTMENT, "Investment too low");
        require(config.leverageRatio <= maxLeverage, "Leverage too high");
        require(investment <= maxPositionSize, "Position too large");
        require(config.maturityTime > block.timestamp, "Invalid maturity");
        
        // Check if basis opportunity exists
        string memory asset = config.underlyingAsset;
        require(_checkBasisOpportunity(asset, config.targetBasisBps), "Insufficient basis opportunity");
        
        positionCounter++;
        positionId = positionCounter;
        
        // Calculate position sizing
        uint256 leveragedAmount = (investment * config.leverageRatio) / 100;
        uint256 spotAmount = leveragedAmount / 2;
        uint256 futureAmount = leveragedAmount / 2;
        
        BasisMetrics memory metrics = BasisMetrics({
            currentBasis: config.targetBasisBps,
            impliedRate: 0,
            carryPnL: 0,
            spotPnL: 0,
            futurePnL: 0,
            totalPnL: 0,
            realizedPnL: 0,
            fundingReceived: 0,
            rollCosts: 0
        });
        
        positions[positionId] = BasisPosition({
            positionId: positionId,
            owner: msg.sender,
            spotAmount: spotAmount,
            futureAmount: futureAmount,
            totalInvestment: investment,
            config: config,
            status: PositionStatus.OPEN,
            openTime: block.timestamp,
            closeTime: 0,
            targetCloseTime: config.maturityTime,
            metrics: metrics
        });
        
        userPositions[msg.sender].push(positionId);
        totalValueLocked += investment;
        
        // Transfer investment from user
        baseAsset.safeTransferFrom(msg.sender, address(this), investment);
        
        // Execute the carry trade
        _executeBasisTrade(positionId, true); // Open position
        
        emit PositionOpened(positionId, msg.sender, investment, config.targetBasisBps);
        return positionId;
    }
    
    function _executeBasisTrade(uint256 positionId, bool isOpening) internal {
        BasisPosition storage position = positions[positionId];
        
        if (position.config.strategy == BasisStrategy.CLASSIC_CARRY) {
            if (isOpening) {
                // Buy spot, sell future
                _buySpot(position.config.underlyingAsset, position.spotAmount);
                _sellFuture(position.config.underlyingAsset, position.futureAmount, position.config.maturityTime);
            } else {
                // Sell spot, buy future to close
                _sellSpot(position.config.underlyingAsset, position.spotAmount);
                _buyFuture(position.config.underlyingAsset, position.futureAmount, position.config.maturityTime);
            }
        } else if (position.config.strategy == BasisStrategy.REVERSE_CARRY) {
            if (isOpening) {
                // Sell spot, buy future
                _sellSpot(position.config.underlyingAsset, position.spotAmount);
                _buyFuture(position.config.underlyingAsset, position.futureAmount, position.config.maturityTime);
            } else {
                // Buy spot, sell future to close
                _buySpot(position.config.underlyingAsset, position.spotAmount);
                _sellFuture(position.config.underlyingAsset, position.futureAmount, position.config.maturityTime);
            }
        }
        
        // In full implementation, would interact with actual DEX/futures exchange
    }
    
    function updateMarketData(
        string calldata asset,
        MarketData calldata data
    ) external onlyRole(ORACLE_ROLE) {
        marketData[asset] = data;
        
        // Calculate current basis
        uint256 basis = data.futurePrice > data.spotPrice ?
            ((data.futurePrice - data.spotPrice) * BPS) / data.spotPrice :
            ((data.spotPrice - data.futurePrice) * BPS) / data.spotPrice;
        
        // Update all positions for this asset
        _updatePositionsForAsset(asset, data, basis);
        
        // Check for new opportunities
        _checkForOpportunities(asset, data, basis);
    }
    
    function _updatePositionsForAsset(string memory asset, MarketData memory data, uint256 basis) internal {
        for (uint256 i = 1; i <= positionCounter; i++) {
            BasisPosition storage position = positions[i];
            
            if (keccak256(bytes(position.config.underlyingAsset)) == keccak256(bytes(asset)) &&
                position.status == PositionStatus.OPEN) {
                
                _updatePositionMetrics(i, data, basis);
                _checkPositionTriggers(i);
            }
        }
    }
    
    function _updatePositionMetrics(uint256 positionId, MarketData memory data, uint256 basis) internal {
        BasisPosition storage position = positions[positionId];
        
        // Update current basis
        position.metrics.currentBasis = basis;
        
        // Calculate implied rate
        uint256 timeToExpiry = data.timeToExpiry;
        if (timeToExpiry > 0) {
            position.metrics.impliedRate = (basis * SECONDS_PER_YEAR) / timeToExpiry;
        }
        
        // Calculate P&L components
        uint256 openBasis = position.config.targetBasisBps;
        uint256 basisChange = openBasis > basis ? openBasis - basis : basis - openBasis;
        
        if (position.config.strategy == BasisStrategy.CLASSIC_CARRY) {
            // Profit when basis narrows (futures price falls relative to spot)
            position.metrics.carryPnL = openBasis > basis ?
                (position.totalInvestment * basisChange) / BPS : 0;
        } else if (position.config.strategy == BasisStrategy.REVERSE_CARRY) {
            // Profit when basis widens
            position.metrics.carryPnL = basis > openBasis ?
                (position.totalInvestment * basisChange) / BPS : 0;
        }
        
        // Total P&L
        position.metrics.totalPnL = position.metrics.carryPnL + position.metrics.spotPnL + position.metrics.futurePnL;
        
        emit BasisUpdated(positionId, basis, position.metrics.impliedRate);
        
        if (position.metrics.carryPnL > 0) {
            emit CarryEarned(positionId, position.metrics.carryPnL);
        }
    }
    
    function _checkPositionTriggers(uint256 positionId) internal {
        BasisPosition storage position = positions[positionId];
        
        uint256 pnlBps = position.totalInvestment > 0 ?
            (position.metrics.totalPnL * BPS) / position.totalInvestment : 0;
        
        // Check take profit
        if (pnlBps >= position.config.takeProfitBps) {
            _closePosition(positionId, PositionStatus.PROFITABLE);
        }
        // Check stop loss
        else if (pnlBps <= position.config.stopLossBps) {
            _closePosition(positionId, PositionStatus.STOPPED_OUT);
        }
        // Check maturity
        else if (block.timestamp >= position.config.maturityTime) {
            if (position.config.autoRoll) {
                _rollPosition(positionId);
            } else {
                _closePosition(positionId, PositionStatus.MATURED);
            }
        }
        // Check max holding period
        else if (block.timestamp >= position.openTime + position.config.maxHoldingPeriod) {
            _closePosition(positionId, PositionStatus.MATURED);
        }
    }
    
    function _closePosition(uint256 positionId, PositionStatus status) internal {
        BasisPosition storage position = positions[positionId];
        
        position.status = status;
        position.closeTime = block.timestamp;
        position.metrics.realizedPnL = position.metrics.totalPnL;
        
        // Execute closing trades
        _executeBasisTrade(positionId, false); // Close position
        
        totalValueLocked -= position.totalInvestment;
        totalPnL += position.metrics.realizedPnL;
        
        // Calculate final payout
        uint256 finalPayout = position.totalInvestment;
        if (position.metrics.realizedPnL > 0) {
            finalPayout += position.metrics.realizedPnL;
        } else if (uint256(-position.metrics.realizedPnL) < position.totalInvestment) {
            finalPayout -= uint256(-position.metrics.realizedPnL);
        } else {
            finalPayout = 0; // Total loss
        }
        
        if (finalPayout > 0) {
            baseAsset.safeTransfer(position.owner, finalPayout);
        }
        
        emit PositionClosed(positionId, position.metrics.realizedPnL, status);
    }
    
    function _rollPosition(uint256 positionId) internal {
        BasisPosition storage position = positions[positionId];
        
        // Calculate roll cost (simplified)
        uint256 rollCost = (position.totalInvestment * 10) / BPS; // 0.1% roll cost
        position.metrics.rollCosts += rollCost;
        
        // Roll to next contract (add 30 days)
        position.config.maturityTime += 30 days;
        position.targetCloseTime = position.config.maturityTime;
        
        emit PositionRolled(positionId, rollCost, position.config.maturityTime);
    }
    
    function _checkForOpportunities(string memory asset, MarketData memory data, uint256 basis) internal {
        if (basis >= minBasisThreshold) {
            // Calculate expected P&L and risk
            uint256 timeToExpiry = data.timeToExpiry;
            uint256 impliedRate = timeToExpiry > 0 ? (basis * SECONDS_PER_YEAR) / timeToExpiry : 0;
            
            uint256 expectedPnL = (basis * 8000) / BPS; // 80% capture rate
            uint256 riskScore = _calculateRiskScore(data);
            
            opportunities[asset] = CarryOpportunity({
                asset: asset,
                basis: basis,
                impliedRate: impliedRate,
                confidence: 8500, // 85% confidence
                expectedPnL: expectedPnL,
                riskScore: riskScore,
                recommended: riskScore <= 5000 && impliedRate >= 500 // 5% min rate
            });
            
            emit OpportunityDetected(asset, basis, impliedRate);
        }
    }
    
    function _calculateRiskScore(MarketData memory data) internal pure returns (uint256) {
        // Simple risk scoring based on volatility and time to expiry
        uint256 volRisk = data.impliedVolatility > 5000 ? 8000 : 3000; // High vol = high risk
        uint256 timeRisk = data.timeToExpiry < 7 days ? 7000 : 2000; // Short expiry = high risk
        
        return (volRisk + timeRisk) / 2;
    }
    
    function _checkBasisOpportunity(string memory asset, uint256 targetBasis) internal view returns (bool) {
        MarketData memory data = marketData[asset];
        if (data.spotPrice == 0 || data.futurePrice == 0) return false;
        
        uint256 currentBasis = data.futurePrice > data.spotPrice ?
            ((data.futurePrice - data.spotPrice) * BPS) / data.spotPrice :
            ((data.spotPrice - data.futurePrice) * BPS) / data.spotPrice;
        
        return currentBasis >= targetBasis && currentBasis >= minBasisThreshold;
    }
    
    // Mock trading functions (in production, would interact with actual exchanges)
    function _buySpot(string memory asset, uint256 amount) internal pure {
        // Mock spot purchase
    }
    
    function _sellSpot(string memory asset, uint256 amount) internal pure {
        // Mock spot sale
    }
    
    function _buyFuture(string memory asset, uint256 amount, uint256 expiry) internal pure {
        // Mock futures purchase
    }
    
    function _sellFuture(string memory asset, uint256 amount, uint256 expiry) internal pure {
        // Mock futures sale
    }
    
    function manualClosePosition(uint256 positionId) external {
        BasisPosition storage position = positions[positionId];
        require(position.owner == msg.sender, "Not position owner");
        require(position.status == PositionStatus.OPEN, "Position not open");
        
        _closePosition(positionId, PositionStatus.CLOSED);
    }
    
    function getPositionInfo(uint256 positionId) external view returns (
        BasisPosition memory position,
        uint256 currentPnL,
        uint256 impliedRate,
        uint256 timeRemaining
    ) {
        position = positions[positionId];
        currentPnL = position.metrics.totalPnL;
        impliedRate = position.metrics.impliedRate;
        timeRemaining = position.targetCloseTime > block.timestamp ?
            position.targetCloseTime - block.timestamp : 0;
    }
    
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    function getOpportunities() external view returns (CarryOpportunity[] memory) {
        // Return all current opportunities
        // In a real implementation, would track active opportunities dynamically
        CarryOpportunity[] memory result = new CarryOpportunity[](0);
        return result;
    }
    
    function emergencyCloseAll() external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 1; i <= positionCounter; i++) {
            if (positions[i].status == PositionStatus.OPEN) {
                _closePosition(i, PositionStatus.CLOSED);
            }
        }
    }
}