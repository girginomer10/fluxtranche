import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { CPPIAutopilotABI } from '@/config/contracts';

interface CPPIStrategy {
  id: string;
  name: string;
  multiplier: number; // CPPI multiplier (typically 3-6x)
  floor: number; // Minimum guaranteed value in USDC
  cap?: number; // Optional upside cap
  safeAssetAllocation: number; // Current % in safe assets (bonds, cash)
  riskyAssetAllocation: number; // Current % in risky assets (stocks, crypto)
  currentCushion: number; // Distance from floor (USDC)
  exposure: number; // Actual exposure to risky assets
  rebalanceThreshold: number; // Rebalance when allocation drifts by this %
  isActive: boolean;
  created: number;
}

interface CPPIPosition {
  id: string;
  owner: `0x${string}`;
  strategyId: string;
  principal: number; // Initial investment in USDC
  currentValue: number; // Current portfolio value
  guaranteedFloor: number; // Protected minimum value
  cushion: number; // currentValue - guaranteedFloor
  riskyExposure: number; // Amount in risky assets
  safeExposure: number; // Amount in safe assets
  totalReturn: number; // Cumulative return %
  maxDrawdown: number; // Maximum drawdown from peak
  rebalanceCount: number; // Number of rebalances
  lastRebalance: number; // Timestamp of last rebalance
  autoRebalanceEnabled: boolean;
  maturityDate?: number; // Optional maturity for structured products
}

interface CPPIPool {
  totalAUM: number; // Total assets under management
  totalPositions: number;
  averageMultiplier: number;
  averageFloorProtection: number; // Average floor protection %
  successRate: number; // % of positions above their floor
  totalRebalances: number;
  avgDailyRebalances: number;
  riskBudgetUtilization: number; // % of risk budget used
  safeAssetAPY: number; // Yield on safe component
  riskyAssetVolatility: number; // Current vol of risky component
}

interface RebalanceEvent {
  positionId: string;
  timestamp: number;
  beforeSafeAllocation: number;
  afterSafeAllocation: number;
  beforeRiskyAllocation: number;
  afterRiskyAllocation: number;
  trigger: 'threshold' | 'volatility' | 'manual' | 'scheduled';
  gasUsed: number;
  slippage: number;
}

