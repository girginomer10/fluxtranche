// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./OracleManager.sol";

/**
 * @title VolTargeting
 * @dev Volatilite hedefleme sistemi - gerçekleşen vol'a göre Junior/Senior oranı otomatik ayarlama
 */
contract VolTargeting is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct VolTargetConfig {
        uint256 targetVolatilityBps;      // Hedef volatilite (BPS) - örnek: 1000 = %10
        uint256 volToleranceBps;          // Tolerans bandı (BPS) - örnek: 200 = %2
        uint256 maxJuniorRatioBps;        // Max junior oranı (BPS) - örnek: 8000 = %80
        uint256 minJuniorRatioBps;        // Min junior oranı (BPS) - örnek: 2000 = %20
        uint256 rebalanceThresholdBps;    // Rebalancing eşiği (BPS) - örnek: 500 = %5
        uint256 adjustmentSpeedBps;       // Ayarlama hızı (BPS) - örnek: 100 = %1 per adjustment
        bool isActive;                    // Sistem aktif mi?
    }
    
    struct VolState {
        uint256 realizedVolBps;           // Gerçekleşen volatilite (BPS)
        uint256 impliedVolBps;            // Implied volatilite (BPS)
        uint256 currentJuniorRatioBps;    // Mevcut junior oranı (BPS)
        uint256 targetJuniorRatioBps;     // Hedef junior oranı (BPS)
        uint256 lastUpdateTime;           // Son güncelleme zamanı
        uint256 measurementWindow;        // Ölçüm penceresi (saniye)
    }
    
    struct RebalanceAction {
        uint256 actionId;
        uint256 timestamp;
        uint256 oldJuniorRatio;
        uint256 newJuniorRatio;
        uint256 realizedVol;
        uint256 targetVol;
        int256 volDeviation;              // (realized - target) in BPS
        string reason;
        bool executed;
    }
    
    OracleManager public oracleManager;
    address public trancheVault;
    
    VolTargetConfig public config;
    VolState public currentState;
    
    uint256 public rebalanceActionCounter;
    mapping(uint256 => RebalanceAction) public rebalanceActions;
    
    // Volatilite hesaplama parametreleri
    uint256 public constant DEFAULT_MEASUREMENT_WINDOW = 7 days;  // 7 günlük pencere
    uint256 public constant MIN_MEASUREMENT_WINDOW = 1 days;      // Min 1 gün
    uint256 public constant MAX_MEASUREMENT_WINDOW = 30 days;     // Max 30 gün
    uint256 public constant BPS = 10_000;
    
    event VolTargetConfigUpdated(
        uint256 targetVolatility,
        uint256 tolerance,
        uint256 maxJuniorRatio,
        uint256 minJuniorRatio
    );
    
    event VolatilityMeasured(
        uint256 realizedVol,
        uint256 impliedVol,
        uint256 targetVol,
        int256 deviation
    );
    
    event RebalanceTriggered(
        uint256 indexed actionId,
        uint256 oldJuniorRatio,
        uint256 newJuniorRatio,
        uint256 realizedVol,
        string reason
    );
    
    event RebalanceExecuted(
        uint256 indexed actionId,
        uint256 juniorRatio,
        uint256 seniorRatio,
        bool success
    );
    
    event VolTargetSystemToggled(bool isActive);
    
    error InvalidConfiguration();
    error SystemNotActive();
    error InsufficientVolatilityData();
    error RebalanceNotNeeded();
    error ActionAlreadyExecuted();
    
    constructor(
        address _oracleManager,
        address _trancheVault,
        uint256 _targetVolatilityBps
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        oracleManager = OracleManager(_oracleManager);
        trancheVault = _trancheVault;
        
        // Varsayılan konfigürasyon: %10 hedef vol
        config = VolTargetConfig({
            targetVolatilityBps: _targetVolatilityBps,     // %10
            volToleranceBps: 200,                          // ±%2 tolerans
            maxJuniorRatioBps: 8000,                       // Max %80 junior
            minJuniorRatioBps: 2000,                       // Min %20 junior  
            rebalanceThresholdBps: 500,                    // %5 eşik
            adjustmentSpeedBps: 1000,                      // %10 ayarlama hızı
            isActive: true
        });
        
        currentState = VolState({
            realizedVolBps: 0,
            impliedVolBps: 0,
            currentJuniorRatioBps: 5000,                   // Başlangıç %50
            targetJuniorRatioBps: 5000,
            lastUpdateTime: block.timestamp,
            measurementWindow: DEFAULT_MEASUREMENT_WINDOW
        });
    }
    
    /**
     * @dev Volatilite ölç ve hedef junior oranını hesapla
     */
    function measureVolatilityAndCalculateTarget() external onlyRole(KEEPER_ROLE) returns (uint256 targetJuniorRatio) {
        if (!config.isActive) revert SystemNotActive();
        
        // Gerçekleşen volatiliteyi hesapla (mock implementation)
        uint256 realizedVol = _calculateRealizedVolatility();
        
        // Implied volatiliteyi al (mock implementation)  
        uint256 impliedVol = _getImpliedVolatility();
        
        // Ana volatilite değeri olarak realized vol kullan
        uint256 mainVol = realizedVol;
        
        // Hedef junior oranını hesapla
        targetJuniorRatio = _calculateTargetJuniorRatio(mainVol);
        
        // State'i güncelle
        currentState.realizedVolBps = realizedVol;
        currentState.impliedVolBps = impliedVol;
        currentState.targetJuniorRatioBps = targetJuniorRatio;
        currentState.lastUpdateTime = block.timestamp;
        
        int256 volDeviation = int256(mainVol) - int256(config.targetVolatilityBps);
        
        emit VolatilityMeasured(realizedVol, impliedVol, config.targetVolatilityBps, volDeviation);
        
        return targetJuniorRatio;
    }
    
    /**
     * @dev Rebalancing gerekip gerekmediğini kontrol et ve tetikle
     */
    function checkAndTriggerRebalance() external onlyRole(KEEPER_ROLE) returns (uint256 actionId) {
        if (!config.isActive) revert SystemNotActive();
        
        uint256 currentRatio = currentState.currentJuniorRatioBps;
        uint256 targetRatio = currentState.targetJuniorRatioBps;
        
        // Rebalancing gerekli mi kontrol et
        uint256 deviation = currentRatio > targetRatio ? 
            currentRatio - targetRatio : 
            targetRatio - currentRatio;
            
        if (deviation < config.rebalanceThresholdBps) {
            revert RebalanceNotNeeded();
        }
        
        // Yeni junior oranını hesapla (kademeli ayarlama)
        uint256 newJuniorRatio = _calculateAdjustedRatio(currentRatio, targetRatio);
        
        // Rebalance action oluştur
        rebalanceActionCounter++;
        actionId = rebalanceActionCounter;
        
        string memory reason = _generateRebalanceReason(currentState.realizedVolBps, config.targetVolatilityBps);
        
        rebalanceActions[actionId] = RebalanceAction({
            actionId: actionId,
            timestamp: block.timestamp,
            oldJuniorRatio: currentRatio,
            newJuniorRatio: newJuniorRatio,
            realizedVol: currentState.realizedVolBps,
            targetVol: config.targetVolatilityBps,
            volDeviation: int256(currentState.realizedVolBps) - int256(config.targetVolatilityBps),
            reason: reason,
            executed: false
        });
        
        emit RebalanceTriggered(actionId, currentRatio, newJuniorRatio, currentState.realizedVolBps, reason);
        
        return actionId;
    }
    
    /**
     * @dev Rebalance action'ını uygula
     */
    function executeRebalance(uint256 actionId) external onlyRole(KEEPER_ROLE) {
        RebalanceAction storage action = rebalanceActions[actionId];
        if (action.actionId == 0) revert ActionAlreadyExecuted();
        if (action.executed) revert ActionAlreadyExecuted();
        
        // Mock implementation - gerçek vault integration burada yapılır
        bool success = _executePortfolioRebalance(action.newJuniorRatio);
        
        if (success) {
            currentState.currentJuniorRatioBps = action.newJuniorRatio;
            action.executed = true;
            
            emit RebalanceExecuted(
                actionId,
                action.newJuniorRatio,
                BPS - action.newJuniorRatio, // Senior ratio
                success
            );
        }
    }
    
    /**
     * @dev Gerçekleşen volatiliteyi hesapla (mock implementation)
     */
    function _calculateRealizedVolatility() internal view returns (uint256) {
        // Mock calculation - gerçekte price history'den hesaplanır
        uint256 timeFactor = (block.timestamp % 86400) * BPS / 86400; // 0-100% daily cycle
        uint256 baseVol = 800; // 8% base
        uint256 variation = (timeFactor * 400) / BPS; // ±4% variation
        
        return baseVol + variation + (block.timestamp % 300); // Random component
    }
    
    /**
     * @dev Implied volatiliteyi al (mock implementation)  
     */
    function _getImpliedVolatility() internal view returns (uint256) {
        // Mock - gerçekte options market'tan alınır
        return _calculateRealizedVolatility() + 200; // IV genelde RV'den %2 yüksek
    }
    
    /**
     * @dev Hedef junior oranını hesapla
     */
    function _calculateTargetJuniorRatio(uint256 currentVolBps) internal view returns (uint256) {
        uint256 targetVol = config.targetVolatilityBps;
        uint256 tolerance = config.volToleranceBps;
        
        // Vol hedefin altındaysa junior oranını artır (daha fazla risk al)
        if (currentVolBps < targetVol - tolerance) {
            uint256 volDeficit = targetVol - currentVolBps;
            uint256 increment = (volDeficit * 2000) / targetVol; // Vol eksikliği kadar junior artır
            uint256 newRatio = currentState.currentJuniorRatioBps + increment;
            return newRatio > config.maxJuniorRatioBps ? config.maxJuniorRatioBps : newRatio;
        }
        // Vol hedefin üstündeyse junior oranını azalt (riski düşür)
        else if (currentVolBps > targetVol + tolerance) {
            uint256 volExcess = currentVolBps - targetVol;
            uint256 decrement = (volExcess * 2000) / targetVol; // Vol fazlası kadar junior azalt
            uint256 newRatio = currentState.currentJuniorRatioBps > decrement ? 
                currentState.currentJuniorRatioBps - decrement : config.minJuniorRatioBps;
            return newRatio < config.minJuniorRatioBps ? config.minJuniorRatioBps : newRatio;
        }
        
        // Tolerance bandı içindeyse mevcut oranı koru
        return currentState.currentJuniorRatioBps;
    }
    
    /**
     * @dev Kademeli ayarlama ile yeni oranı hesapla
     */
    function _calculateAdjustedRatio(uint256 currentRatio, uint256 targetRatio) internal view returns (uint256) {
        uint256 maxAdjustment = config.adjustmentSpeedBps;
        
        if (targetRatio > currentRatio) {
            uint256 increase = targetRatio - currentRatio;
            return currentRatio + (increase > maxAdjustment ? maxAdjustment : increase);
        } else {
            uint256 decrease = currentRatio - targetRatio;
            return currentRatio - (decrease > maxAdjustment ? maxAdjustment : decrease);
        }
    }
    
    /**
     * @dev Rebalance sebebini oluştur
     */
    function _generateRebalanceReason(uint256 currentVol, uint256 targetVol) internal pure returns (string memory) {
        if (currentVol > targetVol + 200) { // %2 fazla
            return "High volatility: Reducing junior allocation";
        } else if (currentVol < targetVol - 200) { // %2 eksik
            return "Low volatility: Increasing junior allocation";
        } else {
            return "Minor vol adjustment needed";
        }
    }
    
    /**
     * @dev Portfolio rebalance'ını uygula (mock implementation)
     */
    function _executePortfolioRebalance(uint256 newJuniorRatioBps) internal pure returns (bool) {
        // Mock - gerçekte TrancheVault ile integration yapılır
        // Burada token swap'leri, position adjustments vs. yapılır
        return newJuniorRatioBps >= 1000 && newJuniorRatioBps <= 9000; // %10-%90 arası kabul et
    }
    
    /**
     * @dev Mevcut volatilite durumunu getir
     */
    function getCurrentVolState() external view returns (VolState memory) {
        return currentState;
    }
    
    /**
     * @dev Rebalance action detayını getir
     */
    function getRebalanceAction(uint256 actionId) external view returns (RebalanceAction memory) {
        return rebalanceActions[actionId];
    }
    
    /**
     * @dev Son N rebalance action'ını getir
     */
    function getRecentRebalanceActions(uint256 count) external view returns (RebalanceAction[] memory actions) {
        uint256 actualCount = count;
        if (actualCount > rebalanceActionCounter) {
            actualCount = rebalanceActionCounter;
        }
        
        actions = new RebalanceAction[](actualCount);
        uint256 startId = rebalanceActionCounter + 1 - actualCount;
        
        for (uint256 i = 0; i < actualCount; i++) {
            actions[i] = rebalanceActions[startId + i];
        }
    }
    
    /**
     * @dev Vol targeting konfigürasyonunu güncelle
     */
    function updateVolTargetConfig(
        uint256 _targetVolatilityBps,
        uint256 _volToleranceBps,
        uint256 _maxJuniorRatioBps,
        uint256 _minJuniorRatioBps,
        uint256 _rebalanceThresholdBps,
        uint256 _adjustmentSpeedBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_maxJuniorRatioBps <= _minJuniorRatioBps) revert InvalidConfiguration();
        if (_targetVolatilityBps == 0 || _targetVolatilityBps > 5000) revert InvalidConfiguration(); // Max %50
        if (_maxJuniorRatioBps > BPS || _minJuniorRatioBps == 0) revert InvalidConfiguration();
        
        config.targetVolatilityBps = _targetVolatilityBps;
        config.volToleranceBps = _volToleranceBps;
        config.maxJuniorRatioBps = _maxJuniorRatioBps;
        config.minJuniorRatioBps = _minJuniorRatioBps;
        config.rebalanceThresholdBps = _rebalanceThresholdBps;
        config.adjustmentSpeedBps = _adjustmentSpeedBps;
        
        emit VolTargetConfigUpdated(_targetVolatilityBps, _volToleranceBps, _maxJuniorRatioBps, _minJuniorRatioBps);
    }
    
    /**
     * @dev Sistemi aktif/pasif yap
     */
    function toggleVolTargetSystem(bool _isActive) external onlyRole(DEFAULT_ADMIN_ROLE) {
        config.isActive = _isActive;
        emit VolTargetSystemToggled(_isActive);
    }
    
    /**
     * @dev Measurement window'u güncelle
     */
    function updateMeasurementWindow(uint256 _windowSeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_windowSeconds < MIN_MEASUREMENT_WINDOW || _windowSeconds > MAX_MEASUREMENT_WINDOW) {
            revert InvalidConfiguration();
        }
        currentState.measurementWindow = _windowSeconds;
    }
    
    /**
     * @dev Manual junior ratio ayarla (acil durum)
     */
    function emergencySetJuniorRatio(uint256 _juniorRatioBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_juniorRatioBps > config.maxJuniorRatioBps || _juniorRatioBps < config.minJuniorRatioBps) {
            revert InvalidConfiguration();
        }
        
        currentState.currentJuniorRatioBps = _juniorRatioBps;
        currentState.targetJuniorRatioBps = _juniorRatioBps;
    }
    
    /**
     * @dev Vault adresini güncelle
     */
    function setTrancheVault(address _trancheVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trancheVault = _trancheVault;
    }
}