import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { YieldTeleportABI, ERC1155ABI } from '@/config/contracts';

interface YieldNote {
  tokenId: string;
  owner: `0x${string}`;
  notional: number; // USDC amount advanced
  futureEpochs: number; // epochs to claim from
  currentEpoch: number;
  maturityEpoch: number;
  yieldRate: number; // expected yield rate per epoch
  totalExpectedYield: number;
  remainingClaims: number;
  isActive: boolean;
  createdAt: number;
}

interface TeleportPool {
  totalAdvanced: number;
  totalOutstanding: number;
  availableAdvance: number;
  juniorYieldBuffer: number;
  defaultRate: number;
  averageMaturity: number;
  activeNotes: number;
}

interface AdvanceOption {
  epochs: number;
  maxAdvance: number;
  yieldRate: number;
  collateralRatio: number;
  description: string;
}

export function useYieldTeleport() {
  const { address } = useAccount();
  const teleportAddr = CONTRACTS.YIELD_TELEPORT as `0x${string}`;
  const notesAddr = CONTRACTS.YIELD_NOTES_1155 as `0x${string}`;
  const enabled = teleportAddr !== '0x0000000000000000000000000000000000000000';

  // Read teleport pool state
  const { data: poolState } = useReadContract({
    address: teleportAddr,
    abi: YieldTeleportABI,
    functionName: 'getPoolState',
    query: { enabled },
  });

  // Read advance options
  const { data: advanceOptions } = useReadContract({
    address: teleportAddr,
    abi: YieldTeleportABI,
    functionName: 'getAdvanceOptions',
    query: { enabled },
  });

  // Read user's yield notes
  const { data: userNotes } = useReadContract({
    address: teleportAddr,
    abi: YieldTeleportABI,
    functionName: 'getUserNotes',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read current junior yield forecast
  const { data: yieldForecast } = useReadContract({
    address: teleportAddr,
    abi: YieldTeleportABI,
    functionName: 'getYieldForecast',
    args: [12], // 12 epochs ahead
    query: { enabled },
  });

  const { writeContract: writeTeleport, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Create yield advance (get cash now, pay from future yield)
  const advanceYield = async (epochs: number, amount: bigint) => {
    return writeTeleport({
      address: teleportAddr,
      abi: YieldTeleportABI,
      functionName: 'advanceYield',
      args: [epochs, amount],
    });
  };

  // Redeem matured yield note
  const redeemNote = async (tokenId: string) => {
    return writeTeleport({
      address: teleportAddr,
      abi: YieldTeleportABI,
      functionName: 'redeemNote',
      args: [tokenId],
    });
  };

  // Partial early redemption (with penalty)
  const earlyRedeem = async (tokenId: string, partialAmount: bigint) => {
    return writeTeleport({
      address: teleportAddr,
      abi: YieldTeleportABI,
      functionName: 'earlyRedeem',
      args: [tokenId, partialAmount],
    });
  };

  // Transfer yield note to another user
  const transferNote = async (tokenId: string, to: `0x${string}`) => {
    return writeTeleport({
      address: notesAddr,
      abi: ERC1155ABI,
      functionName: 'safeTransferFrom',
      args: [address!, to, tokenId, 1, '0x'],
    });
  };

  // Process state for UI
  const state = useMemo(() => {
    if (!enabled || !poolState) {
      // Demo data
      return {
        pool: {
          totalAdvanced: 287500,
          totalOutstanding: 312000,
          availableAdvance: 125000,
          juniorYieldBuffer: 45000,
          defaultRate: 0.02,
          averageMaturity: 8.5,
          activeNotes: 23
        },
        advanceOptions: [
          {
            epochs: 3,
            maxAdvance: 15000,
            yieldRate: 0.045, // 4.5% per epoch
            collateralRatio: 1.2,
            description: "Short-term advance with high liquidity"
          },
          {
            epochs: 6,
            maxAdvance: 35000,
            yieldRate: 0.055, // 5.5% per epoch
            collateralRatio: 1.15,
            description: "Medium-term advance, balanced risk/reward"
          },
          {
            epochs: 12,
            maxAdvance: 75000,
            yieldRate: 0.072, // 7.2% per epoch
            collateralRatio: 1.1,
            description: "Long-term advance with premium rates"
          },
          {
            epochs: 24,
            maxAdvance: 150000,
            yieldRate: 0.085, // 8.5% per epoch
            collateralRatio: 1.05,
            description: "Maximum advance with highest yield"
          }
        ] as AdvanceOption[],
        userNotes: [
          {
            tokenId: "1001",
            owner: address || "0x0",
            notional: 25000,
            futureEpochs: 6,
            currentEpoch: 145,
            maturityEpoch: 151,
            yieldRate: 0.055,
            totalExpectedYield: 8250, // 25000 * 0.055 * 6
            remainingClaims: 3,
            isActive: true,
            createdAt: Date.now() - 86400000 * 21 // 21 days ago
          },
          {
            tokenId: "1002", 
            owner: address || "0x0",
            notional: 10000,
            futureEpochs: 12,
            currentEpoch: 140,
            maturityEpoch: 152,
            yieldRate: 0.072,
            totalExpectedYield: 8640, // 10000 * 0.072 * 12
            remainingClaims: 7,
            isActive: true,
            createdAt: Date.now() - 86400000 * 35 // 35 days ago
          }
        ] as YieldNote[],
        yieldForecast: {
          epochs: Array.from({length: 12}, (_, i) => ({
            epoch: 145 + i,
            expectedYield: 1200 + Math.sin(i * 0.5) * 300,
            confidence: Math.max(0.7, 1 - i * 0.03),
            riskAdjusted: (1200 + Math.sin(i * 0.5) * 300) * Math.max(0.7, 1 - i * 0.03)
          }))
        }
      };
    }

    const pool = poolState as any;
    const options = (advanceOptions as any[]) || [];
    const notes = (userNotes as any[]) || [];
    const forecast = yieldForecast as any;

    return {
      pool: {
        totalAdvanced: Number(pool.totalAdvanced) / 1e6,
        totalOutstanding: Number(pool.totalOutstanding) / 1e6,
        availableAdvance: Number(pool.availableAdvance) / 1e6,
        juniorYieldBuffer: Number(pool.juniorYieldBuffer) / 1e6,
        defaultRate: Number(pool.defaultRate) / 10000,
        averageMaturity: Number(pool.averageMaturity) / 100,
        activeNotes: Number(pool.activeNotes)
      } as TeleportPool,
      advanceOptions: options.map((opt: any) => ({
        epochs: Number(opt.epochs),
        maxAdvance: Number(opt.maxAdvance) / 1e6,
        yieldRate: Number(opt.yieldRate) / 10000,
        collateralRatio: Number(opt.collateralRatio) / 1000,
        description: opt.description
      })) as AdvanceOption[],
      userNotes: notes.map((note: any) => ({
        tokenId: note.tokenId.toString(),
        owner: note.owner,
        notional: Number(note.notional) / 1e6,
        futureEpochs: Number(note.futureEpochs),
        currentEpoch: Number(note.currentEpoch),
        maturityEpoch: Number(note.maturityEpoch),
        yieldRate: Number(note.yieldRate) / 10000,
        totalExpectedYield: Number(note.totalExpectedYield) / 1e6,
        remainingClaims: Number(note.remainingClaims),
        isActive: note.isActive,
        createdAt: Number(note.createdAt) * 1000
      })) as YieldNote[],
      yieldForecast: forecast ? {
        epochs: forecast.epochs.map((e: any) => ({
          epoch: Number(e.epoch),
          expectedYield: Number(e.expectedYield) / 1e6,
          confidence: Number(e.confidence) / 10000,
          riskAdjusted: Number(e.riskAdjusted) / 1e6
        }))
      } : null
    };
  }, [enabled, poolState, advanceOptions, userNotes, yieldForecast, address]);

  return {
    enabled,
    state,
    isWritePending,
    advanceYield,
    redeemNote,
    earlyRedeem,
    transferNote,
  } as const;
}