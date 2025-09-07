// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LiquidityStaircaseNFT
 * @dev Liquidity Staircase NFT — Withdrawal kuyruğunda öncelik hakkını temsil eden NFT
 */
contract LiquidityStaircaseNFT is ERC721Enumerable, AccessControl {
    
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct StaircasePosition {
        uint256 tokenId;
        address holder;
        uint256 queuePosition; // Position in withdrawal queue (lower = higher priority)
        uint256 withdrawalAmount;
        uint256 requestedAt;
        uint256 estimatedWaitTime; // Estimated time until withdrawal ready
        bool isActive;
        PriorityTier tier;
        uint256 stakedAmount; // Amount staked for priority
        uint256 loyaltyScore; // Based on holding period and activity
    }
    
    enum PriorityTier {
        BASIC,      // Default priority
        SILVER,     // 10% faster
        GOLD,       // 25% faster  
        PLATINUM,   // 50% faster
        DIAMOND,    // 75% faster
        LEGENDARY   // Instant priority
    }
    
    struct QueueMetrics {
        uint256 totalQueued;
        uint256 totalAmount;
        uint256 avgWaitTime;
        uint256 processingRate; // Withdrawals per day
        uint256 lastProcessedPosition;
    }
    
    mapping(uint256 => StaircasePosition) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(uint256 => bool) public processedPositions;
    
    uint256 public tokenCounter;
    uint256 public currentQueuePosition;
    QueueMetrics public queueMetrics;
    
    // Priority staking requirements (USDC amounts)
    mapping(PriorityTier => uint256) public tierStakeRequirements;
    mapping(PriorityTier => uint256) public tierSpeedBonus; // BPS
    
    // Loyalty scoring
    mapping(address => uint256) public userLoyaltyScore;
    mapping(address => uint256) public lastActivityTime;
    
    address public trancheVault;
    
    event PositionMinted(uint256 indexed tokenId, address indexed holder, uint256 queuePosition, uint256 amount);
    event PositionUpgraded(uint256 indexed tokenId, PriorityTier oldTier, PriorityTier newTier);
    event QueueAdvanced(uint256 newPosition, uint256 processed, uint256 totalRemaining);
    event WithdrawalReady(uint256 indexed tokenId, address indexed holder, uint256 amount);
    event LoyaltyScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore);
    event PriorityStaked(address indexed user, PriorityTier tier, uint256 stakedAmount);
    
    constructor(address _trancheVault) ERC721("FluxTranche Liquidity Staircase", "FTLS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_ROLE, _trancheVault);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        trancheVault = _trancheVault;
        
        // Initialize tier requirements (in USDC, 6 decimals)
        tierStakeRequirements[PriorityTier.BASIC] = 0;
        tierStakeRequirements[PriorityTier.SILVER] = 1000 * 10**6; // $1,000
        tierStakeRequirements[PriorityTier.GOLD] = 5000 * 10**6; // $5,000
        tierStakeRequirements[PriorityTier.PLATINUM] = 25000 * 10**6; // $25,000
        tierStakeRequirements[PriorityTier.DIAMOND] = 100000 * 10**6; // $100,000
        tierStakeRequirements[PriorityTier.LEGENDARY] = 500000 * 10**6; // $500,000
        
        // Speed bonuses (BPS - basis points)
        tierSpeedBonus[PriorityTier.BASIC] = 0;
        tierSpeedBonus[PriorityTier.SILVER] = 1000; // 10%
        tierSpeedBonus[PriorityTier.GOLD] = 2500; // 25%
        tierSpeedBonus[PriorityTier.PLATINUM] = 5000; // 50%
        tierSpeedBonus[PriorityTier.DIAMOND] = 7500; // 75%
        tierSpeedBonus[PriorityTier.LEGENDARY] = 10000; // 100% (instant)
    }
    
    function mintPosition(
        address holder,
        uint256 withdrawalAmount,
        uint256 stakedAmount
    ) external onlyRole(VAULT_ROLE) returns (uint256 tokenId) {
        tokenCounter++;
        tokenId = tokenCounter;
        currentQueuePosition++;
        
        PriorityTier tier = _calculateTier(stakedAmount, userLoyaltyScore[holder]);
        uint256 effectivePosition = _calculateEffectivePosition(currentQueuePosition, tier);
        
        positions[tokenId] = StaircasePosition({
            tokenId: tokenId,
            holder: holder,
            queuePosition: effectivePosition,
            withdrawalAmount: withdrawalAmount,
            requestedAt: block.timestamp,
            estimatedWaitTime: _calculateWaitTime(effectivePosition),
            isActive: true,
            tier: tier,
            stakedAmount: stakedAmount,
            loyaltyScore: userLoyaltyScore[holder]
        });
        
        userPositions[holder].push(tokenId);
        queueMetrics.totalQueued++;
        queueMetrics.totalAmount += withdrawalAmount;
        
        _mint(holder, tokenId);
        
        emit PositionMinted(tokenId, holder, effectivePosition, withdrawalAmount);
        return tokenId;
    }
    
    function stakePriorityBoost(uint256 tokenId, uint256 additionalStake) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        StaircasePosition storage position = positions[tokenId];
        require(position.isActive, "Position not active");
        
        position.stakedAmount += additionalStake;
        PriorityTier oldTier = position.tier;
        PriorityTier newTier = _calculateTier(position.stakedAmount, position.loyaltyScore);
        
        if (newTier > oldTier) {
            position.tier = newTier;
            uint256 newEffectivePosition = _calculateEffectivePosition(position.queuePosition, newTier);
            position.queuePosition = newEffectivePosition;
            position.estimatedWaitTime = _calculateWaitTime(newEffectivePosition);
            
            emit PositionUpgraded(tokenId, oldTier, newTier);
            emit PriorityStaked(msg.sender, newTier, additionalStake);
        }
    }
    
    function updateLoyaltyScore(address user, uint256 activityValue) external onlyRole(KEEPER_ROLE) {
        uint256 oldScore = userLoyaltyScore[user];
        
        // Calculate loyalty based on:
        // 1. Time since last activity
        // 2. Consistency of interactions
        // 3. Total value of activities
        
        uint256 timeSinceLastActivity = block.timestamp - lastActivityTime[user];
        uint256 consistencyBonus = timeSinceLastActivity < 7 days ? 100 : 0;
        uint256 newScore = (oldScore * 9 + activityValue + consistencyBonus) / 10; // Rolling average
        
        userLoyaltyScore[user] = newScore;
        lastActivityTime[user] = block.timestamp;
        
        // Update all user's active positions
        uint256[] memory userTokens = userPositions[user];
        for (uint256 i = 0; i < userTokens.length; i++) {
            uint256 tokenId = userTokens[i];
            if (positions[tokenId].isActive) {
                positions[tokenId].loyaltyScore = newScore;
                
                // Recalculate tier and position if loyalty improved significantly
                PriorityTier newTier = _calculateTier(positions[tokenId].stakedAmount, newScore);
                if (newTier > positions[tokenId].tier) {
                    positions[tokenId].tier = newTier;
                    uint256 newPosition = _calculateEffectivePosition(positions[tokenId].queuePosition, newTier);
                    positions[tokenId].queuePosition = newPosition;
                    positions[tokenId].estimatedWaitTime = _calculateWaitTime(newPosition);
                }
            }
        }
        
        emit LoyaltyScoreUpdated(user, oldScore, newScore);
    }
    
    function processWithdrawalQueue(uint256 batchSize) external onlyRole(KEEPER_ROLE) {
        uint256 processed = 0;
        uint256 startPosition = queueMetrics.lastProcessedPosition + 1;
        
        for (uint256 pos = startPosition; pos <= currentQueuePosition && processed < batchSize; pos++) {
            // Find token with this queue position
            uint256 tokenId = _findTokenAtPosition(pos);
            
            if (tokenId != 0 && positions[tokenId].isActive && !processedPositions[pos]) {
                processedPositions[pos] = true;
                positions[tokenId].isActive = false;
                queueMetrics.lastProcessedPosition = pos;
                queueMetrics.totalQueued--;
                queueMetrics.totalAmount -= positions[tokenId].withdrawalAmount;
                
                emit WithdrawalReady(tokenId, positions[tokenId].holder, positions[tokenId].withdrawalAmount);
                processed++;
            }
        }
        
        // Update queue metrics
        queueMetrics.avgWaitTime = _calculateAverageWaitTime();
        queueMetrics.processingRate = _calculateProcessingRate();
        
        emit QueueAdvanced(queueMetrics.lastProcessedPosition, processed, queueMetrics.totalQueued);
    }
    
    function _calculateTier(uint256 stakedAmount, uint256 loyaltyScore) internal view returns (PriorityTier) {
        // Combine staked amount and loyalty for tier calculation
        uint256 effectiveStake = stakedAmount + (stakedAmount * loyaltyScore / 1000); // Loyalty adds up to 100% bonus
        
        if (effectiveStake >= tierStakeRequirements[PriorityTier.LEGENDARY]) {
            return PriorityTier.LEGENDARY;
        } else if (effectiveStake >= tierStakeRequirements[PriorityTier.DIAMOND]) {
            return PriorityTier.DIAMOND;
        } else if (effectiveStake >= tierStakeRequirements[PriorityTier.PLATINUM]) {
            return PriorityTier.PLATINUM;
        } else if (effectiveStake >= tierStakeRequirements[PriorityTier.GOLD]) {
            return PriorityTier.GOLD;
        } else if (effectiveStake >= tierStakeRequirements[PriorityTier.SILVER]) {
            return PriorityTier.SILVER;
        } else {
            return PriorityTier.BASIC;
        }
    }
    
    function _calculateEffectivePosition(uint256 basePosition, PriorityTier tier) internal view returns (uint256) {
        if (tier == PriorityTier.LEGENDARY) {
            return 1; // Instant priority
        }
        
        uint256 speedBonus = tierSpeedBonus[tier];
        uint256 positionReduction = (basePosition * speedBonus) / 10000;
        uint256 effectivePosition = basePosition > positionReduction ? basePosition - positionReduction : 1;
        
        return effectivePosition;
    }
    
    function _calculateWaitTime(uint256 queuePosition) internal view returns (uint256) {
        if (queueMetrics.processingRate == 0) {
            return 7 days; // Default estimate
        }
        
        uint256 remainingQueue = queuePosition > queueMetrics.lastProcessedPosition ? 
            queuePosition - queueMetrics.lastProcessedPosition : 0;
        
        return (remainingQueue * 1 days) / queueMetrics.processingRate;
    }
    
    function _calculateAverageWaitTime() internal view returns (uint256) {
        if (queueMetrics.totalQueued == 0) return 0;
        
        uint256 totalWaitTime = 0;
        uint256 activePositions = 0;
        
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (positions[i].isActive) {
                totalWaitTime += positions[i].estimatedWaitTime;
                activePositions++;
            }
        }
        
        return activePositions > 0 ? totalWaitTime / activePositions : 0;
    }
    
    function _calculateProcessingRate() internal view returns (uint256) {
        // Calculate based on recent processing history
        // Simplified: assume 1 withdrawal per hour during active periods
        return 24; // withdrawals per day
    }
    
    function _findTokenAtPosition(uint256 position) internal view returns (uint256) {
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (positions[i].queuePosition == position && positions[i].isActive) {
                return i;
            }
        }
        return 0;
    }
    
    function getPositionDetails(uint256 tokenId) external view returns (
        uint256 queuePosition,
        uint256 withdrawalAmount,
        uint256 estimatedWaitTime,
        PriorityTier tier,
        uint256 stakedAmount,
        bool isActive
    ) {
        StaircasePosition memory position = positions[tokenId];
        return (
            position.queuePosition,
            position.withdrawalAmount,
            position.estimatedWaitTime,
            position.tier,
            position.stakedAmount,
            position.isActive
        );
    }
    
    function getQueueStatus() external view returns (
        uint256 totalQueued,
        uint256 totalAmount,
        uint256 avgWaitTime,
        uint256 processingRate,
        uint256 yourPosition
    ) {
        uint256 userPosition = 0;
        uint256[] memory userTokens = userPositions[msg.sender];
        
        // Find user's best (lowest) position
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (positions[userTokens[i]].isActive) {
                if (userPosition == 0 || positions[userTokens[i]].queuePosition < userPosition) {
                    userPosition = positions[userTokens[i]].queuePosition;
                }
            }
        }
        
        return (
            queueMetrics.totalQueued,
            queueMetrics.totalAmount,
            queueMetrics.avgWaitTime,
            queueMetrics.processingRate,
            userPosition
        );
    }
    
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    function getTierRequirements(PriorityTier tier) external view returns (uint256 stakeRequired, uint256 speedBonus) {
        return (tierStakeRequirements[tier], tierSpeedBonus[tier]);
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        StaircasePosition memory position = positions[tokenId];
        string memory tierName = _getTierName(position.tier);
        
        // In production, this would return a URL to JSON metadata
        // For now, return a simple concatenated string
        return string(abi.encodePacked(
            "https://fluxtranche.io/api/staircase/",
            Strings.toString(tokenId),
            "?tier=", tierName,
            "&position=", Strings.toString(position.queuePosition)
        ));
    }
    
    function _getTierName(PriorityTier tier) internal pure returns (string memory) {
        if (tier == PriorityTier.LEGENDARY) return "Legendary";
        if (tier == PriorityTier.DIAMOND) return "Diamond";
        if (tier == PriorityTier.PLATINUM) return "Platinum";
        if (tier == PriorityTier.GOLD) return "Gold";
        if (tier == PriorityTier.SILVER) return "Silver";
        return "Basic";
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}