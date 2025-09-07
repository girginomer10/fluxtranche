// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AIExplainabilityPanel
 * @dev AI Panel (Explainability) — "reasons[]" ile bugün neden S/J oranı böyle?
 */
contract AIExplainabilityPanel is AccessControl {
    
    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    struct DecisionExplanation {
        uint256 timestamp;
        uint256 epoch;
        uint256 seniorRatio; // BPS
        uint256 juniorRatio; // BPS
        uint256 confidence; // AI confidence level (0-100)
        DecisionReason[] reasons;
        MarketContext marketContext;
        RiskMetrics riskMetrics;
        PortfolioState portfolioState;
        string aiModel; // "GPT-4o", "Claude-3", "Gemini-2.0-Pro"
        uint256 processingTime; // ms
    }
    
    struct DecisionReason {
        ReasonCategory category;
        uint256 weight; // Impact weight (0-100)
        string description;
        string[] supportingData;
        uint256 confidence; // Confidence in this reason (0-100)
        ReasonDirection direction; // BULLISH, BEARISH, NEUTRAL
    }
    
    enum ReasonCategory {
        MARKET_VOLATILITY,
        LIQUIDITY_CONDITIONS,
        RISK_METRICS,
        HISTORICAL_PERFORMANCE,
        CORRELATION_ANALYSIS,
        SENTIMENT_INDICATORS,
        ECONOMIC_INDICATORS,
        PORTFOLIO_REBALANCING,
        USER_BEHAVIOR,
        REGULATORY_ENVIRONMENT
    }
    
    enum ReasonDirection {
        BULLISH,    // Favors Junior (higher risk/reward)
        BEARISH,    // Favors Senior (lower risk)
        NEUTRAL     // No strong directional bias
    }
    
    struct MarketContext {
        uint256 vixLevel; // BPS
        uint256 bondYields; // BPS
        uint256 equityVolatility; // BPS
        uint256 liquiditySpread; // BPS
        uint256 correlationIndex; // -100 to +100
        string marketRegime; // "BULL", "BEAR", "SIDEWAYS", "CRISIS"
        uint256 fearGreedIndex; // 0-100
    }
    
    struct RiskMetrics {
        uint256 portfolioVaR; // Value at Risk (BPS)
        uint256 maxDrawdown; // BPS
        uint256 sharpeRatio; // BPS
        uint256 tailRisk; // BPS
        uint256 concentrationRisk; // BPS
        uint256 liquidityRisk; // BPS
        string riskBudgetUsage; // "LOW", "MEDIUM", "HIGH"
    }
    
    struct PortfolioState {
        uint256 totalAssets;
        uint256 seniorAssets;
        uint256 juniorAssets;
        uint256 pendingDeposits;
        uint256 pendingWithdrawals;
        uint256 utilizationRate; // BPS
        uint256 performanceYTD; // BPS
        uint256 avgHoldingPeriod; // days
    }
    
    struct UserQuery {
        address user;
        string question;
        uint256 timestamp;
        bool answered;
        string answer;
        uint256 relevantEpoch;
    }
    
    mapping(uint256 => DecisionExplanation) public epochExplanations;
    mapping(uint256 => UserQuery) public userQueries;
    mapping(address => uint256[]) public userQueryHistory;
    
    uint256 public currentEpoch;
    uint256 public queryCounter;
    
    // Common explanations for efficiency
    mapping(string => string) public commonExplanations;
    
    event DecisionExplained(uint256 indexed epoch, uint256 seniorRatio, uint256 juniorRatio, uint256 reasonCount, string aiModel);
    event UserQuerySubmitted(uint256 indexed queryId, address indexed user, string question);
    event UserQueryAnswered(uint256 indexed queryId, string answer, uint256 relevantEpoch);
    event ReasonWeightUpdated(uint256 indexed epoch, ReasonCategory category, uint256 weight);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AI_ORACLE_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
        
        // Initialize common explanations
        _initializeCommonExplanations();
    }
    
    function explainEpochDecision(
        uint256 epoch,
        uint256 seniorRatio,
        uint256 juniorRatio,
        uint256 confidence,
        DecisionReason[] calldata reasons,
        MarketContext calldata marketContext,
        RiskMetrics calldata riskMetrics,
        PortfolioState calldata portfolioState,
        string calldata aiModel,
        uint256 processingTime
    ) external onlyRole(AI_ORACLE_ROLE) {
        require(reasons.length > 0, "No reasons provided");
        require(seniorRatio + juniorRatio == 10000, "Invalid ratios");
        
        DecisionExplanation storage explanation = epochExplanations[epoch];
        explanation.timestamp = block.timestamp;
        explanation.epoch = epoch;
        explanation.seniorRatio = seniorRatio;
        explanation.juniorRatio = juniorRatio;
        explanation.confidence = confidence;
        explanation.marketContext = marketContext;
        explanation.riskMetrics = riskMetrics;
        explanation.portfolioState = portfolioState;
        explanation.aiModel = aiModel;
        explanation.processingTime = processingTime;
        
        // Copy reasons
        delete explanation.reasons;
        for (uint256 i = 0; i < reasons.length; i++) {
            explanation.reasons.push(reasons[i]);
        }
        
        currentEpoch = epoch;
        
        emit DecisionExplained(epoch, seniorRatio, juniorRatio, reasons.length, aiModel);
    }
    
    function askQuestion(string calldata question) external returns (uint256 queryId) {
        queryCounter++;
        queryId = queryCounter;
        
        userQueries[queryId] = UserQuery({
            user: msg.sender,
            question: question,
            timestamp: block.timestamp,
            answered: false,
            answer: "",
            relevantEpoch: currentEpoch
        });
        
        userQueryHistory[msg.sender].push(queryId);
        
        emit UserQuerySubmitted(queryId, msg.sender, question);
        return queryId;
    }
    
    function answerUserQuery(
        uint256 queryId,
        string calldata answer,
        uint256 relevantEpoch
    ) external onlyRole(AI_ORACLE_ROLE) {
        UserQuery storage query = userQueries[queryId];
        require(!query.answered, "Already answered");
        
        query.answer = answer;
        query.answered = true;
        query.relevantEpoch = relevantEpoch;
        
        emit UserQueryAnswered(queryId, answer, relevantEpoch);
    }
    
    function getCurrentDecisionBreakdown() external view returns (
        uint256 seniorRatio,
        uint256 juniorRatio,
        uint256 confidence,
        string memory marketRegime,
        uint256 reasonCount,
        string memory aiModel
    ) {
        DecisionExplanation storage current = epochExplanations[currentEpoch];
        return (
            current.seniorRatio,
            current.juniorRatio,
            current.confidence,
            current.marketContext.marketRegime,
            current.reasons.length,
            current.aiModel
        );
    }
    
    function getTopReasons(uint256 epoch, uint256 limit) external view returns (DecisionReason[] memory) {
        DecisionExplanation storage explanation = epochExplanations[epoch];
        uint256 length = explanation.reasons.length > limit ? limit : explanation.reasons.length;
        
        DecisionReason[] memory topReasons = new DecisionReason[](length);
        
        // Sort by weight (simplified - in production would use proper sorting)
        for (uint256 i = 0; i < length; i++) {
            topReasons[i] = explanation.reasons[i];
        }
        
        return topReasons;
    }
    
    function getReasonsByCategory(uint256 epoch, ReasonCategory category) external view returns (DecisionReason[] memory) {
        DecisionExplanation storage explanation = epochExplanations[epoch];
        
        // Count matching reasons
        uint256 count = 0;
        for (uint256 i = 0; i < explanation.reasons.length; i++) {
            if (explanation.reasons[i].category == category) {
                count++;
            }
        }
        
        DecisionReason[] memory categoryReasons = new DecisionReason[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < explanation.reasons.length; i++) {
            if (explanation.reasons[i].category == category) {
                categoryReasons[index] = explanation.reasons[i];
                index++;
            }
        }
        
        return categoryReasons;
    }
    
    function getMarketContext(uint256 epoch) external view returns (MarketContext memory) {
        return epochExplanations[epoch].marketContext;
    }
    
    function getRiskMetrics(uint256 epoch) external view returns (RiskMetrics memory) {
        return epochExplanations[epoch].riskMetrics;
    }
    
    function getPortfolioState(uint256 epoch) external view returns (PortfolioState memory) {
        return epochExplanations[epoch].portfolioState;
    }
    
    function getUserQueryHistory(address user) external view returns (uint256[] memory) {
        return userQueryHistory[user];
    }
    
    function getQuery(uint256 queryId) external view returns (UserQuery memory) {
        return userQueries[queryId];
    }
    
    function generateSimpleExplanation(uint256 epoch) external view returns (string memory) {
        DecisionExplanation storage explanation = epochExplanations[epoch];
        
        string memory baseExplanation = "Based on current market conditions, the AI recommends ";
        
        if (explanation.seniorRatio > explanation.juniorRatio) {
            baseExplanation = string(abi.encodePacked(
                baseExplanation,
                "a conservative approach with ",
                _uint2str(explanation.seniorRatio / 100),
                "% in Senior tranches due to "
            ));
        } else {
            baseExplanation = string(abi.encodePacked(
                baseExplanation,
                "a growth-oriented approach with ",
                _uint2str(explanation.juniorRatio / 100),
                "% in Junior tranches due to "
            ));
        }
        
        // Add top reason
        if (explanation.reasons.length > 0) {
            baseExplanation = string(abi.encodePacked(
                baseExplanation,
                explanation.reasons[0].description
            ));
        }
        
        return baseExplanation;
    }
    
    function getDecisionTimeline(uint256 startEpoch, uint256 endEpoch) external view returns (
        uint256[] memory epochs,
        uint256[] memory seniorRatios,
        uint256[] memory juniorRatios,
        uint256[] memory confidences
    ) {
        require(endEpoch >= startEpoch, "Invalid epoch range");
        uint256 length = endEpoch - startEpoch + 1;
        
        epochs = new uint256[](length);
        seniorRatios = new uint256[](length);
        juniorRatios = new uint256[](length);
        confidences = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 epoch = startEpoch + i;
            DecisionExplanation storage explanation = epochExplanations[epoch];
            
            epochs[i] = epoch;
            seniorRatios[i] = explanation.seniorRatio;
            juniorRatios[i] = explanation.juniorRatio;
            confidences[i] = explanation.confidence;
        }
    }
    
    function _initializeCommonExplanations() internal {
        commonExplanations["HIGH_VOLATILITY"] = "Market volatility is elevated, favoring safer Senior tranches";
        commonExplanations["LOW_VOLATILITY"] = "Market volatility is low, creating opportunities for Junior tranches";
        commonExplanations["RISING_RATES"] = "Rising interest rates make Senior tranches more attractive";
        commonExplanations["FALLING_RATES"] = "Falling rates support risk assets in Junior tranches";
        commonExplanations["HIGH_CORRELATION"] = "High asset correlations increase portfolio risk";
        commonExplanations["FLIGHT_TO_QUALITY"] = "Market stress drives demand for Senior tranches";
        commonExplanations["RISK_ON"] = "Risk-on sentiment supports Junior tranche allocation";
        commonExplanations["LIQUIDITY_STRESS"] = "Liquidity conditions favor more liquid Senior positions";
    }
    
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
    
    function updateCommonExplanation(string calldata key, string calldata explanation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        commonExplanations[key] = explanation;
    }
    
    function batchAnswerQueries(
        uint256[] calldata queryIds,
        string[] calldata answers,
        uint256[] calldata relevantEpochs
    ) external onlyRole(AI_ORACLE_ROLE) {
        require(queryIds.length == answers.length, "Array length mismatch");
        require(answers.length == relevantEpochs.length, "Array length mismatch");
        
        for (uint256 i = 0; i < queryIds.length; i++) {
            UserQuery storage query = userQueries[queryIds[i]];
            if (!query.answered) {
                query.answer = answers[i];
                query.answered = true;
                query.relevantEpoch = relevantEpochs[i];
                
                emit UserQueryAnswered(queryIds[i], answers[i], relevantEpochs[i]);
            }
        }
    }
    
    function getReasonCategoryBreakdown(uint256 epoch) external view returns (
        ReasonCategory[] memory categories,
        uint256[] memory weights,
        uint256[] memory counts
    ) {
        DecisionExplanation storage explanation = epochExplanations[epoch];
        
        // Count unique categories
        ReasonCategory[] memory tempCategories = new ReasonCategory[](10); // Max categories
        uint256[] memory tempWeights = new uint256[](10);
        uint256[] memory tempCounts = new uint256[](10);
        uint256 uniqueCategories = 0;
        
        for (uint256 i = 0; i < explanation.reasons.length; i++) {
            ReasonCategory cat = explanation.reasons[i].category;
            
            // Find existing category or add new one
            bool found = false;
            for (uint256 j = 0; j < uniqueCategories; j++) {
                if (tempCategories[j] == cat) {
                    tempWeights[j] += explanation.reasons[i].weight;
                    tempCounts[j]++;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                tempCategories[uniqueCategories] = cat;
                tempWeights[uniqueCategories] = explanation.reasons[i].weight;
                tempCounts[uniqueCategories] = 1;
                uniqueCategories++;
            }
        }
        
        // Resize arrays to actual size
        categories = new ReasonCategory[](uniqueCategories);
        weights = new uint256[](uniqueCategories);
        counts = new uint256[](uniqueCategories);
        
        for (uint256 i = 0; i < uniqueCategories; i++) {
            categories[i] = tempCategories[i];
            weights[i] = tempWeights[i];
            counts[i] = tempCounts[i];
        }
    }
}