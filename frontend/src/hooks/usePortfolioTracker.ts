import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { PortfolioTrackerABI } from '@/config/contracts';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'commodity' | 'bond' | 'etf' | 'index' | 'forex';
  price: number; // Current price in USD
  change24h: number; // 24h price change %
  volume24h: number; // 24h trading volume
  marketCap?: number; // Market cap if applicable
  sector?: string; // For stocks
  exchange: string; // Trading venue
  logo?: string; // Asset logo URL
}

interface Position {
  id: string;
  owner: `0x${string}`;
  assetId: string;
  symbol: string;
  quantity: number; // Amount held
  avgCost: number; // Average cost basis per unit
  totalCost: number; // Total invested
  currentValue: number; // Current market value
  unrealizedPnL: number; // Unrealized profit/loss
  unrealizedPnLPercent: number; // Unrealized P&L %
  realizedPnL: number; // Realized profit/loss from trades
  totalReturn: number; // Total return %
  weight: number; // Portfolio weight %
  lastUpdated: number;
  notes?: string; // User notes
}

interface Transaction {
  id: string;
  portfolioId: string;
  assetId: string;
  symbol: string;
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer';
  quantity: number;
  price: number;
  value: number; // Total transaction value
  fees: number; // Transaction fees
  timestamp: number;
  description?: string;
}

interface Portfolio {
  id: string;
  owner: `0x${string}`;
  name: string;
  description?: string;
  totalValue: number; // Total portfolio value
  totalCost: number; // Total amount invested
  totalReturn: number; // Total return $
  totalReturnPercent: number; // Total return %
  dayChange: number; // 1-day change $
  dayChangePercent: number; // 1-day change %
  positions: Position[];
  transactions: Transaction[];
  rebalanceThreshold: number; // Auto-rebalance trigger %
  isPublic: boolean; // Whether portfolio is public
  created: number;
  updated: number;
}

interface MarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  dominanceBTC: number;
  dominanceETH: number;
  fearGreedIndex: number;
  topGainers: Asset[];
  topLosers: Asset[];
  trending: Asset[];
}

interface AssetAllocation {
  type: string;
  value: number;
  percentage: number;
  color: string;
}

interface PerformanceMetrics {
  sharpeRatio: number;
  sortino: number;
  maxDrawdown: number;
  volatility: number;
  beta: number; // vs market benchmark
  alpha: number;
  correlationToMarket: number;
  valueAtRisk95: number; // 95% VaR
}

