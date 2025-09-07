// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title StrategyGenomeSBT
 * @dev Strategy Genome SBT — Kullanıcıya özel strateji "DNA"sı, SBT olarak mint
 */
contract StrategyGenomeSBT is ERC1155Supply, AccessControl {
    
    bytes32 public constant AI_ANALYZER_ROLE = keccak256("AI_ANALYZER_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct StrategyGenome {
        uint256 tokenId;
        address owner;
        string genomeHash; // IPFS hash of detailed genome data
        uint256 riskTolerance; // 0-100 scale
        uint256 timeHorizon; // Days
        uint256 volatilityPreference; // 0-100 scale
        uint256 liquidityNeed; // 0-100 scale
        GenomeTraits traits;
        PerformanceMetrics performance;
        uint256 lastUpdated;
        uint256 generation; // Genome evolution generation
        bool isActive;
    }
    
    struct GenomeTraits {
        // Risk Profile Genes
        uint8 conservativeGene; // 0-255
        uint8 aggressiveGene; // 0-255
        uint8 balancedGene; // 0-255
        
        // Time Preference Genes
        uint8 shortTermGene; // 0-255
        uint8 longTermGene; // 0-255
        
        // Market Behavior Genes
        uint8 trendFollowingGene; // 0-255
        uint8 contrarianGene; // 0-255
        uint8 momentumGene; // 0-255
        
        // Stability Genes
        uint8 volatilitySeekingGene; // 0-255
        uint8 stabilitySeekingGene; // 0-255
        
        // Social Genes
        uint8 herdBehaviorGene; // 0-255
        uint8 independentGene; // 0-255
    }
    
    struct PerformanceMetrics {
        uint256 totalReturn; // BPS
        uint256 sharpeRatio; // BPS  
        uint256 maxDrawdown; // BPS
        uint256 winRate; // BPS
        uint256 avgHoldingPeriod; // Days
        uint256 adaptabilityScore; // 0-100
        uint256 consistencyScore; // 0-100
        uint256 totalTrades;
        uint256 profitableTrades;
    }
    
    struct GenomeEvolution {
        uint256 fromGeneration;
        uint256 toGeneration;
        string[] mutations;
        uint256 performanceImprovement; // BPS
        uint256 timestamp;
    }
    
    // Genome Categories for SBT token IDs
    uint256 public constant RISK_AVERSE_GENOME = 1;
    uint256 public constant BALANCED_GENOME = 2;
    uint256 public constant AGGRESSIVE_GENOME = 3;
    uint256 public constant ADAPTIVE_GENOME = 4;
    uint256 public constant CONTRARIAN_GENOME = 5;
    uint256 public constant MOMENTUM_GENOME = 6;
    uint256 public constant LEGENDARY_GENOME = 7; // Exceptional performance
    
    mapping(uint256 => StrategyGenome) public genomes;
    mapping(address => uint256) public userGenomeId;
    mapping(uint256 => GenomeEvolution[]) public genomeEvolutions;
    mapping(address => uint256[]) public userGenomeHistory; // Track all genomes user had
    
    uint256 public genomeCounter;
    uint256 public constant EVOLUTION_THRESHOLD = 1000; // BPS improvement needed for evolution
    
    event GenomeCreated(uint256 indexed tokenId, address indexed owner, uint256 riskTolerance, uint256 timeHorizon);
    event GenomeEvolved(uint256 indexed oldTokenId, uint256 indexed newTokenId, uint256 generation, uint256 improvement);
    event PerformanceUpdated(uint256 indexed tokenId, uint256 totalReturn, uint256 sharpeRatio, uint256 adaptability);
    event GenomeMutated(uint256 indexed tokenId, string mutation, uint256 generation);
    event LegendaryGenomeAchieved(address indexed owner, uint256 indexed tokenId, uint256 performanceScore);
    
    constructor() ERC1155("https://fluxtranche.io/api/genome-sbt/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AI_ANALYZER_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
    }
    
    function analyzeAndMintGenome(
        address user,
        uint256 riskTolerance,
        uint256 timeHorizon,
        uint256 volatilityPreference,
        uint256 liquidityNeed,
        GenomeTraits calldata traits,
        string calldata genomeDataHash
    ) external onlyRole(AI_ANALYZER_ROLE) returns (uint256 tokenId) {
        require(userGenomeId[user] == 0, "User already has genome");
        require(riskTolerance <= 100, "Invalid risk tolerance");
        require(volatilityPreference <= 100, "Invalid volatility preference");
        require(liquidityNeed <= 100, "Invalid liquidity need");
        
        genomeCounter++;
        tokenId = genomeCounter;
        
        genomes[tokenId] = StrategyGenome({
            tokenId: tokenId,
            owner: user,
            genomeHash: genomeDataHash,
            riskTolerance: riskTolerance,
            timeHorizon: timeHorizon,
            volatilityPreference: volatilityPreference,
            liquidityNeed: liquidityNeed,
            traits: traits,
            performance: PerformanceMetrics(0, 0, 0, 0, 0, 50, 50, 0, 0),
            lastUpdated: block.timestamp,
            generation: 1,
            isActive: true
        });
        
        userGenomeId[user] = tokenId;
        userGenomeHistory[user].push(tokenId);
        
        uint256 sbtCategory = _determineGenomeCategory(traits, riskTolerance);
        _mint(user, sbtCategory, 1, "");
        
        emit GenomeCreated(tokenId, user, riskTolerance, timeHorizon);
        return tokenId;
    }
    
    function updatePerformanceMetrics(
        uint256 tokenId,
        PerformanceMetrics calldata metrics
    ) external onlyRole(AI_ANALYZER_ROLE) {
        StrategyGenome storage genome = genomes[tokenId];
        require(genome.isActive, "Genome not active");
        
        genome.performance = metrics;
        genome.lastUpdated = block.timestamp;
        
        // Check for evolution criteria
        if (_shouldEvolve(genome)) {
            _evolveGenome(tokenId);
        }
        
        // Check for legendary status
        if (_isLegendaryPerformance(metrics)) {
            _awardLegendaryGenome(genome.owner, tokenId);
        }
        
        emit PerformanceUpdated(tokenId, metrics.totalReturn, metrics.sharpeRatio, metrics.adaptabilityScore);
    }
    
    function _shouldEvolve(StrategyGenome memory genome) internal pure returns (bool) {
        // Evolution criteria:
        // 1. Significant performance improvement
        // 2. High consistency and adaptability
        // 3. Sufficient trading history
        
        return genome.performance.totalReturn > EVOLUTION_THRESHOLD &&
               genome.performance.adaptabilityScore >= 70 &&
               genome.performance.consistencyScore >= 70 &&
               genome.performance.totalTrades >= 50;
    }
    
    function _evolveGenome(uint256 tokenId) internal {
        StrategyGenome storage genome = genomes[tokenId];
        
        // Create evolution record
        string[] memory mutations = _generateMutations(genome);
        
        genomeEvolutions[tokenId].push(GenomeEvolution({
            fromGeneration: genome.generation,
            toGeneration: genome.generation + 1,
            mutations: mutations,
            performanceImprovement: genome.performance.totalReturn,
            timestamp: block.timestamp
        }));
        
        // Evolve the genome
        genome.generation++;
        genome.traits = _mutateTraits(genome.traits, mutations);
        
        // Mint evolved SBT category if warranted
        uint256 newCategory = _determineGenomeCategory(genome.traits, genome.riskTolerance);
        if (balanceOf(genome.owner, newCategory) == 0) {
            _mint(genome.owner, newCategory, 1, "");
        }
        
        emit GenomeEvolved(tokenId, tokenId, genome.generation, genome.performance.totalReturn);
    }
    
    function _generateMutations(StrategyGenome memory genome) internal pure returns (string[] memory) {
        string[] memory mutations = new string[](3);
        
        if (genome.performance.sharpeRatio > 2000) { // 20% Sharpe
            mutations[0] = "Enhanced Risk Assessment";
        }
        
        if (genome.performance.maxDrawdown < 500) { // <5% max drawdown
            mutations[1] = "Improved Downside Protection";
        }
        
        if (genome.performance.adaptabilityScore >= 80) {
            mutations[2] = "Market Regime Adaptation";
        }
        
        return mutations;
    }
    
    function _mutateTraits(GenomeTraits memory traits, string[] memory mutations) internal pure returns (GenomeTraits memory) {
        // Mutate traits based on performance
        for (uint256 i = 0; i < mutations.length; i++) {
            if (keccak256(abi.encodePacked(mutations[i])) == keccak256("Enhanced Risk Assessment")) {
                traits.balancedGene = uint8(_bound(uint256(traits.balancedGene) + 20, 0, 255));
            }
            if (keccak256(abi.encodePacked(mutations[i])) == keccak256("Improved Downside Protection")) {
                traits.stabilitySeekingGene = uint8(_bound(uint256(traits.stabilitySeekingGene) + 15, 0, 255));
            }
            if (keccak256(abi.encodePacked(mutations[i])) == keccak256("Market Regime Adaptation")) {
                traits.trendFollowingGene = uint8(_bound(uint256(traits.trendFollowingGene) + 10, 0, 255));
            }
        }
        return traits;
    }
    
    function _isLegendaryPerformance(PerformanceMetrics memory metrics) internal pure returns (bool) {
        return metrics.totalReturn > 5000 && // 50% return
               metrics.sharpeRatio > 3000 && // 30% Sharpe
               metrics.maxDrawdown < 300 && // <3% drawdown
               metrics.consistencyScore >= 90 &&
               metrics.adaptabilityScore >= 90 &&
               metrics.totalTrades >= 100;
    }
    
    function _awardLegendaryGenome(address owner, uint256 tokenId) internal {
        if (balanceOf(owner, LEGENDARY_GENOME) == 0) {
            _mint(owner, LEGENDARY_GENOME, 1, "");
            emit LegendaryGenomeAchieved(owner, tokenId, genomes[tokenId].performance.totalReturn);
        }
    }
    
    function _determineGenomeCategory(GenomeTraits memory traits, uint256 riskTolerance) internal pure returns (uint256) {
        if (riskTolerance <= 30) {
            return RISK_AVERSE_GENOME;
        } else if (riskTolerance <= 70) {
            if (traits.balancedGene > traits.conservativeGene && traits.balancedGene > traits.aggressiveGene) {
                return BALANCED_GENOME;
            } else if (traits.momentumGene > 200) {
                return MOMENTUM_GENOME;
            } else if (traits.contrarianGene > 200) {
                return CONTRARIAN_GENOME;
            } else {
                return ADAPTIVE_GENOME;
            }
        } else {
            return AGGRESSIVE_GENOME;
        }
    }
    
    function getGenomeAnalysis(uint256 tokenId) external view returns (
        string memory riskProfile,
        string memory timePreference,
        string memory marketBehavior,
        string memory dominantTrait,
        uint256 genomeScore
    ) {
        StrategyGenome memory genome = genomes[tokenId];
        GenomeTraits memory traits = genome.traits;
        
        // Analyze risk profile
        if (traits.conservativeGene > traits.aggressiveGene && traits.conservativeGene > traits.balancedGene) {
            riskProfile = "Conservative";
        } else if (traits.aggressiveGene > traits.conservativeGene && traits.aggressiveGene > traits.balancedGene) {
            riskProfile = "Aggressive";
        } else {
            riskProfile = "Balanced";
        }
        
        // Analyze time preference
        timePreference = traits.longTermGene > traits.shortTermGene ? "Long-term" : "Short-term";
        
        // Analyze market behavior
        if (traits.trendFollowingGene > traits.contrarianGene) {
            marketBehavior = "Trend Following";
        } else {
            marketBehavior = "Contrarian";
        }
        
        // Determine dominant trait
        uint256 maxTrait = 0;
        if (traits.volatilitySeekingGene > maxTrait) {
            maxTrait = traits.volatilitySeekingGene;
            dominantTrait = "Volatility Seeking";
        }
        if (traits.stabilitySeekingGene > maxTrait) {
            maxTrait = traits.stabilitySeekingGene;
            dominantTrait = "Stability Seeking";
        }
        if (traits.momentumGene > maxTrait) {
            dominantTrait = "Momentum";
        }
        
        // Calculate genome score (0-1000)
        genomeScore = (genome.performance.adaptabilityScore * 5) + (genome.performance.consistencyScore * 5);
    }
    
    function getEvolutionHistory(uint256 tokenId) external view returns (GenomeEvolution[] memory) {
        return genomeEvolutions[tokenId];
    }
    
    function getUserGenomeHistory(address user) external view returns (uint256[] memory) {
        return userGenomeHistory[user];
    }
    
    function _bound(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
    
    // Override transfer functions to make it soulbound
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        revert("Soulbound: Transfer not allowed");
    }
    
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        revert("Soulbound: Transfer not allowed");
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}