import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { CONTRACTS } from '@/config/web3';
import { AutoCallableNoteABI, ERC1155ABI } from '@/config/contracts';

interface AutoCallableNote {
  tokenId: string;
  owner: `0x${string}`;
  principal: number; // Initial investment in USDC
  underlyingAsset: string; // e.g., 'ETH', 'BTC', 'S&P500'
  initialPrice: number; // Reference price at issuance
  currentPrice: number; // Current underlying price
  knockInBarrier: number; // Downside barrier (e.g., 70% of initial)
  callBarrier: number; // Auto-call barrier (e.g., 100% of initial)
  bufferLevel: number; // Buffer protection level (e.g., 80% of initial)
  couponRate: number; // Coupon rate if called early (annualized %)
  maturityDate: number; // Final maturity timestamp
  observationDates: number[]; // Auto-call observation dates
  nextObservation: number; // Next observation date
  hasKnockedIn: boolean; // Whether barrier has been breached
  isAutoCalled: boolean; // Whether note has been auto-called
  totalCouponsEarned: number; // USDC earned from coupons
  status: 'active' | 'called' | 'matured' | 'knocked_in';
  createdAt: number;
}

interface NotePool {
  totalNotional: number; // Total outstanding notional
  totalNotes: number; // Number of active notes
  averageCouponRate: number; // Average coupon across all notes
  averageTimeToMaturity: number; // Average time to maturity (days)
  knockInRate: number; // % of notes that have knocked in
  autoCallRate: number; // % of notes that have auto-called
  underlyingAssets: string[]; // List of available underlying assets
  totalCouponsDistributed: number; // Total coupons paid out
}

interface ObservationEvent {
  noteId: string;
  observationDate: number;
  underlyingPrice: number;
  initialPrice: number;
  pricePerformance: number; // Price vs initial (%)
  callBarrierLevel: number;
  knockInBarrierLevel: number;
  wasAutoCalled: boolean;
  wasKnockedIn: boolean;
  couponPaid: number; // USDC coupon if auto-called
}

interface NoteTemplate {
  id: string;
  name: string;
  underlyingAsset: string;
  term: number; // Term in days
  callBarrier: number; // % of initial price
  knockInBarrier: number; // % of initial price  
  bufferLevel: number; // % buffer protection
  couponRate: number; // Annual coupon rate if called
  observationFrequency: number; // Days between observations
  minimumInvestment: number; // Min USDC
  maximumInvestment: number; // Max USDC
  issuanceOpen: boolean;
  description: string;
}

