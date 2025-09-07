// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./OracleManager.sol";

/**
 * @title KineticFees
 * @dev Dinamik ücret sistemi - volatilite, volume ve risk durumuna göre ücretleri ayarlar
 */
contract KineticFees is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct FeeStructure {
        uint256 managementFeeBaseBps;     // Temel yönetim ücreti (BPS)
        uint256 performanceFeeBaseBps;    // Temel performans ücreti (BPS) 
        uint256 seniorCouponBaseBps;      // Temel senior kupon (BPS)
        uint256 maxFeeBps;                // Maximum ücret sınırı
        uint256 minFeeBps;                // Minimum ücret sınırı
    }
    
    struct MarketConditions {
        uint256 volatility;               // Mevcut volatilite (BPS)
        uint256 tradingVolume;            // Trading volume (24h)
        uint256 liquidity;                // Likidite durumu
        uint256 correlations;             // Asset korelasyonları
        uint256 momentum;                 // Momentum indeksi
    }
    
    struct DynamicRates {
        uint256 managementFeeBps;         // Güncel yönetim ücreti
        uint256 performanceFeeBps;        // Güncel performans ücreti
        uint256 seniorCouponBps;          // Güncel senior kupon
        uint256 entryFeeBps;              // Giriş ücreti
        uint256 exitFeeBps;               // Çıkış ücreti
        uint256 lastUpdateTime;           // Son güncelleme zamanı
    }
    
    OracleManager public oracleManager;
    FeeStructure public baseFees;
    MarketConditions public marketState;
    DynamicRates public currentRates;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant UPDATE_THRESHOLD = 1 hours; // Min güncelleme aralığı
    
    // Kinetik parametreler
    uint256 public volSensitivity = 150;      // %1.5 volatilite duyarlılığı
    uint256 public volumeSensitivity = 100;   // %1.0 volume duyarlılığı
    uint256 public liquiditySensitivity = 75; // %0.75 likidite duyarlılığı
    
    event FeesUpdated(
        uint256 managementFee,
        uint256 performanceFee, 
        uint256 seniorCoupon,
        uint256 marketVolatility
    );
    event KineticParametersUpdated(uint256 volSens, uint256 volSens2, uint256 liqSens);
    event FeeSpike(uint256 oldFee, uint256 newFee, string reason);
    event FeeDrop(uint256 oldFee, uint256 newFee, string reason);
    
    constructor(
        address _oracleManager,
        uint256 _baseMgmtFee,
        uint256 _basePerfFee,
        uint256 _baseCoupon
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        oracleManager = OracleManager(_oracleManager);
        
        baseFees = FeeStructure({
            managementFeeBaseBps: _baseMgmtFee,      // 1% base
            performanceFeeBaseBps: _basePerfFee,     // 10% base
            seniorCouponBaseBps: _baseCoupon,        // 5% base
            maxFeeBps: _baseMgmtFee * 3,             // 3x cap
            minFeeBps: _baseMgmtFee / 2              // 0.5x floor
        });
        
        // Initialize with base rates
        currentRates = DynamicRates({
            managementFeeBps: _baseMgmtFee,
            performanceFeeBps: _basePerfFee,
            seniorCouponBps: _baseCoupon,
            entryFeeBps: 25,  // 0.25%
            exitFeeBps: 25,   // 0.25%
            lastUpdateTime: block.timestamp
        });
    }
    
    /**
     * @dev Market koşullarını günceller ve dinamik ücretleri hesaplar
     */
    function updateKineticFees() external onlyRole(KEEPER_ROLE) returns (DynamicRates memory newRates) {
        require(
            block.timestamp >= currentRates.lastUpdateTime + UPDATE_THRESHOLD,
            "Update too frequent"
        );
        
        // Market koşullarını oku
        MarketConditions memory conditions = _getMarketConditions();
        marketState = conditions;
        
        // Volatilite etkisi
        uint256 volMultiplier = _calculateVolatilityMultiplier(conditions.volatility);
        
        // Volume etkisi  
        uint256 volumeMultiplier = _calculateVolumeMultiplier(conditions.tradingVolume);
        
        // Likidite etkisi
        uint256 liquidityMultiplier = _calculateLiquidityMultiplier(conditions.liquidity);
        
        // Momentum etkisi
        uint256 momentumMultiplier = _calculateMomentumMultiplier(conditions.momentum);
        
        // Yeni ücretleri hesapla
        uint256 oldMgmtFee = currentRates.managementFeeBps;
        uint256 newMgmtFee = _applyMultipliers(
            baseFees.managementFeeBaseBps,
            volMultiplier,
            volumeMultiplier,
            liquidityMultiplier,
            momentumMultiplier
        );
        
        uint256 oldPerfFee = currentRates.performanceFeeBps;
        uint256 newPerfFee = _applyMultipliers(
            baseFees.performanceFeeBaseBps,
            volMultiplier,
            volumeMultiplier,
            liquidityMultiplier,
            momentumMultiplier
        );
        
        uint256 oldCoupon = currentRates.seniorCouponBps;
        uint256 newCoupon = _applyMultipliers(
            baseFees.seniorCouponBaseBps,
            volMultiplier,
            volumeMultiplier,
            liquidityMultiplier,
            momentumMultiplier
        );
        
        // Değişim kontrolü
        _checkFeeSpikes(oldMgmtFee, newMgmtFee, "Management");
        _checkFeeSpikes(oldPerfFee, newPerfFee, "Performance");
        _checkFeeSpikes(oldCoupon, newCoupon, "Coupon");
        
        // Update current rates
        newRates = DynamicRates({
            managementFeeBps: _capFee(newMgmtFee),
            performanceFeeBps: _capFee(newPerfFee),
            seniorCouponBps: _capFee(newCoupon),
            entryFeeBps: _calculateEntryFee(conditions),
            exitFeeBps: _calculateExitFee(conditions),
            lastUpdateTime: block.timestamp
        });
        
        currentRates = newRates;
        
        emit FeesUpdated(
            newRates.managementFeeBps,
            newRates.performanceFeeBps,
            newRates.seniorCouponBps,
            conditions.volatility
        );
        
        return newRates;
    }
    
    /**
     * @dev Volatilite çarpanını hesaplar
     */
    function _calculateVolatilityMultiplier(uint256 vol) internal view returns (uint256) {
        // Yüksek volatilite = yüksek ücret
        // 30% vol = 1.0x, 60% vol = 1.5x, 90% vol = 2.0x
        if (vol <= 3000) return BPS; // Base multiplier
        
        uint256 excess = vol - 3000; // 30% üzeri
        uint256 multiplier = BPS + (excess * volSensitivity / 100);
        return multiplier;
    }
    
    /**
     * @dev Trading volume çarpanını hesaplar
     */
    function _calculateVolumeMultiplier(uint256 volume) internal view returns (uint256) {
        // Düşük volume = yüksek ücret (illiquidity premium)
        if (volume >= 1000000) return BPS; // Normal volume = base fee
        
        // Volume düştükçe ücret artır
        uint256 shortage = 1000000 - volume;
        uint256 multiplier = BPS + (shortage * volumeSensitivity / 1000000);
        return multiplier;
    }
    
    /**
     * @dev Likidite çarpanını hesaplar
     */
    function _calculateLiquidityMultiplier(uint256 liquidity) internal view returns (uint256) {
        // Düşük likidite = yüksek ücret
        if (liquidity >= 5000) return BPS; // %50+ likidite = base
        
        uint256 shortage = 5000 - liquidity;
        uint256 multiplier = BPS + (shortage * liquiditySensitivity / 100);
        return multiplier;
    }
    
    /**
     * @dev Momentum çarpanını hesaplar
     */
    function _calculateMomentumMultiplier(uint256 momentum) internal pure returns (uint256) {
        // Aşırı momentum = yüksek ücret (bubble protection)
        if (momentum <= 7000) return BPS; // Normal momentum
        
        uint256 excess = momentum - 7000;
        uint256 multiplier = BPS + (excess * 200 / 1000); // 0.2x sensitivity
        return multiplier;
    }
    
    /**
     * @dev Çarpanları uygular
     */
    function _applyMultipliers(
        uint256 baseFee,
        uint256 volMult,
        uint256 volMult2,
        uint256 liqMult,
        uint256 momMult
    ) internal pure returns (uint256) {
        uint256 adjustedFee = baseFee;
        adjustedFee = (adjustedFee * volMult) / BPS;
        adjustedFee = (adjustedFee * volMult2) / BPS;
        adjustedFee = (adjustedFee * liqMult) / BPS;
        adjustedFee = (adjustedFee * momMult) / BPS;
        return adjustedFee;
    }
    
    /**
     * @dev Giriş ücretini hesaplar
     */
    function _calculateEntryFee(MarketConditions memory conditions) internal pure returns (uint256) {
        uint256 baseFee = 25; // 0.25%
        
        // Yüksek volatilite döneminde giriş ücreti artır
        if (conditions.volatility > 6000) { // %60+
            baseFee = baseFee * 2; // 0.5%
        }
        
        return baseFee;
    }
    
    /**
     * @dev Çıkış ücretini hesaplar
     */
    function _calculateExitFee(MarketConditions memory conditions) internal pure returns (uint256) {
        uint256 baseFee = 25; // 0.25%
        
        // Düşük likidite döneminde çıkış ücreti artır
        if (conditions.liquidity < 3000) { // %30-
            baseFee = baseFee * 3; // 0.75%
        }
        
        return baseFee;
    }
    
    /**
     * @dev Ücret sınırlarını uygular
     */
    function _capFee(uint256 fee) internal view returns (uint256) {
        if (fee > baseFees.maxFeeBps) return baseFees.maxFeeBps;
        if (fee < baseFees.minFeeBps) return baseFees.minFeeBps;
        return fee;
    }
    
    /**
     * @dev Ani ücret değişimlerini kontrol eder
     */
    function _checkFeeSpikes(uint256 oldFee, uint256 newFee, string memory feeType) internal {
        if (newFee > oldFee) {
            uint256 increase = ((newFee - oldFee) * BPS) / oldFee;
            if (increase > 5000) { // %50+ artış
                emit FeeSpike(oldFee, newFee, feeType);
            }
        } else if (oldFee > newFee) {
            uint256 decrease = ((oldFee - newFee) * BPS) / oldFee;
            if (decrease > 5000) { // %50+ azalış
                emit FeeDrop(oldFee, newFee, feeType);
            }
        }
    }
    
    /**
     * @dev Market koşullarını oracle'dan alır (mock implementation)
     */
    function _getMarketConditions() internal view returns (MarketConditions memory) {
        // Mock implementation - production'da gerçek oracle verisi kullanılır
        uint256 timeVar = block.timestamp % 3600; // 1 saatlik döngü
        
        return MarketConditions({
            volatility: 3000 + (timeVar * 4000 / 3600),      // 30-70% range
            tradingVolume: 500000 + (timeVar * 1000000 / 3600), // Variable volume
            liquidity: 2000 + (timeVar * 6000 / 3600),       // 20-80% range
            correlations: 5000 + (timeVar * 2000 / 3600),    // 50-70% correlations
            momentum: 3000 + (timeVar * 8000 / 3600)         // Momentum index
        });
    }
    
    /**
     * @dev Mevcut dinamik ücretleri döndürür
     */
    function getCurrentRates() external view returns (DynamicRates memory) {
        return currentRates;
    }
    
    /**
     * @dev Market durumunu döndürür
     */
    function getMarketState() external view returns (MarketConditions memory) {
        return marketState;
    }
    
    /**
     * @dev Kinetik parametreleri günceller
     */
    function updateKineticParams(
        uint256 _volSensitivity,
        uint256 _volumeSensitivity,
        uint256 _liquiditySensitivity
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        volSensitivity = _volSensitivity;
        volumeSensitivity = _volumeSensitivity;
        liquiditySensitivity = _liquiditySensitivity;
        
        emit KineticParametersUpdated(_volSensitivity, _volumeSensitivity, _liquiditySensitivity);
    }
    
    /**
     * @dev Acil ücret sıfırlaması
     */
    function emergencyResetFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        currentRates.managementFeeBps = baseFees.managementFeeBaseBps;
        currentRates.performanceFeeBps = baseFees.performanceFeeBaseBps;
        currentRates.seniorCouponBps = baseFees.seniorCouponBaseBps;
        currentRates.lastUpdateTime = block.timestamp;
        
        emit FeesUpdated(
            baseFees.managementFeeBaseBps,
            baseFees.performanceFeeBaseBps,
            baseFees.seniorCouponBaseBps,
            0
        );
    }
}