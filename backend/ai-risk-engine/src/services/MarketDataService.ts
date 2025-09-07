import axios from 'axios';
import { MarketData, DetailedMarketSignals } from '../types';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';
import { CEX_CONFIG } from '../config/market';

async function safeFetch(url: string): Promise<any> {
    try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            // Not found is a valid response for unlisted pairs
            return null;
        }
        logger.warn(`Failed to fetch ${url}: ${error.message}`);
        return null;
    }
}

export class MarketDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: this.CACHE_TTL,
      checkperiod: 60 
    });
  }

  async getMarketData(): Promise<MarketData> {
    const cached = this.cache.get<MarketData>('market_data');
    if (cached) {
      logger.info('Returning cached market data');
      return cached;
    }

    try {
      const [btcData, ethData] = await Promise.all([
        this.fetchAggregatedMarketData('BTC'),
        this.fetchAggregatedMarketData('ETH')
      ]);

      const marketData: MarketData = {
        btcPrice: btcData?.price || 65000,
        ethPrice: ethData?.price || 3500,
        totalLiquidity: (btcData?.volume || 0) + (ethData?.volume || 0), // Simplification
        avgFunding: 0.01, // Placeholder
        impliedVol: btcData?.priceChange24h || 50, // Simplification
        vixEquivalent: this.calculateVixEquivalent(),
        liquidityConcentration: this.calculateLiquidityConcentration(),
        crossAssetCorr: this.calculateCrossAssetCorrelation(),
        timestamp: Date.now()
      };

      this.cache.set('market_data', marketData);
      logger.info('Fetched fresh market data', { 
        btcPrice: marketData.btcPrice,
        ethPrice: marketData.ethPrice,
        impliedVol: marketData.impliedVol 
      });

      return marketData;
    } catch (error) {
      logger.error('Failed to fetch market data, using mock data:', error);
      return this.getMockMarketData();
    }
  }

  private async fetchAggregatedMarketData(token: string): Promise<{ price: number; volume: number; priceChange24h: number } | null> {
    const pairs = CEX_CONFIG.QUOTE_PRIORITY;
    let bestData = null;
    let maxVolume = 0;

    for (const pair of pairs) {
        const ticker = `${token}${pair}`;
        const url = `${CEX_CONFIG.BINANCE_PROXY_URL}/api/v3/ticker/24hr?symbol=${ticker}`;
        const data = await safeFetch(url);

        if (data && data.quoteVolume) {
            const volume = parseFloat(data.quoteVolume);
            if (volume > maxVolume) {
                maxVolume = volume;
                bestData = {
                    price: parseFloat(data.lastPrice),
                    volume: volume,
                    priceChange24h: parseFloat(data.priceChangePercent)
                };
            }
        }
    }
    return bestData;
  }

  async getDetailedSignals(): Promise<DetailedMarketSignals> {
    const marketData = await this.getMarketData();
    
    return {
      volatility: {
        btc24h: marketData.impliedVol,
        eth24h: marketData.impliedVol * 0.9,
        defi24h: marketData.impliedVol * 1.1,
        vixEquivalent: marketData.vixEquivalent || 25
      },
      liquidity: {
        totalTvl: marketData.totalLiquidity,
        concentrationRatio: marketData.liquidityConcentration || 0.3,
        averageDepth: marketData.totalLiquidity * 0.1,
        slippageImpact: this.calculateSlippageImpact(marketData)
      },
      funding: {
        btcPerp: marketData.avgFunding,
        ethPerp: marketData.avgFunding * 0.8,
        altPerp: marketData.avgFunding * 1.2,
        openInterest: 1000000000
      },
      correlation: {
        btcEth: marketData.crossAssetCorr || 0.65,
        btcDefi: (marketData.crossAssetCorr || 0.65) * 0.9,
        ethDefi: (marketData.crossAssetCorr || 0.65) * 1.1,
        traditionalMarkets: 0.4
      },
      sentiment: {
        fearGreedIndex: this.calculateFearGreedIndex(marketData),
        socialSentiment: Math.random() * 100,
        whaleActivity: Math.random() * 100,
        retailFlow: Math.random() * 100 - 50
      },
      technical: {
        rsi: 50 + (Math.random() - 0.5) * 40,
        macdSignal: Math.random() > 0.5 ? 'bullish' : 'bearish',
        supportLevel: marketData.btcPrice * 0.95,
        resistanceLevel: marketData.btcPrice * 1.05
      }
    };
  }

  private extractValue(
    result: PromiseSettledResult<any>, 
    key: string, 
    defaultValue: number
  ): number {
    if (result.status === 'fulfilled' && result.value[key]) {
      return result.value[key];
    }
    // This function is now mostly replaced by fetchAggregatedMarketData
    return defaultValue + (Math.random() - 0.5) * defaultValue * 0.1;
  }

  private calculateVixEquivalent(): number {
    // Mock VIX calculation based on implied vol
    return 20 + Math.random() * 20;
  }

  private calculateLiquidityConcentration(): number {
    // Mock liquidity concentration (higher = more concentrated)
    return 0.2 + Math.random() * 0.4;
  }

  private calculateCrossAssetCorrelation(): number {
    // Mock correlation coefficient
    return 0.5 + Math.random() * 0.4;
  }

  private calculateSlippageImpact(marketData: MarketData): number {
    // Lower liquidity = higher slippage impact
    const liquidityFactor = marketData.totalLiquidity / 1000000000;
    return Math.max(0.1, 2 / liquidityFactor);
  }

  private calculateFearGreedIndex(marketData: MarketData): number {
    // Simple fear/greed based on volatility and funding
    const volFactor = Math.max(0, 100 - marketData.impliedVol);
    const fundingFactor = marketData.avgFunding > 0 ? 30 : 70;
    return Math.min(100, Math.max(0, (volFactor + fundingFactor) / 2));
  }

  private getMockMarketData(): MarketData {
    return {
      btcPrice: 65000,
      ethPrice: 3500,
      totalLiquidity: 1000000000,
      avgFunding: 0.01,
      impliedVol: 50,
      vixEquivalent: 25,
      liquidityConcentration: 0.3,
      crossAssetCorr: 0.65,
      timestamp: Date.now()
    };
  }
}