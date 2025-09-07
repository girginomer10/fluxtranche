import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { VolTargetIndexABI, ERC1155ABI } from '@/config/contracts';

interface VolTargetStrategy {
  id: string;
  name: string;
  targetVolatility: number; // Target vol % (e.g., 0.10 for 10%)
  underlyingAsset: string; // Base asset (ETH, BTC, S&P500, etc.)
  currentVolatility: number; // Realized vol over lookback period
  lookbackPeriod: number; // Days for vol calculation
  rebalanceFrequency: number; // Hours between rebalances
  currentExposure: number; // Current exposure multiplier (0-2x typically)
  maxExposure: number; // Maximum allowed exposure
  minExposure: number; // Minimum allowed exposure
  cashAllocation: number; // Current % in cash
  riskAllocation: number; // Current % in risky asset
  totalAUM: number; // Total assets under management
  sharpeRatio: number; // Risk-adjusted return
  maxDrawdown: number; // Maximum drawdown since inception
  isActive: boolean;
  created: number;
}

interface VolTargetPosition {
  id: string;
  owner: `0x${string}`;
  strategyId: string;
  shares: number; // Number of index shares owned
  initialValue: number; // Initial USDC investment
  currentValue: number; // Current position value
  currentExposure: number; // Current leverage/exposure
  entryPrice: number; // Price per share at entry
  currentPrice: number; // Current price per share
  totalReturn: number; // Total return %
  unrealizedPnL: number; // Unrealized P&L in USDC
  avgVolatility: number; // Average vol since position opened
  daysHeld: number; // Days since position opened
  lastRebalance: number; // Last rebalance timestamp
  autoCompound: boolean; // Whether to auto-compound returns
  created: number;
}

interface VolTargetPool {
  totalAUM: number; // Combined AUM across all strategies
  totalPositions: number; // Total active positions
  averageTargetVol: number; // Average target vol across strategies
  averageRealizedVol: number; // Average realized vol
  volTrackingError: number; // How well we track target vol
  totalRebalances: number; // Total rebalances across all strategies
  rebalancesLast24h: number; // Recent rebalance activity
  cashUtilization: number; // % of total funds deployed
  averageSharpe: number; // Average Sharpe ratio
}

interface RebalanceEvent {
  strategyId: string;
  timestamp: number;
  beforeExposure: number; // Exposure before rebalance
  afterExposure: number; // Exposure after rebalance
  realizedVol: number; // Volatility that triggered rebalance
  targetVol: number; // Target volatility
  volDifference: number; // How far off we were
  cashBefore: number; // Cash % before
  cashAfter: number; // Cash % after
  gasUsed: number;
  trigger: 'scheduled' | 'threshold' | 'manual' | 'emergency';
}

interface VolSurface {
  timeframe: string; // '1D', '7D', '30D', '90D', '1Y'
  realized: number; // Realized vol for this timeframe
  implied?: number; // Implied vol if available
  percentile: number; // Where current vol sits vs history (0-100)
}

