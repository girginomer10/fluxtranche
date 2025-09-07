import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { KineticFeesABI, KineticFeesWriteABI } from '@/config/contracts';

export function useKineticFees() {
  const addr = CONTRACTS.KINETIC_FEES as `0x${string}`;
  const enabled = addr !== '0x0000000000000000000000000000000000000000';

  const { data: rates } = useReadContract({
    address: addr,
    abi: KineticFeesABI,
    functionName: 'getCurrentRates',
    query: { enabled },
  });

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending } = useWaitForTransactionReceipt({ hash: txHash });

  const update = async () => {
    return writeContract({ address: addr, abi: KineticFeesWriteABI, functionName: 'updateKineticFees' });
  };

  const view = useMemo(() => {
    if (!enabled || !rates) return null;
    const r = rates as any;
    return {
      managementFeeBps: Number(r.managementFeeBps ?? r[0] ?? 0),
      performanceFeeBps: Number(r.performanceFeeBps ?? r[1] ?? 0),
      seniorCouponBps: Number(r.seniorCouponBps ?? r[2] ?? 0),
      entryFeeBps: Number(r.entryFeeBps ?? r[3] ?? 0),
      exitFeeBps: Number(r.exitFeeBps ?? r[4] ?? 0),
      lastUpdateTime: Number(r.lastUpdateTime ?? r[5] ?? 0) * 1000,
    };
  }, [enabled, rates]);

  return { enabled, rates: view, update, isPending } as const;
}

