import { useMemo } from 'react';
import { useAccount } from 'wagmi';

// SettleUp-Style Expense Sharing
interface ExpenseGroup {
  id: string;
  name: string;
  members: GroupMember[];
  totalExpenses: number;
  balances: { [address: string]: number }; // Positive = owed money, Negative = owes money
  recentExpenses: Expense[];
}

interface GroupMember {
  address: `0x${string}`;
  name: string;
  avatar?: string;
  isActive: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: `0x${string}`;
  splitBetween: `0x${string}`[];
  category: string;
  date: number;
  receipt?: string;
}

// Social Pot - Shared investment pools
interface SocialPot {
  id: string;
  name: string;
  description: string;
  creator: `0x${string}`;
  members: PotMember[];
  targetAmount: number;
  currentAmount: number;
  strategy: string;
  minContribution: number;
  maxContribution: number;
  votingThreshold: number; // % needed for decisions
  isPublic: boolean;
  created: number;
}

interface PotMember {
  address: `0x${string}`;
  name: string;
  contribution: number;
  votingPower: number;
  joinedAt: number;
}

// Round-Up/Card-Link
interface CardLinkAccount {
  id: string;
  owner: `0x${string}`;
  linkedCards: LinkedCard[];
  roundUpSettings: RoundUpSettings;
  totalRoundUps: number;
  currentBalance: number;
  investmentStrategy: string;
}

interface LinkedCard {
  id: string;
  last4: string;
  type: 'debit' | 'credit';
  bank: string;
  isActive: boolean;
  roundUpEnabled: boolean;
}

interface RoundUpSettings {
  multiplier: number; // 1x, 2x, 5x, 10x round up
  minimumRoundUp: number;
  maximumRoundUp: number;
  investmentAllocation: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
}

interface RoundUpTransaction {
  id: string;
  cardId: string;
  merchantName: string;
  originalAmount: number;
  roundUpAmount: number;
  timestamp: number;
  category: string;
}

export function useExpenseSharing() {
  const { address } = useAccount();
  
  const state = useMemo(() => ({
    groups: [{
      id: 'group_001',
      name: 'Roommates',
      members: [
        { address: address || '0x0', name: 'You', isActive: true },
        { address: '0x1111111111111111111111111111111111111111' as `0x${string}`, name: 'Alice', isActive: true },
        { address: '0x2222222222222222222222222222222222222222' as `0x${string}`, name: 'Bob', isActive: true }
      ],
      totalExpenses: 2450,
      balances: {
        [address || '0x0']: 120,
        '0x1111111111111111111111111111111111111111': -85,
        '0x2222222222222222222222222222222222222222': -35
      },
      recentExpenses: [
        {
          id: 'exp_001',
          description: 'Groceries - Whole Foods',
          amount: 156.80,
          paidBy: address || '0x0',
          splitBetween: [
            address || '0x0',
            '0x1111111111111111111111111111111111111111' as `0x${string}`,
            '0x2222222222222222222222222222222222222222' as `0x${string}`
          ],
          category: 'Food',
          date: Date.now() - 86400000 * 2
        },
        {
          id: 'exp_002',
          description: 'Internet Bill',
          amount: 89.99,
          paidBy: '0x1111111111111111111111111111111111111111' as `0x${string}`,
          splitBetween: [
            address || '0x0',
            '0x1111111111111111111111111111111111111111' as `0x${string}`,
            '0x2222222222222222222222222222222222222222' as `0x${string}`
          ],
          category: 'Utilities',
          date: Date.now() - 86400000 * 5
        }
      ]
    }] as ExpenseGroup[]
  }), [address]);

  return { enabled: false, state };
}

export function useSocialPot() {
  const { address } = useAccount();
  
  const state = useMemo(() => ({
    pots: [{
      id: 'pot_001',
      name: 'Crypto Bull Run 2024',
      description: 'Group investment pot for the next crypto bull run',
      creator: address || '0x0',
      members: [
        { address: address || '0x0', name: 'You', contribution: 5000, votingPower: 0.35, joinedAt: Date.now() - 86400000 * 30 },
        { address: '0x1111111111111111111111111111111111111111' as `0x${string}`, name: 'Sarah', contribution: 3500, votingPower: 0.25, joinedAt: Date.now() - 86400000 * 25 },
        { address: '0x2222222222222222222222222222222222222222' as `0x${string}`, name: 'Mike', contribution: 2800, votingPower: 0.20, joinedAt: Date.now() - 86400000 * 20 },
        { address: '0x3333333333333333333333333333333333333333' as `0x${string}`, name: 'Lisa', contribution: 2700, votingPower: 0.20, joinedAt: Date.now() - 86400000 * 15 }
      ],
      targetAmount: 25000,
      currentAmount: 14000,
      strategy: 'Aggressive DeFi',
      minContribution: 1000,
      maxContribution: 10000,
      votingThreshold: 0.60,
      isPublic: false,
      created: Date.now() - 86400000 * 30
    }] as SocialPot[],
    publicPots: [{
      id: 'pub_pot_001',
      name: 'ETH Stakers United',
      description: 'Open pool for ETH staking with professional management',
      creator: '0xaaa0000000000000000000000000000000000000' as `0x${string}`,
      members: [], // Simplified for demo
      targetAmount: 1000000,
      currentAmount: 650000,
      strategy: 'ETH Staking',
      minContribution: 100,
      maxContribution: 50000,
      votingThreshold: 0.51,
      isPublic: true,
      created: Date.now() - 86400000 * 60
    }] as SocialPot[]
  }), [address]);

  return { enabled: false, state };
}

export function useRoundUpCardLink() {
  const { address } = useAccount();
  
  const state = useMemo(() => ({
    account: {
      id: 'card_001',
      owner: address || '0x0',
      linkedCards: [
        {
          id: 'card_debit_001',
          last4: '4567',
          type: 'debit' as const,
          bank: 'Chase',
          isActive: true,
          roundUpEnabled: true
        },
        {
          id: 'card_credit_001',
          last4: '8901',
          type: 'credit' as const,
          bank: 'Amex',
          isActive: true,
          roundUpEnabled: true
        }
      ],
      roundUpSettings: {
        multiplier: 2, // 2x round up
        minimumRoundUp: 0.50,
        maximumRoundUp: 5.00,
        investmentAllocation: {
          conservative: 0.40,
          moderate: 0.35,
          aggressive: 0.25
        }
      },
      totalRoundUps: 487.32,
      currentBalance: 487.32,
      investmentStrategy: 'Diversified'
    } as CardLinkAccount,
    recentTransactions: [
      {
        id: 'tx_001',
        cardId: 'card_debit_001',
        merchantName: 'Starbucks',
        originalAmount: 6.85,
        roundUpAmount: 1.15, // 2x round up: (8-6.85) * 2
        timestamp: Date.now() - 86400000 * 1,
        category: 'Dining'
      },
      {
        id: 'tx_002',
        cardId: 'card_credit_001',
        merchantName: 'Amazon',
        originalAmount: 23.47,
        roundUpAmount: 1.06, // 2x round up: (24-23.47) * 2
        timestamp: Date.now() - 86400000 * 2,
        category: 'Shopping'
      },
      {
        id: 'tx_003',
        cardId: 'card_debit_001',
        merchantName: 'Shell Gas Station',
        originalAmount: 45.21,
        roundUpAmount: 1.58, // 2x round up: (46-45.21) * 2
        timestamp: Date.now() - 86400000 * 3,
        category: 'Gas'
      }
    ] as RoundUpTransaction[]
  }), [address]);

  return { enabled: false, state };
}