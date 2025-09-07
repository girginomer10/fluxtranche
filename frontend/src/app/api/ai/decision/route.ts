import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET() {
  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      // Return mock data when no API key
      const mockDecision = {
        seniorTarget: 65 + Math.random() * 20,
        riskLevel: 'Medium',
        confidence: 80 + Math.random() * 15,
        strategies: Math.floor(Math.random() * 3) + 1,
        reasoning: [
          'Market conditions show moderate volatility',
          'Funding rates suggest neutral sentiment',
          'Liquidity levels support current allocation'
        ]
      };
      
      return NextResponse.json(mockDecision);
    }

    // Get model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Mock market data (in production, fetch from real sources)
    const marketData = {
      btcPrice: 65000 + Math.random() * 5000,
      ethPrice: 3500 + Math.random() * 500,
      totalLiquidity: 1000000 + Math.random() * 500000,
      avgFunding: -0.01 + Math.random() * 0.02,
      impliedVol: 40 + Math.random() * 30,
    };

    const prompt = `
    You are an AI risk engine for a DeFi protocol. Analyze the following market data and provide risk parameters:
    
    Market Data:
    - BTC Price: $${marketData.btcPrice.toFixed(2)}
    - ETH Price: $${marketData.ethPrice.toFixed(2)}
    - Total Liquidity: $${marketData.totalLiquidity.toFixed(0)}
    - Average Funding Rate: ${(marketData.avgFunding * 100).toFixed(3)}%
    - Implied Volatility: ${marketData.impliedVol.toFixed(1)}%
    
    Provide a JSON response with the following structure (no markdown, just JSON):
    {
      "epochLength": <seconds between 3600 and 86400>,
      "seniorTargetBps": <basis points between 10 and 100>,
      "maxDrawdownBps": <basis points between 500 and 3000>,
      "slippageBps": <basis points between 10 and 200>,
      "strategies": ["0x1234...", "0x5678..."],
      "targetWeightsBps": [<array of weights summing to 10000>],
      "caps": [<array of caps in USDC>],
      "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
      "confidence": <confidence percentage 0-100>,
      "signals": {
        "impliedVol": ${marketData.impliedVol},
        "fundingRate": ${marketData.avgFunding},
        "liquidityDepth": ${marketData.totalLiquidity},
        "correlation": <correlation coefficient>,
        "twapDeviation": <deviation percentage>
      }
    }
    
    Base your decision on:
    1. Higher volatility = lower senior target, higher junior buffer
    2. Negative funding = bullish bias, can increase risk
    3. High liquidity = can take larger positions
    4. Consider correlation between assets for diversification
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    let aiDecision;
    try {
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiDecision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      // Fallback to mock data if parsing fails
      aiDecision = generateMockDecision(marketData);
    }

    // Add timestamp
    aiDecision.timestamp = Date.now();

    return NextResponse.json(aiDecision);
  } catch (error) {
    console.error('AI decision error:', error);
    
    // Return mock data on error
    return NextResponse.json(generateMockDecision({
      impliedVol: 50,
      avgFunding: 0.01,
      totalLiquidity: 1000000,
    }));
  }
}

function generateMockDecision(marketData: any) {
  const isHighVol = marketData.impliedVol > 60;
  const isBullish = marketData.avgFunding < 0;
  
  return {
    epochLength: isHighVol ? 3600 * 4 : 86400, // Shorter epochs in high vol
    seniorTargetBps: isHighVol ? 20 : 50, // Lower target in high vol
    maxDrawdownBps: isHighVol ? 1000 : 2000,
    slippageBps: 50,
    strategies: [
      "0x1234567890123456789012345678901234567890",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ],
    targetWeightsBps: isHighVol ? [7000, 3000] : [6000, 4000],
    caps: [1000000, 500000],
    reasons: [
      isHighVol ? "High volatility detected, reducing risk exposure" : "Stable market conditions allow for higher yields",
      isBullish ? "Negative funding indicates bullish sentiment" : "Neutral funding, balanced approach",
      "Liquidity depth sufficient for current allocation"
    ],
    confidence: isHighVol ? 75 : 85,
    signals: {
      impliedVol: marketData.impliedVol || 50,
      fundingRate: marketData.avgFunding || 0.01,
      liquidityDepth: marketData.totalLiquidity || 1000000,
      correlation: 0.65,
      twapDeviation: 1.2
    },
    timestamp: Date.now()
  };
}