export function useVolTargetIndex() {
  const { address } = useAccount();
  const volIndexAddr = CONTRACTS.VOL_TARGET_INDEX as `0x${string}`;
  const indexSharesAddr = CONTRACTS.VOL_INDEX_SHARES as `0x${string}`;
  const enabled = volIndexAddr !== '0x0000000000000000000000000000000000000000';

  // Read vol target pool state
  const { data: poolState } = useReadContract({
    address: volIndexAddr,
    abi: VolTargetIndexABI,
    functionName: 'getPoolState',
    query: { enabled },
  });

  // Read available strategies
  const { data: availableStrategies } = useReadContract({
    address: volIndexAddr,
    abi: VolTargetIndexABI,
    functionName: 'getAvailableStrategies',
    query: { enabled },
  });

  // Read user's positions
  const { data: userPositions } = useReadContract({
    address: volIndexAddr,
    abi: VolTargetIndexABI,
    functionName: 'getUserPositions',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read recent rebalances
  const { data: recentRebalances } = useReadContract({
    address: volIndexAddr,
    abi: VolTargetIndexABI,
    functionName: 'getRecentRebalances',
    args: [20], // Last 20 rebalances
    query: { enabled },
  });

  // Read volatility surface data
  const { data: volSurface } = useReadContract({
    address: volIndexAddr,
    abi: VolTargetIndexABI,
    functionName: 'getVolatilitySurface',
    query: { enabled },
  });

  const { writeContract: writeVolIndex, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Create new vol target position
  const createPosition = async (strategyId: string, amount: bigint) => {
    return writeVolIndex({
      address: volIndexAddr,
      abi: VolTargetIndexABI,
      functionName: 'createPosition',
      args: [strategyId, amount],
    });
  };

  // Manually trigger rebalance
  const triggerRebalance = async (strategyId: string) => {
    return writeVolIndex({
      address: volIndexAddr,
      abi: VolTargetIndexABI,
      functionName: 'triggerRebalance',
      args: [strategyId],
    });
  };

  // Redeem position (full or partial)
  const redeemPosition = async (positionId: string, shares: bigint) => {
    return writeVolIndex({
      address: volIndexAddr,
      abi: VolTargetIndexABI,
      functionName: 'redeemPosition',
      args: [positionId, shares],
    });
  };

  // Update position settings
  const updatePosition = async (positionId: string, autoCompound: boolean) => {
    return writeVolIndex({
      address: volIndexAddr,
      abi: VolTargetIndexABI,
      functionName: 'updatePosition',
      args: [positionId, autoCompound],
    });
  };

  // Calculate optimal exposure based on current vs target vol
  const calculateOptimalExposure = (
    currentVol: number, 
    targetVol: number, 
    maxExposure: number, 
    minExposure: number
  ) => {
    if (currentVol <= 0) return maxExposure;
    
    const volRatio = targetVol / currentVol;
    const optimalExposure = Math.max(minExposure, Math.min(maxExposure, volRatio));
    
    return {
      exposure: optimalExposure,
      cashAllocation: Math.max(0, 1 - optimalExposure),
      riskAllocation: Math.min(1, optimalExposure),
      volScaling: volRatio,
      isRebalanceNeeded: Math.abs(optimalExposure - 1) > 0.05 // 5% threshold
    };
  };

  // Process state for UI
  const state = useMemo(() => {
    if (!enabled || !poolState) {
      // Demo data
      return {
        pool: {
          totalAUM: 8450000,
          totalPositions: 156,
          averageTargetVol: 0.095, // 9.5% average target
          averageRealizedVol: 0.102, // 10.2% realized
          volTrackingError: 0.007, // 0.7% tracking error
          totalRebalances: 2847,
          rebalancesLast24h: 23,
          cashUtilization: 0.87, // 87% deployed
          averageSharpe: 1.34
        },
        strategies: [
          {
            id: 'voltarget_eth_10',
            name: 'ETH Vol Target 10%',
            targetVolatility: 0.10,
            underlyingAsset: 'ETH',
            currentVolatility: 0.095,
            lookbackPeriod: 30,
            rebalanceFrequency: 6, // Every 6 hours
            currentExposure: 1.05, // 105% exposure
            maxExposure: 2.0,
            minExposure: 0.0,
            cashAllocation: 0.0, // Leveraged, so negative "cash"
            riskAllocation: 1.05,
            totalAUM: 3200000,
            sharpeRatio: 1.45,
            maxDrawdown: -0.08, // -8% max drawdown
            isActive: true,
            created: Date.now() - 86400000 * 120
          },
          {
            id: 'voltarget_btc_8',
            name: 'BTC Vol Target 8%',
            targetVolatility: 0.08,
            underlyingAsset: 'BTC',
            currentVolatility: 0.075,
            lookbackPeriod: 21,
            rebalanceFrequency: 8,
            currentExposure: 1.07,
            maxExposure: 1.5,
            minExposure: 0.2,
            cashAllocation: 0.0,
            riskAllocation: 1.07,
            totalAUM: 2100000,
            sharpeRatio: 1.28,
            maxDrawdown: -0.06,
            isActive: true,
            created: Date.now() - 86400000 * 90
          },
          {
            id: 'voltarget_sp500_12',
            name: 'S&P500 Vol Target 12%',
            targetVolatility: 0.12,
            underlyingAsset: 'S&P500',
            currentVolatility: 0.14,
            lookbackPeriod: 45,
            rebalanceFrequency: 12,
            currentExposure: 0.86, // Under-exposed due to high vol
            maxExposure: 1.8,
            minExposure: 0.3,
            cashAllocation: 0.14,
            riskAllocation: 0.86,
            totalAUM: 1850000,
            sharpeRatio: 1.12,
            maxDrawdown: -0.11,
            isActive: true,
            created: Date.now() - 86400000 * 60
          },
          {
            id: 'voltarget_nasdaq_15',
            name: 'NASDAQ Vol Target 15%',
            targetVolatility: 0.15,
            underlyingAsset: 'NASDAQ',
            currentVolatility: 0.168,
            lookbackPeriod: 30,
            rebalanceFrequency: 4,
            currentExposure: 0.89,
            maxExposure: 2.2,
            minExposure: 0.1,
            cashAllocation: 0.11,
            riskAllocation: 0.89,
            totalAUM: 1300000,
            sharpeRatio: 1.52,
            maxDrawdown: -0.13,
            isActive: true,
            created: Date.now() - 86400000 * 30
          }
        ] as VolTargetStrategy[],
        userPositions: [
          {
            id: 'pos_001',
            owner: address || '0x0',
            strategyId: 'voltarget_eth_10',
            shares: 250,
            initialValue: 25000,
            currentValue: 27350,
            currentExposure: 1.05,
            entryPrice: 100,
            currentPrice: 109.4,
            totalReturn: 0.094, // 9.4% return
            unrealizedPnL: 2350,
            avgVolatility: 0.097,
            daysHeld: 45,
            lastRebalance: Date.now() - 86400000 * 0.25, // 6 hours ago
            autoCompound: true,
            created: Date.now() - 86400000 * 45
          },
          {
            id: 'pos_002',
            owner: address || '0x0',
            strategyId: 'voltarget_btc_8',
            shares: 100,
            initialValue: 10000,
            currentValue: 10640,
            currentExposure: 1.07,
            entryPrice: 100,
            currentPrice: 106.4,
            totalReturn: 0.064, // 6.4% return
            unrealizedPnL: 640,
            avgVolatility: 0.078,
            daysHeld: 28,
            lastRebalance: Date.now() - 86400000 * 0.33, // 8 hours ago
            autoCompound: false,
            created: Date.now() - 86400000 * 28
          }
        ] as VolTargetPosition[],
        recentRebalances: [
          {
            strategyId: 'voltarget_eth_10',
            timestamp: Date.now() - 86400000 * 0.25,
            beforeExposure: 1.08,
            afterExposure: 1.05,
            realizedVol: 0.095,
            targetVol: 0.10,
            volDifference: -0.005,
            cashBefore: -0.08,
            cashAfter: -0.05,
            gasUsed: 145000,
            trigger: 'scheduled'
          },
          {
            strategyId: 'voltarget_sp500_12',
            timestamp: Date.now() - 86400000 * 0.5,
            beforeExposure: 0.92,
            afterExposure: 0.86,
            realizedVol: 0.14,
            targetVol: 0.12,
            volDifference: 0.02,
            cashBefore: 0.08,
            cashAfter: 0.14,
            gasUsed: 132000,
            trigger: 'threshold'
          }
        ] as RebalanceEvent[],
        volSurface: [
          { timeframe: '1D', realized: 0.088, percentile: 35 },
          { timeframe: '7D', realized: 0.102, percentile: 52 },
          { timeframe: '30D', realized: 0.095, percentile: 41 },
          { timeframe: '90D', realized: 0.118, percentile: 78 },
          { timeframe: '1Y', realized: 0.134, percentile: 65 }
        ] as VolSurface[]
      };
    }

    const pool = poolState as any;
    const strategies = (availableStrategies as any[]) || [];
    const positions = (userPositions as any[]) || [];
    const rebalances = (recentRebalances as any[]) || [];
    const surface = (volSurface as any[]) || [];

    return {
      pool: {
        totalAUM: Number(pool.totalAUM) / 1e6,
        totalPositions: Number(pool.totalPositions),
        averageTargetVol: Number(pool.averageTargetVol) / 10000,
        averageRealizedVol: Number(pool.averageRealizedVol) / 10000,
        volTrackingError: Number(pool.volTrackingError) / 10000,
        totalRebalances: Number(pool.totalRebalances),
        rebalancesLast24h: Number(pool.rebalancesLast24h),
        cashUtilization: Number(pool.cashUtilization) / 10000,
        averageSharpe: Number(pool.averageSharpe) / 100
      } as VolTargetPool,
      strategies: strategies.map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        targetVolatility: Number(strategy.targetVolatility) / 10000,
        underlyingAsset: strategy.underlyingAsset,
        currentVolatility: Number(strategy.currentVolatility) / 10000,
        lookbackPeriod: Number(strategy.lookbackPeriod),
        rebalanceFrequency: Number(strategy.rebalanceFrequency),
        currentExposure: Number(strategy.currentExposure) / 10000,
        maxExposure: Number(strategy.maxExposure) / 10000,
        minExposure: Number(strategy.minExposure) / 10000,
        cashAllocation: Number(strategy.cashAllocation) / 10000,
        riskAllocation: Number(strategy.riskAllocation) / 10000,
        totalAUM: Number(strategy.totalAUM) / 1e6,
        sharpeRatio: Number(strategy.sharpeRatio) / 100,
        maxDrawdown: Number(strategy.maxDrawdown) / 10000,
        isActive: strategy.isActive,
        created: Number(strategy.created) * 1000
      })) as VolTargetStrategy[],
      userPositions: positions.map((position: any) => ({
        id: position.id,
        owner: position.owner,
        strategyId: position.strategyId,
        shares: Number(position.shares) / 1e6,
        initialValue: Number(position.initialValue) / 1e6,
        currentValue: Number(position.currentValue) / 1e6,
        currentExposure: Number(position.currentExposure) / 10000,
        entryPrice: Number(position.entryPrice) / 1e6,
        currentPrice: Number(position.currentPrice) / 1e6,
        totalReturn: Number(position.totalReturn) / 10000,
        unrealizedPnL: Number(position.unrealizedPnL) / 1e6,
        avgVolatility: Number(position.avgVolatility) / 10000,
        daysHeld: Number(position.daysHeld),
        lastRebalance: Number(position.lastRebalance) * 1000,
        autoCompound: position.autoCompound,
        created: Number(position.created) * 1000
      })) as VolTargetPosition[],
      recentRebalances: rebalances.map((rebalance: any) => ({
        strategyId: rebalance.strategyId,
        timestamp: Number(rebalance.timestamp) * 1000,
        beforeExposure: Number(rebalance.beforeExposure) / 10000,
        afterExposure: Number(rebalance.afterExposure) / 10000,
        realizedVol: Number(rebalance.realizedVol) / 10000,
        targetVol: Number(rebalance.targetVol) / 10000,
        volDifference: Number(rebalance.volDifference) / 10000,
        cashBefore: Number(rebalance.cashBefore) / 10000,
        cashAfter: Number(rebalance.cashAfter) / 10000,
        gasUsed: Number(rebalance.gasUsed),
        trigger: rebalance.trigger
      })) as RebalanceEvent[],
      volSurface: surface.map((vol: any) => ({
        timeframe: vol.timeframe,
        realized: Number(vol.realized) / 10000,
        implied: vol.implied ? Number(vol.implied) / 10000 : undefined,
        percentile: Number(vol.percentile)
      })) as VolSurface[]
    };
  }, [enabled, poolState, availableStrategies, userPositions, recentRebalances, volSurface, address]);

  return {
    enabled,
    state,
    isWritePending,
    createPosition,
    triggerRebalance,
    redeemPosition,
    updatePosition,
    calculateOptimalExposure,
  } as const;
}