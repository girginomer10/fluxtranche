export interface MarketData {
  btcPrice: number;
  ethPrice: number;
  totalLiquidity: number;
  avgFunding: number;
  impliedVol: number;
  vixEquivalent?: number;
  liquidityConcentration?: number;
  crossAssetCorr?: number;
  timestamp: number;
}

export interface RiskConfig {
  epochLength: number;
  seniorTargetBps: number;
  maxDrawdownBps: number;
  slippageBps: number;
  strategies: string[];
  targetWeightsBps: number[];
  caps: number[];
  reasons: string[];
  confidence: number;
  signals: {
    impliedVol: number;
    fundingRate: number;
    liquidityDepth: number;
    correlation: number;
    twapDeviation: number;
    riskScore?: number;
  };
}

export interface AIPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  targetAPY: number;
  maxDrawdown: number;
  preferredStrategies?: string[];
}

export interface DetailedMarketSignals {
  volatility: {
    btc24h: number;
    eth24h: number;
    defi24h: number;
    vixEquivalent: number;
  };
  liquidity: {
    totalTvl: number;
    concentrationRatio: number;
    averageDepth: number;
    slippageImpact: number;
  };
  funding: {
    btcPerp: number;
    ethPerp: number;
    altPerp: number;
    openInterest: number;
  };
  correlation: {
    btcEth: number;
    btcDefi: number;
    ethDefi: number;
    traditionalMarkets: number;
  };
  sentiment: {
    fearGreedIndex: number;
    socialSentiment: number;
    whaleActivity: number;
    retailFlow: number;
  };
  technical: {
    rsi: number;
    macdSignal: 'bullish' | 'bearish';
    supportLevel: number;
    resistanceLevel: number;
  };
}

export interface SignedRiskConfig extends RiskConfig {
  signature: string;
  timestamp: number;
  nonce?: number;
}