import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { DrawdownShieldABI, TrancheVaultABI } from '@/config/contracts';

interface ShieldPolicy {
  id: string;
  owner: `0x${string}`;
  threshold: number; // basis points (e.g., 100 = 1%)
  notional: number; // USDC amount
  premium: number; // USDC premium paid
  active: boolean;
  epochsRemaining: number;
  totalClaimed: number;
  maxClaim: number;
}

interface ShieldPool {
  totalReserves: number;
  utilizationRate: number;
  totalPolicies: number;
  activeClaims: number;
  fundingSourceAPY: number;
  minThreshold: number;
  maxThreshold: number;
  premiumRate: number; // basis points per epoch
}

interface DrawdownEvent {
  epoch: number;
  drawdownBps: number;
  timestamp: number;
  shieldsTriggered: number;
  totalPayout: number;
  poolUtilization: number;
}

export function useDrawdownShield() {
  const { address } = useAccount();
  const shieldAddr = CONTRACTS.DRAWDOWN_SHIELD as `0x${string}`;
  const vaultAddr = CONTRACTS.TRANCHE_VAULT as `0x${string}`;
  const enabled = shieldAddr !== '0x0000000000000000000000000000000000000000';

  // Read shield pool state
  const { data: poolState } = useReadContract({
    address: shieldAddr,
    abi: DrawdownShieldABI,
    functionName: 'getPoolState',
    query: { enabled },
  });

  // Read user's active shields
  const { data: userShields } = useReadContract({
    address: shieldAddr,
    abi: DrawdownShieldABI,
    functionName: 'getUserShields',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read recent drawdown events
  const { data: recentEvents } = useReadContract({
    address: shieldAddr,
    abi: DrawdownShieldABI,
    functionName: 'getRecentDrawdowns',
    args: [10], // Last 10 events
    query: { enabled },
  });

  // Read shield pricing for different thresholds
  const { data: pricingTable } = useReadContract({
    address: shieldAddr,
    abi: DrawdownShieldABI,
    functionName: 'getShieldPricing',
    query: { enabled },
  });

  const { writeContract: writeShield, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Purchase shield policy
  const purchaseShield = async (thresholdBps: number, notional: bigint, duration: number) => {
    return writeShield({
      address: shieldAddr,
      abi: DrawdownShieldABI,
      functionName: 'purchaseShield',
      args: [thresholdBps, notional, duration],
    });
  };

  // Claim shield payout
  const claimShield = async (shieldId: string) => {
    return writeShield({
      address: shieldAddr,
      abi: DrawdownShieldABI,
      functionName: 'claimShield',
      args: [shieldId],
    });
  };

  // Cancel shield (partial refund)
  const cancelShield = async (shieldId: string) => {
    return writeShield({
      address: shieldAddr,
      abi: DrawdownShieldABI,
      functionName: 'cancelShield',
      args: [shieldId],
    });
  };

  // Fund shield pool (Junior profits contribute)
  const fundPool = async (amount: bigint) => {
    return writeShield({
      address: vaultAddr,
      abi: TrancheVaultABI,
      functionName: 'contributeToShieldPool',
      args: [amount],
    });
  };

  // Process shield state for UI
  const state = useMemo(() => {
    if (!enabled || !poolState) {
      // Demo data
      return {
        pool: {
          totalReserves: 125000,
          utilizationRate: 0.23,
          totalPolicies: 47,
          activeClaims: 3,
          fundingSourceAPY: 15.2,
          minThreshold: 50, // 0.5%
          maxThreshold: 1000, // 10%
          premiumRate: 25 // 0.25% per epoch
        },
        userShields: [
          {
            id: "shield_001",
            owner: address || "0x0",
            threshold: 100, // 1%
            notional: 25000,
            premium: 125, // 0.5%
            active: true,
            epochsRemaining: 8,
            totalClaimed: 0,
            maxClaim: 2500 // 10% of notional max
          }
        ] as ShieldPolicy[],
        recentEvents: [
          {
            epoch: 156,
            drawdownBps: 120, // 1.2%
            timestamp: Date.now() - 86400000 * 2,
            shieldsTriggered: 5,
            totalPayout: 3500,
            poolUtilization: 0.28
          },
          {
            epoch: 142,
            drawdownBps: 75, // 0.75%
            timestamp: Date.now() - 86400000 * 12,
            shieldsTriggered: 0,
            totalPayout: 0,
            poolUtilization: 0.15
          }
        ] as DrawdownEvent[],
        pricingTable: [
          { threshold: 50, premium: 12.5 },   // 0.5% threshold, 0.125% premium
          { threshold: 100, premium: 25 },    // 1% threshold, 0.25% premium  
          { threshold: 200, premium: 60 },    // 2% threshold, 0.6% premium
          { threshold: 500, premium: 200 },   // 5% threshold, 2% premium
        ]
      };
    }

    const pool = poolState as any;
    const shields = (userShields as any[]) || [];
    const events = (recentEvents as any[]) || [];
    const pricing = (pricingTable as any[]) || [];

    return {
      pool: {
        totalReserves: Number(pool.totalReserves) / 1e6,
        utilizationRate: Number(pool.utilizationRate) / 10000,
        totalPolicies: Number(pool.totalPolicies),
        activeClaims: Number(pool.activeClaims),
        fundingSourceAPY: Number(pool.fundingSourceAPY) / 100,
        minThreshold: Number(pool.minThreshold),
        maxThreshold: Number(pool.maxThreshold),
        premiumRate: Number(pool.premiumRate)
      } as ShieldPool,
      userShields: shields.map((shield: any) => ({
        id: shield.id,
        owner: shield.owner,
        threshold: Number(shield.threshold),
        notional: Number(shield.notional) / 1e6,
        premium: Number(shield.premium) / 1e6,
        active: shield.active,
        epochsRemaining: Number(shield.epochsRemaining),
        totalClaimed: Number(shield.totalClaimed) / 1e6,
        maxClaim: Number(shield.maxClaim) / 1e6
      })) as ShieldPolicy[],
      recentEvents: events.map((event: any) => ({
        epoch: Number(event.epoch),
        drawdownBps: Number(event.drawdownBps),
        timestamp: Number(event.timestamp) * 1000,
        shieldsTriggered: Number(event.shieldsTriggered),
        totalPayout: Number(event.totalPayout) / 1e6,
        poolUtilization: Number(event.poolUtilization) / 10000
      })) as DrawdownEvent[],
      pricingTable: pricing.map((item: any) => ({
        threshold: Number(item.threshold),
        premium: Number(item.premium) / 100
      }))
    };
  }, [enabled, poolState, userShields, recentEvents, pricingTable, address]);

  return {
    enabled,
    state,
    isWritePending,
    purchaseShield,
    claimShield,
    cancelShield,
    fundPool,
  } as const;
}