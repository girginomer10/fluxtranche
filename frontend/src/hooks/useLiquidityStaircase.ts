import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { LiquidityStaircaseABI, ERC1155ABI } from '@/config/contracts';

interface StaircaseRung {
  rungId: number;
  name: string;
  minLiquidity: number; // USDC minimum
  maxLiquidity: number; // USDC maximum  
  premium: number; // Premium multiplier (1.0 = base, 1.5 = 50% premium)
  lockDuration: number; // Hours locked
  yieldBoost: number; // Additional yield % per epoch
  utilization: number; // Current utilization rate
  available: number; // Available capacity
}

interface LiquidityNFT {
  tokenId: string;
  owner: `0x${string}`;
  rungId: number;
  principal: number; // USDC amount
  lockedUntil: number; // Timestamp
  yieldAccrued: number; // USDC earned so far
  totalYieldPotential: number; // Max USDC can earn
  isActive: boolean;
  createdAt: number;
  premiumTier: string;
}

interface StaircasePool {
  totalLiquidity: number;
  utilizationByRung: number[];
  averageYield: number;
  totalNFTs: number;
  rewardsPool: number;
  emergencyExitFee: number; // Basis points
  maxCapacity: number;
}

interface LiquidityEvent {
  type: 'deposit' | 'withdraw' | 'yield' | 'upgrade';
  tokenId: string;
  amount: number;
  rung: number;
  timestamp: number;
  premium: number;
}