export function usePortfolioTracker() {
  const { address } = useAccount();
  const trackerAddr = CONTRACTS.PORTFOLIO_TRACKER as `0x${string}`;
  const enabled = trackerAddr !== '0x0000000000000000000000000000000000000000';

  // Read user's portfolios
  const { data: userPortfolios } = useReadContract({
    address: trackerAddr,
    abi: PortfolioTrackerABI,
    functionName: 'getUserPortfolios',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read available assets
  const { data: availableAssets } = useReadContract({
    address: trackerAddr,
    abi: PortfolioTrackerABI,
    functionName: 'getAvailableAssets',
    query: { enabled },
  });

  // Read market data
  const { data: marketData } = useReadContract({
    address: trackerAddr,
    abi: PortfolioTrackerABI,
    functionName: 'getMarketData',
    query: { enabled },
  });

  // Read trending assets
  const { data: trendingAssets } = useReadContract({
    address: trackerAddr,
    abi: PortfolioTrackerABI,
    functionName: 'getTrendingAssets',
    args: [20], // Top 20 trending
    query: { enabled },
  });

  const { writeContract: writeTracker, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Create new portfolio
  const createPortfolio = async (name: string, description: string, isPublic: boolean) => {
    return writeTracker({
      address: trackerAddr,
      abi: PortfolioTrackerABI,
      functionName: 'createPortfolio',
      args: [name, description, isPublic],
    });
  };

  // Add position to portfolio
  const addPosition = async (
    portfolioId: string,
    assetId: string,
    quantity: bigint,
    avgCost: bigint,
    notes?: string
  ) => {
    return writeTracker({
      address: trackerAddr,
      abi: PortfolioTrackerABI,
      functionName: 'addPosition',
      args: [portfolioId, assetId, quantity, avgCost, notes || ''],
    });
  };

  // Update position
  const updatePosition = async (
    positionId: string,
    quantity: bigint,
    avgCost: bigint,
    notes?: string
  ) => {
    return writeTracker({
      address: trackerAddr,
      abi: PortfolioTrackerABI,
      functionName: 'updatePosition',
      args: [positionId, quantity, avgCost, notes || ''],
    });
  };

  // Record transaction
  const recordTransaction = async (
    portfolioId: string,
    assetId: string,
    type: string,
    quantity: bigint,
    price: bigint,
    fees: bigint,
    description?: string
  ) => {
    return writeTracker({
      address: trackerAddr,
      abi: PortfolioTrackerABI,
      functionName: 'recordTransaction',
      args: [portfolioId, assetId, type, quantity, price, fees, description || ''],
    });
  };

  // Calculate portfolio metrics
  const calculateMetrics = (portfolio: Portfolio): PerformanceMetrics => {
    // Simplified metrics calculation
    const returns = portfolio.positions.map(p => p.totalReturn);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    return {
      sharpeRatio: volatility > 0 ? (avgReturn - 0.02) / volatility : 0, // Assuming 2% risk-free rate
      sortino: 0.85, // Placeholder
      maxDrawdown: -0.12, // Placeholder
      volatility,
      beta: 0.95, // Placeholder
      alpha: 0.03, // Placeholder
      correlationToMarket: 0.72, // Placeholder
      valueAtRisk95: portfolio.totalValue * 0.05 // 5% of portfolio value
    };
  };

  // Calculate asset allocation
  const calculateAllocation = (portfolio: Portfolio): AssetAllocation[] => {
    const typeGroups: { [key: string]: number } = {};
    
    portfolio.positions.forEach(position => {
      const asset = state.assets.find(a => a.id === position.assetId);
      const type = asset?.type || 'unknown';
      typeGroups[type] = (typeGroups[type] || 0) + position.currentValue;
    });

    const colors = {
      crypto: '#f7931e',
      stock: '#4ade80',
      commodity: '#fbbf24',
      bond: '#60a5fa',
      etf: '#a78bfa',
      index: '#f87171',
      forex: '#34d399'
    };

    return Object.entries(typeGroups).map(([type, value]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      value,
      percentage: (value / portfolio.totalValue) * 100,
      color: colors[type as keyof typeof colors] || '#9ca3af'
    }));
  };

  // Process state for UI
  const state = useMemo(() => {
    if (!enabled || !userPortfolios) {
      // Demo data
      return {
        portfolios: [
          {
            id: 'portfolio_001',
            owner: address || '0x0',
            name: 'Main Portfolio',
            description: 'Primary investment portfolio',
            totalValue: 125750,
            totalCost: 100000,
            totalReturn: 25750,
            totalReturnPercent: 0.2575,
            dayChange: 2340,
            dayChangePercent: 0.019,
            positions: [
              {
                id: 'pos_001',
                owner: address || '0x0',
                assetId: 'eth',
                symbol: 'ETH',
                quantity: 15.5,
                avgCost: 1800,
                totalCost: 27900,
                currentValue: 36270, // 15.5 * 2340
                unrealizedPnL: 8370,
                unrealizedPnLPercent: 0.30,
                realizedPnL: 0,
                totalReturn: 0.30,
                weight: 0.288, // 36270/125750
                lastUpdated: Date.now(),
                notes: 'Core crypto holding'
              },
              {
                id: 'pos_002',
                owner: address || '0x0',
                assetId: 'aapl',
                symbol: 'AAPL',
                quantity: 100,
                avgCost: 150,
                totalCost: 15000,
                currentValue: 18900, // 100 * 189
                unrealizedPnL: 3900,
                unrealizedPnLPercent: 0.26,
                realizedPnL: 500,
                totalReturn: 0.293,
                weight: 0.150,
                lastUpdated: Date.now(),
                notes: 'Tech growth play'
              }
            ],
            transactions: [],
            rebalanceThreshold: 0.05,
            isPublic: false,
            created: Date.now() - 86400000 * 90,
            updated: Date.now()
          }
        ] as Portfolio[],
        assets: [
          {
            id: 'eth',
            symbol: 'ETH',
            name: 'Ethereum',
            type: 'crypto' as const,
            price: 2340,
            change24h: 0.032,
            volume24h: 8500000000,
            marketCap: 280000000000,
            exchange: 'Multiple',
            logo: '/assets/eth.png'
          },
          {
            id: 'btc',
            symbol: 'BTC',
            name: 'Bitcoin',
            type: 'crypto' as const,
            price: 43200,
            change24h: 0.018,
            volume24h: 12000000000,
            marketCap: 850000000000,
            exchange: 'Multiple',
            logo: '/assets/btc.png'
          },
          {
            id: 'aapl',
            symbol: 'AAPL',
            name: 'Apple Inc.',
            type: 'stock' as const,
            price: 189,
            change24h: 0.015,
            volume24h: 45000000,
            marketCap: 2900000000000,
            sector: 'Technology',
            exchange: 'NASDAQ',
            logo: '/assets/aapl.png'
          },
          {
            id: 'gold',
            symbol: 'GOLD',
            name: 'Gold Futures',
            type: 'commodity' as const,
            price: 2020,
            change24h: -0.008,
            volume24h: 150000000,
            exchange: 'COMEX',
            logo: '/assets/gold.png'
          }
        ] as Asset[],
        marketData: {
          totalMarketCap: 2400000000000,
          totalVolume24h: 95000000000,
          dominanceBTC: 0.51,
          dominanceETH: 0.18,
          fearGreedIndex: 72,
          topGainers: [],
          topLosers: [],
          trending: []
        } as MarketData,
        trendingAssets: [] as Asset[]
      };
    }

    const portfolios = (userPortfolios as any[]) || [];
    const assets = (availableAssets as any[]) || [];
    const market = marketData as any;
    const trending = (trendingAssets as any[]) || [];

    return {
      portfolios: portfolios.map((portfolio: any) => ({
        id: portfolio.id,
        owner: portfolio.owner,
        name: portfolio.name,
        description: portfolio.description,
        totalValue: Number(portfolio.totalValue) / 1e6,
        totalCost: Number(portfolio.totalCost) / 1e6,
        totalReturn: Number(portfolio.totalReturn) / 1e6,
        totalReturnPercent: Number(portfolio.totalReturnPercent) / 10000,
        dayChange: Number(portfolio.dayChange) / 1e6,
        dayChangePercent: Number(portfolio.dayChangePercent) / 10000,
        positions: (portfolio.positions || []).map((pos: any) => ({
          id: pos.id,
          owner: pos.owner,
          assetId: pos.assetId,
          symbol: pos.symbol,
          quantity: Number(pos.quantity) / 1e8, // 8 decimal precision
          avgCost: Number(pos.avgCost) / 1e6,
          totalCost: Number(pos.totalCost) / 1e6,
          currentValue: Number(pos.currentValue) / 1e6,
          unrealizedPnL: Number(pos.unrealizedPnL) / 1e6,
          unrealizedPnLPercent: Number(pos.unrealizedPnLPercent) / 10000,
          realizedPnL: Number(pos.realizedPnL) / 1e6,
          totalReturn: Number(pos.totalReturn) / 10000,
          weight: Number(pos.weight) / 10000,
          lastUpdated: Number(pos.lastUpdated) * 1000,
          notes: pos.notes
        })),
        transactions: (portfolio.transactions || []).map((tx: any) => ({
          id: tx.id,
          portfolioId: tx.portfolioId,
          assetId: tx.assetId,
          symbol: tx.symbol,
          type: tx.type,
          quantity: Number(tx.quantity) / 1e8,
          price: Number(tx.price) / 1e6,
          value: Number(tx.value) / 1e6,
          fees: Number(tx.fees) / 1e6,
          timestamp: Number(tx.timestamp) * 1000,
          description: tx.description
        })),
        rebalanceThreshold: Number(portfolio.rebalanceThreshold) / 10000,
        isPublic: portfolio.isPublic,
        created: Number(portfolio.created) * 1000,
        updated: Number(portfolio.updated) * 1000
      })) as Portfolio[],
      assets: assets.map((asset: any) => ({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        price: Number(asset.price) / 1e6,
        change24h: Number(asset.change24h) / 10000,
        volume24h: Number(asset.volume24h) / 1e6,
        marketCap: asset.marketCap ? Number(asset.marketCap) / 1e6 : undefined,
        sector: asset.sector,
        exchange: asset.exchange,
        logo: asset.logo
      })) as Asset[],
      marketData: market ? {
        totalMarketCap: Number(market.totalMarketCap) / 1e6,
        totalVolume24h: Number(market.totalVolume24h) / 1e6,
        dominanceBTC: Number(market.dominanceBTC) / 10000,
        dominanceETH: Number(market.dominanceETH) / 10000,
        fearGreedIndex: Number(market.fearGreedIndex),
        topGainers: (market.topGainers || []).map((asset: any) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          price: Number(asset.price) / 1e6,
          change24h: Number(asset.change24h) / 10000,
          volume24h: Number(asset.volume24h) / 1e6,
          exchange: asset.exchange
        })),
        topLosers: (market.topLosers || []).map((asset: any) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          price: Number(asset.price) / 1e6,
          change24h: Number(asset.change24h) / 10000,
          volume24h: Number(asset.volume24h) / 1e6,
          exchange: asset.exchange
        })),
        trending: (market.trending || []).map((asset: any) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          price: Number(asset.price) / 1e6,
          change24h: Number(asset.change24h) / 10000,
          volume24h: Number(asset.volume24h) / 1e6,
          exchange: asset.exchange
        }))
      } : {
        totalMarketCap: 0,
        totalVolume24h: 0,
        dominanceBTC: 0,
        dominanceETH: 0,
        fearGreedIndex: 50,
        topGainers: [],
        topLosers: [],
        trending: []
      } as MarketData,
      trendingAssets: trending.map((asset: any) => ({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        price: Number(asset.price) / 1e6,
        change24h: Number(asset.change24h) / 10000,
        volume24h: Number(asset.volume24h) / 1e6,
        exchange: asset.exchange
      })) as Asset[]
    };
  }, [enabled, userPortfolios, availableAssets, marketData, trendingAssets, address]);

  return {
    enabled,
    state,
    isWritePending,
    createPortfolio,
    addPosition,
    updatePosition,
    recordTransaction,
    calculateMetrics,
    calculateAllocation,
  } as const;
}