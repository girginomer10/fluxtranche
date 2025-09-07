// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LadderedEpochs
 * @dev Laddered Epochs — Farklı sürelerde maturity'ler, CD benzeri
 */
contract LadderedEpochs is AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant EPOCH_MANAGER_ROLE = keccak256("EPOCH_MANAGER_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct EpochLadder {
        uint256 ladderId;
        address owner;
        string name; // "Conservative 3-6-12", "Aggressive Weekly"
        EpochRung[] rungs;
        uint256 totalInvestment;
        uint256 totalValue;
        LadderStrategy strategy;
        bool isActive;
        uint256 createdAt;
    }
    
    struct EpochRung {
        uint256 rungId;
        uint256 duration; // Duration in seconds
        uint256 allocation; // Amount allocated to this rung
        uint256 currentValue; // Current value of this rung
        uint256 yield; // Yield earned
        uint256 startTime;
        uint256 maturityTime;
        RungStatus status;
        uint256 seniorRatio; // BPS allocation to senior tranche
        uint256 juniorRatio; // BPS allocation to junior tranche
    }
    
    enum RungStatus {
        PENDING,    // Not yet started
        ACTIVE,     // Currently earning yield
        MATURED,    // Matured, ready for withdrawal/rollover
        ROLLED_OVER // Reinvested into new rung
    }
    
    enum LadderStrategy {
        CONSERVATIVE,  // Longer durations, more senior-heavy
        BALANCED,      // Mix of durations and risk levels
        AGGRESSIVE,    // Shorter durations, more junior-heavy
        CUSTOM         // User-defined allocation
    }
    
    struct LadderTemplate {
        string name;
        uint256[] durations; // In days
        uint256[] allocations; // BPS
        uint256[] seniorRatios; // BPS
        LadderStrategy strategy;
        uint256 minInvestment;
    }
    
    struct MaturityEvent {
        uint256 timestamp;
        uint256 ladderId;
        uint256 rungId;
        uint256 principal;
        uint256 yield;
        uint256 totalValue;
        bool autoRollover;
    }
    
    struct RolloverConfig {
        bool enabled;
        uint256 targetDuration; // Days to rollover to
        uint256 seniorRatio; // New senior allocation
        uint256 juniorRatio; // New junior allocation
        bool compoundYield; // Include yield in rollover
    }
    
    mapping(uint256 => EpochLadder) public ladders;
    mapping(address => uint256[]) public userLadders;
    mapping(uint256 => RolloverConfig) public rolloverConfigs;
    mapping(uint256 => MaturityEvent[]) public maturityHistory;
    
    LadderTemplate[] public templates;
    uint256 public ladderCounter;
    uint256 public totalValueLocked;
    
    IERC20 public baseAsset;
    address public trancheVault;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_DURATION = 1 days;
    uint256 public constant MAX_DURATION = 365 days;
    uint256 public constant MIN_INVESTMENT = 100 * 10**6; // $100 USDC
    
    event LadderCreated(uint256 indexed ladderId, address indexed owner, string name, uint256 totalInvestment);
    event RungMatured(uint256 indexed ladderId, uint256 indexed rungId, uint256 principal, uint256 yield);
    event RungRolledOver(uint256 indexed ladderId, uint256 oldRungId, uint256 newRungId, uint256 amount);
    event YieldClaimed(uint256 indexed ladderId, uint256 totalYield);
    event TemplateAdded(uint256 templateId, string name, LadderStrategy strategy);
    
    constructor(address _baseAsset, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EPOCH_MANAGER_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        baseAsset = IERC20(_baseAsset);
        trancheVault = _trancheVault;
        
        _initializeTemplates();
    }
    
    function createLadderFromTemplate(
        uint256 templateId,
        uint256 investment,
        string calldata customName
    ) external returns (uint256 ladderId) {
        require(templateId < templates.length, "Invalid template");
        require(investment >= templates[templateId].minInvestment, "Investment too low");
        
        LadderTemplate storage template = templates[templateId];
        
        ladderCounter++;
        ladderId = ladderCounter;
        
        string memory ladderName = bytes(customName).length > 0 ? customName : template.name;
        
        EpochLadder storage ladder = ladders[ladderId];
        ladder.ladderId = ladderId;
        ladder.owner = msg.sender;
        ladder.name = ladderName;
        ladder.totalInvestment = investment;
        ladder.totalValue = investment;
        ladder.strategy = template.strategy;
        ladder.isActive = true;
        ladder.createdAt = block.timestamp;
        
        // Create rungs based on template
        for (uint256 i = 0; i < template.durations.length; i++) {
            uint256 rungInvestment = (investment * template.allocations[i]) / BPS;
            uint256 duration = template.durations[i] * 1 days;
            
            ladder.rungs.push(EpochRung({
                rungId: i,
                duration: duration,
                allocation: rungInvestment,
                currentValue: rungInvestment,
                yield: 0,
                startTime: block.timestamp,
                maturityTime: block.timestamp + duration,
                status: RungStatus.ACTIVE,
                seniorRatio: template.seniorRatios[i],
                juniorRatio: BPS - template.seniorRatios[i]
            }));
        }
        
        userLadders[msg.sender].push(ladderId);
        totalValueLocked += investment;
        
        // Transfer investment from user
        baseAsset.safeTransferFrom(msg.sender, address(this), investment);
        
        // Allocate to tranches based on rung configurations
        _allocateToTranches(ladderId);
        
        emit LadderCreated(ladderId, msg.sender, ladderName, investment);
        return ladderId;
    }
    
    function createCustomLadder(
        string calldata name,
        uint256[] calldata durations, // in days
        uint256[] calldata allocations, // BPS
        uint256[] calldata seniorRatios, // BPS
        uint256 investment
    ) external returns (uint256 ladderId) {
        require(durations.length == allocations.length, "Array length mismatch");
        require(allocations.length == seniorRatios.length, "Array length mismatch");
        require(investment >= MIN_INVESTMENT, "Investment too low");
        require(durations.length <= 10, "Too many rungs");
        
        // Validate allocations sum to 100%
        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            totalAllocation += allocations[i];
            require(durations[i] >= MIN_DURATION / 1 days, "Duration too short");
            require(durations[i] <= MAX_DURATION / 1 days, "Duration too long");
            require(seniorRatios[i] <= BPS, "Invalid senior ratio");
        }
        require(totalAllocation == BPS, "Allocations must sum to 100%");
        
        ladderCounter++;
        ladderId = ladderCounter;
        
        EpochLadder storage ladder = ladders[ladderId];
        ladder.ladderId = ladderId;
        ladder.owner = msg.sender;
        ladder.name = name;
        ladder.totalInvestment = investment;
        ladder.totalValue = investment;
        ladder.strategy = LadderStrategy.CUSTOM;
        ladder.isActive = true;
        ladder.createdAt = block.timestamp;
        
        // Create custom rungs
        for (uint256 i = 0; i < durations.length; i++) {
            uint256 rungInvestment = (investment * allocations[i]) / BPS;
            uint256 duration = durations[i] * 1 days;
            
            ladder.rungs.push(EpochRung({
                rungId: i,
                duration: duration,
                allocation: rungInvestment,
                currentValue: rungInvestment,
                yield: 0,
                startTime: block.timestamp,
                maturityTime: block.timestamp + duration,
                status: RungStatus.ACTIVE,
                seniorRatio: seniorRatios[i],
                juniorRatio: BPS - seniorRatios[i]
            }));
        }
        
        userLadders[msg.sender].push(ladderId);
        totalValueLocked += investment;
        
        // Transfer investment from user
        baseAsset.safeTransferFrom(msg.sender, address(this), investment);
        
        // Allocate to tranches
        _allocateToTranches(ladderId);
        
        emit LadderCreated(ladderId, msg.sender, name, investment);
        return ladderId;
    }
    
    function processMaturedRungs(uint256[] calldata ladderIds) external onlyRole(KEEPER_ROLE) {
        for (uint256 i = 0; i < ladderIds.length; i++) {
            _processLadderMaturity(ladderIds[i]);
        }
    }
    
    function _processLadderMaturity(uint256 ladderId) internal {
        EpochLadder storage ladder = ladders[ladderId];
        require(ladder.isActive, "Ladder not active");
        
        for (uint256 i = 0; i < ladder.rungs.length; i++) {
            EpochRung storage rung = ladder.rungs[i];
            
            if (rung.status == RungStatus.ACTIVE && block.timestamp >= rung.maturityTime) {
                // Calculate yield (simplified - in production would get from tranche vault)
                uint256 yieldEarned = _calculateRungYield(ladderId, i);
                rung.yield += yieldEarned;
                rung.currentValue += yieldEarned;
                rung.status = RungStatus.MATURED;
                
                // Record maturity event
                maturityHistory[ladderId].push(MaturityEvent({
                    timestamp: block.timestamp,
                    ladderId: ladderId,
                    rungId: i,
                    principal: rung.allocation,
                    yield: yieldEarned,
                    totalValue: rung.currentValue,
                    autoRollover: rolloverConfigs[ladderId].enabled
                }));
                
                emit RungMatured(ladderId, i, rung.allocation, yieldEarned);
                
                // Auto-rollover if configured
                if (rolloverConfigs[ladderId].enabled) {
                    _rolloverRung(ladderId, i);
                }
            }
        }
    }
    
    function _rolloverRung(uint256 ladderId, uint256 rungId) internal {
        EpochLadder storage ladder = ladders[ladderId];
        EpochRung storage oldRung = ladder.rungs[rungId];
        RolloverConfig storage config = rolloverConfigs[ladderId];
        
        require(oldRung.status == RungStatus.MATURED, "Rung not matured");
        
        uint256 rolloverAmount = config.compoundYield ? 
            oldRung.currentValue : oldRung.allocation;
        
        uint256 newDuration = config.targetDuration * 1 days;
        
        // Create new rung
        ladder.rungs.push(EpochRung({
            rungId: ladder.rungs.length,
            duration: newDuration,
            allocation: rolloverAmount,
            currentValue: rolloverAmount,
            yield: 0,
            startTime: block.timestamp,
            maturityTime: block.timestamp + newDuration,
            status: RungStatus.ACTIVE,
            seniorRatio: config.seniorRatio,
            juniorRatio: config.juniorRatio
        }));
        
        oldRung.status = RungStatus.ROLLED_OVER;
        
        emit RungRolledOver(ladderId, rungId, ladder.rungs.length - 1, rolloverAmount);
    }
    
    function configureAutoRollover(
        uint256 ladderId,
        bool enabled,
        uint256 targetDurationDays,
        uint256 seniorRatio,
        bool compoundYield
    ) external {
        EpochLadder storage ladder = ladders[ladderId];
        require(ladder.owner == msg.sender, "Not ladder owner");
        require(seniorRatio <= BPS, "Invalid senior ratio");
        
        rolloverConfigs[ladderId] = RolloverConfig({
            enabled: enabled,
            targetDuration: targetDurationDays,
            seniorRatio: seniorRatio,
            juniorRatio: BPS - seniorRatio,
            compoundYield: compoundYield
        });
    }
    
    function claimMaturedRungs(uint256 ladderId, uint256[] calldata rungIds) external {
        EpochLadder storage ladder = ladders[ladderId];
        require(ladder.owner == msg.sender, "Not ladder owner");
        
        uint256 totalClaim = 0;
        
        for (uint256 i = 0; i < rungIds.length; i++) {
            uint256 rungId = rungIds[i];
            require(rungId < ladder.rungs.length, "Invalid rung ID");
            
            EpochRung storage rung = ladder.rungs[rungId];
            require(rung.status == RungStatus.MATURED, "Rung not matured");
            
            totalClaim += rung.currentValue;
            ladder.totalValue -= rung.currentValue;
            
            // Mark as claimed by removing value
            rung.currentValue = 0;
        }
        
        if (totalClaim > 0) {
            totalValueLocked -= totalClaim;
            baseAsset.safeTransfer(msg.sender, totalClaim);
            emit YieldClaimed(ladderId, totalClaim);
        }
    }
    
    function _calculateRungYield(uint256 ladderId, uint256 rungId) internal view returns (uint256) {
        EpochLadder storage ladder = ladders[ladderId];
        EpochRung storage rung = ladder.rungs[rungId];
        
        // Simplified yield calculation
        // In production, would query actual tranche performance
        uint256 timeElapsed = block.timestamp - rung.startTime;
        uint256 annualizedReturn = 500; // 5% APY in BPS
        
        // Higher return for junior-heavy allocations
        if (rung.juniorRatio > 5000) { // More than 50% junior
            annualizedReturn = 800; // 8% APY
        }
        
        return (rung.allocation * annualizedReturn * timeElapsed) / (BPS * 365 days);
    }
    
    function _allocateToTranches(uint256 ladderId) internal {
        // In full implementation, would allocate each rung to appropriate tranches
        // For now, just approve tranche vault to spend
        baseAsset.safeApprove(trancheVault, type(uint256).max);
    }
    
    function _initializeTemplates() internal {
        // Conservative template: Long durations, senior-heavy
        uint256[] memory conservativeDurations = new uint256[](3);
        conservativeDurations[0] = 30; // 30 days
        conservativeDurations[1] = 90; // 90 days  
        conservativeDurations[2] = 180; // 180 days
        
        uint256[] memory conservativeAllocations = new uint256[](3);
        conservativeAllocations[0] = 3333; // 33.33%
        conservativeAllocations[1] = 3333; // 33.33%
        conservativeAllocations[2] = 3334; // 33.34%
        
        uint256[] memory conservativeSeniorRatios = new uint256[](3);
        conservativeSeniorRatios[0] = 8000; // 80% senior
        conservativeSeniorRatios[1] = 7000; // 70% senior
        conservativeSeniorRatios[2] = 6000; // 60% senior
        
        templates.push(LadderTemplate({
            name: "Conservative Ladder",
            durations: conservativeDurations,
            allocations: conservativeAllocations,
            seniorRatios: conservativeSeniorRatios,
            strategy: LadderStrategy.CONSERVATIVE,
            minInvestment: MIN_INVESTMENT
        }));
        
        // Aggressive template: Short durations, junior-heavy
        uint256[] memory aggressiveDurations = new uint256[](4);
        aggressiveDurations[0] = 7; // 1 week
        aggressiveDurations[1] = 14; // 2 weeks
        aggressiveDurations[2] = 30; // 1 month
        aggressiveDurations[3] = 60; // 2 months
        
        uint256[] memory aggressiveAllocations = new uint256[](4);
        aggressiveAllocations[0] = 2500; // 25%
        aggressiveAllocations[1] = 2500; // 25%
        aggressiveAllocations[2] = 2500; // 25%
        aggressiveAllocations[3] = 2500; // 25%
        
        uint256[] memory aggressiveSeniorRatios = new uint256[](4);
        aggressiveSeniorRatios[0] = 2000; // 20% senior
        aggressiveSeniorRatios[1] = 3000; // 30% senior
        aggressiveSeniorRatios[2] = 4000; // 40% senior
        aggressiveSeniorRatios[3] = 5000; // 50% senior
        
        templates.push(LadderTemplate({
            name: "Aggressive Ladder",
            durations: aggressiveDurations,
            allocations: aggressiveAllocations,
            seniorRatios: aggressiveSeniorRatios,
            strategy: LadderStrategy.AGGRESSIVE,
            minInvestment: MIN_INVESTMENT
        }));
        
        emit TemplateAdded(0, "Conservative Ladder", LadderStrategy.CONSERVATIVE);
        emit TemplateAdded(1, "Aggressive Ladder", LadderStrategy.AGGRESSIVE);
    }
    
    function getLadderInfo(uint256 ladderId) external view returns (
        EpochLadder memory ladder,
        uint256 activeRungs,
        uint256 maturedRungs,
        uint256 totalYield
    ) {
        ladder = ladders[ladderId];
        
        for (uint256 i = 0; i < ladder.rungs.length; i++) {
            if (ladder.rungs[i].status == RungStatus.ACTIVE) {
                activeRungs++;
            } else if (ladder.rungs[i].status == RungStatus.MATURED) {
                maturedRungs++;
            }
            totalYield += ladder.rungs[i].yield;
        }
    }
    
    function getUserLadders(address user) external view returns (uint256[] memory) {
        return userLadders[user];
    }
    
    function getMaturitySchedule(uint256 ladderId) external view returns (
        uint256[] memory rungIds,
        uint256[] memory maturityTimes,
        uint256[] memory amounts,
        RungStatus[] memory statuses
    ) {
        EpochLadder storage ladder = ladders[ladderId];
        uint256 rungCount = ladder.rungs.length;
        
        rungIds = new uint256[](rungCount);
        maturityTimes = new uint256[](rungCount);
        amounts = new uint256[](rungCount);
        statuses = new RungStatus[](rungCount);
        
        for (uint256 i = 0; i < rungCount; i++) {
            rungIds[i] = ladder.rungs[i].rungId;
            maturityTimes[i] = ladder.rungs[i].maturityTime;
            amounts[i] = ladder.rungs[i].currentValue;
            statuses[i] = ladder.rungs[i].status;
        }
    }
    
    function getTemplates() external view returns (LadderTemplate[] memory) {
        return templates;
    }
    
    function addTemplate(
        string calldata name,
        uint256[] calldata durations,
        uint256[] calldata allocations,
        uint256[] calldata seniorRatios,
        LadderStrategy strategy,
        uint256 minInvestment
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        templates.push(LadderTemplate({
            name: name,
            durations: durations,
            allocations: allocations,
            seniorRatios: seniorRatios,
            strategy: strategy,
            minInvestment: minInvestment
        }));
        
        emit TemplateAdded(templates.length - 1, name, strategy);
    }
}