export function useCPPIAutopilot() {
  const { address } = useAccount();
  const cppiAddr = CONTRACTS.CPPI_AUTOPILOT as `0x${string}`;
  const enabled = cppiAddr !== '0x0000000000000000000000000000000000000000';

  // Read CPPI pool state
  const { data: poolState } = useReadContract({
    address: cppiAddr,
    abi: CPPIAutopilotABI,
    functionName: 'getPoolState',
    query: { enabled },
  });

  // Read available strategies
  const { data: availableStrategies } = useReadContract({
    address: cppiAddr,
    abi: CPPIAutopilotABI,
    functionName: 'getAvailableStrategies',
    query: { enabled },
  });

  // Read user's positions
  const { data: userPositions } = useReadContract({
    address: cppiAddr,
    abi: CPPIAutopilotABI,
    functionName: 'getUserPositions',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read recent rebalance events
  const { data: recentRebalances } = useReadContract({
    address: cppiAddr,
    abi: CPPIAutopilotABI,
    functionName: 'getRecentRebalances',
    args: [20], // Last 20 rebalances
    query: { enabled },
  });

  const { writeContract: writeCPPI, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Create new CPPI position
  const createPosition = async (
    strategyId: string,
    amount: bigint,
    customFloor?: bigint,
    autoRebalance: boolean = true
  ) => {
    return writeCPPI({
      address: cppiAddr,
      abi: CPPIAutopilotABI,
      functionName: 'createPosition',
      args: [strategyId, amount, customFloor || BigInt(0), autoRebalance],
    });
  };

  // Manually trigger rebalance
  const rebalancePosition = async (positionId: string) => {
    return writeCPPI({
      address: cppiAddr,
      abi: CPPIAutopilotABI,
      functionName: 'rebalancePosition',
      args: [positionId],
    });
  };

  // Update position parameters
  const updatePosition = async (
    positionId: string,
    newMultiplier?: number,
    newFloor?: bigint,
    newAutoRebalance?: boolean
  ) => {
    return writeCPPI({
      address: cppiAddr,
      abi: CPPIAutopilotABI,
      functionName: 'updatePosition',
      args: [
        positionId,
        newMultiplier ? Math.floor(newMultiplier * 100) : 0,
        newFloor || BigInt(0),
        newAutoRebalance ?? true
      ],
    });
  };

  // Close position and withdraw
  const closePosition = async (positionId: string) => {
    return writeCPPI({
      address: cppiAddr,
      abi: CPPIAutopilotABI,
      functionName: 'closePosition',
      args: [positionId],
    });
  };

  // Emergency stop (freeze rebalancing)
  const emergencyStop = async (positionId: string) => {
    return writeCPPI({
      address: cppiAddr,
      abi: CPPIAutopilotABI,
      functionName: 'emergencyStop',
      args: [positionId],
    });
  };

  // Calculate optimal allocation for given market conditions
  const calculateOptimalAllocation = (
    currentValue: number,
    floor: number,
    multiplier: number,
    volatility: number
  ) => {
    const cushion = Math.max(0, currentValue - floor);
    const targetRiskyExposure = Math.min(cushion * multiplier, currentValue * 0.95); // Max 95% in risky
    const riskyAllocation = currentValue > 0 ? targetRiskyExposure / currentValue : 0;
    const safeAllocation = 1 - riskyAllocation;

    return {
      riskyAllocation: Math.max(0, Math.min(1, riskyAllocation)),
      safeAllocation: Math.max(0, Math.min(1, safeAllocation)),
      targetExposure: targetRiskyExposure,
      riskBudget: cushion,
      leverageRatio: cushion > 0 ? targetRiskyExposure / cushion : 0
    };
  };

  // Process state for UI
  const state = useMemo(() => {
    if (!enabled || !poolState) {
      // Demo data
      return {
        pool: {
          totalAUM: 4275000,
          totalPositions: 127,
          averageMultiplier: 4.2,
          averageFloorProtection: 0.85, // 85% floor protection
          successRate: 0.92, // 92% success rate
          totalRebalances: 1043,
          avgDailyRebalances: 23.4,
          riskBudgetUtilization: 0.67,
          safeAssetAPY: 4.8,
          riskyAssetVolatility: 18.5
        },
        strategies: [
          {
            id: 'cppi_conservative',
            name: 'Conservative CPPI',
            multiplier: 3,
            floor: 0.90, // 90% floor
            safeAssetAllocation: 0.75,
            riskyAssetAllocation: 0.25,
            currentCushion: 425000,
            exposure: 1275000,
            rebalanceThreshold: 0.05, // 5%
            isActive: true,
            created: Date.now() - 86400000 * 45
          },
          {
            id: 'cppi_balanced',
            name: 'Balanced CPPI',
            multiplier: 4,
            floor: 0.85, // 85% floor
            cap: 1.5, // 150% cap
            safeAssetAllocation: 0.65,
            riskyAssetAllocation: 0.35,
            currentCushion: 640000,
            exposure: 2560000,
            rebalanceThreshold: 0.03,
            isActive: true,
            created: Date.now() - 86400000 * 30
          },
          {
            id: 'cppi_aggressive',
            name: 'Aggressive CPPI',
            multiplier: 5.5,
            floor: 0.80, // 80% floor
            safeAssetAllocation: 0.45,
            riskyAssetAllocation: 0.55,
            currentCushion: 850000,
            exposure: 4675000,
            rebalanceThreshold: 0.02,
            isActive: true,
            created: Date.now() - 86400000 * 15
          }
        ] as CPPIStrategy[],
        userPositions: [
          {
            id: 'pos_001',
            owner: address || '0x0',
            strategyId: 'cppi_balanced',
            principal: 50000,
            currentValue: 56750,
            guaranteedFloor: 42500, // 85% of principal
            cushion: 14250,
            riskyExposure: 34050, // 60% in risky
            safeExposure: 22700, // 40% in safe
            totalReturn: 0.135, // 13.5% return
            maxDrawdown: -0.048, // -4.8% max drawdown
            rebalanceCount: 7,
            lastRebalance: Date.now() - 86400000 * 2,
            autoRebalanceEnabled: true,
            maturityDate: Date.now() + 86400000 * 365 // 1 year
          },
          {
            id: 'pos_002',
            owner: address || '0x0',
            strategyId: 'cppi_conservative',
            principal: 25000,
            currentValue: 26875,
            guaranteedFloor: 22500, // 90% of principal
            cushion: 4375,
            riskyExposure: 8062, // 30% in risky
            safeExposure: 18813, // 70% in safe
            totalReturn: 0.075, // 7.5% return
            maxDrawdown: -0.025, // -2.5% max drawdown
            rebalanceCount: 3,
            lastRebalance: Date.now() - 86400000 * 5,
            autoRebalanceEnabled: true
          }
        ] as CPPIPosition[],
        recentRebalances: [
          {
            positionId: 'pos_001',
            timestamp: Date.now() - 86400000 * 2,
            beforeSafeAllocation: 0.42,
            afterSafeAllocation: 0.40,
            beforeRiskyAllocation: 0.58,
            afterRiskyAllocation: 0.60,
            trigger: 'threshold',
            gasUsed: 145000,
            slippage: 0.0015
          },
          {
            positionId: 'pos_002',
            timestamp: Date.now() - 86400000 * 5,
            beforeSafeAllocation: 0.68,
            afterSafeAllocation: 0.70,
            beforeRiskyAllocation: 0.32,
            afterRiskyAllocation: 0.30,
            trigger: 'volatility',
            gasUsed: 132000,
            slippage: 0.0008
          }
        ] as RebalanceEvent[]
      };
    }

    const pool = poolState as any;
    const strategies = (availableStrategies as any[]) || [];
    const positions = (userPositions as any[]) || [];
    const rebalances = (recentRebalances as any[]) || [];

    return {
      pool: {
        totalAUM: Number(pool.totalAUM) / 1e6,
        totalPositions: Number(pool.totalPositions),
        averageMultiplier: Number(pool.averageMultiplier) / 100,
        averageFloorProtection: Number(pool.averageFloorProtection) / 10000,
        successRate: Number(pool.successRate) / 10000,
        totalRebalances: Number(pool.totalRebalances),
        avgDailyRebalances: Number(pool.avgDailyRebalances) / 100,
        riskBudgetUtilization: Number(pool.riskBudgetUtilization) / 10000,
        safeAssetAPY: Number(pool.safeAssetAPY) / 100,
        riskyAssetVolatility: Number(pool.riskyAssetVolatility) / 100
      } as CPPIPool,
      strategies: strategies.map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        multiplier: Number(strategy.multiplier) / 100,
        floor: Number(strategy.floor) / 10000,
        cap: strategy.cap ? Number(strategy.cap) / 10000 : undefined,
        safeAssetAllocation: Number(strategy.safeAssetAllocation) / 10000,
        riskyAssetAllocation: Number(strategy.riskyAssetAllocation) / 10000,
        currentCushion: Number(strategy.currentCushion) / 1e6,
        exposure: Number(strategy.exposure) / 1e6,
        rebalanceThreshold: Number(strategy.rebalanceThreshold) / 10000,
        isActive: strategy.isActive,
        created: Number(strategy.created) * 1000
      })) as CPPIStrategy[],
      userPositions: positions.map((position: any) => ({
        id: position.id,
        owner: position.owner,
        strategyId: position.strategyId,
        principal: Number(position.principal) / 1e6,
        currentValue: Number(position.currentValue) / 1e6,
        guaranteedFloor: Number(position.guaranteedFloor) / 1e6,
        cushion: Number(position.cushion) / 1e6,
        riskyExposure: Number(position.riskyExposure) / 1e6,
        safeExposure: Number(position.safeExposure) / 1e6,
        totalReturn: Number(position.totalReturn) / 10000,
        maxDrawdown: Number(position.maxDrawdown) / 10000,
        rebalanceCount: Number(position.rebalanceCount),
        lastRebalance: Number(position.lastRebalance) * 1000,
        autoRebalanceEnabled: position.autoRebalanceEnabled,
        maturityDate: position.maturityDate ? Number(position.maturityDate) * 1000 : undefined
      })) as CPPIPosition[],
      recentRebalances: rebalances.map((rebalance: any) => ({
        positionId: rebalance.positionId,
        timestamp: Number(rebalance.timestamp) * 1000,
        beforeSafeAllocation: Number(rebalance.beforeSafeAllocation) / 10000,
        afterSafeAllocation: Number(rebalance.afterSafeAllocation) / 10000,
        beforeRiskyAllocation: Number(rebalance.beforeRiskyAllocation) / 10000,
        afterRiskyAllocation: Number(rebalance.afterRiskyAllocation) / 10000,
        trigger: rebalance.trigger,
        gasUsed: Number(rebalance.gasUsed),
        slippage: Number(rebalance.slippage) / 1000000
      })) as RebalanceEvent[]
    };
  }, [enabled, poolState, availableStrategies, userPositions, recentRebalances, address]);

  return {
    enabled,
    state,
    isWritePending,
    createPosition,
    rebalancePosition,
    updatePosition,
    closePosition,
    emergencyStop,
    calculateOptimalAllocation,
  } as const;
}