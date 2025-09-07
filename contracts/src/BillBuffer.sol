// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BillBuffer
 * @dev Fatura tarihine kadar mikro birikim sistemi - gününde hazır
 */
contract BillBuffer is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct BillBuffer {
        uint256 bufferId;
        address owner;
        string billName;             // "Electricity Bill Oct 2024"
        uint256 billAmount;          // Hedef tutar
        uint256 dueDate;             // Fatura son ödeme tarihi
        uint256 startDate;           // Birikim başlangıç tarihi
        uint256 currentBalance;      // Mevcut birikim
        uint256 dailyTarget;         // Günlük hedef miktar
        address payee;               // Fatura ödenecek adres
        bool isActive;
        bool isPaid;
        BufferStrategy strategy;
    }
    
    enum BufferStrategy {
        DAILY_EQUAL,        // Eşit günlük ödemeler
        SENIOR_YIELD,       // Senior tranche getirisiyle
        PROGRESSIVE,        // Artan ödemeler (son hafta daha fazla)
        AGGRESSIVE_START,   // İlk hafta agresif, sonra yavaş
        INTEREST_COMPOUND   // Biriken faiz ile büyütme
    }
    
    struct MicroContribution {
        uint256 contributionId;
        uint256 bufferId;
        uint256 amount;
        uint256 timestamp;
        ContributionType contributionType;
        string source;              // "Daily auto", "Manual", "Yield earning"
    }
    
    enum ContributionType {
        MANUAL,
        AUTOMATIC_DAILY,
        YIELD_COMPOUND,
        SPARE_CHANGE,      // Bozuk para yuvarlaması
        EXTERNAL_TRIGGER   // Dış tetikleyici (maaş, bonus vs.)
    }
    
    struct BufferAnalytics {
        uint256 bufferId;
        uint256 totalContributions;
        uint256 averageDailyRate;
        uint256 projectedCompletion; // Tahmini tamamlanma tarihi
        uint256 riskScore;           // 0-100 (100 = yüksek risk, yetiştirmeme)
        bool onTrack;
    }
    
    IERC20 public paymentToken;
    address public trancheVault;
    
    uint256 public bufferCounter;
    uint256 public contributionCounter;
    
    mapping(uint256 => BillBuffer) public billBuffers;
    mapping(address => uint256[]) public userBuffers;
    mapping(uint256 => MicroContribution[]) public bufferContributions;
    mapping(uint256 => BufferAnalytics) public bufferAnalytics;
    
    // Global settings
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_BUFFER_DAYS = 7;        // Min 7 gün önceden
    uint256 public constant MAX_BUFFER_DAYS = 365;      // Max 1 yıl önceden
    uint256 public defaultSpareChangeThreshold = 100;   // $1 altı yuvarla
    
    event BillBufferCreated(
        uint256 indexed bufferId,
        address indexed owner,
        string billName,
        uint256 billAmount,
        uint256 dueDate,
        BufferStrategy strategy
    );
    
    event MicroContributionMade(
        uint256 indexed bufferId,
        uint256 indexed contributionId,
        uint256 amount,
        ContributionType contributionType
    );
    
    event BillPaid(
        uint256 indexed bufferId,
        address indexed payee,
        uint256 amount,
        uint256 excessAmount
    );
    
    event BufferCompleted(
        uint256 indexed bufferId,
        uint256 finalAmount,
        uint256 daysEarly
    );
    
    event RiskAlert(
        uint256 indexed bufferId,
        uint256 riskScore,
        uint256 shortfall,
        uint256 daysRemaining
    );
    
    error BufferNotFound();
    error InsufficientTime();
    error BufferAlreadyPaid();
    error InsufficientBalance();
    error InvalidStrategy();
    error BillOverdue();
    
    constructor(
        address _paymentToken,
        address _trancheVault
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        paymentToken = IERC20(_paymentToken);
        trancheVault = _trancheVault;
    }
    
    /**
     * @dev Yeni bill buffer oluştur
     */
    function createBillBuffer(
        string calldata billName,
        uint256 billAmount,
        uint256 dueDate,
        address payee,
        BufferStrategy strategy
    ) external returns (uint256 bufferId) {
        if (dueDate <= block.timestamp + MIN_BUFFER_DAYS * 1 days) revert InsufficientTime();
        if (dueDate > block.timestamp + MAX_BUFFER_DAYS * 1 days) revert InsufficientTime();
        
        bufferCounter++;
        bufferId = bufferCounter;
        
        uint256 daysUntilDue = (dueDate - block.timestamp) / 1 days;
        uint256 dailyTarget = billAmount / daysUntilDue;
        
        billBuffers[bufferId] = BillBuffer({
            bufferId: bufferId,
            owner: msg.sender,
            billName: billName,
            billAmount: billAmount,
            dueDate: dueDate,
            startDate: block.timestamp,
            currentBalance: 0,
            dailyTarget: dailyTarget,
            payee: payee,
            isActive: true,
            isPaid: false,
            strategy: strategy
        });
        
        userBuffers[msg.sender].push(bufferId);
        
        // Analytics initialize
        bufferAnalytics[bufferId] = BufferAnalytics({
            bufferId: bufferId,
            totalContributions: 0,
            averageDailyRate: 0,
            projectedCompletion: dueDate,
            riskScore: 50, // Orta risk ile başla
            onTrack: true
        });
        
        emit BillBufferCreated(bufferId, msg.sender, billName, billAmount, dueDate, strategy);
        
        return bufferId;
    }
    
    /**
     * @dev Manuel contribution yap
     */
    function contributeToBuffer(uint256 bufferId, uint256 amount) external nonReentrant {
        BillBuffer storage buffer = billBuffers[bufferId];
        if (buffer.bufferId == 0) revert BufferNotFound();
        if (buffer.owner != msg.sender) revert BufferNotFound();
        if (!buffer.isActive || buffer.isPaid) revert BufferAlreadyPaid();
        
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        _addContribution(bufferId, amount, ContributionType.MANUAL, "Manual contribution");
        
        // Buffer'a yatır ve yield'e koy
        _processContribution(bufferId, amount);
    }
    
    /**
     * @dev Otomatik günlük contribution (Keeper tarafından çağrılır)
     */
    function processAutomaticContributions() external onlyRole(KEEPER_ROLE) {
        for (uint256 i = 1; i <= bufferCounter; i++) {
            BillBuffer storage buffer = billBuffers[i];
            
            if (buffer.isActive && !buffer.isPaid && block.timestamp < buffer.dueDate) {
                uint256 requiredAmount = _calculateDailyContribution(i);
                
                if (requiredAmount > 0 && paymentToken.balanceOf(buffer.owner) >= requiredAmount) {
                    // Owner'dan otomatik çek (pre-approved olmalı)
                    try paymentToken.transferFrom(buffer.owner, address(this), requiredAmount) {
                        _addContribution(i, requiredAmount, ContributionType.AUTOMATIC_DAILY, "Daily auto-contribution");
                        _processContribution(i, requiredAmount);
                    } catch {
                        // Transfer başarısız - risk score artır
                        _updateRiskScore(i, true);
                    }
                }
            }
        }
    }
    
    /**
     * @dev Spare change yuvarlaması (mikro contributions)
     */
    function processSpareChange(uint256 transactionAmount) external {
        if (transactionAmount <= defaultSpareChangeThreshold) return;
        
        uint256 spareChange = defaultSpareChangeThreshold - (transactionAmount % defaultSpareChangeThreshold);
        if (spareChange == 0 || spareChange > 99) return; // Max $0.99
        
        // Kullanıcının aktif bufferlarına dağıt
        uint256[] memory userBufferIds = userBuffers[msg.sender];
        if (userBufferIds.length == 0) return;
        
        uint256 perBuffer = spareChange / userBufferIds.length;
        if (perBuffer == 0) return;
        
        for (uint256 i = 0; i < userBufferIds.length; i++) {
            uint256 bufferId = userBufferIds[i];
            BillBuffer storage buffer = billBuffers[bufferId];
            
            if (buffer.isActive && !buffer.isPaid) {
                try paymentToken.transferFrom(msg.sender, address(this), perBuffer) {
                    _addContribution(bufferId, perBuffer, ContributionType.SPARE_CHANGE, "Spare change rounding");
                    _processContribution(bufferId, perBuffer);
                } catch {
                    // Ignore failed transfers
                }
            }
        }
    }
    
    /**
     * @dev Faturayı öde (due date geldiğinde)
     */
    function payBill(uint256 bufferId) external nonReentrant {
        BillBuffer storage buffer = billBuffers[bufferId];
        if (buffer.bufferId == 0) revert BufferNotFound();
        if (buffer.isPaid) revert BufferAlreadyPaid();
        if (block.timestamp < buffer.dueDate) revert BillOverdue();
        
        if (buffer.currentBalance < buffer.billAmount) {
            _updateRiskScore(bufferId, true);
            revert InsufficientBalance();
        }
        
        // Faturayı öde
        paymentToken.safeTransfer(buffer.payee, buffer.billAmount);
        
        // Fazla kalan tutarı owner'a iade et
        uint256 excess = buffer.currentBalance - buffer.billAmount;
        if (excess > 0) {
            paymentToken.safeTransfer(buffer.owner, excess);
        }
        
        buffer.isPaid = true;
        buffer.isActive = false;
        
        emit BillPaid(bufferId, buffer.payee, buffer.billAmount, excess);
        
        uint256 daysEarly = buffer.dueDate > block.timestamp ? 
            (buffer.dueDate - block.timestamp) / 1 days : 0;
            
        emit BufferCompleted(bufferId, buffer.currentBalance, daysEarly);
    }
    
    /**
     * @dev Contribution'ı işle ve yield stratejisine göre yatır
     */
    function _processContribution(uint256 bufferId, uint256 amount) internal {
        BillBuffer storage buffer = billBuffers[bufferId];
        buffer.currentBalance += amount;
        
        // Strategy'ye göre yield generation
        if (buffer.strategy == BufferStrategy.SENIOR_YIELD) {
            _depositToSeniorTranche(amount, buffer.owner);
        } else if (buffer.strategy == BufferStrategy.INTEREST_COMPOUND) {
            _depositToInterestAccount(bufferId, amount);
        }
        
        _updateBufferAnalytics(bufferId);
    }
    
    /**
     * @dev Günlük contribution miktarını hesapla
     */
    function _calculateDailyContribution(uint256 bufferId) internal view returns (uint256) {
        BillBuffer memory buffer = billBuffers[bufferId];
        if (buffer.dueDate <= block.timestamp) return 0;
        
        uint256 remaining = buffer.billAmount > buffer.currentBalance ? 
            buffer.billAmount - buffer.currentBalance : 0;
        uint256 daysRemaining = (buffer.dueDate - block.timestamp) / 1 days + 1;
        
        if (daysRemaining == 0) return remaining;
        
        if (buffer.strategy == BufferStrategy.DAILY_EQUAL) {
            return remaining / daysRemaining;
        } else if (buffer.strategy == BufferStrategy.PROGRESSIVE) {
            // Son hafta %50 daha fazla
            if (daysRemaining <= 7) {
                return (remaining * 150) / (daysRemaining * 100);
            }
            return remaining / daysRemaining;
        } else if (buffer.strategy == BufferStrategy.AGGRESSIVE_START) {
            // İlk hafta %200, sonra normal
            uint256 daysSinceStart = (block.timestamp - buffer.startDate) / 1 days;
            if (daysSinceStart <= 7) {
                return buffer.dailyTarget * 2;
            }
            return buffer.dailyTarget / 2;
        }
        
        return buffer.dailyTarget;
    }
    
    /**
     * @dev Contribution kaydı ekle
     */
    function _addContribution(
        uint256 bufferId, 
        uint256 amount, 
        ContributionType contributionType, 
        string memory source
    ) internal {
        contributionCounter++;
        
        bufferContributions[bufferId].push(MicroContribution({
            contributionId: contributionCounter,
            bufferId: bufferId,
            amount: amount,
            timestamp: block.timestamp,
            contributionType: contributionType,
            source: source
        }));
        
        emit MicroContributionMade(bufferId, contributionCounter, amount, contributionType);
    }
    
    /**
     * @dev Buffer analytics güncelle
     */
    function _updateBufferAnalytics(uint256 bufferId) internal {
        BillBuffer memory buffer = billBuffers[bufferId];
        BufferAnalytics storage analytics = bufferAnalytics[bufferId];
        
        analytics.totalContributions = bufferContributions[bufferId].length;
        
        uint256 daysElapsed = (block.timestamp - buffer.startDate) / 1 days + 1;
        analytics.averageDailyRate = daysElapsed > 0 ? buffer.currentBalance / daysElapsed : 0;
        
        // Projected completion hesapla
        if (analytics.averageDailyRate > 0) {
            uint256 remaining = buffer.billAmount > buffer.currentBalance ? 
                buffer.billAmount - buffer.currentBalance : 0;
            uint256 daysNeeded = remaining / analytics.averageDailyRate;
            analytics.projectedCompletion = block.timestamp + (daysNeeded * 1 days);
        }
        
        // Risk score hesapla
        _updateRiskScore(bufferId, false);
    }
    
    /**
     * @dev Risk score hesapla ve güncelle
     */
    function _updateRiskScore(uint256 bufferId, bool penalize) internal {
        BillBuffer memory buffer = billBuffers[bufferId];
        BufferAnalytics storage analytics = bufferAnalytics[bufferId];
        
        uint256 daysRemaining = buffer.dueDate > block.timestamp ? 
            (buffer.dueDate - block.timestamp) / 1 days : 0;
        
        uint256 progressPercentage = (buffer.currentBalance * 100) / buffer.billAmount;
        uint256 timeProgressPercentage = ((block.timestamp - buffer.startDate) * 100) / 
                                       (buffer.dueDate - buffer.startDate);
        
        // Risk = time progress - money progress
        int256 riskDelta = int256(timeProgressPercentage) - int256(progressPercentage);
        
        if (riskDelta > 20) {
            analytics.riskScore = 80 + uint256(riskDelta - 20); // High risk
            analytics.onTrack = false;
        } else if (riskDelta > 10) {
            analytics.riskScore = 60 + uint256(riskDelta - 10) * 2; // Medium risk  
        } else {
            analytics.riskScore = 30; // Low risk
            analytics.onTrack = true;
        }
        
        if (penalize) {
            analytics.riskScore += 20;
        }
        
        // Risk alert
        if (analytics.riskScore > 70) {
            uint256 shortfall = buffer.billAmount > buffer.currentBalance ? 
                buffer.billAmount - buffer.currentBalance : 0;
            emit RiskAlert(bufferId, analytics.riskScore, shortfall, daysRemaining);
        }
    }
    
    /**
     * @dev Senior tranche'a yatır (mock)
     */
    function _depositToSeniorTranche(uint256 amount, address user) internal {
        // Mock - gerçekte TrancheVault integration
    }
    
    /**
     * @dev Interest account'a yatır (mock)
     */
    function _depositToInterestAccount(uint256 bufferId, uint256 amount) internal {
        // Mock - gerçekte yield farming integration
    }
    
    /**
     * @dev View functions
     */
    function getUserBuffers(address user) external view returns (uint256[] memory) {
        return userBuffers[user];
    }
    
    function getBufferContributions(uint256 bufferId) external view returns (MicroContribution[] memory) {
        return bufferContributions[bufferId];
    }
    
    function getBufferAnalytics(uint256 bufferId) external view returns (BufferAnalytics memory) {
        return bufferAnalytics[bufferId];
    }
    
    function getActiveBuffersCount(address user) external view returns (uint256 count) {
        uint256[] memory bufferIds = userBuffers[user];
        for (uint256 i = 0; i < bufferIds.length; i++) {
            if (billBuffers[bufferIds[i]].isActive && !billBuffers[bufferIds[i]].isPaid) {
                count++;
            }
        }
    }
    
    /**
     * @dev Admin functions
     */
    function setSpareChangeThreshold(uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultSpareChangeThreshold = threshold;
    }
    
    function emergencyPauseBuffer(uint256 bufferId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        billBuffers[bufferId].isActive = false;
    }
    
    function emergencyWithdraw(uint256 bufferId) external {
        BillBuffer storage buffer = billBuffers[bufferId];
        require(buffer.owner == msg.sender, "Not owner");
        require(!buffer.isPaid, "Already paid");
        
        if (buffer.currentBalance > 0) {
            paymentToken.safeTransfer(buffer.owner, buffer.currentBalance);
            buffer.currentBalance = 0;
            buffer.isActive = false;
        }
    }
}