export function useLiquidityStaircase() {
  const { address } = useAccount();
  const staircaseAddr = CONTRACTS.LIQUIDITY_STAIRCASE as `0x${string}`;
  const nftAddr = CONTRACTS.LIQUIDITY_NFTS as `0x${string}`;
  const enabled = staircaseAddr !== '0x0000000000000000000000000000000000000000';

  // Read staircase pool state
  const { data: poolState } = useReadContract({
    address: staircaseAddr,
    abi: LiquidityStaircaseABI,
    functionName: 'getPoolState',
    query: { enabled },
  });

  // Read all available rungs
  const { data: staircaseRungs } = useReadContract({
    address: staircaseAddr,
    abi: LiquidityStaircaseABI,
    functionName: 'getAllRungs',
    query: { enabled },
  });

  // Read user's liquidity NFTs
  const { data: userNFTs } = useReadContract({
    address: staircaseAddr,
    abi: LiquidityStaircaseABI,
    functionName: 'getUserNFTs',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read recent liquidity events
  const { data: recentEvents } = useReadContract({
    address: staircaseAddr,
    abi: LiquidityStaircaseABI,
    functionName: 'getRecentEvents',
    args: [20], // Last 20 events
    query: { enabled },
  });

  const { writeContract: writeStaircase, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Deposit into specific rung and mint NFT
  const depositToRung = async (rungId: number, amount: bigint) => {
    return writeStaircase({
      address: staircaseAddr,
      abi: LiquidityStaircaseABI,
      functionName: 'depositToRung',
      args: [rungId, amount],
    });
  };

  // Withdraw from NFT (if unlocked)
  const withdrawFromNFT = async (tokenId: string) => {
    return writeStaircase({
      address: staircaseAddr,
      abi: LiquidityStaircaseABI,
      functionName: 'withdraw',
      args: [tokenId],
    });
  };

  // Emergency exit (with penalty)
  const emergencyExit = async (tokenId: string) => {
    return writeStaircase({
      address: staircaseAddr,
      abi: LiquidityStaircaseABI,
      functionName: 'emergencyExit',
      args: [tokenId],
    });
  };

  // Upgrade NFT to higher rung
  const upgradeNFT = async (tokenId: string, newRungId: number, additionalAmount: bigint) => {
    return writeStaircase({
      address: staircaseAddr,
      abi: LiquidityStaircaseABI,
      functionName: 'upgradeRung',
      args: [tokenId, newRungId, additionalAmount],
    });
  };

  // Claim accrued yield
  const claimYield = async (tokenId: string) => {
    return writeStaircase({
      address: staircaseAddr,
      abi: LiquidityStaircaseABI,
      functionName: 'claimYield',
      args: [tokenId],
    });
  };

  // Transfer NFT to another user
  const transferNFT = async (tokenId: string, to: `0x${string}`) => {
    return writeStaircase({
      address: nftAddr,
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
          totalLiquidity: 892500,
          utilizationByRung: [0.85, 0.72, 0.58, 0.41, 0.23],
          averageYield: 12.4,
          totalNFTs: 156,
          rewardsPool: 42000,
          emergencyExitFee: 500, // 5%
          maxCapacity: 2000000
        },
        rungs: [
          {
            rungId: 0,
            name: "Foundation",
            minLiquidity: 1000,
            maxLiquidity: 25000,
            premium: 1.0,
            lockDuration: 24, // 1 day
            yieldBoost: 0.02, // 2%
            utilization: 0.85,
            available: 3750
          },
          {
            rungId: 1,
            name: "Ascent",
            minLiquidity: 10000,
            maxLiquidity: 75000,
            premium: 1.25,
            lockDuration: 72, // 3 days
            yieldBoost: 0.045, // 4.5%
            utilization: 0.72,
            available: 21000
          },
          {
            rungId: 2,
            name: "Summit",
            minLiquidity: 25000,
            maxLiquidity: 150000,
            premium: 1.5,
            lockDuration: 168, // 1 week
            yieldBoost: 0.075, // 7.5%
            utilization: 0.58,
            available: 63000
          },
          {
            rungId: 3,
            name: "Peak",
            minLiquidity: 75000,
            maxLiquidity: 300000,
            premium: 1.75,
            lockDuration: 336, // 2 weeks
            yieldBoost: 0.12, // 12%
            utilization: 0.41,
            available: 177000
          },
          {
            rungId: 4,
            name: "Zenith",
            minLiquidity: 200000,
            maxLiquidity: 1000000,
            premium: 2.0,
            lockDuration: 720, // 1 month
            yieldBoost: 0.18, // 18%
            utilization: 0.23,
            available: 770000
          }
        ] as StaircaseRung[],
        userNFTs: [
          {
            tokenId: "stair_001",
            owner: address || "0x0",
            rungId: 1,
            principal: 15000,
            lockedUntil: Date.now() + 86400000 * 2, // 2 days from now
            yieldAccrued: 187.50, // 15000 * 0.045 * 2.78 epochs
            totalYieldPotential: 675, // 15000 * 0.045 * full term
            isActive: true,
            createdAt: Date.now() - 86400000 * 1, // 1 day ago
            premiumTier: "Ascent"
          },
          {
            tokenId: "stair_002",
            owner: address || "0x0",
            rungId: 2,
            principal: 50000,
            lockedUntil: Date.now() + 86400000 * 5, // 5 days from now
            yieldAccrued: 937.50, // 50000 * 0.075 * 2.5 epochs
            totalYieldPotential: 3750, // 50000 * 0.075 * full term
            isActive: true,
            createdAt: Date.now() - 86400000 * 2, // 2 days ago
            premiumTier: "Summit"
          }
        ] as LiquidityNFT[],
        recentEvents: [
          {
            type: 'deposit' as const,
            tokenId: 'stair_155',
            amount: 25000,
            rung: 2,
            timestamp: Date.now() - 86400000 * 0.5,
            premium: 1.5
          },
          {
            type: 'upgrade' as const,
            tokenId: 'stair_132',
            amount: 35000,
            rung: 3,
            timestamp: Date.now() - 86400000 * 1,
            premium: 1.75
          },
          {
            type: 'yield' as const,
            tokenId: 'stair_089',
            amount: 1250,
            rung: 1,
            timestamp: Date.now() - 86400000 * 1.5,
            premium: 1.25
          },
          {
            type: 'withdraw' as const,
            tokenId: 'stair_067',
            amount: 42000,
            rung: 4,
            timestamp: Date.now() - 86400000 * 2,
            premium: 2.0
          }
        ] as LiquidityEvent[]
      };
    }

    const pool = poolState as any;
    const rungs = (staircaseRungs as any[]) || [];
    const nfts = (userNFTs as any[]) || [];
    const events = (recentEvents as any[]) || [];

    return {
      pool: {
        totalLiquidity: Number(pool.totalLiquidity) / 1e6,
        utilizationByRung: pool.utilizationByRung.map((u: any) => Number(u) / 10000),
        averageYield: Number(pool.averageYield) / 100,
        totalNFTs: Number(pool.totalNFTs),
        rewardsPool: Number(pool.rewardsPool) / 1e6,
        emergencyExitFee: Number(pool.emergencyExitFee),
        maxCapacity: Number(pool.maxCapacity) / 1e6
      } as StaircasePool,
      rungs: rungs.map((rung: any) => ({
        rungId: Number(rung.rungId),
        name: rung.name,
        minLiquidity: Number(rung.minLiquidity) / 1e6,
        maxLiquidity: Number(rung.maxLiquidity) / 1e6,
        premium: Number(rung.premium) / 1000,
        lockDuration: Number(rung.lockDuration),
        yieldBoost: Number(rung.yieldBoost) / 10000,
        utilization: Number(rung.utilization) / 10000,
        available: Number(rung.available) / 1e6
      })) as StaircaseRung[],
      userNFTs: nfts.map((nft: any) => ({
        tokenId: nft.tokenId,
        owner: nft.owner,
        rungId: Number(nft.rungId),
        principal: Number(nft.principal) / 1e6,
        lockedUntil: Number(nft.lockedUntil) * 1000,
        yieldAccrued: Number(nft.yieldAccrued) / 1e6,
        totalYieldPotential: Number(nft.totalYieldPotential) / 1e6,
        isActive: nft.isActive,
        createdAt: Number(nft.createdAt) * 1000,
        premiumTier: nft.premiumTier
      })) as LiquidityNFT[],
      recentEvents: events.map((event: any) => ({
        type: event.type,
        tokenId: event.tokenId,
        amount: Number(event.amount) / 1e6,
        rung: Number(event.rung),
        timestamp: Number(event.timestamp) * 1000,
        premium: Number(event.premium) / 1000
      })) as LiquidityEvent[]
    };
  }, [enabled, poolState, staircaseRungs, userNFTs, recentEvents, address]);

  return {
    enabled,
    state,
    isWritePending,
    depositToRung,
    withdrawFromNFT,
    emergencyExit,
    upgradeNFT,
    claimYield,
    transferNFT,
  } as const;
}