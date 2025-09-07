import { useMemo } from 'react';
import { useAccount } from 'wagmi';

interface CashCarryPosition {
  id: string;
  asset: string;
  spotPrice: number;
  futurePrice: number;
  basis: number; // Future - Spot
  annualizedBasis: number;
  quantity: number;
  collateral: number;
  pnl: number;
  daysToExpiry: number;
}

export function useCashCarryVault() {
  const { address } = useAccount();
  
  const state = useMemo(() => ({
    pool: {
      totalAUM: 3400000,
      activeTrades: 18,
      avgAnnualizedBasis: 0.085,
      totalPnL: 85000
    },
    positions: [
      {
        id: 'cc_001',
        asset: 'BTC',
        spotPrice: 43200,
        futurePrice: 44100,
        basis: 900,
        annualizedBasis: 0.076,
        quantity: 2.5,
        collateral: 110000,
        pnl: 2250,
        daysToExpiry: 28
      }
    ] as CashCarryPosition[]
  }), []);

  const createCashCarryTrade = async () => Promise.resolve();

  return { enabled: false, state, createCashCarryTrade } as const;
}