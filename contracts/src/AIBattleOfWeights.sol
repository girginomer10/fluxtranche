// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./OracleManager.sol";

/**
 * @title AIBattleOfWeights
 * @dev Multiple AI agents propose portfolio weights, best performer wins more influence
 */
contract AIBattleOfWeights is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");
    
    struct AgentInfo {
        address agentAddress;
        string name;
        string model;           // "GPT-4", "Claude", "Gemini"
        uint256 reputation;     // Performance-based reputation (BPS)
        uint256 totalPredictions;
        uint256 successfulPredictions;
        uint256 lastActive;
        bool isActive;
    }
    
    struct WeightProposal {
        uint256 proposalId;
        address agent;
        uint256 epochIndex;
        uint256 seniorWeightBps;  // 0-10000 (0-100%)
        uint256 juniorWeightBps;  // 0-10000 (0-100%)
        uint256 timestamp;
        string reasoning;         // AI's reasoning for the weights
        uint256 confidence;       // 0-10000 (0-100%)
        bool executed;
        int256 performance;       // Actual performance after epoch
    }
    
    struct BattleRound {
        uint256 roundId;
        uint256 epochIndex;
        uint256 startTime;
        uint256 endTime;
        uint256[] proposalIds;
        uint256 winningProposalId;
        address winningAgent;
        bool settled;
        int256 bestPerformance;
    }
    
    struct ConsensusWeights {
        uint256 epochIndex;
        uint256 seniorWeightBps;
        uint256 juniorWeightBps;
        uint256 totalVoteWeight;     // Sum of reputation weights
        uint256 participantCount;
        uint256 timestamp;
        string methodology;           // "Reputation-weighted", "Simple average"
    }
    
    OracleManager public oracleManager;
    address public trancheVault;
    
    // Storage
    uint256 public agentCounter;
    uint256 public proposalCounter;
    uint256 public battleRoundCounter;
    
    mapping(uint256 => AgentInfo) public agents;
    mapping(address => uint256) public agentIds;
    mapping(uint256 => WeightProposal) public proposals;
    mapping(uint256 => BattleRound) public battleRounds;
    mapping(uint256 => ConsensusWeights) public epochWeights; // epochIndex => weights
    
    // Battle parameters
    uint256 public battleDuration = 2 hours;        // Battle submission window
    uint256 public minReputationRequired = 1000;    // 10% min reputation to participate
    uint256 public reputationDecay = 9900;          // 99% retention per failed prediction
    uint256 public reputationBoost = 11000;         // 110% boost per successful prediction
    uint256 public maxAgents = 10;                  // Maximum number of active agents
    
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed agent,
        string name,
        string model
    );
    
    event WeightProposed(
        uint256 indexed proposalId,
        uint256 indexed roundId,
        address indexed agent,
        uint256 seniorWeight,
        uint256 juniorWeight,
        uint256 confidence
    );
    
    event BattleStarted(
        uint256 indexed roundId,
        uint256 indexed epochIndex,
        uint256 endTime
    );
    
    event BattleSettled(
        uint256 indexed roundId,
        uint256 indexed winningProposalId,
        address indexed winningAgent,
        int256 bestPerformance
    );
    
    event ConsensusReached(
        uint256 indexed epochIndex,
        uint256 seniorWeight,
        uint256 juniorWeight,
        uint256 participantCount
    );
    
    event ReputationUpdated(
        address indexed agent,
        uint256 oldReputation,
        uint256 newReputation,
        bool successful
    );
    
    error AgentNotFound();
    error AgentAlreadyRegistered();
    error BattleNotActive();
    error BattleAlreadySettled();
    error InsufficientReputation();
    error InvalidWeights();
    error MaxAgentsReached();
    error ProposalNotFound();
    error UnauthorizedAgent();
    
    constructor(address _oracleManager, address _trancheVault) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        oracleManager = OracleManager(_oracleManager);
        trancheVault = _trancheVault;
    }
    
    /**
     * @dev Register new AI agent
     */
    function registerAgent(
        address agentAddress,
        string calldata name,
        string calldata model
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 agentId) {
        if (agentIds[agentAddress] != 0) revert AgentAlreadyRegistered();
        if (agentCounter >= maxAgents) revert MaxAgentsReached();
        
        agentCounter++;
        agentId = agentCounter;
        
        agents[agentId] = AgentInfo({
            agentAddress: agentAddress,
            name: name,
            model: model,
            reputation: 5000, // Start with 50% reputation
            totalPredictions: 0,
            successfulPredictions: 0,
            lastActive: block.timestamp,
            isActive: true
        });
        
        agentIds[agentAddress] = agentId;
        _grantRole(AI_AGENT_ROLE, agentAddress);
        
        emit AgentRegistered(agentId, agentAddress, name, model);
    }
    
    /**
     * @dev Start new battle round for epoch
     */
    function startBattle(uint256 epochIndex) external onlyRole(KEEPER_ROLE) returns (uint256 roundId) {
        battleRoundCounter++;
        roundId = battleRoundCounter;
        
        battleRounds[roundId] = BattleRound({
            roundId: roundId,
            epochIndex: epochIndex,
            startTime: block.timestamp,
            endTime: block.timestamp + battleDuration,
            proposalIds: new uint256[](0),
            winningProposalId: 0,
            winningAgent: address(0),
            settled: false,
            bestPerformance: 0
        });
        
        emit BattleStarted(roundId, epochIndex, block.timestamp + battleDuration);
    }
    
    /**
     * @dev AI agent submits weight proposal
     */
    function proposeWeights(
        uint256 roundId,
        uint256 seniorWeightBps,
        uint256 juniorWeightBps,
        string calldata reasoning,
        uint256 confidence
    ) external onlyRole(AI_AGENT_ROLE) returns (uint256 proposalId) {
        BattleRound storage round = battleRounds[roundId];
        if (round.roundId == 0) revert BattleNotActive();
        if (block.timestamp >= round.endTime) revert BattleNotActive();
        if (round.settled) revert BattleAlreadySettled();
        
        uint256 agentId = agentIds[msg.sender];
        if (agentId == 0) revert AgentNotFound();
        
        AgentInfo storage agent = agents[agentId];
        if (!agent.isActive) revert UnauthorizedAgent();
        if (agent.reputation < minReputationRequired) revert InsufficientReputation();
        
        // Weights must add up to 100%
        if (seniorWeightBps + juniorWeightBps != 10000) revert InvalidWeights();
        if (confidence > 10000) revert InvalidWeights();
        
        proposalCounter++;
        proposalId = proposalCounter;
        
        proposals[proposalId] = WeightProposal({
            proposalId: proposalId,
            agent: msg.sender,
            epochIndex: round.epochIndex,
            seniorWeightBps: seniorWeightBps,
            juniorWeightBps: juniorWeightBps,
            timestamp: block.timestamp,
            reasoning: reasoning,
            confidence: confidence,
            executed: false,
            performance: 0
        });
        
        round.proposalIds.push(proposalId);
        agent.totalPredictions++;
        agent.lastActive = block.timestamp;
        
        emit WeightProposed(
            proposalId,
            roundId,
            msg.sender,
            seniorWeightBps,
            juniorWeightBps,
            confidence
        );
    }
    
    /**
     * @dev Calculate consensus weights from all proposals
     */
    function calculateConsensus(uint256 roundId) external onlyRole(KEEPER_ROLE) returns (ConsensusWeights memory) {
        BattleRound storage round = battleRounds[roundId];
        if (round.roundId == 0) revert BattleNotActive();
        if (block.timestamp < round.endTime) revert BattleNotActive();
        
        uint256 totalSeniorWeight = 0;
        uint256 totalJuniorWeight = 0;
        uint256 totalVoteWeight = 0;
        uint256 participantCount = round.proposalIds.length;
        
        // Reputation-weighted consensus
        for (uint256 i = 0; i < round.proposalIds.length; i++) {
            uint256 proposalId = round.proposalIds[i];
            WeightProposal storage proposal = proposals[proposalId];
            uint256 agentId = agentIds[proposal.agent];
            AgentInfo storage agent = agents[agentId];
            
            // Use reputation as voting weight
            uint256 voteWeight = agent.reputation * proposal.confidence / 10000;
            
            totalSeniorWeight += proposal.seniorWeightBps * voteWeight;
            totalJuniorWeight += proposal.juniorWeightBps * voteWeight;
            totalVoteWeight += voteWeight;
        }
        
        // Calculate weighted averages
        uint256 consensusSenior = totalVoteWeight > 0 ? totalSeniorWeight / totalVoteWeight : 5000;
        uint256 consensusJunior = totalVoteWeight > 0 ? totalJuniorWeight / totalVoteWeight : 5000;
        
        // Ensure they add up to 100%
        if (consensusSenior + consensusJunior != 10000) {
            consensusSenior = consensusSenior * 10000 / (consensusSenior + consensusJunior);
            consensusJunior = 10000 - consensusSenior;
        }
        
        ConsensusWeights memory consensus = ConsensusWeights({
            epochIndex: round.epochIndex,
            seniorWeightBps: consensusSenior,
            juniorWeightBps: consensusJunior,
            totalVoteWeight: totalVoteWeight,
            participantCount: participantCount,
            timestamp: block.timestamp,
            methodology: "Reputation-weighted"
        });
        
        epochWeights[round.epochIndex] = consensus;
        
        emit ConsensusReached(
            round.epochIndex,
            consensusSenior,
            consensusJunior,
            participantCount
        );
        
        return consensus;
    }
    
    /**
     * @dev Settle battle round after epoch ends (update reputations)
     */
    function settleBattle(
        uint256 roundId,
        int256[] calldata performances
    ) external onlyRole(KEEPER_ROLE) {
        BattleRound storage round = battleRounds[roundId];
        if (round.settled) revert BattleAlreadySettled();
        
        if (performances.length != round.proposalIds.length) revert InvalidWeights();
        
        int256 bestPerformance = type(int256).min;
        uint256 winningProposalId = 0;
        address winningAgent = address(0);
        
        // Find best performing proposal and update all reputations
        for (uint256 i = 0; i < round.proposalIds.length; i++) {
            uint256 proposalId = round.proposalIds[i];
            WeightProposal storage proposal = proposals[proposalId];
            proposal.performance = performances[i];
            
            uint256 agentId = agentIds[proposal.agent];
            AgentInfo storage agent = agents[agentId];
            
            // Update reputation based on performance
            bool successful = performances[i] > 0;
            uint256 oldReputation = agent.reputation;
            
            if (successful) {
                agent.reputation = (agent.reputation * reputationBoost) / 10000;
                agent.reputation = agent.reputation > 10000 ? 10000 : agent.reputation; // Cap at 100%
                agent.successfulPredictions++;
            } else {
                agent.reputation = (agent.reputation * reputationDecay) / 10000;
                agent.reputation = agent.reputation < 100 ? 100 : agent.reputation; // Floor at 1%
            }
            
            emit ReputationUpdated(proposal.agent, oldReputation, agent.reputation, successful);
            
            // Track best performance
            if (performances[i] > bestPerformance) {
                bestPerformance = performances[i];
                winningProposalId = proposalId;
                winningAgent = proposal.agent;
            }
        }
        
        round.winningProposalId = winningProposalId;
        round.winningAgent = winningAgent;
        round.bestPerformance = bestPerformance;
        round.settled = true;
        
        emit BattleSettled(roundId, winningProposalId, winningAgent, bestPerformance);
    }
    
    /**
     * @dev Get current consensus weights for epoch
     */
    function getCurrentWeights(uint256 epochIndex) external view returns (ConsensusWeights memory) {
        return epochWeights[epochIndex];
    }
    
    /**
     * @dev Get active agents
     */
    function getActiveAgents() external view returns (AgentInfo[] memory activeAgents) {
        uint256 activeCount = 0;
        
        // Count active agents
        for (uint256 i = 1; i <= agentCounter; i++) {
            if (agents[i].isActive) {
                activeCount++;
            }
        }
        
        activeAgents = new AgentInfo[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= agentCounter; i++) {
            if (agents[i].isActive) {
                activeAgents[index] = agents[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Get battle round details
     */
    function getBattleRound(uint256 roundId) external view returns (BattleRound memory) {
        return battleRounds[roundId];
    }
    
    /**
     * @dev Get proposals for a round
     */
    function getRoundProposals(uint256 roundId) external view returns (WeightProposal[] memory roundProposals) {
        BattleRound memory round = battleRounds[roundId];
        roundProposals = new WeightProposal[](round.proposalIds.length);
        
        for (uint256 i = 0; i < round.proposalIds.length; i++) {
            roundProposals[i] = proposals[round.proposalIds[i]];
        }
    }
    
    /**
     * @dev Get agent statistics
     */
    function getAgentStats(address agentAddress) external view returns (
        uint256 reputation,
        uint256 totalPredictions,
        uint256 successfulPredictions,
        uint256 successRate
    ) {
        uint256 agentId = agentIds[agentAddress];
        if (agentId == 0) revert AgentNotFound();
        
        AgentInfo memory agent = agents[agentId];
        reputation = agent.reputation;
        totalPredictions = agent.totalPredictions;
        successfulPredictions = agent.successfulPredictions;
        successRate = totalPredictions > 0 ? (successfulPredictions * 10000) / totalPredictions : 0;
    }
    
    /**
     * @dev Admin functions
     */
    function setTrancheVault(address _trancheVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trancheVault = _trancheVault;
    }
    
    function updateBattleParams(
        uint256 _battleDuration,
        uint256 _minReputationRequired,
        uint256 _reputationDecay,
        uint256 _reputationBoost
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        battleDuration = _battleDuration;
        minReputationRequired = _minReputationRequired;
        reputationDecay = _reputationDecay;
        reputationBoost = _reputationBoost;
    }
    
    function deactivateAgent(uint256 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        agents[agentId].isActive = false;
    }
    
    function reactivateAgent(uint256 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        agents[agentId].isActive = true;
    }
}