// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AutoCallableBufferNote
 * @dev AutoCallable Buffer Note — Belirli seviyeye ulaştığında otomatik ödeme
 */
contract AutoCallableBufferNote is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant NOTE_MANAGER_ROLE = keccak256("NOTE_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct BufferNote {
        uint256 noteId;
        address owner;
        uint256 principal; // Initial investment
        uint256 currentValue; // Current portfolio value
        BufferNoteConfig config;
        NoteStatus status;
        uint256 createdAt;
        uint256 lastObservationDate;
        uint256 nextObservationDate;
        CallEvent[] callEvents;
        BarrierEvent[] barrierEvents;
    }
    
    struct BufferNoteConfig {
        uint256 callBarrier; // BPS - price level for auto-call (e.g., 10500 = 105%)
        uint256 bufferLevel; // BPS - protection level (e.g., 8000 = 80% protection)
        uint256 couponRate; // BPS - annual coupon rate
        uint256 maturityTime; // Timestamp when note matures
        uint256 observationFrequency; // How often to check call/barrier (seconds)
        uint256 maxPayoutMultiplier; // BPS - max payout (e.g., 15000 = 150%)
        bool knockInOccurred; // Has the barrier been breached
        bool autoCallEnabled; // Enable automatic calling
        uint256 gracePeriod; // Time before barrier breach takes effect
    }
    
    enum NoteStatus {
        ACTIVE,        // Note is active and earning
        CALLED,        // Auto-called, waiting for payout
        BARRIER_HIT,   // Barrier breached, principal at risk  
        MATURED,       // Reached maturity
        PAID_OUT,      // Final payout completed
        CANCELLED      // Cancelled before maturity
    }
    
    struct CallEvent {
        uint256 timestamp;
        uint256 underlyingPrice; // Price at time of call
        uint256 callLevel; // Call barrier that was hit
        uint256 payoutAmount;
        uint256 couponPayment;
        bool executed;
    }
    
    struct BarrierEvent {
        uint256 timestamp;
        uint256 underlyingPrice;
        uint256 barrierLevel;
        bool knockInActivated;
        uint256 gracePeriodEnd;
    }
    
    struct ObservationData {
        uint256 timestamp;
        uint256 price; // Underlying asset price in BPS (10000 = 100%)
        bool callTriggered;
        bool barrierBreached;
    }
    
    mapping(uint256 => BufferNote) public bufferNotes;
    mapping(address => uint256[]) public userNotes;
    mapping(uint256 => ObservationData[]) public priceHistory;
    
    uint256 public noteCounter;
    uint256 public totalNotionalValue;
    address public underlyingAsset;
    address public trancheVault;
    IERC20 public baseAsset;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_INVESTMENT = 1000 * 10**6; // $1000 minimum
    uint256 public constant MAX_CALL_BARRIER = 20000; // 200% max call barrier
    uint256 public constant MIN_BUFFER_LEVEL = 5000; // 50% min buffer protection
    uint256 public constant DEFAULT_OBSERVATION_FREQUENCY = 1 days;
    
    event BufferNoteCreated(uint256 indexed noteId, address indexed owner, uint256 principal, uint256 callBarrier, uint256 bufferLevel);
    event CallTriggered(uint256 indexed noteId, uint256 underlyingPrice, uint256 payoutAmount);
    event BarrierBreached(uint256 indexed noteId, uint256 underlyingPrice, uint256 bufferLevel);
    event CouponPaid(uint256 indexed noteId, uint256 couponAmount);
    event NotePaidOut(uint256 indexed noteId, uint256 finalPayment);
    event PriceObserved(uint256 indexed noteId, uint256 price, bool callTriggered, bool barrierBreached);
    
    constructor(
        address _baseAsset,
        address _underlyingAsset,
        address _trancheVault
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(NOTE_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        baseAsset = IERC20(_baseAsset);
        underlyingAsset = _underlyingAsset;
        trancheVault = _trancheVault;
    }
    
    function createBufferNote(
        uint256 investment,
        uint256 callBarrier,
        uint256 bufferLevel,
        uint256 couponRate,
        uint256 maturityDays,
        bool autoCallEnabled
    ) external returns (uint256 noteId) {
        require(investment >= MIN_INVESTMENT, "Investment too low");
        require(callBarrier > BPS && callBarrier <= MAX_CALL_BARRIER, "Invalid call barrier");
        require(bufferLevel >= MIN_BUFFER_LEVEL && bufferLevel < BPS, "Invalid buffer level");
        require(maturityDays >= 30 && maturityDays <= 1095, "Invalid maturity"); // 30 days to 3 years
        
        noteCounter++;
        noteId = noteCounter;
        
        uint256 maturityTime = block.timestamp + (maturityDays * 1 days);
        
        BufferNoteConfig memory config = BufferNoteConfig({
            callBarrier: callBarrier,
            bufferLevel: bufferLevel,
            couponRate: couponRate,
            maturityTime: maturityTime,
            observationFrequency: DEFAULT_OBSERVATION_FREQUENCY,
            maxPayoutMultiplier: 15000, // 150% max
            knockInOccurred: false,
            autoCallEnabled: autoCallEnabled,
            gracePeriod: 7 days
        });
        
        bufferNotes[noteId] = BufferNote({
            noteId: noteId,
            owner: msg.sender,
            principal: investment,
            currentValue: investment,
            config: config,
            status: NoteStatus.ACTIVE,
            createdAt: block.timestamp,
            lastObservationDate: block.timestamp,
            nextObservationDate: block.timestamp + DEFAULT_OBSERVATION_FREQUENCY,
            callEvents: new CallEvent[](0),
            barrierEvents: new BarrierEvent[](0)
        });
        
        userNotes[msg.sender].push(noteId);
        totalNotionalValue += investment;
        
        // Transfer investment from user
        baseAsset.safeTransferFrom(msg.sender, address(this), investment);
        
        // Allocate to tranches (initially conservative until we know performance)
        _allocateToTranches(noteId, 7000, 3000); // 70% senior, 30% junior initially
        
        emit BufferNoteCreated(noteId, msg.sender, investment, callBarrier, bufferLevel);
        return noteId;
    }
    
    function observePrice(uint256 underlyingPrice) external onlyRole(ORACLE_ROLE) {
        // Check all active notes for call/barrier triggers
        for (uint256 i = 1; i <= noteCounter; i++) {
            BufferNote storage note = bufferNotes[i];
            
            if (note.status == NoteStatus.ACTIVE && block.timestamp >= note.nextObservationDate) {
                _processObservation(i, underlyingPrice);
            }
        }
    }
    
    function _processObservation(uint256 noteId, uint256 underlyingPrice) internal {
        BufferNote storage note = bufferNotes[noteId];
        
        bool callTriggered = false;
        bool barrierBreached = false;
        
        // Check for call trigger
        if (underlyingPrice >= note.config.callBarrier && note.config.autoCallEnabled) {
            callTriggered = true;
            _triggerCall(noteId, underlyingPrice);
        }
        
        // Check for barrier breach
        if (underlyingPrice <= note.config.bufferLevel && !note.config.knockInOccurred) {
            barrierBreached = true;
            _triggerBarrierBreach(noteId, underlyingPrice);
        }
        
        // Record observation
        priceHistory[noteId].push(ObservationData({
            timestamp: block.timestamp,
            price: underlyingPrice,
            callTriggered: callTriggered,
            barrierBreached: barrierBreached
        }));
        
        // Update observation dates
        note.lastObservationDate = block.timestamp;
        note.nextObservationDate = block.timestamp + note.config.observationFrequency;
        
        emit PriceObserved(noteId, underlyingPrice, callTriggered, barrierBreached);
        
        // Check if matured
        if (block.timestamp >= note.config.maturityTime && note.status == NoteStatus.ACTIVE) {
            _matureNote(noteId, underlyingPrice);
        }
    }
    
    function _triggerCall(uint256 noteId, uint256 underlyingPrice) internal {
        BufferNote storage note = bufferNotes[noteId];
        
        // Calculate payout amount
        uint256 performanceRatio = (underlyingPrice * BPS) / BPS; // Price appreciation
        uint256 payoutMultiplier = performanceRatio > note.config.maxPayoutMultiplier ?
            note.config.maxPayoutMultiplier : performanceRatio;
        
        uint256 payoutAmount = (note.principal * payoutMultiplier) / BPS;
        
        // Calculate accrued coupon
        uint256 timeElapsed = block.timestamp - note.createdAt;
        uint256 couponPayment = (note.principal * note.config.couponRate * timeElapsed) / (BPS * 365 days);
        
        // Create call event
        CallEvent memory callEvent = CallEvent({
            timestamp: block.timestamp,
            underlyingPrice: underlyingPrice,
            callLevel: note.config.callBarrier,
            payoutAmount: payoutAmount,
            couponPayment: couponPayment,
            executed: false
        });
        
        note.callEvents.push(callEvent);
        note.status = NoteStatus.CALLED;
        
        emit CallTriggered(noteId, underlyingPrice, payoutAmount);
        
        // Execute payout if auto-call is enabled
        if (note.config.autoCallEnabled) {
            _executePayout(noteId);
        }
    }
    
    function _triggerBarrierBreach(uint256 noteId, uint256 underlyingPrice) internal {
        BufferNote storage note = bufferNotes[noteId];
        
        note.config.knockInOccurred = true;
        
        BarrierEvent memory barrierEvent = BarrierEvent({
            timestamp: block.timestamp,
            underlyingPrice: underlyingPrice,
            barrierLevel: note.config.bufferLevel,
            knockInActivated: true,
            gracePeriodEnd: block.timestamp + note.config.gracePeriod
        });
        
        note.barrierEvents.push(barrierEvent);
        
        // Wait for grace period before changing status
        if (block.timestamp >= barrierEvent.gracePeriodEnd) {
            note.status = NoteStatus.BARRIER_HIT;
        }
        
        emit BarrierBreached(noteId, underlyingPrice, note.config.bufferLevel);
        
        // Adjust allocation to more defensive posture
        _allocateToTranches(noteId, 9000, 1000); // 90% senior, 10% junior
    }
    
    function _matureNote(uint256 noteId, uint256 finalPrice) internal {
        BufferNote storage note = bufferNotes[noteId];
        
        note.status = NoteStatus.MATURED;
        
        // Calculate final payout based on barrier breach status
        uint256 finalPayout;
        
        if (!note.config.knockInOccurred) {
            // No barrier breach - return principal plus coupon
            uint256 totalCoupon = (note.principal * note.config.couponRate * 
                (note.config.maturityTime - note.createdAt)) / (BPS * 365 days);
            finalPayout = note.principal + totalCoupon;
        } else {
            // Barrier was breached - payout depends on final price vs buffer level
            if (finalPrice >= note.config.bufferLevel) {
                // Recovered above buffer - return principal
                finalPayout = note.principal;
            } else {
                // Below buffer - principal loss
                uint256 lossRatio = (note.config.bufferLevel - finalPrice) * BPS / note.config.bufferLevel;
                finalPayout = note.principal - (note.principal * lossRatio / BPS);
            }
        }
        
        note.currentValue = finalPayout;
        _executePayout(noteId);
    }
    
    function _executePayout(uint256 noteId) internal {
        BufferNote storage note = bufferNotes[noteId];
        require(note.status == NoteStatus.CALLED || note.status == NoteStatus.MATURED, "Note not ready for payout");
        
        uint256 payoutAmount = note.currentValue;
        
        // Mark as paid out
        note.status = NoteStatus.PAID_OUT;
        totalNotionalValue -= note.principal;
        
        // Transfer payout to owner
        baseAsset.safeTransfer(note.owner, payoutAmount);
        
        emit NotePaidOut(noteId, payoutAmount);
    }
    
    function manualCall(uint256 noteId) external {
        BufferNote storage note = bufferNotes[noteId];
        require(note.owner == msg.sender, "Not note owner");
        require(note.status == NoteStatus.CALLED, "Not callable");
        
        _executePayout(noteId);
    }
    
    function _allocateToTranches(uint256 noteId, uint256 seniorBps, uint256 juniorBps) internal {
        BufferNote storage note = bufferNotes[noteId];
        
        uint256 seniorAmount = (note.currentValue * seniorBps) / BPS;
        uint256 juniorAmount = (note.currentValue * juniorBps) / BPS;
        
        // In full implementation, would interact with actual tranche vault
        // TrancheVault(trancheVault).rebalance(seniorAmount, juniorAmount);
    }
    
    function updateNoteValue(uint256 noteId, uint256 newValue) external onlyRole(ORACLE_ROLE) {
        BufferNote storage note = bufferNotes[noteId];
        require(note.status == NoteStatus.ACTIVE || note.status == NoteStatus.BARRIER_HIT, "Invalid status");
        
        note.currentValue = newValue;
    }
    
    function payCoupon(uint256 noteId) external onlyRole(KEEPER_ROLE) {
        BufferNote storage note = bufferNotes[noteId];
        require(note.status == NoteStatus.ACTIVE, "Note not active");
        
        uint256 timeElapsed = block.timestamp - note.lastObservationDate;
        uint256 couponPayment = (note.principal * note.config.couponRate * timeElapsed) / (BPS * 365 days);
        
        if (couponPayment > 0) {
            baseAsset.safeTransfer(note.owner, couponPayment);
            emit CouponPaid(noteId, couponPayment);
        }
    }
    
    function getNoteInfo(uint256 noteId) external view returns (
        BufferNote memory note,
        uint256 timeToMaturity,
        uint256 accruedCoupon,
        uint256 currentYield
    ) {
        note = bufferNotes[noteId];
        
        timeToMaturity = note.config.maturityTime > block.timestamp ?
            note.config.maturityTime - block.timestamp : 0;
        
        uint256 timeElapsed = block.timestamp - note.createdAt;
        accruedCoupon = (note.principal * note.config.couponRate * timeElapsed) / (BPS * 365 days);
        
        currentYield = timeElapsed > 0 ?
            (accruedCoupon * 365 days * BPS) / (note.principal * timeElapsed) : 0;
    }
    
    function getUserNotes(address user) external view returns (uint256[] memory) {
        return userNotes[user];
    }
    
    function getPriceHistory(uint256 noteId, uint256 limit) external view returns (ObservationData[] memory) {
        ObservationData[] storage history = priceHistory[noteId];
        uint256 length = history.length > limit ? limit : history.length;
        
        ObservationData[] memory recentHistory = new ObservationData[](length);
        for (uint256 i = 0; i < length; i++) {
            recentHistory[i] = history[history.length - 1 - i]; // Latest first
        }
        
        return recentHistory;
    }
    
    function getNotesRequiringObservation() external view returns (uint256[] memory) {
        uint256[] memory needsObservation = new uint256[](noteCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= noteCounter; i++) {
            BufferNote storage note = bufferNotes[i];
            
            if (note.status == NoteStatus.ACTIVE && block.timestamp >= note.nextObservationDate) {
                needsObservation[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = needsObservation[i];
        }
        
        return result;
    }
    
    function batchProcessObservations(
        uint256[] calldata noteIds,
        uint256 underlyingPrice
    ) external onlyRole(ORACLE_ROLE) {
        for (uint256 i = 0; i < noteIds.length; i++) {
            _processObservation(noteIds[i], underlyingPrice);
        }
    }
    
    function cancelNote(uint256 noteId) external {
        BufferNote storage note = bufferNotes[noteId];
        require(note.owner == msg.sender, "Not note owner");
        require(note.status == NoteStatus.ACTIVE, "Cannot cancel");
        require(block.timestamp <= note.createdAt + 1 days, "Cancellation period expired");
        
        note.status = NoteStatus.CANCELLED;
        totalNotionalValue -= note.principal;
        
        // Return principal (minus small cancellation fee)
        uint256 cancellationFee = (note.principal * 50) / BPS; // 0.5% fee
        uint256 refund = note.principal - cancellationFee;
        
        baseAsset.safeTransfer(note.owner, refund);
    }
}