export function useAutoCallableNote() {
  const { address } = useAccount();
  const noteAddr = CONTRACTS.AUTOCALLABLE_NOTE as `0x${string}`;
  const nftAddr = CONTRACTS.AUTOCALLABLE_NFTS as `0x${string}`;
  const enabled = noteAddr !== '0x0000000000000000000000000000000000000000';

  // Read note pool state
  const { data: poolState } = useReadContract({
    address: noteAddr,
    abi: AutoCallableNoteABI,
    functionName: 'getPoolState',
    query: { enabled },
  });

  // Read available note templates
  const { data: noteTemplates } = useReadContract({
    address: noteAddr,
    abi: AutoCallableNoteABI,
    functionName: 'getAvailableTemplates',
    query: { enabled },
  });

  // Read user's notes
  const { data: userNotes } = useReadContract({
    address: noteAddr,
    abi: AutoCallableNoteABI,
    functionName: 'getUserNotes',
    args: address ? [address] : undefined,
    query: { enabled: enabled && !!address },
  });

  // Read recent observations
  const { data: recentObservations } = useReadContract({
    address: noteAddr,
    abi: AutoCallableNoteABI,
    functionName: 'getRecentObservations',
    args: [20], // Last 20 observation events
    query: { enabled },
  });

  const { writeContract: writeNote, data: writeHash } = useWriteContract();
  const { isLoading: isWritePending } = useWaitForTransactionReceipt({ hash: writeHash });

  // Issue new autocallable note
  const issueNote = async (templateId: string, amount: bigint, customParams?: any) => {
    return writeNote({
      address: noteAddr,
      abi: AutoCallableNoteABI,
      functionName: 'issueNote',
      args: [templateId, amount, customParams || '0x'],
    });
  };

  // Manually trigger observation (if current time >= next observation)
  const triggerObservation = async (tokenId: string) => {
    return writeNote({
      address: noteAddr,
      abi: AutoCallableNoteABI,
      functionName: 'triggerObservation',
      args: [tokenId],
    });
  };

  // Claim matured note
  const claimMaturedNote = async (tokenId: string) => {
    return writeNote({
      address: noteAddr,
      abi: AutoCallableNoteABI,
      functionName: 'claimMaturedNote',
      args: [tokenId],
    });
  };

  // Claim auto-called note
  const claimAutoCalledNote = async (tokenId: string) => {
    return writeNote({
      address: noteAddr,
      abi: AutoCallableNoteABI,
      functionName: 'claimAutoCalledNote',
      args: [tokenId],
    });
  };

  // Transfer note NFT
  const transferNote = async (tokenId: string, to: `0x${string}`) => {
    return writeNote({
      address: nftAddr,
      abi: ERC1155ABI,
      functionName: 'safeTransferFrom',
      args: [address!, to, tokenId, 1, '0x'],
    });
  };

  // Calculate note current value
  const calculateCurrentValue = (note: AutoCallableNote) => {
    if (note.isAutoCalled) {
      return note.principal + note.totalCouponsEarned;
    }
    
    if (note.status === 'matured') {
      if (note.hasKnockedIn) {
        // Principal is at risk
        const finalPerformance = note.currentPrice / note.initialPrice;
        return note.principal * Math.max(finalPerformance, 0);
      } else {
        // Principal protected by buffer
        return note.principal;
      }
    }
    
    // Active note - estimate current value
    const pricePerformance = note.currentPrice / note.initialPrice;
    if (note.hasKnockedIn && pricePerformance < note.bufferLevel) {
      return note.principal * pricePerformance;
    }
    
    return note.principal; // Buffer protection active
  };

  // Process state for UI
  const state = useMemo(() => {
    if (!enabled || !poolState) {
      // Demo data
      return {
        pool: {
          totalNotional: 12500000,
          totalNotes: 284,
          averageCouponRate: 8.25,
          averageTimeToMaturity: 127,
          knockInRate: 0.15, // 15% knocked in
          autoCallRate: 0.42, // 42% auto-called
          underlyingAssets: ['ETH', 'BTC', 'S&P500', 'TSLA', 'MSFT'],
          totalCouponsDistributed: 520000
        },
        templates: [
          {
            id: 'eth_6m_buffer',
            name: 'ETH 6M Buffer Note',
            underlyingAsset: 'ETH',
            term: 180, // 6 months
            callBarrier: 1.0, // 100% auto-call
            knockInBarrier: 0.65, // 65% knock-in
            bufferLevel: 0.80, // 20% buffer
            couponRate: 0.12, // 12% annual if called
            observationFrequency: 30, // Monthly observations
            minimumInvestment: 1000,
            maximumInvestment: 100000,
            issuanceOpen: true,
            description: 'Monthly observations with 20% downside buffer'
          },
          {
            id: 'btc_1y_aggressive',
            name: 'BTC 1Y Aggressive Note',
            underlyingAsset: 'BTC',
            term: 365, // 1 year
            callBarrier: 1.05, // 105% auto-call
            knockInBarrier: 0.60, // 60% knock-in
            bufferLevel: 0.75, // 25% buffer
            couponRate: 0.15, // 15% annual if called
            observationFrequency: 90, // Quarterly observations
            minimumInvestment: 5000,
            maximumInvestment: 250000,
            issuanceOpen: true,
            description: 'Quarterly observations with higher coupon potential'
          },
          {
            id: 'sp500_conservative',
            name: 'S&P500 Conservative Note',
            underlyingAsset: 'S&P500',
            term: 270, // 9 months
            callBarrier: 0.95, // 95% auto-call
            knockInBarrier: 0.70, // 70% knock-in
            bufferLevel: 0.85, // 15% buffer
            couponRate: 0.08, // 8% annual if called
            observationFrequency: 60, // Bi-monthly observations
            minimumInvestment: 2500,
            maximumInvestment: 500000,
            issuanceOpen: true,
            description: 'Conservative structure with frequent observations'
          }
        ] as NoteTemplate[],
        userNotes: [
          {
            tokenId: 'note_001',
            owner: address || '0x0',
            principal: 25000,
            underlyingAsset: 'ETH',
            initialPrice: 2000,
            currentPrice: 2340,
            knockInBarrier: 1300, // 65% of 2000
            callBarrier: 2000, // 100% of 2000
            bufferLevel: 1600, // 80% of 2000
            couponRate: 0.12,
            maturityDate: Date.now() + 86400000 * 120, // 4 months remaining
            observationDates: [
              Date.now() + 86400000 * 30,
              Date.now() + 86400000 * 60,
              Date.now() + 86400000 * 90,
              Date.now() + 86400000 * 120
            ],
            nextObservation: Date.now() + 86400000 * 30,
            hasKnockedIn: false,
            isAutoCalled: false,
            totalCouponsEarned: 0,
            status: 'active' as const,
            createdAt: Date.now() - 86400000 * 60
          },
          {
            tokenId: 'note_002',
            owner: address || '0x0',
            principal: 10000,
            underlyingAsset: 'BTC',
            initialPrice: 45000,
            currentPrice: 52500,
            knockInBarrier: 27000, // 60% of 45000
            callBarrier: 47250, // 105% of 45000
            bufferLevel: 33750, // 75% of 45000
            couponRate: 0.15,
            maturityDate: Date.now() + 86400000 * 275, // 9+ months remaining
            observationDates: [
              Date.now() + 86400000 * 90,
              Date.now() + 86400000 * 180,
              Date.now() + 86400000 * 270,
              Date.now() + 86400000 * 365
            ],
            nextObservation: Date.now() + 86400000 * 90,
            hasKnockedIn: false,
            isAutoCalled: false,
            totalCouponsEarned: 0,
            status: 'active' as const,
            createdAt: Date.now() - 86400000 * 90
          },
          {
            tokenId: 'note_003',
            owner: address || '0x0',
            principal: 15000,
            underlyingAsset: 'S&P500',
            initialPrice: 4200,
            currentPrice: 4410,
            knockInBarrier: 2940, // 70% of 4200
            callBarrier: 3990, // 95% of 4200
            bufferLevel: 3570, // 85% of 4200
            couponRate: 0.08,
            maturityDate: Date.now() - 86400000 * 30, // Matured
            observationDates: [],
            nextObservation: 0,
            hasKnockedIn: false,
            isAutoCalled: true, // Was auto-called
            totalCouponsEarned: 900, // Earned coupon
            status: 'called' as const,
            createdAt: Date.now() - 86400000 * 270
          }
        ] as AutoCallableNote[],
        recentObservations: [
          {
            noteId: 'note_003',
            observationDate: Date.now() - 86400000 * 35,
            underlyingPrice: 4200,
            initialPrice: 4200,
            pricePerformance: 1.0,
            callBarrierLevel: 3990,
            knockInBarrierLevel: 2940,
            wasAutoCalled: true,
            wasKnockedIn: false,
            couponPaid: 900
          },
          {
            noteId: 'note_127',
            observationDate: Date.now() - 86400000 * 7,
            underlyingPrice: 1950,
            initialPrice: 2100,
            pricePerformance: 0.929,
            callBarrierLevel: 2100,
            knockInBarrierLevel: 1365,
            wasAutoCalled: false,
            wasKnockedIn: false,
            couponPaid: 0
          }
        ] as ObservationEvent[]
      };
    }

    const pool = poolState as any;
    const templates = (noteTemplates as any[]) || [];
    const notes = (userNotes as any[]) || [];
    const observations = (recentObservations as any[]) || [];

    return {
      pool: {
        totalNotional: Number(pool.totalNotional) / 1e6,
        totalNotes: Number(pool.totalNotes),
        averageCouponRate: Number(pool.averageCouponRate) / 100,
        averageTimeToMaturity: Number(pool.averageTimeToMaturity),
        knockInRate: Number(pool.knockInRate) / 10000,
        autoCallRate: Number(pool.autoCallRate) / 10000,
        underlyingAssets: pool.underlyingAssets || [],
        totalCouponsDistributed: Number(pool.totalCouponsDistributed) / 1e6
      } as NotePool,
      templates: templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        underlyingAsset: template.underlyingAsset,
        term: Number(template.term),
        callBarrier: Number(template.callBarrier) / 10000,
        knockInBarrier: Number(template.knockInBarrier) / 10000,
        bufferLevel: Number(template.bufferLevel) / 10000,
        couponRate: Number(template.couponRate) / 10000,
        observationFrequency: Number(template.observationFrequency),
        minimumInvestment: Number(template.minimumInvestment) / 1e6,
        maximumInvestment: Number(template.maximumInvestment) / 1e6,
        issuanceOpen: template.issuanceOpen,
        description: template.description
      })) as NoteTemplate[],
      userNotes: notes.map((note: any) => ({
        tokenId: note.tokenId,
        owner: note.owner,
        principal: Number(note.principal) / 1e6,
        underlyingAsset: note.underlyingAsset,
        initialPrice: Number(note.initialPrice) / 1e8, // Price with 8 decimals
        currentPrice: Number(note.currentPrice) / 1e8,
        knockInBarrier: Number(note.knockInBarrier) / 1e8,
        callBarrier: Number(note.callBarrier) / 1e8,
        bufferLevel: Number(note.bufferLevel) / 1e8,
        couponRate: Number(note.couponRate) / 10000,
        maturityDate: Number(note.maturityDate) * 1000,
        observationDates: note.observationDates.map((d: any) => Number(d) * 1000),
        nextObservation: Number(note.nextObservation) * 1000,
        hasKnockedIn: note.hasKnockedIn,
        isAutoCalled: note.isAutoCalled,
        totalCouponsEarned: Number(note.totalCouponsEarned) / 1e6,
        status: note.status,
        createdAt: Number(note.createdAt) * 1000
      })) as AutoCallableNote[],
      recentObservations: observations.map((obs: any) => ({
        noteId: obs.noteId,
        observationDate: Number(obs.observationDate) * 1000,
        underlyingPrice: Number(obs.underlyingPrice) / 1e8,
        initialPrice: Number(obs.initialPrice) / 1e8,
        pricePerformance: Number(obs.pricePerformance) / 10000,
        callBarrierLevel: Number(obs.callBarrierLevel) / 1e8,
        knockInBarrierLevel: Number(obs.knockInBarrierLevel) / 1e8,
        wasAutoCalled: obs.wasAutoCalled,
        wasKnockedIn: obs.wasKnockedIn,
        couponPaid: Number(obs.couponPaid) / 1e6
      })) as ObservationEvent[]
    };
  }, [enabled, poolState, noteTemplates, userNotes, recentObservations, address]);

  return {
    enabled,
    state,
    isWritePending,
    issueNote,
    triggerObservation,
    claimMaturedNote,
    claimAutoCalledNote,
    transferNote,
    calculateCurrentValue,
  } as const;
}