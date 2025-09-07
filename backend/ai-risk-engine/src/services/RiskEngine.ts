import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { MarketData, RiskConfig, AIPreferences } from '../types';
import NodeCache from 'node-cache';

export class RiskEngine {
  private genAI: GoogleGenerativeAI;
  private cache: NodeCache;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.cache = new NodeCache({ 
      stdTTL: 300, // 5 minutes cache
      checkperiod: 60 
    });
  }

  async generateRiskParams(
    marketData: MarketData, 
    preferences?: AIPreferences
  ): Promise<RiskConfig> {
    const cacheKey = `risk_params_${JSON.stringify(marketData).substring(0, 50)}`;
    const cached = this.cache.get<RiskConfig>(cacheKey);
    
    if (cached) {
      logger.info('Returning cached risk parameters');
      return cached;
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const prompt = this.buildPrompt(marketData, preferences);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      let riskConfig = this.parseAIResponse(text, marketData);
      
      // Apply safety bounds
      riskConfig = this.applySafetyBounds(riskConfig);
      
      // Cache the result
      this.cache.set(cacheKey, riskConfig);
      
      logger.info('Generated new risk parameters via AI', {
        epochLength: riskConfig.epochLength,
        seniorTargetBps: riskConfig.seniorTargetBps,
        confidence: riskConfig.confidence
      });
      
      return riskConfig;
    } catch (error) {
      logger.error('AI generation failed, falling back to rule-based system:', error);
      return this.generateRuleBasedParams(marketData, preferences);
    }
  }

  private buildPrompt(marketData: MarketData, preferences?: AIPreferences): string {
    return `
You are an expert DeFi risk management AI for FluxTranche protocol. Analyze the market data and generate optimal risk parameters.

Current Market Conditions:
- BTC Price: $${marketData.btcPrice.toFixed(2)}
- ETH Price: $${marketData.ethPrice.toFixed(2)}
- Total DeFi Liquidity: $${marketData.totalLiquidity.toLocaleString()}
- Average Funding Rate: ${(marketData.avgFunding * 100).toFixed(3)}%
- Implied Volatility: ${marketData.impliedVol.toFixed(1)}%
- VIX Equivalent: ${marketData.vixEquivalent?.toFixed(1) || 'N/A'}
- Liquidity Concentration: ${marketData.liquidityConcentration?.toFixed(2) || 'N/A'}
- Cross-Asset Correlation: ${marketData.crossAssetCorr?.toFixed(2) || 'N/A'}

${preferences ? `User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Target APY: ${preferences.targetAPY}%
- Max Drawdown: ${preferences.maxDrawdown}%` : ''}

Generate a JSON response with risk parameters optimized for:
1. Market volatility management
2. Liquidity risk mitigation
3. Senior tranche protection
4. Junior tranche yield optimization

Required JSON format (no markdown, pure JSON):
{
  "epochLength": <seconds between 3600 and 86400>,
  "seniorTargetBps": <basis points between 10 and 200>,
  "maxDrawdownBps": <basis points between 500 and 5000>,
  "slippageBps": <basis points between 10 and 300>,
  "strategies": ["0x1234567890123456789012345678901234567890", "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"],
  "targetWeightsBps": [<array of weights summing to 10000>],
  "caps": [<array of strategy caps in USDC, e.g., 1000000>],
  "reasons": ["<detailed reason 1>", "<detailed reason 2>", "<detailed reason 3>"],
  "confidence": <confidence percentage 0-100>,
  "signals": {
    "impliedVol": ${marketData.impliedVol},
    "fundingRate": ${marketData.avgFunding},
    "liquidityDepth": ${marketData.totalLiquidity},
    "correlation": <calculated correlation 0-1>,
    "twapDeviation": <deviation percentage>,
    "riskScore": <overall risk 0-100>
  }
}

Risk Management Rules:
- Higher volatility (>50%) → Lower senior target, shorter epochs
- Negative funding → Bullish bias, can increase risk slightly
- Low liquidity (<$500M) → Higher slippage tolerance, lower caps
- High correlation (>0.8) → More diversification needed
- VIX equivalent >30 → Defensive positioning

Provide specific, actionable reasoning based on the current market regime.
`;
  }

  private parseAIResponse(text: string, marketData: MarketData): RiskConfig {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!this.validateRiskConfigStructure(parsed)) {
        throw new Error('Invalid risk config structure from AI');
      }
      
      return parsed;
    } catch (error) {
      logger.warn('Failed to parse AI response, using rule-based fallback');
      return this.generateRuleBasedParams(marketData);
    }
  }

  private validateRiskConfigStructure(config: any): boolean {
    const required = ['epochLength', 'seniorTargetBps', 'maxDrawdownBps', 'slippageBps', 'strategies', 'targetWeightsBps', 'caps', 'confidence'];
    return required.every(field => config[field] !== undefined);
  }

  private generateRuleBasedParams(marketData: MarketData, preferences?: AIPreferences): RiskConfig {
    const isHighVol = marketData.impliedVol > 60;
    const isVeryHighVol = marketData.impliedVol > 80;
    const isBullish = marketData.avgFunding < 0;
    const isLowLiquidity = marketData.totalLiquidity < 500000000;
    
    // Dynamic epoch length based on volatility
    let epochLength = 86400; // 24 hours default
    if (isVeryHighVol) epochLength = 14400; // 4 hours
    else if (isHighVol) epochLength = 43200; // 12 hours
    
    // Senior target based on market conditions
    let seniorTargetBps = 50; // 0.5% default
    if (isHighVol) seniorTargetBps = 30;
    if (isVeryHighVol) seniorTargetBps = 20;
    if (isBullish && !isHighVol) seniorTargetBps = 70;
    
    // Drawdown limits
    let maxDrawdownBps = isHighVol ? 1500 : 2500;
    if (preferences?.maxDrawdown) {
      maxDrawdownBps = Math.min(maxDrawdownBps, preferences.maxDrawdown * 100);
    }
    
    // Strategy allocation
    const conservativeWeight = isHighVol ? 7500 : 6000;
    const aggressiveWeight = 10000 - conservativeWeight;
    
    return {
      epochLength,
      seniorTargetBps,
      maxDrawdownBps,
      slippageBps: isLowLiquidity ? 150 : 50,
      strategies: [
        "0x1234567890123456789012345678901234567890", // Conservative strategy
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"  // Aggressive strategy
      ],
      targetWeightsBps: [conservativeWeight, aggressiveWeight],
      caps: [
        isLowLiquidity ? 500000 : 1500000, // Conservative cap
        isLowLiquidity ? 200000 : 800000   // Aggressive cap
      ],
      reasons: [
        `Market volatility at ${marketData.impliedVol.toFixed(1)}% ${isHighVol ? 'requires defensive positioning' : 'allows for moderate risk-taking'}`,
        `Funding rate of ${(marketData.avgFunding * 100).toFixed(3)}% indicates ${isBullish ? 'bullish' : 'neutral'} sentiment`,
        `Liquidity depth of $${marketData.totalLiquidity.toLocaleString()} ${isLowLiquidity ? 'requires careful position sizing' : 'supports larger allocations'}`,
        `Epoch length set to ${epochLength / 3600}h to ${isHighVol ? 'adapt quickly to changing conditions' : 'provide stability'}`
      ],
      confidence: isHighVol ? 75 : 90, // Lower confidence in high vol environments
      signals: {
        impliedVol: marketData.impliedVol,
        fundingRate: marketData.avgFunding,
        liquidityDepth: marketData.totalLiquidity,
        correlation: marketData.crossAssetCorr || 0.65,
        twapDeviation: Math.random() * 3, // Mock TWAP deviation
        riskScore: isHighVol ? 80 : isLowLiquidity ? 60 : 40
      }
    };
  }

  private applySafetyBounds(config: RiskConfig): RiskConfig {
    return {
      ...config,
      epochLength: Math.max(3600, Math.min(86400, config.epochLength)),
      seniorTargetBps: Math.max(10, Math.min(200, config.seniorTargetBps)),
      maxDrawdownBps: Math.max(500, Math.min(5000, config.maxDrawdownBps)),
      slippageBps: Math.max(10, Math.min(300, config.slippageBps)),
      confidence: Math.max(0, Math.min(100, config.confidence)),
      // Ensure weights sum to 10000
      targetWeightsBps: this.normalizeWeights(config.targetWeightsBps)
    };
  }

  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) return weights.map(() => Math.floor(10000 / weights.length));
    return weights.map(w => Math.floor((w / sum) * 10000));
  }

  async getCurrentConfig(): Promise<RiskConfig | null> {
    // In a real implementation, this would fetch from the blockchain
    // For now, return a cached version or null
    return this.cache.get('current_config') || null;
  }
}