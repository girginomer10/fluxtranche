import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { FlashEpochsABI, TrancheVaultABI } from '@/config/contracts';

export function useFlashEpochs() {
  const flashAddr = CONTRACTS.FLASH_EPOCHS as `0x${string}`;
  const vaultAddr = CONTRACTS.TRANCHE_VAULT as `0x${string}`;
  const enabled = flashAddr !== '0x0000000000000000000000000000000000000000';

  const { data: volTuple } = useReadContract({
    address: flashAddr,
    abi: FlashEpochsABI,
    functionName: 'getVolatilityState',
    query: { enabled },
  });

  const { data: cfg } = useReadContract({
    address: flashAddr,
    abi: FlashEpochsABI,
    functionName: 'getAdaptiveConfig',
    query: { enabled },
  });

  const { data: adaptiveDuration } = useReadContract({
    address: flashAddr,
    abi: FlashEpochsABI,
    functionName: 'calculateOptimalDuration',
    query: { enabled },
  });

  const { writeContract: writeVault, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  const triggerFlashCheck = async () => {
    return writeVault({
      address: vaultAddr,
      abi: TrancheVaultABI,
      functionName: 'checkFlashTrigger',
      args: [],
    });
  };

  const updateVolatility = async () => {
    return writeVault({
      address: vaultAddr,
      abi: TrancheVaultABI,
      functionName: 'updateVolatilityAndCheckEpoch',
      args: [],
    });
  };

  const state = useMemo(() => {
    if (!enabled || !volTuple || !cfg) return null;
    const [currentVol, historicalVol, lastUpdateTime, volChangeRate] = volTuple as readonly [bigint, bigint, bigint, bigint];
    const base = (cfg as any).baseEpochDuration as bigint;
    const min = (cfg as any).minEpochDuration as bigint;
    const max = (cfg as any).maxEpochDuration as bigint;
    const low = (cfg as any).volThresholdLow as bigint;
    const high = (cfg as any).volThresholdHigh as bigint;
    const speed = (cfg as any).speedMultiplier as bigint;

    const currentVolPct = Number(currentVol) / 100; // BPS → %
    const adaptive = adaptiveDuration ? Number(adaptiveDuration) : Number(base);
    const flashActive = Number(currentVol) >= Number(high);

    return {
      currentVolatility: currentVolPct,
      adaptiveDuration: adaptive,
      baseDuration: Number(base),
      lastUpdate: Number(lastUpdateTime) * 1000,
      flashTriggerActive: flashActive,
      volThresholdLow: Number(low) / 100,
      volThresholdHigh: Number(high) / 100,
      epochSpeedMultiplier: Number(speed) / 1000,
      bounds: { min: Number(min), max: Number(max) },
    };
  }, [enabled, volTuple, cfg, adaptiveDuration]);

  return {
    enabled,
    state,
    isWritePending,
    triggerFlashCheck,
    updateVolatility,
  } as const;
}

