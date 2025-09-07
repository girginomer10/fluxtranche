// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./OracleManager.sol";

/**
 * @title SessionKeyMacros
 * @dev Koşullu makro sistemi - kullanıcılar "IV>60 → Senior'a git" gibi kurallar tanımlayabilir
 */
contract SessionKeyMacros is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    enum ComparisonOperator {
        GREATER_THAN,      // >
        LESS_THAN,         // <
        GREATER_EQUAL,     // >=
        LESS_EQUAL,        // <=
        EQUAL,             // ==
        NOT_EQUAL          // !=
    }
    
    enum ActionType {
        ALLOCATE_TO_SENIOR,    // Tüm bakiyeyi senior'a
        ALLOCATE_TO_JUNIOR,    // Tüm bakiyeyi junior'a
        REBALANCE_RATIO,       // Belirli orana göre rebalance
        PAUSE_DEPOSITS,        // Deposit'leri duraklat
        EMERGENCY_WITHDRAW     // Acil çıkış
    }
    
    enum TriggerMetric {
        IMPLIED_VOLATILITY,    // IV (%)
        REALIZED_VOLATILITY,   // RV (%)
        VIX_LEVEL,            // VIX seviyesi
        CORRELATION,          // Korelasyon
        DRAWDOWN,             // Drawdown
        NAV_RATIO,            // Senior/Junior NAV oranı
        TIME_SINCE_EPOCH,     // Epoch başından beri geçen süre
        TOTAL_RETURN          // Toplam getiri
    }
    
    struct MacroCondition {
        TriggerMetric metric;
        ComparisonOperator operator;
        uint256 threshold;        // BPS cinsinden (10000 = 100%)
        bool isActive;
    }
    
    struct MacroAction {
        ActionType actionType;
        uint256 targetRatio;      // REBALANCE_RATIO için (BPS)
        uint256 maxSlippage;      // Max kayma toleransı (BPS)
        bool executeImmediately;  // Hemen uygula veya bekle
    }
    
    struct UserMacro {
        uint256 id;
        address user;
        string description;       // "IV>60 → Senior"
        MacroCondition condition;
        MacroAction action;
        uint256 createdAt;
        uint256 lastTriggered;
        uint256 triggerCount;
        bool isActive;
    }
    
    OracleManager public oracleManager;
    address public trancheVault;
    
    uint256 public userMacroCounter;
    mapping(uint256 => UserMacro) public userMacros;
    mapping(address => uint256[]) public userMacrosList;
    
    // Global userMacro limits
    uint256 public maxMacrosPerUser = 5;
    uint256 public cooldownPeriod = 1 hours;
    
    event MacroCreated(
        uint256 indexed macroId,
        address indexed user,
        string description,
        TriggerMetric metric,
        ComparisonOperator operator,
        uint256 threshold,
        ActionType actionType
    );
    
    event MacroTriggered(
        uint256 indexed macroId,
        address indexed user,
        uint256 currentValue,
        uint256 threshold,
        ActionType actionType
    );
    
    event MacroExecuted(
        uint256 indexed macroId,
        address indexed user,
        ActionType actionType,
        uint256 amount,
        bool success
    );
    
    event MacroUpdated(uint256 indexed macroId, bool isActive);
    event MacroDeleted(uint256 indexed macroId, address indexed user);
    
    error MacroLimitExceeded();
    error MacroNotFound();
    error UnauthorizedAccess();
    error InvalidThreshold();
    error CooldownNotMet();
    error MacroNotActive();
    
    constructor(
        address _oracleManager,
        address _trancheVault
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        oracleManager = OracleManager(_oracleManager);
        trancheVault = _trancheVault;
    }
    
    /**
     * @dev Yeni makro oluştur
     */
    function createMacro(
        string calldata description,
        TriggerMetric metric,
        ComparisonOperator operator,
        uint256 threshold,
        ActionType actionType,
        uint256 targetRatio,
        uint256 maxSlippage
    ) external returns (uint256 macroId) {
        if (userMacrosList[msg.sender].length >= maxMacrosPerUser) {
            revert MacroLimitExceeded();
        }
        
        if (threshold == 0 || threshold > 50000) { // Max %500
            revert InvalidThreshold();
        }
        
        userMacroCounter++;
        macroId = userMacroCounter;
        
        MacroCondition memory condition = MacroCondition({
            metric: metric,
            operator: operator,
            threshold: threshold,
            isActive: true
        });
        
        MacroAction memory action = MacroAction({
            actionType: actionType,
            targetRatio: targetRatio,
            maxSlippage: maxSlippage,
            executeImmediately: true
        });
        
        userMacros[macroId] = UserMacro({
            id: macroId,
            user: msg.sender,
            description: description,
            condition: condition,
            action: action,
            createdAt: block.timestamp,
            lastTriggered: 0,
            triggerCount: 0,
            isActive: true
        });
        
        userMacrosList[msg.sender].push(macroId);
        
        emit MacroCreated(
            macroId,
            msg.sender,
            description,
            metric,
            operator,
            threshold,
            actionType
        );
    }
    
    /**
     * @dev Makroları kontrol et ve tetikle (Keeper tarafından çağrılır)
     */
    function checkAndTriggerMacros() external onlyRole(KEEPER_ROLE) {
        // Tüm aktif makroları kontrol et
        for (uint256 i = 1; i <= userMacroCounter; i++) {
            UserMacro storage userMacro = userMacros[i];
            
            if (!userMacro.isActive || !userMacro.condition.isActive) continue;
            
            // Cooldown kontrolü
            if (userMacro.lastTriggered + cooldownPeriod > block.timestamp) continue;
            
            // Koşulu kontrol et
            uint256 currentValue = _getCurrentValue(userMacro.condition.metric);
            bool shouldTrigger = _evaluateCondition(
                currentValue,
                userMacro.condition.operator,
                userMacro.condition.threshold
            );
            
            if (shouldTrigger) {
                _triggerMacro(i, currentValue);
            }
        }
    }
    
    /**
     * @dev Makroyu tetikle
     */
    function _triggerMacro(uint256 macroId, uint256 currentValue) internal {
        UserMacro storage userMacro = userMacros[macroId];
        
        userMacro.lastTriggered = block.timestamp;
        userMacro.triggerCount++;
        
        emit MacroTriggered(
            macroId,
            userMacro.user,
            currentValue,
            userMacro.condition.threshold,
            userMacro.action.actionType
        );
        
        // Action'ı execute et
        _executeMacroAction(macroId);
    }
    
    /**
     * @dev Makro aksiyonunu uygula
     */
    function _executeMacroAction(uint256 macroId) internal {
        UserMacro storage userMacro = userMacros[macroId];
        bool success = false;
        uint256 amount = 0;
        
        // Mock implementation - production'da gerçek vault ile integrate edilir
        if (userMacro.action.actionType == ActionType.ALLOCATE_TO_SENIOR) {
            // Kullanıcının tüm junior position'ını senior'a çevir
            success = true;
            amount = 100000; // Mock amount
        } else if (userMacro.action.actionType == ActionType.ALLOCATE_TO_JUNIOR) {
            // Kullanıcının tüm senior position'ını junior'a çevir
            success = true;
            amount = 100000; // Mock amount
        } else if (userMacro.action.actionType == ActionType.REBALANCE_RATIO) {
            // Belirli orana göre rebalance
            success = true;
            amount = userMacro.action.targetRatio;
        } else if (userMacro.action.actionType == ActionType.PAUSE_DEPOSITS) {
            // Kullanıcı için deposit'leri duraklat
            success = true;
        } else if (userMacro.action.actionType == ActionType.EMERGENCY_WITHDRAW) {
            // Acil çıkış yap
            success = true;
            amount = 100000; // Mock amount
        }
        
        emit MacroExecuted(
            macroId,
            userMacro.user,
            userMacro.action.actionType,
            amount,
            success
        );
    }
    
    /**
     * @dev Koşulu değerlendir
     */
    function _evaluateCondition(
        uint256 currentValue,
        ComparisonOperator operator,
        uint256 threshold
    ) internal pure returns (bool) {
        if (operator == ComparisonOperator.GREATER_THAN) {
            return currentValue > threshold;
        } else if (operator == ComparisonOperator.LESS_THAN) {
            return currentValue < threshold;
        } else if (operator == ComparisonOperator.GREATER_EQUAL) {
            return currentValue >= threshold;
        } else if (operator == ComparisonOperator.LESS_EQUAL) {
            return currentValue <= threshold;
        } else if (operator == ComparisonOperator.EQUAL) {
            return currentValue == threshold;
        } else if (operator == ComparisonOperator.NOT_EQUAL) {
            return currentValue != threshold;
        }
        return false;
    }
    
    /**
     * @dev Metric için mevcut değeri al
     */
    function _getCurrentValue(TriggerMetric metric) internal view returns (uint256) {
        // Mock implementation - production'da gerçek oracle'lardan veri alır
        if (metric == TriggerMetric.IMPLIED_VOLATILITY) {
            // Mock IV: 30-70% arası
            return 3000 + (block.timestamp % 4000); // 30-70%
        } else if (metric == TriggerMetric.REALIZED_VOLATILITY) {
            // Mock RV
            return 2500 + (block.timestamp % 3500); // 25-60%
        } else if (metric == TriggerMetric.VIX_LEVEL) {
            // Mock VIX
            return 1500 + (block.timestamp % 3500); // 15-50
        } else if (metric == TriggerMetric.CORRELATION) {
            // Mock korelasyon
            return 5000 + (block.timestamp % 3000); // 50-80%
        } else if (metric == TriggerMetric.DRAWDOWN) {
            // Mock drawdown
            return block.timestamp % 1500; // 0-15%
        } else if (metric == TriggerMetric.NAV_RATIO) {
            // Mock NAV ratio
            return 9000 + (block.timestamp % 2000); // 90-110%
        } else if (metric == TriggerMetric.TIME_SINCE_EPOCH) {
            // Epoch başından beri geçen süre (saniye)
            return block.timestamp % 86400; // 0-24 saat
        } else if (metric == TriggerMetric.TOTAL_RETURN) {
            // Mock toplam getiri
            return 10000 + uint256(int256(block.timestamp % 2000) - 1000); // -10% to +10%
        }
        
        return 0;
    }
    
    /**
     * @dev Kullanıcının makrolarını getir
     */
    function getUserMacros(address user) external view returns (uint256[] memory) {
        return userMacrosList[user];
    }
    
    /**
     * @dev Makro detaylarını getir
     */
    function getMacro(uint256 macroId) external view returns (UserMacro memory) {
        if (userMacros[macroId].user == address(0)) revert MacroNotFound();
        return userMacros[macroId];
    }
    
    /**
     * @dev Makroyu aktif/pasif yap
     */
    function toggleMacro(uint256 macroId) external {
        UserMacro storage userMacro = userMacros[macroId];
        if (userMacro.user != msg.sender) revert UnauthorizedAccess();
        
        userMacro.isActive = !userMacro.isActive;
        emit MacroUpdated(macroId, userMacro.isActive);
    }
    
    /**
     * @dev Makroyu sil
     */
    function deleteMacro(uint256 macroId) external {
        UserMacro storage userMacro = userMacros[macroId];
        if (userMacro.user != msg.sender) revert UnauthorizedAccess();
        
        // User'ın userMacro listesinden çıkar
        uint256[] storage userMacrosListLocal = userMacrosList[msg.sender];
        for (uint256 i = 0; i < userMacrosListLocal.length; i++) {
            if (userMacrosListLocal[i] == macroId) {
                userMacrosListLocal[i] = userMacrosListLocal[userMacrosListLocal.length - 1];
                userMacrosListLocal.pop();
                break;
            }
        }
        
        delete userMacros[macroId];
        emit MacroDeleted(macroId, msg.sender);
    }
    
    /**
     * @dev Metric açıklamasını getir
     */
    function getMetricDescription(TriggerMetric metric) external pure returns (string memory) {
        if (metric == TriggerMetric.IMPLIED_VOLATILITY) return "Implied Volatility (%)";
        if (metric == TriggerMetric.REALIZED_VOLATILITY) return "Realized Volatility (%)";
        if (metric == TriggerMetric.VIX_LEVEL) return "VIX Level";
        if (metric == TriggerMetric.CORRELATION) return "Correlation (%)";
        if (metric == TriggerMetric.DRAWDOWN) return "Drawdown (%)";
        if (metric == TriggerMetric.NAV_RATIO) return "Senior/Junior NAV Ratio (%)";
        if (metric == TriggerMetric.TIME_SINCE_EPOCH) return "Time Since Epoch (seconds)";
        if (metric == TriggerMetric.TOTAL_RETURN) return "Total Return (%)";
        return "Unknown";
    }
    
    /**
     * @dev Operator açıklamasını getir
     */
    function getOperatorDescription(ComparisonOperator operator) external pure returns (string memory) {
        if (operator == ComparisonOperator.GREATER_THAN) return ">";
        if (operator == ComparisonOperator.LESS_THAN) return "<";
        if (operator == ComparisonOperator.GREATER_EQUAL) return ">=";
        if (operator == ComparisonOperator.LESS_EQUAL) return "<=";
        if (operator == ComparisonOperator.EQUAL) return "==";
        if (operator == ComparisonOperator.NOT_EQUAL) return "!=";
        return "Unknown";
    }
    
    /**
     * @dev Action açıklamasını getir
     */
    function getActionDescription(ActionType actionType) external pure returns (string memory) {
        if (actionType == ActionType.ALLOCATE_TO_SENIOR) return "Move All to Senior";
        if (actionType == ActionType.ALLOCATE_TO_JUNIOR) return "Move All to Junior";
        if (actionType == ActionType.REBALANCE_RATIO) return "Rebalance to Ratio";
        if (actionType == ActionType.PAUSE_DEPOSITS) return "Pause Deposits";
        if (actionType == ActionType.EMERGENCY_WITHDRAW) return "Emergency Withdraw";
        return "Unknown";
    }
    
    /**
     * @dev Admin fonksiyonları
     */
    function updateLimits(
        uint256 _maxMacrosPerUser,
        uint256 _cooldownPeriod
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxMacrosPerUser = _maxMacrosPerUser;
        cooldownPeriod = _cooldownPeriod;
    }
    
    function setTrancheVault(address _trancheVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trancheVault = _trancheVault;
    }
    
    /**
     * @dev Acil durum makro devre dışı bırak
     */
    function emergencyDisableMacro(uint256 macroId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        userMacros[macroId].isActive = false;
        emit MacroUpdated(macroId, false);
    }
}