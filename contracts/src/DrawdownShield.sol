// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DrawdownShield
 * @dev Drawdown Shield — %X'ten fazla düşüş varsa otomatik korumaya geç
 */
contract DrawdownShield is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant SHIELD_MANAGER_ROLE = keccak256("SHIELD_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    struct Shield {
        uint256 shieldId;
        address owner;
        uint256 principal; // Initial investment
        uint256 currentValue; // Current portfolio value
        uint256 highWaterMark; // Highest value reached
        uint256 drawdownThreshold; // Threshold in BPS (e.g., 1000 = 10%)
        uint256 currentDrawdown; // Current drawdown in BPS
        ShieldStatus status;
        ShieldConfig config;
        ProtectionMode protectionMode;
        uint256 createdAt;
        uint256 lastUpdateAt;
    }
    
    enum ShieldStatus {
        ACTIVE,        // Normal operation
        PROTECTED,     // Shield activated due to drawdown
        RECOVERING,    // Recovering from protection
        CLOSED         // Position closed
    }
    
    enum ProtectionMode {
        CASH_OUT,      // Move to cash/stablecoins
        HEDGE,         // Enter hedging positions
        STOP_LOSS,     // Sell position
        GRADUAL_EXIT   // Gradual exit over time
    }
    
    struct ShieldConfig {
        uint256 drawdownThreshold; // BPS
        uint256 recoveryThreshold; // BPS - when to exit protection
        uint256 maxProtectionTime; // Max time in protection (seconds)
        uint256 rebalanceFreency; // How often to check (seconds)
        bool autoRebalance; // Auto-execute protection
        uint256 seniorAllocation; // Normal allocation to senior
        uint256 juniorAllocation; // Normal allocation to junior
        uint256 protectedSeniorAllocation; // Protected allocation
        uint256 protectedJuniorAllocation; // Protected allocation
    }
    
    struct DrawdownEvent {
        uint256 timestamp;
        uint256 shieldId;
        uint256 fromValue;
        uint256 toValue;
        uint256 drawdownPct;
        bool shieldActivated;
        ProtectionMode actionTaken;
    }
    
    struct RecoveryEvent {
        uint256 timestamp;
        uint256 shieldId;
        uint256 fromValue;
        uint256 toValue;
        uint256 recoveryPct;
        bool shieldDeactivated;
    }
    
    mapping(uint256 => Shield) public shields;
    mapping(address => uint256[]) public userShields;
    mapping(uint256 => DrawdownEvent[]) public drawdownHistory;
    mapping(uint256 => RecoveryEvent[]) public recoveryHistory;
    
    uint256 public shieldCounter;
    uint256 public totalProtectedValue;
    address public trancheVault;
    IERC20 public baseAsset;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_INVESTMENT = 1000 * 10**6; // $1000 minimum
    uint256 public constant MAX_DRAWDOWN_THRESHOLD = 5000; // 50% max
    uint256 public constant MIN_DRAWDOWN_THRESHOLD = 100; // 1% min
    
    event ShieldCreated(uint256 indexed shieldId, address indexed owner, uint256 principal, uint256 drawdownThreshold);
    event DrawdownDetected(uint256 indexed shieldId, uint256 drawdownPct, bool shieldActivated);
    event ShieldActivated(uint256 indexed shieldId, uint256 currentValue, ProtectionMode mode);
    event ShieldDeactivated(uint256 indexed shieldId, uint256 currentValue, uint256 recoveryPct);
    event ProtectionExecuted(uint256 indexed shieldId, ProtectionMode mode, uint256 protectedAmount);
    event ValueUpdated(uint256 indexed shieldId, uint256 oldValue, uint256 newValue, uint256 drawdown);
    
    constructor(address _baseAsset, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SHIELD_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        
        baseAsset = IERC20(_baseAsset);
        trancheVault = _trancheVault;
    }
    
    function createShield(
        uint256 investment,
        uint256 drawdownThreshold,
        ProtectionMode protectionMode,
        ShieldConfig calldata config
    ) external returns (uint256 shieldId) {
        require(investment >= MIN_INVESTMENT, "Investment too low");
        require(drawdownThreshold >= MIN_DRAWDOWN_THRESHOLD, "Threshold too low");
        require(drawdownThreshold <= MAX_DRAWDOWN_THRESHOLD, "Threshold too high");
        require(config.seniorAllocation + config.juniorAllocation <= BPS, "Invalid allocation");
        require(config.protectedSeniorAllocation + config.protectedJuniorAllocation <= BPS, "Invalid protected allocation");
        
        shieldCounter++;
        shieldId = shieldCounter;
        
        shields[shieldId] = Shield({
            shieldId: shieldId,
            owner: msg.sender,
            principal: investment,
            currentValue: investment,
            highWaterMark: investment,
            drawdownThreshold: drawdownThreshold,
            currentDrawdown: 0,
            status: ShieldStatus.ACTIVE,
            config: config,
            protectionMode: protectionMode,
            createdAt: block.timestamp,
            lastUpdateAt: block.timestamp
        });
        
        userShields[msg.sender].push(shieldId);
        totalProtectedValue += investment;
        
        // Transfer investment from user
        baseAsset.safeTransferFrom(msg.sender, address(this), investment);
        
        // Initial allocation to tranches
        _allocateToTranches(shieldId, false); // Normal allocation
        
        emit ShieldCreated(shieldId, msg.sender, investment, drawdownThreshold);
        return shieldId;
    }
    
    function updateShieldValue(uint256 shieldId, uint256 newValue) public onlyRole(ORACLE_ROLE) {
        Shield storage shield = shields[shieldId];
        require(shield.status != ShieldStatus.CLOSED, "Shield closed");
        
        uint256 oldValue = shield.currentValue;
        shield.currentValue = newValue;
        shield.lastUpdateAt = block.timestamp;
        
        // Update high water mark
        if (newValue > shield.highWaterMark) {
            shield.highWaterMark = newValue;
        }
        
        // Calculate current drawdown
        uint256 drawdown = shield.highWaterMark > newValue ?
            ((shield.highWaterMark - newValue) * BPS) / shield.highWaterMark : 0;
        
        shield.currentDrawdown = drawdown;
        
        emit ValueUpdated(shieldId, oldValue, newValue, drawdown);
        
        // Check if shield should be activated/deactivated
        _checkShieldTriggers(shieldId);
    }
    
    function _checkShieldTriggers(uint256 shieldId) internal {
        Shield storage shield = shields[shieldId];
        
        if (shield.status == ShieldStatus.ACTIVE) {
            // Check if drawdown threshold is breached
            if (shield.currentDrawdown >= shield.drawdownThreshold) {
                _activateShield(shieldId);
            }
        } else if (shield.status == ShieldStatus.PROTECTED) {
            // Check if recovery threshold is met
            uint256 recoveryFromLow = shield.currentValue > shield.principal ?
                ((shield.currentValue - shield.principal) * BPS) / shield.principal : 0;
            
            if (recoveryFromLow >= shield.config.recoveryThreshold) {
                _deactivateShield(shieldId);
            }
            
            // Check max protection time
            if (block.timestamp >= shield.lastUpdateAt + shield.config.maxProtectionTime) {
                _deactivateShield(shieldId);
            }
        }
    }
    
    function _activateShield(uint256 shieldId) internal {
        Shield storage shield = shields[shieldId];
        
        shield.status = ShieldStatus.PROTECTED;
        
        // Record drawdown event
        drawdownHistory[shieldId].push(DrawdownEvent({
            timestamp: block.timestamp,
            shieldId: shieldId,
            fromValue: shield.highWaterMark,
            toValue: shield.currentValue,
            drawdownPct: shield.currentDrawdown,
            shieldActivated: true,
            actionTaken: shield.protectionMode
        }));
        
        emit DrawdownDetected(shieldId, shield.currentDrawdown, true);
        emit ShieldActivated(shieldId, shield.currentValue, shield.protectionMode);
        
        // Execute protection if auto-rebalance is enabled
        if (shield.config.autoRebalance) {
            _executeProtection(shieldId);
        }
    }
    
    function _deactivateShield(uint256 shieldId) internal {
        Shield storage shield = shields[shieldId];
        
        shield.status = ShieldStatus.RECOVERING;
        
        uint256 recoveryPct = shield.currentValue > shield.principal ?
            ((shield.currentValue - shield.principal) * BPS) / shield.principal : 0;
        
        // Record recovery event
        recoveryHistory[shieldId].push(RecoveryEvent({
            timestamp: block.timestamp,
            shieldId: shieldId,
            fromValue: shield.principal, // Recovery from initial
            toValue: shield.currentValue,
            recoveryPct: recoveryPct,
            shieldDeactivated: true
        }));
        
        emit ShieldDeactivated(shieldId, shield.currentValue, recoveryPct);
        
        // Return to normal allocation
        _allocateToTranches(shieldId, false);
        
        // Set back to active after a delay
        shield.status = ShieldStatus.ACTIVE;
    }
    
    function _executeProtection(uint256 shieldId) internal {
        Shield storage shield = shields[shieldId];
        
        if (shield.protectionMode == ProtectionMode.CASH_OUT) {
            // Move to all senior (safer) allocation
            _allocateToTranches(shieldId, true);
        } else if (shield.protectionMode == ProtectionMode.STOP_LOSS) {
            // Close position entirely
            _closeShield(shieldId);
            return;
        } else if (shield.protectionMode == ProtectionMode.GRADUAL_EXIT) {
            // Gradually move to safer allocation
            _allocateToTranches(shieldId, true);
        }
        // HEDGE mode would require additional hedge instruments
        
        emit ProtectionExecuted(shieldId, shield.protectionMode, shield.currentValue);
    }
    
    function _allocateToTranches(uint256 shieldId, bool useProtectedAllocation) internal {
        Shield storage shield = shields[shieldId];
        
        uint256 seniorAllocation;
        uint256 juniorAllocation;
        
        if (useProtectedAllocation) {
            seniorAllocation = shield.config.protectedSeniorAllocation;
            juniorAllocation = shield.config.protectedJuniorAllocation;
        } else {
            seniorAllocation = shield.config.seniorAllocation;
            juniorAllocation = shield.config.juniorAllocation;
        }
        
        uint256 seniorAmount = (shield.currentValue * seniorAllocation) / BPS;
        uint256 juniorAmount = (shield.currentValue * juniorAllocation) / BPS;
        
        // In full implementation, would interact with actual tranche vault
        // TrancheVault(trancheVault).rebalance(seniorAmount, juniorAmount);
    }
    
    function manualProtectionTrigger(uint256 shieldId) external {
        Shield storage shield = shields[shieldId];
        require(shield.owner == msg.sender, "Not shield owner");
        require(shield.status == ShieldStatus.ACTIVE, "Shield not active");
        
        _activateShield(shieldId);
        _executeProtection(shieldId);
    }
    
    function manualRecoveryTrigger(uint256 shieldId) external {
        Shield storage shield = shields[shieldId];
        require(shield.owner == msg.sender, "Not shield owner");
        require(shield.status == ShieldStatus.PROTECTED, "Shield not protected");
        
        _deactivateShield(shieldId);
    }
    
    function _closeShield(uint256 shieldId) internal {
        Shield storage shield = shields[shieldId];
        
        shield.status = ShieldStatus.CLOSED;
        totalProtectedValue -= shield.currentValue;
        
        // Return funds to owner
        baseAsset.safeTransfer(shield.owner, shield.currentValue);
    }
    
    function withdrawShield(uint256 shieldId) external nonReentrant {
        Shield storage shield = shields[shieldId];
        require(shield.owner == msg.sender, "Not shield owner");
        require(shield.status != ShieldStatus.CLOSED, "Already closed");
        
        _closeShield(shieldId);
    }
    
    function updateShieldConfig(
        uint256 shieldId,
        ShieldConfig calldata newConfig
    ) external {
        Shield storage shield = shields[shieldId];
        require(shield.owner == msg.sender, "Not shield owner");
        require(newConfig.drawdownThreshold >= MIN_DRAWDOWN_THRESHOLD, "Threshold too low");
        require(newConfig.drawdownThreshold <= MAX_DRAWDOWN_THRESHOLD, "Threshold too high");
        
        shield.config = newConfig;
        shield.drawdownThreshold = newConfig.drawdownThreshold;
    }
    
    function getShieldInfo(uint256 shieldId) external view returns (
        Shield memory shield,
        uint256 unrealizedPnL,
        uint256 realizedPnL,
        uint256 timeInProtection
    ) {
        shield = shields[shieldId];
        
        // Calculate PnL
        if (shield.currentValue >= shield.principal) {
            unrealizedPnL = shield.currentValue - shield.principal;
        } else {
            unrealizedPnL = 0; // Loss represented separately
        }
        
        realizedPnL = 0; // Would track actual realized gains/losses
        
        // Calculate time in protection
        if (shield.status == ShieldStatus.PROTECTED) {
            timeInProtection = block.timestamp - shield.lastUpdateAt;
        } else {
            timeInProtection = 0;
        }
    }
    
    function getUserShields(address user) external view returns (uint256[] memory) {
        return userShields[user];
    }
    
    function getDrawdownHistory(uint256 shieldId, uint256 limit) external view returns (DrawdownEvent[] memory) {
        DrawdownEvent[] storage history = drawdownHistory[shieldId];
        uint256 length = history.length > limit ? limit : history.length;
        
        DrawdownEvent[] memory recentHistory = new DrawdownEvent[](length);
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i]; // Latest first
        }
        
        return recentHistory;
    }
    
    function getRecoveryHistory(uint256 shieldId, uint256 limit) external view returns (RecoveryEvent[] memory) {
        RecoveryEvent[] storage history = recoveryHistory[shieldId];
        uint256 length = history.length > limit ? limit : history.length;
        
        RecoveryEvent[] memory recentHistory = new RecoveryEvent[](length);
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i]; // Latest first
        }
        
        return recentHistory;
    }
    
    function getShieldsRequiringAttention() external view returns (uint256[] memory) {
        // Return shields that are near threshold or have been in protection too long
        uint256[] memory attentionNeeded = new uint256[](shieldCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= shieldCounter; i++) {
            Shield storage shield = shields[i];
            
            if (shield.status == ShieldStatus.ACTIVE) {
                // Near threshold (80% of threshold)
                if (shield.currentDrawdown >= (shield.drawdownThreshold * 8000) / BPS) {
                    attentionNeeded[count] = i;
                    count++;
                }
            } else if (shield.status == ShieldStatus.PROTECTED) {
                // Too long in protection
                if (block.timestamp >= shield.lastUpdateAt + shield.config.maxProtectionTime) {
                    attentionNeeded[count] = i;
                    count++;
                }
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = attentionNeeded[i];
        }
        
        return result;
    }
    
    function batchUpdateValues(
        uint256[] calldata shieldIds,
        uint256[] calldata newValues
    ) external onlyRole(ORACLE_ROLE) {
        require(shieldIds.length == newValues.length, "Array length mismatch");
        
        for (uint256 i = 0; i < shieldIds.length; i++) {
            updateShieldValue(shieldIds[i], newValues[i]);
        }
    }
}