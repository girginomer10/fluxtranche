// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RainyDayLadder  
 * @dev Acil fonu anlık/7g/30g dilimlerine bölen merdiven sistemi
 */
contract RainyDayLadder is ERC1155Supply, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    enum LadderTier {
        INSTANT,        // Anlık erişim (0 gün)
        SHORT_TERM,     // Kısa vadeli (7 gün)  
        MEDIUM_TERM,    // Orta vadeli (30 gün)
        LONG_TERM       // Uzun vadeli (90 gün)
    }
    
    struct EmergencyLadder {
        uint256 ladderId;
        address owner;
        uint256 totalAmount;         // Toplam acil fon
        uint256 instantAmount;       // Anlık erişim (0 yield)
        uint256 shortTermAmount;     // 7 gün (düşük yield) 
        uint256 mediumTermAmount;    // 30 gün (orta yield)
        uint256 longTermAmount;      // 90 gün (yüksek yield)
        uint256 createdAt;
        bool isActive;
        LadderStrategy strategy;
    }
    
    enum LadderStrategy {
        BALANCED,           // Eşit dağılım
        CONSERVATIVE,       // Çoğu instant+short
        AGGRESSIVE,         // Çoğu medium+long 
        CUSTOM             // Kullanıcı tanımlı
    }
    
    struct TierConfig {
        uint256 lockDays;            // Kilit süresi
        uint256 yieldRateBps;        // Yıllık getiri (BPS)
        uint256 penaltyRateBps;      // Erken çekme cezası (BPS)
        bool allowPartialWithdraw;   // Kısmi çekim izni
    }
    
    struct WithdrawalRequest {
        uint256 requestId;
        uint256 ladderId;
        LadderTier tier;
        uint256 amount;
        uint256 requestedAt;
        uint256 availableAt;         // Ne zaman çekilebilir
        bool isProcessed;
        bool isEmergency;            // Acil durumu mu?
        string reason;               // Çekim sebebi
    }
    
    struct LadderAnalytics {
        uint256 ladderId;
        uint256 totalYieldEarned;
        uint256 totalWithdrawals;
        uint256 averageYieldRate;
        uint256 emergencyUsageCount; // Kaç kez acil kullanıldı
        uint256 optimalAllocation;    // AI önerilen dağılım
        uint256 riskScore;           // 0-100 (ne kadar hazırlıklı)
    }
    
    IERC20 public stableToken;
    address public trancheVault;
    
    uint256 public ladderCounter;
    uint256 public requestCounter;
    
    mapping(uint256 => EmergencyLadder) public emergencyLadders;
    mapping(address => uint256) public userLadderId;
    mapping(LadderTier => TierConfig) public tierConfigs;
    mapping(uint256 => WithdrawalRequest[]) public ladderRequests;
    mapping(uint256 => LadderAnalytics) public ladderAnalytics;
    
    // Yield accrual tracking
    mapping(uint256 => mapping(LadderTier => uint256)) public lastYieldUpdate;
    mapping(uint256 => mapping(LadderTier => uint256)) public accruedYield;
    
    // NFT Token IDs
    uint256 public constant EMERGENCY_FUND_BADGE = 1;
    uint256 public constant TIER_1_BADGE = 2;  // 1 ay süreyle active
    uint256 public constant TIER_2_BADGE = 3;  // 6 ay süreyle active
    uint256 public constant TIER_3_BADGE = 4;  // 1 yıl süreyle active
    
    uint256 public constant BPS = 10_000;
    
    event LadderCreated(
        uint256 indexed ladderId,
        address indexed owner,
        uint256 totalAmount,
        LadderStrategy strategy
    );
    
    event FundsAllocated(
        uint256 indexed ladderId,
        LadderTier tier,
        uint256 amount,
        uint256 expectedYield
    );
    
    event WithdrawalRequested(
        uint256 indexed requestId,
        uint256 indexed ladderId,
        LadderTier tier,
        uint256 amount,
        bool isEmergency
    );
    
    event WithdrawalProcessed(
        uint256 indexed requestId,
        uint256 amount,
        uint256 penalty,
        uint256 netAmount
    );
    
    event YieldDistributed(
        uint256 indexed ladderId,
        LadderTier tier,
        uint256 yieldAmount
    );
    
    event EmergencyAccessed(
        uint256 indexed ladderId,
        uint256 amount,
        string reason,
        uint256 impactScore
    );
    
    error LadderNotFound();
    error InsufficientFunds();
    error InvalidAllocation();
    error WithdrawalNotReady();
    error RequestNotFound();
    error TierLocked();
    
    constructor(
        address _stableToken,
        address _trancheVault
    ) ERC1155("https://fluxtranche.io/api/rainy-day/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        stableToken = IERC20(_stableToken);
        trancheVault = _trancheVault;
        
        _initializeTierConfigs();
    }
    
    /**
     * @dev Tier konfigürasyonlarını başlat
     */
    function _initializeTierConfigs() internal {
        // Instant: 0 gün, 0% yield, %1 penalty
        tierConfigs[LadderTier.INSTANT] = TierConfig({
            lockDays: 0,
            yieldRateBps: 0,
            penaltyRateBps: 100,
            allowPartialWithdraw: true
        });
        
        // Short-term: 7 gün, %2 yield, %2 penalty
        tierConfigs[LadderTier.SHORT_TERM] = TierConfig({
            lockDays: 7,
            yieldRateBps: 200,
            penaltyRateBps: 200,
            allowPartialWithdraw: true
        });
        
        // Medium-term: 30 gün, %5 yield, %3 penalty  
        tierConfigs[LadderTier.MEDIUM_TERM] = TierConfig({
            lockDays: 30,
            yieldRateBps: 500,
            penaltyRateBps: 300,
            allowPartialWithdraw: false
        });
        
        // Long-term: 90 gün, %8 yield, %5 penalty
        tierConfigs[LadderTier.LONG_TERM] = TierConfig({
            lockDays: 90,
            yieldRateBps: 800,
            penaltyRateBps: 500,
            allowPartialWithdraw: false
        });
    }
    
    /**
     * @dev Acil fon merdiveni oluştur
     */
    function createEmergencyLadder(
        uint256 totalAmount,
        LadderStrategy strategy
    ) external nonReentrant returns (uint256 ladderId) {
        if (userLadderId[msg.sender] != 0) revert LadderNotFound(); // Zaten var
        
        stableToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        ladderCounter++;
        ladderId = ladderCounter;
        
        // Strategy'ye göre dağıt
        (uint256 instant, uint256 shortTerm, uint256 mediumTerm, uint256 longTerm) = 
            _calculateAllocation(totalAmount, strategy);
        
        emergencyLadders[ladderId] = EmergencyLadder({
            ladderId: ladderId,
            owner: msg.sender,
            totalAmount: totalAmount,
            instantAmount: instant,
            shortTermAmount: shortTerm,
            mediumTermAmount: mediumTerm,
            longTermAmount: longTerm,
            createdAt: block.timestamp,
            isActive: true,
            strategy: strategy
        });
        
        userLadderId[msg.sender] = ladderId;
        
        // Analytics initialize
        ladderAnalytics[ladderId] = LadderAnalytics({
            ladderId: ladderId,
            totalYieldEarned: 0,
            totalWithdrawals: 0,
            averageYieldRate: _calculateAverageYield(instant, shortTerm, mediumTerm, longTerm),
            emergencyUsageCount: 0,
            optimalAllocation: 0,
            riskScore: _calculateInitialRiskScore(strategy)
        });
        
        // Yield tracking başlat
        _initializeYieldTracking(ladderId);
        
        // NFT mint et
        _mint(msg.sender, EMERGENCY_FUND_BADGE, 1, "");
        
        emit LadderCreated(ladderId, msg.sender, totalAmount, strategy);
        
        return ladderId;
    }
    
    /**
     * @dev Para çekme talebi oluştur
     */
    function requestWithdrawal(
        LadderTier tier,
        uint256 amount,
        bool isEmergency,
        string calldata reason
    ) external returns (uint256 requestId) {
        uint256 ladderId = userLadderId[msg.sender];
        if (ladderId == 0) revert LadderNotFound();
        
        EmergencyLadder storage ladder = emergencyLadders[ladderId];
        if (!ladder.isActive) revert LadderNotFound();
        
        // Tier'da yeterli bakiye var mı?
        uint256 tierBalance = _getTierBalance(ladderId, tier);
        if (tierBalance < amount) revert InsufficientFunds();
        
        requestCounter++;
        requestId = requestCounter;
        
        TierConfig memory config = tierConfigs[tier];
        uint256 availableAt = isEmergency ? block.timestamp : 
                             block.timestamp + (config.lockDays * 1 days);
        
        ladderRequests[ladderId].push(WithdrawalRequest({
            requestId: requestId,
            ladderId: ladderId,
            tier: tier,
            amount: amount,
            requestedAt: block.timestamp,
            availableAt: availableAt,
            isProcessed: false,
            isEmergency: isEmergency,
            reason: reason
        }));
        
        emit WithdrawalRequested(requestId, ladderId, tier, amount, isEmergency);
        
        return requestId;
    }
    
    /**
     * @dev Para çekme talebini işle
     */
    function processWithdrawal(uint256 requestId) external nonReentrant {
        uint256 ladderId = userLadderId[msg.sender];
        WithdrawalRequest[] storage requests = ladderRequests[ladderId];
        
        bool found = false;
        uint256 requestIndex;
        
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].requestId == requestId && !requests[i].isProcessed) {
                requestIndex = i;
                found = true;
                break;
            }
        }
        
        if (!found) revert RequestNotFound();
        
        WithdrawalRequest storage request = requests[requestIndex];
        if (block.timestamp < request.availableAt) revert WithdrawalNotReady();
        
        // Penalty hesapla
        uint256 penalty = 0;
        if (request.isEmergency) {
            TierConfig memory config = tierConfigs[request.tier];
            penalty = (request.amount * config.penaltyRateBps) / BPS;
        }
        
        uint256 netAmount = request.amount - penalty;
        
        // Tier balance'dan düş
        _updateTierBalance(ladderId, request.tier, request.amount, false);
        
        // Transfer yap
        stableToken.safeTransfer(msg.sender, netAmount);
        
        // Analytics güncelle
        LadderAnalytics storage analytics = ladderAnalytics[ladderId];
        analytics.totalWithdrawals += request.amount;
        if (request.isEmergency) {
            analytics.emergencyUsageCount++;
            emit EmergencyAccessed(ladderId, request.amount, request.reason, 
                                 _calculateEmergencyImpact(ladderId, request.amount));
        }
        
        request.isProcessed = true;
        
        emit WithdrawalProcessed(requestId, request.amount, penalty, netAmount);
    }
    
    /**
     * @dev Yield dağıtımı (Keeper tarafından çağrılır)
     */
    function distributeYield() external onlyRole(KEEPER_ROLE) {
        for (uint256 i = 1; i <= ladderCounter; i++) {
            EmergencyLadder storage ladder = emergencyLadders[i];
            if (!ladder.isActive) continue;
            
            _distributeYieldForLadder(i);
        }
    }
    
    /**
     * @dev Belirli ladder için yield dağıt
     */
    function _distributeYieldForLadder(uint256 ladderId) internal {
        LadderTier[4] memory tiers = [LadderTier.INSTANT, LadderTier.SHORT_TERM, 
                                     LadderTier.MEDIUM_TERM, LadderTier.LONG_TERM];
        
        for (uint256 i = 0; i < tiers.length; i++) {
            LadderTier tier = tiers[i];
            uint256 balance = _getTierBalance(ladderId, tier);
            if (balance == 0) continue;
            
            TierConfig memory config = tierConfigs[tier];
            if (config.yieldRateBps == 0) continue;
            
            uint256 lastUpdate = lastYieldUpdate[ladderId][tier];
            if (lastUpdate == 0) lastUpdate = emergencyLadders[ladderId].createdAt;
            
            uint256 timeElapsed = block.timestamp - lastUpdate;
            uint256 yieldAmount = (balance * config.yieldRateBps * timeElapsed) / 
                                 (BPS * 365 days);
            
            if (yieldAmount > 0) {
                accruedYield[ladderId][tier] += yieldAmount;
                lastYieldUpdate[ladderId][tier] = block.timestamp;
                
                ladderAnalytics[ladderId].totalYieldEarned += yieldAmount;
                
                emit YieldDistributed(ladderId, tier, yieldAmount);
            }
        }
    }
    
    /**
     * @dev Ladder'a ek fon ekle  
     */
    function addFunds(uint256 amount, LadderTier tier) external nonReentrant {
        uint256 ladderId = userLadderId[msg.sender];
        if (ladderId == 0) revert LadderNotFound();
        
        stableToken.safeTransferFrom(msg.sender, address(this), amount);
        
        _updateTierBalance(ladderId, tier, amount, true);
        
        EmergencyLadder storage ladder = emergencyLadders[ladderId];
        ladder.totalAmount += amount;
        
        emit FundsAllocated(ladderId, tier, amount, _calculateExpectedYield(tier, amount));
    }
    
    /**
     * @dev Rebalance ladder (tier'lar arası transfer)
     */
    function rebalanceLadder(
        LadderTier fromTier,
        LadderTier toTier,
        uint256 amount
    ) external {
        uint256 ladderId = userLadderId[msg.sender];
        if (ladderId == 0) revert LadderNotFound();
        
        uint256 fromBalance = _getTierBalance(ladderId, fromTier);
        if (fromBalance < amount) revert InsufficientFunds();
        
        _updateTierBalance(ladderId, fromTier, amount, false);
        _updateTierBalance(ladderId, toTier, amount, true);
    }
    
    /**
     * @dev Strategy'ye göre allocation hesapla
     */
    function _calculateAllocation(
        uint256 totalAmount, 
        LadderStrategy strategy
    ) internal pure returns (uint256 instant, uint256 shortTerm, uint256 mediumTerm, uint256 longTerm) {
        if (strategy == LadderStrategy.BALANCED) {
            instant = totalAmount * 25 / 100;      // %25
            shortTerm = totalAmount * 35 / 100;    // %35  
            mediumTerm = totalAmount * 25 / 100;   // %25
            longTerm = totalAmount * 15 / 100;     // %15
        } else if (strategy == LadderStrategy.CONSERVATIVE) {
            instant = totalAmount * 40 / 100;      // %40
            shortTerm = totalAmount * 40 / 100;    // %40
            mediumTerm = totalAmount * 15 / 100;   // %15
            longTerm = totalAmount * 5 / 100;      // %5
        } else if (strategy == LadderStrategy.AGGRESSIVE) {
            instant = totalAmount * 10 / 100;      // %10
            shortTerm = totalAmount * 20 / 100;    // %20
            mediumTerm = totalAmount * 35 / 100;   // %35
            longTerm = totalAmount * 35 / 100;     // %35
        } else {
            // CUSTOM - eşit dağıt
            instant = totalAmount / 4;
            shortTerm = totalAmount / 4;
            mediumTerm = totalAmount / 4;
            longTerm = totalAmount / 4;
        }
    }
    
    /**
     * @dev Tier balance'ını getir (ana para + yield)
     */
    function _getTierBalance(uint256 ladderId, LadderTier tier) internal view returns (uint256) {
        EmergencyLadder memory ladder = emergencyLadders[ladderId];
        uint256 principal;
        
        if (tier == LadderTier.INSTANT) principal = ladder.instantAmount;
        else if (tier == LadderTier.SHORT_TERM) principal = ladder.shortTermAmount;
        else if (tier == LadderTier.MEDIUM_TERM) principal = ladder.mediumTermAmount;
        else if (tier == LadderTier.LONG_TERM) principal = ladder.longTermAmount;
        
        return principal + accruedYield[ladderId][tier];
    }
    
    /**
     * @dev Tier balance güncelle
     */
    function _updateTierBalance(uint256 ladderId, LadderTier tier, uint256 amount, bool isAdd) internal {
        EmergencyLadder storage ladder = emergencyLadders[ladderId];
        
        if (tier == LadderTier.INSTANT) {
            if (isAdd) ladder.instantAmount += amount;
            else ladder.instantAmount -= amount;
        } else if (tier == LadderTier.SHORT_TERM) {
            if (isAdd) ladder.shortTermAmount += amount;
            else ladder.shortTermAmount -= amount;
        } else if (tier == LadderTier.MEDIUM_TERM) {
            if (isAdd) ladder.mediumTermAmount += amount;
            else ladder.mediumTermAmount -= amount;
        } else if (tier == LadderTier.LONG_TERM) {
            if (isAdd) ladder.longTermAmount += amount;
            else ladder.longTermAmount -= amount;
        }
    }
    
    /**
     * @dev Yield tracking initialize et
     */
    function _initializeYieldTracking(uint256 ladderId) internal {
        LadderTier[4] memory tiers = [LadderTier.INSTANT, LadderTier.SHORT_TERM, 
                                     LadderTier.MEDIUM_TERM, LadderTier.LONG_TERM];
        
        for (uint256 i = 0; i < tiers.length; i++) {
            lastYieldUpdate[ladderId][tiers[i]] = block.timestamp;
        }
    }
    
    /**
     * @dev Beklenen yield hesapla
     */
    function _calculateExpectedYield(LadderTier tier, uint256 amount) internal view returns (uint256) {
        TierConfig memory config = tierConfigs[tier];
        return (amount * config.yieldRateBps) / BPS; // Yıllık yield
    }
    
    /**
     * @dev Ortalama yield hesapla
     */
    function _calculateAverageYield(
        uint256 instant, uint256 shortTerm, uint256 mediumTerm, uint256 longTerm
    ) internal view returns (uint256) {
        uint256 totalAmount = instant + shortTerm + mediumTerm + longTerm;
        if (totalAmount == 0) return 0;
        
        uint256 weightedYield = 
            (instant * tierConfigs[LadderTier.INSTANT].yieldRateBps) +
            (shortTerm * tierConfigs[LadderTier.SHORT_TERM].yieldRateBps) +
            (mediumTerm * tierConfigs[LadderTier.MEDIUM_TERM].yieldRateBps) +
            (longTerm * tierConfigs[LadderTier.LONG_TERM].yieldRateBps);
            
        return weightedYield / totalAmount;
    }
    
    /**
     * @dev İlk risk skoru hesapla
     */
    function _calculateInitialRiskScore(LadderStrategy strategy) internal pure returns (uint256) {
        if (strategy == LadderStrategy.CONSERVATIVE) return 90; // En hazırlıklı
        if (strategy == LadderStrategy.BALANCED) return 70;
        if (strategy == LadderStrategy.AGGRESSIVE) return 50;
        return 60; // Custom
    }
    
    /**
     * @dev Acil durum kullanımının etkisini hesapla
     */
    function _calculateEmergencyImpact(uint256 ladderId, uint256 amount) internal view returns (uint256) {
        EmergencyLadder memory ladder = emergencyLadders[ladderId];
        return (amount * 100) / ladder.totalAmount; // % olarak impact
    }
    
    /**
     * @dev View functions
     */
    function getUserLadder(address user) external view returns (EmergencyLadder memory) {
        uint256 ladderId = userLadderId[user];
        return emergencyLadders[ladderId];
    }
    
    function getLadderRequests(address user) external view returns (WithdrawalRequest[] memory) {
        uint256 ladderId = userLadderId[user];
        return ladderRequests[ladderId];
    }
    
    function getLadderAnalytics(address user) external view returns (LadderAnalytics memory) {
        uint256 ladderId = userLadderId[user];
        return ladderAnalytics[ladderId];
    }
    
    function getTierBalance(address user, LadderTier tier) external view returns (uint256) {
        uint256 ladderId = userLadderId[user];
        return _getTierBalance(ladderId, tier);
    }
    
    /**
     * @dev Admin functions
     */
    function updateTierConfig(LadderTier tier, TierConfig calldata config) 
        external onlyRole(DEFAULT_ADMIN_ROLE) {
        tierConfigs[tier] = config;
    }
    
    // ERC1155 required overrides
    function supportsInterface(bytes4 interfaceId) 
        public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}