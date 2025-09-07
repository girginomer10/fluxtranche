// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SocialPot
 * @dev Social Pot (Arkadaş/Çift Kasası) — Ortak hedefe paylaşımlı kasa; AI grup kural önerileri
 */
contract SocialPot is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");
    
    struct SocialVault {
        uint256 vaultId;
        string name;
        string goal; // "Vacation to Japan", "New Car", "Emergency Fund"
        address[] contributors;
        mapping(address => bool) isContributor;
        mapping(address => uint256) contributions;
        mapping(address => uint256) commitments; // Monthly commitment
        uint256 targetAmount;
        uint256 currentBalance;
        uint256 deadline;
        bool isActive;
        bool goalReached;
        VaultRules rules;
        AIRecommendations aiAdvice;
        uint256 createdAt;
    }
    
    struct VaultRules {
        uint256 minContribution; // Minimum monthly contribution
        uint256 penaltyRate; // Late contribution penalty (BPS)
        bool allowEarlyWithdrawal;
        uint256 earlyWithdrawalPenalty; // BPS
        bool requireUnanimous; // Unanimous decision for withdrawal
        uint256 votingPeriod; // Time for voting on decisions
        bool autoInvestSurplus; // Invest surplus in tranches
        uint256 seniorRatio; // Senior tranche allocation (BPS)
    }
    
    struct AIRecommendations {
        uint256 suggestedMonthlyAmount;
        uint256 optimalDeadline;
        string riskAssessment; // "Low", "Medium", "High"
        string[] strategyTips;
        uint256 lastUpdated;
        int256 sentimentScore; // Group cohesion score (-100 to +100)
    }
    
    struct ContributionSchedule {
        address contributor;
        uint256 amount;
        uint256 dueDate;
        bool isPaid;
        uint256 paidDate;
        uint256 penalty;
    }
    
    struct Withdrawal {
        uint256 withdrawalId;
        uint256 vaultId;
        address proposer;
        uint256 amount;
        string reason;
        mapping(address => bool) votes;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool isExecuted;
        bool isApproved;
    }
    
    IERC20 public paymentToken;
    address public trancheVault;
    address public aiOracle;
    
    uint256 public vaultCounter;
    uint256 public withdrawalCounter;
    
    mapping(uint256 => SocialVault) public socialVaults;
    mapping(address => uint256[]) public userVaults;
    mapping(uint256 => ContributionSchedule[]) public contributionSchedules;
    mapping(uint256 => Withdrawal) public withdrawals;
    mapping(uint256 => uint256[]) public vaultWithdrawals;
    
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_CONTRIBUTORS = 10;
    
    event VaultCreated(uint256 indexed vaultId, string name, string goal, address[] contributors, uint256 targetAmount);
    event ContributionMade(uint256 indexed vaultId, address indexed contributor, uint256 amount, bool onTime);
    event GoalReached(uint256 indexed vaultId, uint256 totalAmount, uint256 timeToGoal);
    event AIRecommendationUpdated(uint256 indexed vaultId, uint256 suggestedAmount, uint256 optimalDeadline, string riskLevel);
    event WithdrawalProposed(uint256 indexed withdrawalId, uint256 indexed vaultId, address indexed proposer, uint256 amount, string reason);
    event WithdrawalExecuted(uint256 indexed withdrawalId, bool approved, uint256 amountWithdrawn);
    event AutoInvestment(uint256 indexed vaultId, uint256 seniorAmount, uint256 juniorAmount);
    
    constructor(address _paymentToken, address _trancheVault, address _aiOracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        _grantRole(AI_ORACLE_ROLE, _aiOracle);
        paymentToken = IERC20(_paymentToken);
        trancheVault = _trancheVault;
        aiOracle = _aiOracle;
    }
    
    function createSocialVault(
        string calldata name,
        string calldata goal,
        address[] calldata contributors,
        uint256 targetAmount,
        uint256 deadline,
        VaultRules calldata rules
    ) external returns (uint256 vaultId) {
        require(contributors.length >= 2 && contributors.length <= MAX_CONTRIBUTORS, "Invalid contributor count");
        require(targetAmount > 0, "Invalid target amount");
        require(deadline > block.timestamp, "Invalid deadline");
        require(rules.seniorRatio <= BPS, "Invalid senior ratio");
        
        vaultCounter++;
        vaultId = vaultCounter;
        
        SocialVault storage vault = socialVaults[vaultId];
        vault.vaultId = vaultId;
        vault.name = name;
        vault.goal = goal;
        vault.contributors = contributors;
        vault.targetAmount = targetAmount;
        vault.deadline = deadline;
        vault.isActive = true;
        vault.rules = rules;
        vault.createdAt = block.timestamp;
        
        // Set contributor flags
        for (uint256 i = 0; i < contributors.length; i++) {
            vault.isContributor[contributors[i]] = true;
            userVaults[contributors[i]].push(vaultId);
        }
        
        // Request AI recommendations
        _requestAIRecommendations(vaultId);
        
        emit VaultCreated(vaultId, name, goal, contributors, targetAmount);
        return vaultId;
    }
    
    function contribute(uint256 vaultId, uint256 amount) external nonReentrant {
        SocialVault storage vault = socialVaults[vaultId];
        require(vault.isActive, "Vault not active");
        require(vault.isContributor[msg.sender], "Not a contributor");
        require(!vault.goalReached, "Goal already reached");
        
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        vault.contributions[msg.sender] += amount;
        vault.currentBalance += amount;
        
        bool onTime = true; // TODO: Check against commitment schedule
        
        // Check if goal is reached
        if (vault.currentBalance >= vault.targetAmount) {
            vault.goalReached = true;
            uint256 timeToGoal = block.timestamp - vault.createdAt;
            emit GoalReached(vaultId, vault.currentBalance, timeToGoal);
        }
        
        // Auto-invest surplus if enabled and goal reached
        if (vault.goalReached && vault.rules.autoInvestSurplus) {
            uint256 surplus = vault.currentBalance - vault.targetAmount;
            if (surplus > 0) {
                _autoInvestSurplus(vaultId, surplus);
            }
        }
        
        emit ContributionMade(vaultId, msg.sender, amount, onTime);
    }
    
    function setCommitment(uint256 vaultId, uint256 monthlyAmount) external {
        SocialVault storage vault = socialVaults[vaultId];
        require(vault.isActive, "Vault not active");
        require(vault.isContributor[msg.sender], "Not a contributor");
        require(monthlyAmount >= vault.rules.minContribution, "Below minimum contribution");
        
        vault.commitments[msg.sender] = monthlyAmount;
    }
    
    function proposeWithdrawal(
        uint256 vaultId,
        uint256 amount,
        string calldata reason
    ) external returns (uint256 withdrawalId) {
        SocialVault storage vault = socialVaults[vaultId];
        require(vault.isActive, "Vault not active");
        require(vault.isContributor[msg.sender], "Not a contributor");
        require(amount <= vault.currentBalance, "Insufficient balance");
        
        if (!vault.goalReached && !vault.rules.allowEarlyWithdrawal) {
            revert("Early withdrawal not allowed");
        }
        
        withdrawalCounter++;
        withdrawalId = withdrawalCounter;
        
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        withdrawal.withdrawalId = withdrawalId;
        withdrawal.vaultId = vaultId;
        withdrawal.proposer = msg.sender;
        withdrawal.amount = amount;
        withdrawal.reason = reason;
        withdrawal.deadline = block.timestamp + vault.rules.votingPeriod;
        
        vaultWithdrawals[vaultId].push(withdrawalId);
        
        emit WithdrawalProposed(withdrawalId, vaultId, msg.sender, amount, reason);
        return withdrawalId;
    }
    
    function voteOnWithdrawal(uint256 withdrawalId, bool support) external {
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        SocialVault storage vault = socialVaults[withdrawal.vaultId];
        
        require(vault.isContributor[msg.sender], "Not a contributor");
        require(!withdrawal.isExecuted, "Already executed");
        require(block.timestamp <= withdrawal.deadline, "Voting period ended");
        require(!withdrawal.votes[msg.sender], "Already voted");
        
        withdrawal.votes[msg.sender] = true;
        
        if (support) {
            withdrawal.votesFor++;
        } else {
            withdrawal.votesAgainst++;
        }
    }
    
    function executeWithdrawal(uint256 withdrawalId) external nonReentrant {
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        SocialVault storage vault = socialVaults[withdrawal.vaultId];
        
        require(!withdrawal.isExecuted, "Already executed");
        require(block.timestamp > withdrawal.deadline, "Voting period not ended");
        
        withdrawal.isExecuted = true;
        
        // Check if approved
        uint256 totalVotes = withdrawal.votesFor + withdrawal.votesAgainst;
        bool approved = false;
        
        if (vault.rules.requireUnanimous) {
            approved = withdrawal.votesFor == vault.contributors.length;
        } else {
            approved = withdrawal.votesFor > withdrawal.votesAgainst && totalVotes >= (vault.contributors.length / 2);
        }
        
        withdrawal.isApproved = approved;
        uint256 amountWithdrawn = 0;
        
        if (approved) {
            amountWithdrawn = withdrawal.amount;
            
            // Apply early withdrawal penalty if applicable
            if (!vault.goalReached && vault.rules.earlyWithdrawalPenalty > 0) {
                uint256 penalty = (amountWithdrawn * vault.rules.earlyWithdrawalPenalty) / BPS;
                amountWithdrawn -= penalty;
            }
            
            vault.currentBalance -= withdrawal.amount;
            paymentToken.safeTransfer(withdrawal.proposer, amountWithdrawn);
        }
        
        emit WithdrawalExecuted(withdrawalId, approved, amountWithdrawn);
    }
    
    function _autoInvestSurplus(uint256 vaultId, uint256 surplus) internal {
        SocialVault storage vault = socialVaults[vaultId];
        
        uint256 seniorAmount = (surplus * vault.rules.seniorRatio) / BPS;
        uint256 juniorAmount = surplus - seniorAmount;
        
        if (seniorAmount + juniorAmount > 0) {
            paymentToken.safeTransfer(trancheVault, seniorAmount + juniorAmount);
            vault.currentBalance -= surplus;
            
            // Note: In full implementation, call vault's deposit function with tranche specification
            
            emit AutoInvestment(vaultId, seniorAmount, juniorAmount);
        }
    }
    
    function updateAIRecommendations(
        uint256 vaultId,
        uint256 suggestedAmount,
        uint256 optimalDeadline,
        string calldata riskLevel,
        string[] calldata tips,
        int256 sentimentScore
    ) external onlyRole(AI_ORACLE_ROLE) {
        SocialVault storage vault = socialVaults[vaultId];
        require(vault.isActive, "Vault not active");
        
        vault.aiAdvice.suggestedMonthlyAmount = suggestedAmount;
        vault.aiAdvice.optimalDeadline = optimalDeadline;
        vault.aiAdvice.riskAssessment = riskLevel;
        // Copy tips array manually
        delete vault.aiAdvice.strategyTips;
        for (uint256 i = 0; i < tips.length; i++) {
            vault.aiAdvice.strategyTips.push(tips[i]);
        }
        vault.aiAdvice.sentimentScore = sentimentScore;
        vault.aiAdvice.lastUpdated = block.timestamp;
        
        emit AIRecommendationUpdated(vaultId, suggestedAmount, optimalDeadline, riskLevel);
    }
    
    function _requestAIRecommendations(uint256 vaultId) internal {
        // In full implementation, this would trigger an off-chain AI analysis
        // For now, we emit an event that the AI oracle can listen to
    }
    
    function getVaultStats(uint256 vaultId) external view returns (
        uint256 currentBalance,
        uint256 targetAmount,
        uint256 progress, // BPS
        uint256 timeRemaining,
        bool goalReached,
        uint256 contributorCount
    ) {
        SocialVault storage vault = socialVaults[vaultId];
        currentBalance = vault.currentBalance;
        targetAmount = vault.targetAmount;
        progress = targetAmount > 0 ? (currentBalance * BPS) / targetAmount : 0;
        timeRemaining = vault.deadline > block.timestamp ? vault.deadline - block.timestamp : 0;
        goalReached = vault.goalReached;
        contributorCount = vault.contributors.length;
    }
    
    function getContributorStats(uint256 vaultId, address contributor) external view returns (
        uint256 totalContributed,
        uint256 monthlyCommitment,
        uint256 sharePercentage
    ) {
        SocialVault storage vault = socialVaults[vaultId];
        totalContributed = vault.contributions[contributor];
        monthlyCommitment = vault.commitments[contributor];
        sharePercentage = vault.currentBalance > 0 ? (totalContributed * BPS) / vault.currentBalance : 0;
    }
    
    function getAIRecommendations(uint256 vaultId) external view returns (
        uint256 suggestedAmount,
        uint256 optimalDeadline,
        string memory riskLevel,
        string[] memory tips,
        int256 sentiment
    ) {
        SocialVault storage vault = socialVaults[vaultId];
        suggestedAmount = vault.aiAdvice.suggestedMonthlyAmount;
        optimalDeadline = vault.aiAdvice.optimalDeadline;
        riskLevel = vault.aiAdvice.riskAssessment;
        tips = vault.aiAdvice.strategyTips;
        sentiment = vault.aiAdvice.sentimentScore;
    }
    
    function getUserVaults(address user) external view returns (uint256[] memory) {
        return userVaults[user];
    }
}