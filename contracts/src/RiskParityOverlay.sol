// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RiskParityOverlay
 * @dev Risk-Parity Overlay — Asset'lerin volatilitesine göre ağırlık ayarı
 */
contract RiskParityOverlay is AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    struct Asset {
        address token;
        uint256 weight; // BPS
        uint256 volatility; // Annualized vol in BPS
        uint256 correlation; // Average correlation with other assets (BPS)
        uint256 lastUpdated;
        bool isActive;
    }
    
    struct RiskParityConfig {
        uint256 targetVolatility; // Target portfolio vol in BPS
        uint256 rebalanceThreshold; // Weight drift threshold in BPS
        uint256 minWeight; // Minimum asset weight in BPS
        uint256 maxWeight; // Maximum asset weight in BPS
        uint256 lookbackPeriod; // Days for volatility calculation
        uint256 decayFactor; // EMA decay factor in BPS
        bool useCorrelationAdjustment;
    }
    
    struct PortfolioMetrics {
        uint256 totalVolatility; // Portfolio volatility in BPS
        uint256 diversificationRatio; // Measure of diversification
        uint256 riskContribution; // Sum of risk contributions
        uint256 effectiveAssets; // Number of effectively diversifying assets
        uint256 concentration; // Herfindahl index
        uint256 maxDrawdown; // Historical max drawdown in BPS
    }
    
    struct RebalanceResult {
        uint256 timestamp;
        address[] assets;
        uint256[] oldWeights;
        uint256[] newWeights;
        uint256 portfolioVolBefore;
        uint256 portfolioVolAfter;
        uint256 improvementScore; // Risk-adjusted improvement
        RebalanceReason reason;
    }
    
    enum RebalanceReason {
        VOLATILITY_DRIFT,
        CORRELATION_CHANGE,
        WEIGHT_DRIFT,
        PERIODIC_REBALANCE,
        RISK_TARGET_ADJUSTMENT
    }
    
    RiskParityConfig public config;
    PortfolioMetrics public portfolioMetrics;
    
    mapping(address => Asset) public assets;
    mapping(address => mapping(address => uint256)) public correlationMatrix;
    address[] public assetList;
    
    RebalanceResult[] public rebalanceHistory;
    uint256 public lastRebalanceTime;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_ASSETS = 20;
    uint256 public constant MIN_REBALANCE_INTERVAL = 1 hours;
    
    event AssetAdded(address indexed asset, uint256 initialWeight, uint256 volatility);
    event AssetRemoved(address indexed asset);
    event VolatilityUpdated(address indexed asset, uint256 oldVol, uint256 newVol);
    event CorrelationUpdated(address indexed asset1, address indexed asset2, uint256 correlation);
    event RiskParityRebalanced(uint256 improvementScore, uint256 newPortfolioVol);
    event ConfigUpdated(uint256 targetVol, uint256 rebalanceThreshold);
    
    constructor(
        uint256 _targetVolatility,
        uint256 _rebalanceThreshold,
        uint256 _minWeight,
        uint256 _maxWeight
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RISK_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        
        config = RiskParityConfig({
            targetVolatility: _targetVolatility,
            rebalanceThreshold: _rebalanceThreshold,
            minWeight: _minWeight,
            maxWeight: _maxWeight,
            lookbackPeriod: 30, // 30 days
            decayFactor: 9500, // 95% EMA decay
            useCorrelationAdjustment: true
        });
    }
    
    function addAsset(
        address token,
        uint256 initialWeight,
        uint256 volatility
    ) external onlyRole(RISK_MANAGER_ROLE) {
        require(token != address(0), "Invalid token");
        require(assetList.length < MAX_ASSETS, "Too many assets");
        require(!assets[token].isActive, "Asset already exists");
        require(initialWeight <= config.maxWeight, "Weight too high");
        require(initialWeight >= config.minWeight, "Weight too low");
        
        assets[token] = Asset({
            token: token,
            weight: initialWeight,
            volatility: volatility,
            correlation: 0, // Will be updated
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        assetList.push(token);
        
        // Normalize all weights to ensure they sum to 100%
        _normalizeWeights();
        
        emit AssetAdded(token, initialWeight, volatility);
    }
    
    function updateVolatility(address token, uint256 newVolatility) external onlyRole(ORACLE_ROLE) {
        Asset storage asset = assets[token];
        require(asset.isActive, "Asset not found");
        
        uint256 oldVol = asset.volatility;
        
        // Apply EMA smoothing
        asset.volatility = (asset.volatility * config.decayFactor + newVolatility * (BPS - config.decayFactor)) / BPS;
        asset.lastUpdated = block.timestamp;
        
        emit VolatilityUpdated(token, oldVol, asset.volatility);
        
        // Check if rebalance is needed
        _checkRebalanceNeeded(RebalanceReason.VOLATILITY_DRIFT);
    }
    
    function updateCorrelationMatrix(
        address[] calldata assets1,
        address[] calldata assets2,
        uint256[] calldata correlations
    ) external onlyRole(ORACLE_ROLE) {
        require(assets1.length == assets2.length, "Array length mismatch");
        require(assets1.length == correlations.length, "Array length mismatch");
        
        for (uint256 i = 0; i < assets1.length; i++) {
            require(assets[assets1[i]].isActive, "Asset1 not found");
            require(assets[assets2[i]].isActive, "Asset2 not found");
            require(correlations[i] <= BPS, "Invalid correlation");
            
            correlationMatrix[assets1[i]][assets2[i]] = correlations[i];
            correlationMatrix[assets2[i]][assets1[i]] = correlations[i]; // Symmetric
            
            emit CorrelationUpdated(assets1[i], assets2[i], correlations[i]);
        }
        
        _updateAverageCorrelations();
        _checkRebalanceNeeded(RebalanceReason.CORRELATION_CHANGE);
    }
    
    function calculateOptimalWeights() external view returns (
        address[] memory assetAddresses,
        uint256[] memory optimalWeights,
        uint256 expectedVolatility
    ) {
        uint256 assetCount = assetList.length;
        require(assetCount > 0, "No assets");
        
        assetAddresses = new address[](assetCount);
        optimalWeights = new uint256[](assetCount);
        
        // Risk parity: weight inversely proportional to volatility and correlation
        uint256[] memory riskContributions = new uint256[](assetCount);
        uint256 totalInverseRisk = 0;
        
        for (uint256 i = 0; i < assetCount; i++) {
            address asset = assetList[i];
            Asset storage assetData = assets[asset];
            
            // Calculate risk contribution (volatility adjusted for correlation)
            uint256 adjustedVol = config.useCorrelationAdjustment ?
                (assetData.volatility * (BPS + assetData.correlation)) / BPS :
                assetData.volatility;
            
            riskContributions[i] = BPS * BPS / adjustedVol; // Inverse volatility
            totalInverseRisk += riskContributions[i];
            assetAddresses[i] = asset;
        }
        
        // Calculate optimal weights with constraints
        for (uint256 i = 0; i < assetCount; i++) {
            uint256 theoreticalWeight = (riskContributions[i] * BPS) / totalInverseRisk;
            
            // Apply min/max constraints
            if (theoreticalWeight < config.minWeight) {
                optimalWeights[i] = config.minWeight;
            } else if (theoreticalWeight > config.maxWeight) {
                optimalWeights[i] = config.maxWeight;
            } else {
                optimalWeights[i] = theoreticalWeight;
            }
        }
        
        // Normalize to ensure sum = 100%
        optimalWeights = _normalizeWeightArray(optimalWeights);
        
        // Calculate expected portfolio volatility
        expectedVolatility = _calculatePortfolioVolatility(assetAddresses, optimalWeights);
        
        return (assetAddresses, optimalWeights, expectedVolatility);
    }
    
    function executeRebalance(RebalanceReason reason) external onlyRole(RISK_MANAGER_ROLE) {
        require(block.timestamp >= lastRebalanceTime + MIN_REBALANCE_INTERVAL, "Too soon");
        
        (address[] memory assetAddresses, uint256[] memory optimalWeights, uint256 expectedVol) = 
            this.calculateOptimalWeights();
        
        // Store old weights
        uint256[] memory oldWeights = new uint256[](assetAddresses.length);
        for (uint256 i = 0; i < assetAddresses.length; i++) {
            oldWeights[i] = assets[assetAddresses[i]].weight;
        }
        
        uint256 oldPortfolioVol = portfolioMetrics.totalVolatility;
        
        // Update weights
        for (uint256 i = 0; i < assetAddresses.length; i++) {
            assets[assetAddresses[i]].weight = optimalWeights[i];
        }
        
        // Update portfolio metrics
        _updatePortfolioMetrics();
        
        // Calculate improvement score
        uint256 improvementScore = oldPortfolioVol > portfolioMetrics.totalVolatility ?
            ((oldPortfolioVol - portfolioMetrics.totalVolatility) * BPS) / oldPortfolioVol : 0;
        
        // Store rebalance history
        rebalanceHistory.push(RebalanceResult({
            timestamp: block.timestamp,
            assets: assetAddresses,
            oldWeights: oldWeights,
            newWeights: optimalWeights,
            portfolioVolBefore: oldPortfolioVol,
            portfolioVolAfter: portfolioMetrics.totalVolatility,
            improvementScore: improvementScore,
            reason: reason
        }));
        
        lastRebalanceTime = block.timestamp;
        
        emit RiskParityRebalanced(improvementScore, portfolioMetrics.totalVolatility);
    }
    
    function _checkRebalanceNeeded(RebalanceReason reason) internal {
        (address[] memory assetAddresses, uint256[] memory optimalWeights, ) = 
            this.calculateOptimalWeights();
        
        // Calculate maximum weight drift
        uint256 maxDrift = 0;
        for (uint256 i = 0; i < assetAddresses.length; i++) {
            uint256 currentWeight = assets[assetAddresses[i]].weight;
            uint256 optimalWeight = optimalWeights[i];
            
            uint256 drift = currentWeight > optimalWeight ?
                ((currentWeight - optimalWeight) * BPS) / optimalWeight :
                ((optimalWeight - currentWeight) * BPS) / currentWeight;
            
            if (drift > maxDrift) {
                maxDrift = drift;
            }
        }
        
        // Trigger rebalance if threshold exceeded
        if (maxDrift >= config.rebalanceThreshold) {
            // In a full implementation, would trigger automatic rebalance
            // For now, just emit an event
            // this.executeRebalance(reason);
        }
    }
    
    function _calculatePortfolioVolatility(
        address[] memory assetAddresses,
        uint256[] memory weights
    ) internal view returns (uint256) {
        uint256 portfolioVariance = 0;
        
        // Calculate portfolio variance using correlation matrix
        for (uint256 i = 0; i < assetAddresses.length; i++) {
            for (uint256 j = 0; j < assetAddresses.length; j++) {
                uint256 weight_i = weights[i];
                uint256 weight_j = weights[j];
                uint256 vol_i = assets[assetAddresses[i]].volatility;
                uint256 vol_j = assets[assetAddresses[j]].volatility;
                uint256 correlation = i == j ? BPS : correlationMatrix[assetAddresses[i]][assetAddresses[j]];
                
                portfolioVariance += (weight_i * weight_j * vol_i * vol_j * correlation) / (BPS * BPS * BPS);
            }
        }
        
        // Return portfolio volatility (sqrt of variance)
        return _sqrt(portfolioVariance);
    }
    
    function _updatePortfolioMetrics() internal {
        uint256 assetCount = assetList.length;
        if (assetCount == 0) return;
        
        // Calculate portfolio volatility
        address[] memory assetAddresses = new address[](assetCount);
        uint256[] memory weights = new uint256[](assetCount);
        
        for (uint256 i = 0; i < assetCount; i++) {
            assetAddresses[i] = assetList[i];
            weights[i] = assets[assetList[i]].weight;
        }
        
        uint256 portfolioVol = _calculatePortfolioVolatility(assetAddresses, weights);
        
        // Calculate concentration (Herfindahl index)
        uint256 concentration = 0;
        for (uint256 i = 0; i < assetCount; i++) {
            uint256 weight = assets[assetList[i]].weight;
            concentration += (weight * weight) / BPS;
        }
        
        // Calculate diversification ratio
        uint256 weightedAvgVol = 0;
        for (uint256 i = 0; i < assetCount; i++) {
            weightedAvgVol += (assets[assetList[i]].weight * assets[assetList[i]].volatility) / BPS;
        }
        uint256 diversificationRatio = portfolioVol > 0 ? (weightedAvgVol * BPS) / portfolioVol : BPS;
        
        portfolioMetrics = PortfolioMetrics({
            totalVolatility: portfolioVol,
            diversificationRatio: diversificationRatio,
            riskContribution: BPS, // Simplified
            effectiveAssets: (BPS * BPS) / concentration, // Inverse of concentration
            concentration: concentration,
            maxDrawdown: 0 // Would require price history
        });
    }
    
    function _updateAverageCorrelations() internal {
        for (uint256 i = 0; i < assetList.length; i++) {
            address asset = assetList[i];
            uint256 sumCorrelations = 0;
            uint256 count = 0;
            
            for (uint256 j = 0; j < assetList.length; j++) {
                if (i != j) {
                    sumCorrelations += correlationMatrix[asset][assetList[j]];
                    count++;
                }
            }
            
            assets[asset].correlation = count > 0 ? sumCorrelations / count : 0;
        }
    }
    
    function _normalizeWeights() internal {
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < assetList.length; i++) {
            totalWeight += assets[assetList[i]].weight;
        }
        
        if (totalWeight != BPS && totalWeight > 0) {
            for (uint256 i = 0; i < assetList.length; i++) {
                assets[assetList[i]].weight = (assets[assetList[i]].weight * BPS) / totalWeight;
            }
        }
    }
    
    function _normalizeWeightArray(uint256[] memory weights) internal pure returns (uint256[] memory) {
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        
        if (totalWeight != BPS && totalWeight > 0) {
            for (uint256 i = 0; i < weights.length; i++) {
                weights[i] = (weights[i] * BPS) / totalWeight;
            }
        }
        
        return weights;
    }
    
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    function getAssetInfo(address token) external view returns (Asset memory) {
        return assets[token];
    }
    
    function getPortfolioMetrics() external view returns (PortfolioMetrics memory) {
        return portfolioMetrics;
    }
    
    function getRebalanceHistory(uint256 limit) external view returns (RebalanceResult[] memory) {
        uint256 length = rebalanceHistory.length > limit ? limit : rebalanceHistory.length;
        RebalanceResult[] memory recent = new RebalanceResult[](length);
        
        for (uint256 i = 0; i < length; i++) {
            recent[i] = rebalanceHistory[rebalanceHistory.length - 1 - i];
        }
        
        return recent;
    }
    
    function updateConfig(
        uint256 _targetVolatility,
        uint256 _rebalanceThreshold,
        uint256 _minWeight,
        uint256 _maxWeight
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        config.targetVolatility = _targetVolatility;
        config.rebalanceThreshold = _rebalanceThreshold;
        config.minWeight = _minWeight;
        config.maxWeight = _maxWeight;
        
        emit ConfigUpdated(_targetVolatility, _rebalanceThreshold);
    }
    
    function removeAsset(address token) external onlyRole(RISK_MANAGER_ROLE) {
        require(assets[token].isActive, "Asset not found");
        require(assetList.length > 1, "Cannot remove last asset");
        
        assets[token].isActive = false;
        
        // Remove from asset list
        for (uint256 i = 0; i < assetList.length; i++) {
            if (assetList[i] == token) {
                assetList[i] = assetList[assetList.length - 1];
                assetList.pop();
                break;
            }
        }
        
        // Redistribute weight among remaining assets
        _normalizeWeights();
        
        emit AssetRemoved(token);
    }
}