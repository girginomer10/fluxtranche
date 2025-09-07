// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title RetirePath
 * @dev Hedef tarihli tranche sistemi - tarih yaklaştıkça Junior→Senior glidepath
 */
contract RetirePath is ERC1155Supply, AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct RetirePlan {
        uint256 planId;
        address owner;
        uint256 targetDate;          // Hedef tarih (timestamp)
        uint256 creationDate;        // Plan oluşturma tarihi
        uint256 totalAmount;         // Toplam yatırım tutarı
        uint256 currentSeniorRatio;  // Mevcut Senior oranı (BPS)
        uint256 initialJuniorRatio;  // Başlangıç Junior oranı (BPS)
        uint256 finalSeniorRatio;    // Hedef Senior oranı (BPS) - genelde %90-95
        bool isActive;
        bool isMatured;
        string planName;             // "Retirement 2055", "House Down Payment 2026"
        PlanType planType;
    }
    
    enum PlanType {
        RETIREMENT,        // Emeklilik planı
        EDUCATION,         // Eğitim fonu
        HOUSE_PURCHASE,    // Ev satın alma
        TRAVEL_FUND,       // Tatil fonu
        EMERGENCY_FUND,    // Acil durum fonu
        BUSINESS_STARTUP,  // İş kurma sermayesi
        CUSTOM            // Özel plan
    }
    
    struct GlidepathConfig {
        uint256 aggressiveYears;     // İlk X yıl agresif (yüksek Junior)
        uint256 conservativeYears;   // Son X yıl konservatif (yüksek Senior)  
        uint256 maxJuniorRatio;      // Maksimum Junior oranı (BPS)
        uint256 minSeniorRatio;      // Minimum Senior oranı (BPS)
        uint256 finalSeniorTarget;   // Hedef tarihte Senior oranı (BPS)
        bool smoothTransition;       // Düzgün geçiş vs step function
    }
    
    struct RebalanceEvent {
        uint256 eventId;
        uint256 planId;
        uint256 timestamp;
        uint256 oldSeniorRatio;
        uint256 newSeniorRatio;
        uint256 yearsToTarget;
        string trigger;              // "Monthly rebalance", "Milestone reached"
        bool executed;
    }
    
    address public trancheVault;
    
    uint256 public planCounter;
    uint256 public rebalanceEventCounter;
    
    mapping(uint256 => RetirePlan) public retirePlans;
    mapping(address => uint256[]) public userPlans;
    mapping(PlanType => GlidepathConfig) public glidepathConfigs;
    mapping(uint256 => RebalanceEvent) public rebalanceEvents;
    
    // Constants
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_PLAN_DURATION = 1 days;     // Min 1 gün
    uint256 public constant MAX_PLAN_DURATION = 50 * 365 days; // Max 50 yıl
    uint256 public constant REBALANCE_FREQUENCY = 30 days;   // Aylık rebalance
    
    // NFT Token IDs
    uint256 public constant RETIRE_PLAN_TOKEN = 1;
    uint256 public constant MILESTONE_TOKEN = 2;
    uint256 public constant COMPLETION_TOKEN = 3;
    
    event RetirePlanCreated(
        uint256 indexed planId,
        address indexed owner,
        uint256 targetDate,
        PlanType planType,
        string planName
    );
    
    event GlidepathRebalanced(
        uint256 indexed planId,
        uint256 oldSeniorRatio,
        uint256 newSeniorRatio,
        uint256 yearsRemaining
    );
    
    event MilestoneReached(
        uint256 indexed planId,
        string milestone,
        uint256 currentProgress
    );
    
    event PlanMatured(
        uint256 indexed planId,
        uint256 finalAmount,
        uint256 finalSeniorRatio
    );
    
    error InvalidPlanDuration();
    error PlanNotFound();
    error UnauthorizedAccess();
    error PlanAlreadyMatured();
    error InvalidRebalanceFrequency();
    
    constructor(
        address _trancheVault
    ) ERC1155("https://fluxtranche.io/api/retire-path/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        trancheVault = _trancheVault;
        
        // Varsayılan glidepath konfigürasyonları
        _initializeGlidepathConfigs();
    }
    
    /**
     * @dev Yeni emeklilik planı oluştur
     */
    function createRetirePlan(
        uint256 targetDate,
        uint256 initialAmount,
        PlanType planType,
        string calldata planName
    ) external returns (uint256 planId) {
        if (targetDate <= block.timestamp + MIN_PLAN_DURATION) revert InvalidPlanDuration();
        if (targetDate > block.timestamp + MAX_PLAN_DURATION) revert InvalidPlanDuration();
        
        planCounter++;
        planId = planCounter;
        
        GlidepathConfig memory config = glidepathConfigs[planType];
        
        retirePlans[planId] = RetirePlan({
            planId: planId,
            owner: msg.sender,
            targetDate: targetDate,
            creationDate: block.timestamp,
            totalAmount: initialAmount,
            currentSeniorRatio: config.minSeniorRatio, // Başlangıçta düşük Senior
            initialJuniorRatio: BPS - config.minSeniorRatio,
            finalSeniorRatio: config.finalSeniorTarget,
            isActive: true,
            isMatured: false,
            planName: planName,
            planType: planType
        });
        
        userPlans[msg.sender].push(planId);
        
        // Plan sahibine NFT mint et
        _mint(msg.sender, RETIRE_PLAN_TOKEN, 1, "");
        
        emit RetirePlanCreated(planId, msg.sender, targetDate, planType, planName);
        
        return planId;
    }
    
    /**
     * @dev Glidepath rebalance işlemi (Keeper tarafından çağrılır)
     */
    function executeGlidepathRebalance(uint256 planId) external onlyRole(KEEPER_ROLE) {
        RetirePlan storage plan = retirePlans[planId];
        if (plan.planId == 0) revert PlanNotFound();
        if (!plan.isActive || plan.isMatured) revert PlanAlreadyMatured();
        
        uint256 newSeniorRatio = _calculateCurrentSeniorRatio(planId);
        
        if (newSeniorRatio != plan.currentSeniorRatio) {
            rebalanceEventCounter++;
            
            rebalanceEvents[rebalanceEventCounter] = RebalanceEvent({
                eventId: rebalanceEventCounter,
                planId: planId,
                timestamp: block.timestamp,
                oldSeniorRatio: plan.currentSeniorRatio,
                newSeniorRatio: newSeniorRatio,
                yearsToTarget: (plan.targetDate - block.timestamp) / 365 days,
                trigger: "Scheduled glidepath rebalance",
                executed: false
            });
            
            // Mock rebalance execution
            bool success = _executePortfolioRebalance(planId, newSeniorRatio);
            
            if (success) {
                uint256 oldRatio = plan.currentSeniorRatio;
                plan.currentSeniorRatio = newSeniorRatio;
                rebalanceEvents[rebalanceEventCounter].executed = true;
                
                uint256 yearsRemaining = (plan.targetDate - block.timestamp) / 365 days;
                
                emit GlidepathRebalanced(planId, oldRatio, newSeniorRatio, yearsRemaining);
                
                // Milestone kontrolü
                _checkMilestones(planId);
            }
        }
        
        // Plan olgunlaştı mı kontrol et
        if (block.timestamp >= plan.targetDate && !plan.isMatured) {
            _maturePlan(planId);
        }
    }
    
    /**
     * @dev Mevcut Senior oranını hesapla (glidepath'e göre)
     */
    function _calculateCurrentSeniorRatio(uint256 planId) internal view returns (uint256) {
        RetirePlan memory plan = retirePlans[planId];
        GlidepathConfig memory config = glidepathConfigs[plan.planType];
        
        uint256 totalDuration = plan.targetDate - plan.creationDate;
        uint256 elapsed = block.timestamp - plan.creationDate;
        uint256 progress = (elapsed * BPS) / totalDuration; // 0-10000 (0-100%)
        
        if (config.smoothTransition) {
            // Smooth sigmoid curve
            return _calculateSmoothGlidepath(progress, config);
        } else {
            // Step function approach
            return _calculateStepGlidepath(plan, config, elapsed, totalDuration);
        }
    }
    
    /**
     * @dev Düzgün glidepath hesapla (sigmoid curve)
     */
    function _calculateSmoothGlidepath(
        uint256 progress, 
        GlidepathConfig memory config
    ) internal pure returns (uint256) {
        // Sigmoid-like curve: yavaş başlar, ortada hızlanır, sonda yavaşlar
        uint256 minSenior = config.minSeniorRatio;
        uint256 maxSenior = config.finalSeniorTarget;
        
        if (progress <= 2000) { // İlk %20
            return minSenior;
        } else if (progress >= 8000) { // Son %20
            return maxSenior;
        } else {
            // Ortadaki %60'ta smooth geçiş
            uint256 midProgress = (progress - 2000) * BPS / 6000; // 0-10000
            uint256 seniorIncrease = (maxSenior - minSenior) * midProgress / BPS;
            return minSenior + seniorIncrease;
        }
    }
    
    /**
     * @dev Basamaklı glidepath hesapla
     */
    function _calculateStepGlidepath(
        RetirePlan memory plan,
        GlidepathConfig memory config,
        uint256 /* elapsed */,
        uint256 /* totalDuration */
    ) internal view returns (uint256) {
        uint256 yearsRemaining = (plan.targetDate - block.timestamp) / 365 days;
        
        if (yearsRemaining > config.aggressiveYears) {
            // Agresif dönem: düşük Senior
            return config.minSeniorRatio;
        } else if (yearsRemaining <= config.conservativeYears) {
            // Konservatif dönem: yüksek Senior
            return config.finalSeniorTarget;
        } else {
            // Geçiş dönemi: linear interpolation
            uint256 transitionYears = config.aggressiveYears - config.conservativeYears;
            uint256 transitionProgress = (config.aggressiveYears - yearsRemaining) * BPS / transitionYears;
            
            uint256 seniorRange = config.finalSeniorTarget - config.minSeniorRatio;
            return config.minSeniorRatio + (seniorRange * transitionProgress / BPS);
        }
    }
    
    /**
     * @dev Milestone kontrolü
     */
    function _checkMilestones(uint256 planId) internal {
        RetirePlan memory plan = retirePlans[planId];
        uint256 progress = ((block.timestamp - plan.creationDate) * 100) / (plan.targetDate - plan.creationDate);
        
        // %25, %50, %75 milestone'ları
        if (progress >= 25 && progress < 30) {
            _mint(plan.owner, MILESTONE_TOKEN, 1, "");
            emit MilestoneReached(planId, "25% Complete", progress);
        } else if (progress >= 50 && progress < 55) {
            _mint(plan.owner, MILESTONE_TOKEN, 1, "");
            emit MilestoneReached(planId, "50% Complete", progress);
        } else if (progress >= 75 && progress < 80) {
            _mint(plan.owner, MILESTONE_TOKEN, 1, "");
            emit MilestoneReached(planId, "75% Complete", progress);
        }
    }
    
    /**
     * @dev Planı olgunlaştır
     */
    function _maturePlan(uint256 planId) internal {
        RetirePlan storage plan = retirePlans[planId];
        plan.isMatured = true;
        plan.isActive = false;
        
        // Completion NFT mint et
        _mint(plan.owner, COMPLETION_TOKEN, 1, "");
        
        emit PlanMatured(planId, plan.totalAmount, plan.currentSeniorRatio);
    }
    
    /**
     * @dev Portfolio rebalance mock implementation
     */
    function _executePortfolioRebalance(uint256 planId, uint256 newSeniorRatio) internal pure returns (bool) {
        // Mock - gerçekte TrancheVault ile integration
        return planId > 0 && newSeniorRatio >= 1000 && newSeniorRatio <= 9500;
    }
    
    /**
     * @dev Glidepath konfigürasyonlarını initialize et
     */
    function _initializeGlidepathConfigs() internal {
        // Emeklilik planı: Agresif başla, konservatif bitir
        glidepathConfigs[PlanType.RETIREMENT] = GlidepathConfig({
            aggressiveYears: 10,      // Son 10 yıla kadar agresif
            conservativeYears: 5,     // Son 5 yıl konservatif
            maxJuniorRatio: 8000,     // %80 Junior
            minSeniorRatio: 2000,     // %20 Senior başlangıç
            finalSeniorTarget: 9000,  // %90 Senior hedef
            smoothTransition: true
        });
        
        // Eğitim fonu: Orta vadeli, balanced
        glidepathConfigs[PlanType.EDUCATION] = GlidepathConfig({
            aggressiveYears: 5,
            conservativeYears: 2,
            maxJuniorRatio: 7000,     // %70 Junior
            minSeniorRatio: 3000,     // %30 Senior başlangıç
            finalSeniorTarget: 8000,  // %80 Senior hedef
            smoothTransition: true
        });
        
        // Ev satın alma: Kısa vadeli, muhafazakar
        glidepathConfigs[PlanType.HOUSE_PURCHASE] = GlidepathConfig({
            aggressiveYears: 3,
            conservativeYears: 1,
            maxJuniorRatio: 6000,     // %60 Junior
            minSeniorRatio: 4000,     // %40 Senior başlangıç
            finalSeniorTarget: 8500,  // %85 Senior hedef
            smoothTransition: false   // Step function
        });
        
        // Tatil fonu: Çok kısa vadeli, çok muhafazakar
        glidepathConfigs[PlanType.TRAVEL_FUND] = GlidepathConfig({
            aggressiveYears: 1,
            conservativeYears: 0,
            maxJuniorRatio: 5000,     // %50 Junior
            minSeniorRatio: 5000,     // %50 Senior başlangıç
            finalSeniorTarget: 9000,  // %90 Senior hedef
            smoothTransition: false
        });
    }
    
    /**
     * @dev Kullanıcının planlarını getir
     */
    function getUserPlans(address user) external view returns (uint256[] memory) {
        return userPlans[user];
    }
    
    /**
     * @dev Plan detaylarını getir
     */
    function getPlanDetails(uint256 planId) external view returns (RetirePlan memory) {
        return retirePlans[planId];
    }
    
    /**
     * @dev Plan için tahmini glidepath getir
     */
    function getProjectedGlidepath(uint256 planId) external view returns (
        uint256[] memory timestamps,
        uint256[] memory seniorRatios
    ) {
        RetirePlan memory plan = retirePlans[planId];
        if (plan.planId == 0) revert PlanNotFound();
        
        uint256 duration = plan.targetDate - plan.creationDate;
        uint256 points = 20; // 20 noktalık projection
        
        timestamps = new uint256[](points);
        seniorRatios = new uint256[](points);
        
        for (uint256 i = 0; i < points; i++) {
            uint256 futureTime = plan.creationDate + (duration * i / (points - 1));
            timestamps[i] = futureTime;
            
            // Mock calculation for projection
            uint256 progress = ((futureTime - plan.creationDate) * BPS) / duration;
            seniorRatios[i] = _calculateSmoothGlidepath(progress, glidepathConfigs[plan.planType]);
        }
    }
    
    /**
     * @dev Son rebalance eventlerini getir
     */
    function getRecentRebalanceEvents(uint256 planId, uint256 count) external view returns (RebalanceEvent[] memory events) {
        uint256 actualCount = count;
        if (actualCount > rebalanceEventCounter) {
            actualCount = rebalanceEventCounter;
        }
        
        events = new RebalanceEvent[](actualCount);
        uint256 found = 0;
        
        for (uint256 i = rebalanceEventCounter; i > 0 && found < actualCount; i--) {
            if (rebalanceEvents[i].planId == planId) {
                events[found] = rebalanceEvents[i];
                found++;
            }
        }
    }
    
    /**
     * @dev Admin functions
     */
    function updateGlidepathConfig(
        PlanType planType,
        GlidepathConfig calldata config
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        glidepathConfigs[planType] = config;
    }
    
    function setTrancheVault(address _trancheVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trancheVault = _trancheVault;
    }
    
    function emergencyPausePlan(uint256 planId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        retirePlans[planId].isActive = false;
    }
    
    function emergencyResumePlan(uint256 planId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RetirePlan storage plan = retirePlans[planId];
        if (!plan.isMatured) {
            plan.isActive = true;
        }
    }
    
    // ERC1155 required overrides
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}