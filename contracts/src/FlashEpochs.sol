// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./OracleManager.sol";

/**
 * @title FlashEpochs
 * @dev Adaptif epoch sistem - volatilite arttığında epoch'ları kısaltır, düştüğünde uzatır
 */
contract FlashEpochs is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct AdaptiveConfig {
        uint256 baseEpochDuration;     // Temel epoch süresi (ör. 24 saat)
        uint256 minEpochDuration;      // Min epoch süresi (ör. 1 saat) 
        uint256 maxEpochDuration;      // Max epoch süresi (ör. 72 saat)
        uint256 volThresholdLow;       // Düşük volatilite eşiği (ör. 20%)
        uint256 volThresholdHigh;      // Yüksek volatilite eşiği (ör. 60%)
        uint256 speedMultiplier;       // Hız çarpanı (1000 = %100)
    }
    
    struct VolatilityState {
        uint256 currentVol;            // Mevcut volatilite (BPS)
        uint256 historicalVol;         // Geçmiş ortalama volatilite
        uint256 lastUpdateTime;        // Son güncelleme zamanı
        uint256 volChangeRate;         // Volatilite değişim hızı
    }
    
    OracleManager public oracleManager;
    AdaptiveConfig public config;
    VolatilityState public volState;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant VOL_WINDOW = 24 hours; // Volatilite penceresi
    
    event EpochDurationUpdated(uint256 oldDuration, uint256 newDuration, uint256 currentVol);
    event VolatilitySpike(uint256 vol, uint256 threshold);
    event VolatilityCalm(uint256 vol, uint256 threshold);
    event ConfigUpdated();
    
    constructor(
        address _oracleManager,
        uint256 _baseEpochDuration,
        uint256 _minEpochDuration,
        uint256 _maxEpochDuration
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        oracleManager = OracleManager(_oracleManager);
        
        config = AdaptiveConfig({
            baseEpochDuration: _baseEpochDuration,
            minEpochDuration: _minEpochDuration,
            maxEpochDuration: _maxEpochDuration,
            volThresholdLow: 2000,      // 20%
            volThresholdHigh: 6000,     // 60%
            speedMultiplier: 1500       // 1.5x hızlandırma
        });
        
        volState.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Mevcut pazar koşullarına göre optimal epoch süresini hesaplar
     */
    function calculateOptimalDuration() external view returns (uint256) {
        uint256 currentVol = _getCurrentVolatility();
        return _calculateDurationForVolatility(currentVol);
    }
    
    /**
     * @dev Volatilite günceller ve gerekirse epoch süresini ayarlar
     */
    function updateVolatilityAndDuration() external onlyRole(KEEPER_ROLE) returns (uint256 newDuration) {
        uint256 currentVol = _getCurrentVolatility();
        uint256 oldVol = volState.currentVol;
        
        // Volatilite state güncelle
        volState.currentVol = currentVol;
        volState.lastUpdateTime = block.timestamp;
        
        // Volatilite değişim hızını hesapla
        if (oldVol > 0) {
            volState.volChangeRate = currentVol > oldVol 
                ? (currentVol - oldVol) * BPS / oldVol
                : (oldVol - currentVol) * BPS / oldVol;
        }
        
        // Yeni epoch süresini hesapla
        newDuration = _calculateDurationForVolatility(currentVol);
        
        // Event'ları emit et
        if (currentVol > config.volThresholdHigh) {
            emit VolatilitySpike(currentVol, config.volThresholdHigh);
        } else if (currentVol < config.volThresholdLow) {
            emit VolatilityCalm(currentVol, config.volThresholdLow);
        }
        
        return newDuration;
    }
    
    /**
     * @dev Volatilite durumuna göre epoch süresini hesaplar
     */
    function _calculateDurationForVolatility(uint256 vol) internal view returns (uint256) {
        if (vol >= config.volThresholdHigh) {
            // Yüksek volatilite → Epoch'ları kısalt
            uint256 reduction = (vol - config.volThresholdHigh) * config.speedMultiplier / BPS;
            uint256 adjustedDuration = config.baseEpochDuration * BPS / (BPS + reduction);
            return adjustedDuration < config.minEpochDuration 
                ? config.minEpochDuration 
                : adjustedDuration;
                
        } else if (vol <= config.volThresholdLow) {
            // Düşük volatilite → Epoch'ları uzat
            uint256 extension = (config.volThresholdLow - vol) * config.speedMultiplier / BPS;
            uint256 adjustedDuration = config.baseEpochDuration * (BPS + extension) / BPS;
            return adjustedDuration > config.maxEpochDuration 
                ? config.maxEpochDuration 
                : adjustedDuration;
                
        } else {
            // Normal volatilite → Temel süre
            return config.baseEpochDuration;
        }
    }
    
    /**
     * @dev Oracle'dan mevcut volatiliteyi alır
     */
    function _getCurrentVolatility() internal view returns (uint256) {
        // Mock implementation - gerçekte oracle'dan TWAP ve volatilite alınacak
        // Şimdilik basit bir hesaplama kullanıyoruz
        uint256 baseVol = 3000; // 30% base volatility
        uint256 timeVariation = (block.timestamp % 86400) * 2000 / 86400; // Gün içi değişim
        return baseVol + timeVariation;
    }
    
    /**
     * @dev Flash trigger - ani volatilite değişimi durumunda acil epoch değişimi
     */
    function flashTrigger() external onlyRole(KEEPER_ROLE) returns (bool shouldForceSettle) {
        uint256 currentVol = _getCurrentVolatility();
        uint256 lastVol = volState.currentVol;
        
        if (lastVol > 0) {
            uint256 volChange = currentVol > lastVol 
                ? (currentVol - lastVol) * BPS / lastVol
                : (lastVol - currentVol) * BPS / lastVol;
            
            // %50'den fazla volatilite değişimi varsa acil settle
            if (volChange > 5000) {
                emit VolatilitySpike(currentVol, lastVol);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Config güncelleme
     */
    function updateConfig(
        uint256 _baseEpochDuration,
        uint256 _minEpochDuration, 
        uint256 _maxEpochDuration,
        uint256 _volThresholdLow,
        uint256 _volThresholdHigh,
        uint256 _speedMultiplier
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        config.baseEpochDuration = _baseEpochDuration;
        config.minEpochDuration = _minEpochDuration;
        config.maxEpochDuration = _maxEpochDuration;
        config.volThresholdLow = _volThresholdLow;
        config.volThresholdHigh = _volThresholdHigh;
        config.speedMultiplier = _speedMultiplier;
        
        emit ConfigUpdated();
    }
    
    /**
     * @dev Volatilite state'i döndürür
     */
    function getVolatilityState() external view returns (
        uint256 currentVol,
        uint256 historicalVol,
        uint256 lastUpdateTime,
        uint256 volChangeRate
    ) {
        return (
            volState.currentVol,
            volState.historicalVol,
            volState.lastUpdateTime,
            volState.volChangeRate
        );
    }
    
    /**
     * @dev Adaptif config'i döndürür
     */
    function getAdaptiveConfig() external view returns (AdaptiveConfig memory) {
        return config;
    }
}