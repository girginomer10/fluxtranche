import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { LadderedEpochsABI, TrancheVaultABI } from '@/config/contracts';

interface LadderRung {
  duration: number; // seconds
  share: number; // percentage (0-100)
  epochCount: number;
  nextSettlement: number; // timestamp
  totalAssets: number;
  apy: number;
}

interface LadderedState {
  rungs: LadderRung[];
  totalDeposits: number;
  activeRungs: number;
  nextSettlement: number;
  averageAPY: number;
  liquidityBuffer: number;
}

export function useLadderedEpochs() {
  const ladderAddr = CONTRACTS.LADDERED_EPOCHS as `0x${string}`;
  const vaultAddr = CONTRACTS.TRANCHE_VAULT as `0x${string}`;
  const enabled = ladderAddr !== '0x0000000000000000000000000000000000000000';

  // Read ladder configuration
  const { data: ladderConfig } = useReadContract({
    address: ladderAddr,
    abi: LadderedEpochsABI,
    functionName: 'getLadderConfig',
    query: { enabled },
  });

  // Read current rung states
  const { data: rungStates } = useReadContract({
    address: ladderAddr,
    abi: LadderedEpochsABI,
    functionName: 'getAllRungStates',
    query: { enabled },
  });

  // Read user's ladder positions
  const { data: userLadder } = useReadContract({
    address: ladderAddr,
    abi: LadderedEpochsABI,
    functionName: 'getUserLadderPosition',
    query: { enabled },
  });

  const { writeContract: writeVault, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Create ladder deposit with specified rung weights
  const depositLadder = async (assets: bigint, rungWeights: number[]) => {
    const weightsBps = rungWeights.map(w => Math.floor(w * 100)); // Convert to basis points
    return writeVault({
      address: vaultAddr,
      abi: TrancheVaultABI,
      functionName: 'depositLadder',
      args: [assets, weightsBps],
    });
  };

  // Settle specific rung
  const settleRung = async (rungIndex: number) => {
    return writeVault({
      address: vaultAddr,
      abi: TrancheVaultABI,
      functionName: 'settleRung',
      args: [rungIndex],
    });
  };

  // Rebalance ladder weights
  const rebalanceLadder = async (newWeights: number[]) => {
    const weightsBps = newWeights.map(w => Math.floor(w * 100));
    return writeVault({
      address: vaultAddr,
      abi: TrancheVaultABI,
      functionName: 'rebalanceLadder',
      args: [weightsBps],
    });
  };

  // Process and format ladder state for UI
  const state = useMemo((): LadderedState | null => {
    if (!enabled || !ladderConfig || !rungStates) {
      return {
        rungs: [
          {
            duration: 3600, // 1 hour
            share: 30,
            epochCount: 24,
            nextSettlement: Date.now() + 3600000,
            totalAssets: 25000,
            apy: 8.5
          },
          {
            duration: 21600, // 6 hours
            share: 45,
            epochCount: 8,
            nextSettlement: Date.now() + 21600000,
            totalAssets: 37500,
            apy: 12.3
          },
          {
            duration: 86400, // 24 hours
            share: 25,
            epochCount: 2,
            nextSettlement: Date.now() + 86400000,
            totalAssets: 20000,
            apy: 15.7
          }
        ],
        totalDeposits: 82500,
        activeRungs: 3,
        nextSettlement: Date.now() + 3600000,
        averageAPY: 11.8,
        liquidityBuffer: 5000
      };
    }

    const config = ladderConfig as any;
    const states = rungStates as any[];
    
    const rungs: LadderRung[] = states.map((state, index) => ({
      duration: Number(config.rungDurations[index]),
      share: Number(state.weightBps) / 100,
      epochCount: Number(state.epochCount),
      nextSettlement: Number(state.nextSettlement) * 1000,
      totalAssets: Number(state.totalAssets) / 1e6, // Assuming USDC
      apy: Number(state.currentAPY) / 100
    }));

    const totalDeposits = rungs.reduce((sum, rung) => sum + rung.totalAssets, 0);
    const averageAPY = rungs.reduce((sum, rung, i) => 
      sum + (rung.apy * rung.totalAssets), 0) / totalDeposits;

    return {
      rungs,
      totalDeposits,
      activeRungs: rungs.filter(r => r.totalAssets > 0).length,
      nextSettlement: Math.min(...rungs.map(r => r.nextSettlement)),
      averageAPY,
      liquidityBuffer: Number(config.liquidityBuffer) / 1e6
    };
  }, [enabled, ladderConfig, rungStates]);

  return {
    enabled,
    state,
    userLadder,
    isWritePending,
    depositLadder,
    settleRung,
    rebalanceLadder,
  } as const;
}