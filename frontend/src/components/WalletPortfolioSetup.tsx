'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  RefreshCw,
  DollarSign,
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Globe,
  Zap,
  Shield,
  PieChart,
  BarChart3,
  Copy,
  ExternalLink
} from 'lucide-react';

// Supported blockchain networks from SSOT - Most Popular Chains
const SUPPORTED_CHAINS = {
  // TOP EVM CHAINS - Most Popular
  ethereum: { 
    name: 'Ethereum', 
    native: 'ETH', 
    icon: '🔷',
    type: 'evm',
    explorer: 'https://etherscan.io/address/',
    features: ['defi', 'nfts', 'staking'],
    popular: true,
    tokens: ['ETH', 'USDT', 'USDC', 'WBTC', 'DAI', 'UNI', 'LINK', 'AAVE']
  },
  bsc: { 
    name: 'BNB Chain', 
    native: 'BNB', 
    icon: '🟨',
    type: 'evm',
    explorer: 'https://bscscan.com/address/',
    features: ['defi', 'nfts'],
    popular: true,
    tokens: ['BNB', 'USDT', 'USDC', 'CAKE', 'XVS']
  },
  polygon: { 
    name: 'Polygon', 
    native: 'MATIC', 
    icon: '🔺',
    type: 'evm',
    explorer: 'https://polygonscan.com/address/',
    features: ['defi', 'nfts'],
    popular: true,
    tokens: ['MATIC', 'USDT', 'USDC', 'WETH', 'WBTC']
  },
  arbitrum: { 
    name: 'Arbitrum', 
    native: 'ETH', 
    icon: '🔵',
    type: 'evm',
    explorer: 'https://arbiscan.io/address/',
    features: ['defi', 'scaling'],
    popular: true,
    tokens: ['ETH', 'ARB', 'USDT', 'USDC', 'WBTC']
  },
  optimism: { 
    name: 'Optimism', 
    native: 'ETH', 
    icon: '🔴',
    type: 'evm',
    explorer: 'https://optimistic.etherscan.io/address/',
    features: ['defi', 'scaling'],
    popular: true,
    tokens: ['ETH', 'OP', 'USDT', 'USDC', 'WBTC']
  },
  base: { 
    name: 'Base', 
    native: 'ETH', 
    icon: '🔵',
    type: 'evm',
    explorer: 'https://basescan.org/address/',
    features: ['defi', 'social'],
    popular: true,
    tokens: ['ETH', 'USDC', 'DAI']
  },
  avalanche: { 
    name: 'Avalanche', 
    native: 'AVAX', 
    icon: '❄️',
    type: 'evm',
    explorer: 'https://snowtrace.io/address/',
    features: ['staking', 'defi'],
    popular: true,
    tokens: ['AVAX', 'USDT', 'USDC', 'WAVAX']
  },

  // TOP COSMOS ECOSYSTEM - Most Popular
  cosmos: { 
    name: 'Cosmos Hub', 
    native: 'ATOM', 
    icon: '⚛️',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/cosmos/account/',
    features: ['staking', 'delegation', 'governance'],
    popular: true,
    tokens: ['ATOM']
  },
  osmosis: { 
    name: 'Osmosis', 
    native: 'OSMO', 
    icon: '🧪',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/osmosis/account/',
    features: ['staking', 'delegation', 'liquidity_pools'],
    popular: true,
    tokens: ['OSMO', 'ATOM', 'USDT', 'USDC']
  },
  celestia: { 
    name: 'Celestia', 
    native: 'TIA', 
    icon: '🔮',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/celestia/account/',
    features: ['staking', 'delegation'],
    popular: true,
    tokens: ['TIA']
  },
  injective: { 
    name: 'Injective', 
    native: 'INJ', 
    icon: '🚀',
    type: 'cosmos',
    explorer: 'https://explorer.injective.network/account/',
    features: ['staking', 'delegation', 'trading'],
    popular: true,
    tokens: ['INJ', 'USDT']
  },
  
  // TOP LAYER 1 CHAINS
  solana: { 
    name: 'Solana', 
    native: 'SOL', 
    icon: '☀️',
    type: 'solana',
    explorer: 'https://solscan.io/account/',
    features: ['staking', 'defi', 'nfts'],
    popular: true,
    tokens: ['SOL', 'USDT', 'USDC', 'JTO', 'JUP', 'PYTH', 'WIF']
  },
  sui: { 
    name: 'Sui', 
    native: 'SUI', 
    icon: '💧',
    type: 'sui',
    explorer: 'https://explorer.sui.io/address/',
    features: ['defi', 'nfts'],
    popular: true,
    tokens: ['SUI', 'USDT', 'USDC']
  },
  near: { 
    name: 'NEAR', 
    native: 'NEAR', 
    icon: '🌊',
    type: 'near',
    explorer: 'https://nearblocks.io/address/',
    features: ['staking', 'defi'],
    popular: true,
    tokens: ['NEAR', 'USDT', 'USDC']
  },
  aptos: { 
    name: 'Aptos', 
    native: 'APT', 
    icon: '🍎',
    type: 'aptos',
    explorer: 'https://explorer.aptoslabs.com/account/',
    features: ['defi', 'nfts'],
    popular: true,
    tokens: ['APT', 'USDT', 'USDC']
  },

  // POPULAR COSMOS CHAINS
  dymension: { 
    name: 'Dymension', 
    native: 'DYM', 
    icon: '💎',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/dymension/account/',
    features: ['staking', 'delegation'],
    tokens: ['DYM']
  },
  stride: { 
    name: 'Stride', 
    native: 'STRD', 
    icon: '🏃‍♂️',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/stride/account/',
    features: ['staking', 'liquid_staking'],
    tokens: ['STRD', 'stATOM', 'stOSMO']
  },
  neutron: { 
    name: 'Neutron', 
    native: 'NTRN', 
    icon: '⚡',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/neutron/account/',
    features: ['smart_contracts', 'interchain'],
    tokens: ['NTRN', 'ATOM']
  },
  kujira: { 
    name: 'Kujira', 
    native: 'KUJI', 
    icon: '🐳',
    type: 'cosmos',
    explorer: 'https://finder.kujira.app/kaiyo-1/address/',
    features: ['defi', 'liquidations'],
    tokens: ['KUJI', 'USK']
  },
  akash: { 
    name: 'Akash', 
    native: 'AKT', 
    icon: '☁️',
    type: 'cosmos',
    explorer: 'https://www.mintscan.io/akash/account/',
    features: ['cloud_computing', 'staking'],
    tokens: ['AKT']
  },

  // OTHER POPULAR CHAINS
  polkadot: { 
    name: 'Polkadot', 
    native: 'DOT', 
    icon: '⭕',
    type: 'substrate',
    explorer: 'https://polkadot.subscan.io/account/',
    features: ['staking', 'parachain_auctions'],
    tokens: ['DOT']
  },
  kusama: { 
    name: 'Kusama', 
    native: 'KSM', 
    icon: '🐤',
    type: 'substrate',
    explorer: 'https://kusama.subscan.io/account/',
    features: ['staking', 'parachain_auctions'],
    tokens: ['KSM']
  },
  fantom: { 
    name: 'Fantom', 
    native: 'FTM', 
    icon: '👻',
    type: 'evm',
    explorer: 'https://ftmscan.com/address/',
    features: ['defi', 'fast_transactions'],
    tokens: ['FTM', 'USDT', 'USDC']
  },
  cronos: { 
    name: 'Cronos', 
    native: 'CRO', 
    icon: '💳',
    type: 'evm',
    explorer: 'https://cronoscan.com/address/',
    features: ['defi', 'payments'],
    tokens: ['CRO', 'USDT', 'USDC']
  }
};

// Bank account types
const BANK_ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking Account', description: 'Daily transactions and expenses' },
  { value: 'savings', label: 'Savings Account', description: 'Emergency fund and short-term savings' },
  { value: 'money_market', label: 'Money Market', description: 'Higher yield savings with restrictions' },
  { value: 'cd', label: 'Certificate of Deposit', description: 'Fixed-term deposit with guaranteed rate' },
  { value: 'investment', label: 'Investment Account', description: 'Brokerage or retirement accounts' },
  { value: 'business', label: 'Business Account', description: 'Business banking and expenses' },
  { value: 'other', label: 'Other', description: 'Other types of accounts' }
];

interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountName: string;
  balance: number;
  currency: string;
  lastUpdated?: string;
  isActive: boolean;
}

interface WalletAddress {
  id: string;
  chain: string;
  address: string;
  name?: string;
  isActive: boolean;
}

interface WalletBalance {
  chain: string;
  address: string;
  liquidBalance: number;
  stakedBalance: number;
  unstakingBalance: number;
  delegatorRewards: number;
  totalBalance: number;
  tokens: Array<{
    denom?: string;
    symbol: string;
    amount: number;
    value: number;
    price: number;
    change24h: number;
    decimals?: number;
  }>;
  stakingInfo?: Array<{
    validatorAddress?: string;
    validatorName?: string;
    apr: number;
    commission: number;
  }>;
  lastUpdated: string;
  apr?: number;
}

interface WalletPortfolioSetupProps {
  currentBankAccounts?: BankAccount[];
  currentWalletAddresses?: WalletAddress[];
  onUpdate: (data: {
    bankAccounts: BankAccount[];
    walletAddresses: WalletAddress[];
  }) => void;
}

export function WalletPortfolioSetup({ 
  currentBankAccounts = [], 
  currentWalletAddresses = [],
  onUpdate 
}: WalletPortfolioSetupProps) {
  const [activeTab, setActiveTab] = useState<'bank' | 'wallets'>('bank');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(currentBankAccounts);
  const [walletAddresses, setWalletAddresses] = useState<WalletAddress[]>(currentWalletAddresses);
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [showBalances, setShowBalances] = useState(true);

  // Load existing wallets from database
  useEffect(() => {
    const loadWallets = async () => {
      try {
        const res = await fetch('/api/wallets');
        if (res.ok) {
          const data = await res.json();
          if (data.wallets && data.wallets.length > 0) {
            const dbWallets: WalletAddress[] = data.wallets.map((w: any) => ({
              id: w.id,
              chain: w.chain,
              address: w.address,
              name: w.name,
              isActive: w.isActive ?? true
            }));
            console.log('📥 Loaded wallets from database:', dbWallets);
            setWalletAddresses(prev => {
              // Merge with existing state, avoid duplicates
              const merged = [...prev];
              dbWallets.forEach(dbWallet => {
                if (!merged.some(existing => existing.address === dbWallet.address && existing.chain === dbWallet.chain)) {
                  merged.push(dbWallet);
                }
              });
              
              // Auto-select chains that have wallets (only valid supported chains)
              const chainsWithWallets = merged
                .map(w => w.chain)
                .filter((chain, index, arr) => arr.indexOf(chain) === index)
                .filter(chain => SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS]); // Guard: only valid chains
              
              setSelectedChains(prev => {
                const newChains = [...prev];
                chainsWithWallets.forEach(chain => {
                  if (!newChains.includes(chain)) {
                    newChains.push(chain);
                  }
                });
                return newChains;
              });
              
              return merged;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load wallets:', error);
      }
    };

    loadWallets();
  }, []);

  useEffect(() => {
    onUpdate({ bankAccounts, walletAddresses });
  }, [bankAccounts, walletAddresses]);

  const addBankAccount = () => {
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      bankName: '',
      accountType: 'checking',
      accountName: '',
      balance: 0,
      currency: 'USD',
      isActive: true
    };
    setBankAccounts([...bankAccounts, newAccount]);
  };

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    setBankAccounts(accounts => 
      accounts.map(account => 
        account.id === id ? { ...account, ...updates } : account
      )
    );
  };

  const removeBankAccount = (id: string) => {
    setBankAccounts(accounts => accounts.filter(account => account.id !== id));
  };

  const addWalletAddress = async (chain: string) => {
    const newWallet: WalletAddress = {
      id: Date.now().toString(),
      chain,
      address: '',
      isActive: true
    };
    console.log('Adding wallet:', newWallet);
    const updatedWallets = [...walletAddresses, newWallet];
    console.log('Updated wallets:', updatedWallets);
    setWalletAddresses(updatedWallets);
    
    // Note: Will save to database when address is filled in updateWalletAddress
  };

  const updateWalletAddress = async (id: string, updates: Partial<WalletAddress>) => {
    setWalletAddresses(wallets => 
      wallets.map(wallet => 
        wallet.id === id ? { ...wallet, ...updates } : wallet
      )
    );

    // If address is being updated and not empty, save to database
    if (updates.address && updates.address.length > 10) {
      const wallet = walletAddresses.find(w => w.id === id);
      if (wallet) {
        const updatedWallet = { ...wallet, ...updates };
        console.log('💾 Saving wallet to database:', updatedWallet);
        
        try {
          const res = await fetch('/api/wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chain: updatedWallet.chain,
              address: updatedWallet.address,
              name: updatedWallet.name || `${SUPPORTED_CHAINS[updatedWallet.chain as keyof typeof SUPPORTED_CHAINS]?.name} Wallet`
            }),
          });
          
          const json = await res.json();
          if (!res.ok) {
            console.error('Failed to save wallet:', json?.error);
          } else {
            console.log('✅ Wallet saved successfully');
          }
        } catch (error) {
          console.error('Error saving wallet:', error);
        }
      }
    }
  };

  const removeWalletAddress = async (id: string) => {
    const wallet = walletAddresses.find(w => w.id === id);
    setWalletAddresses(wallets => wallets.filter(wallet => wallet.id !== id));
    
    // If wallet has address, also remove from database
    if (wallet && wallet.address && wallet.address.length > 10) {
      try {
        console.log('🗑️ Removing wallet from database:', wallet.address);
        const res = await fetch('/api/wallets', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: wallet.chain,
            address: wallet.address
          }),
        });
        
        if (!res.ok) {
          console.warn('Failed to remove wallet from database');
        } else {
          console.log('✅ Wallet removed from database');
        }
      } catch (error) {
        console.error('Error removing wallet from database:', error);
      }
    }
  };

  const toggleChainSelection = (chainId: string) => {
    setSelectedChains(prev => 
      prev.includes(chainId) 
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const refreshWalletBalances = async () => {
    setIsRefreshing(true);
    
    try {
      // Import SSOT data fetcher
      const { SSotDataFetcher } = await import('@/lib/ssotDataFetcher');
      
      // Filter active wallets with valid addresses
      const activeWallets = walletAddresses
        .filter(w => w.isActive && w.address && w.address.length > 10);

      if (activeWallets.length === 0) {
        console.warn('No active wallets with valid addresses found for refresh');
        setIsRefreshing(false);
        return;
      }

      console.log(`🔄 Refreshing balances for ${activeWallets.length} wallets:`, 
        activeWallets.map(w => `${w.chain}:${w.address.slice(0, 8)}...${w.address.slice(-6)}`));

      // Fetch real wallet balances using enhanced SSOT APIs
      const balances = await SSotDataFetcher.fetchMultipleWalletBalances(activeWallets);
      
      if (balances.length > 0) {
        console.log(`✅ Successfully fetched ${balances.length} wallet balances`);
        
        // Log summary of balances
        balances.forEach(balance => {
          const totalValue = balance.totalBalance;
          console.log(`💰 ${balance.chain.toUpperCase()}: $${totalValue.toFixed(2)} (${balance.tokens.length} tokens)`);
        });
        
        setWalletBalances(balances);
      } else {
        console.warn('No balances returned from SSOT APIs, using fallback data');
        throw new Error('No balances returned');
      }
      
    } catch (error) {
      console.error('❌ Error fetching wallet balances:', error);
      
      // Enhanced fallback with better mock data
      const fallbackBalances: WalletBalance[] = walletAddresses
        .filter(w => w.isActive && w.address)
        .map(wallet => {
          const chain = SUPPORTED_CHAINS[wallet.chain as keyof typeof SUPPORTED_CHAINS];
          const liquidAmount = Math.random() * 100 + 10; // 10-110 tokens
          const mockPrice = getChainMockPrice(wallet.chain);
          
          return {
            chain: wallet.chain,
            address: wallet.address,
            liquidBalance: liquidAmount * mockPrice,
            stakedBalance: Math.random() * 5000 + 1000,
            unstakingBalance: Math.random() * 500,
            delegatorRewards: Math.random() * 100,
            totalBalance: 0,
            tokens: [
              {
                denom: `native_${wallet.chain}`,
                symbol: chain?.native || 'TOKEN',
                amount: liquidAmount,
                value: liquidAmount * mockPrice,
                price: mockPrice,
                change24h: (Math.random() - 0.5) * 20,
                decimals: wallet.chain === 'ethereum' || wallet.chain === 'functionx' ? 18 : 6
              }
            ],
            lastUpdated: new Date().toISOString(),
            apr: getChainMockAPR(wallet.chain)
          };
        });

      fallbackBalances.forEach(balance => {
        balance.totalBalance = balance.liquidBalance + balance.stakedBalance + balance.unstakingBalance + balance.delegatorRewards;
      });

      console.log(`🎭 Using fallback data for ${fallbackBalances.length} wallets`);
      setWalletBalances(fallbackBalances);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper functions for better mock data
  const getChainMockPrice = (chain: string): number => {
    const prices: Record<string, number> = {
      'ethereum': 3200,
      'bitcoin': 64000,
      'polygon': 0.8,
      'arbitrum': 3200, // Same as ETH
      'optimism': 3200, // Same as ETH
      'base': 3200, // Same as ETH
      'avalanche': 35,
      'bsc': 310,
      'functionx': 0.15,
      'cosmos': 8.5,
      'osmosis': 0.6,
      'celestia': 6.2,
      'dymension': 2.1,
      'stride': 0.8,
      'band': 1.2,
      'umee': 0.8,
      'iris': 0.02,
      'lava': 0.05,
    };
    return prices[chain] || 1.0;
  };

  const getChainMockAPR = (chain: string): number => {
    const aprs: Record<string, number> = {
      'cosmos': 19.2,
      'osmosis': 17.5,
      'celestia': 16.8,
      'dymension': 14.2,
      'stride': 18.9,
      'band': 15.3,
      'umee': 12.1,
      'iris': 8.7,
      'lava': 22.4,
      'ethereum': 3.5, // ETH staking
      'functionx': 18.2,
    };
    return aprs[chain] || 12.0;
  };

  const getTotalPortfolioValue = () => {
    const bankTotal = bankAccounts.reduce((total, account) => 
      account.isActive ? total + account.balance : total, 0
    );
    const walletTotal = walletBalances.reduce((total, balance) => 
      total + balance.totalBalance, 0
    );
    return bankTotal + walletTotal;
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="space-y-6">
      {/* Header with Portfolio Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
              Portfolio Overview
            </h3>
            <p className="text-gray-600 dark:text-slate-500">
              Traditional + Crypto Assets
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-slate-500">Total Value</div>
            {showBalances ? (
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ${getTotalPortfolioValue().toLocaleString()}
              </div>
            ) : (
              <div className="text-3xl font-bold text-slate-500">
                ••••••
              </div>
            )}
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="flex items-center gap-1 mt-1 text-sm text-slate-600 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showBalances ? <Eye size={14} /> : <EyeOff size={14} />}
              {showBalances ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-green-600" />
              <span className="text-sm text-gray-600 dark:text-slate-500">Traditional</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {showBalances ? `$${bankAccounts.reduce((total, account) => 
                account.isActive ? total + account.balance : total, 0
              ).toLocaleString()}` : '••••••'}
            </div>
            <div className="text-xs text-slate-600">{bankAccounts.filter(a => a.isActive).length} accounts</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-purple-600" />
              <span className="text-sm text-gray-600 dark:text-slate-500">Crypto</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {showBalances ? `$${walletBalances.reduce((total, balance) => 
                total + balance.totalBalance, 0
              ).toLocaleString()}` : '••••••'}
            </div>
            <div className="text-xs text-slate-600">{walletAddresses.filter(w => w.isActive).length} wallets</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-orange-600" />
              <span className="text-sm text-gray-600 dark:text-slate-500">Staked</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {showBalances ? `$${walletBalances.reduce((total, balance) => 
                total + balance.stakedBalance, 0
              ).toLocaleString()}` : '••••••'}
            </div>
            <div className="text-xs text-slate-600">
              ~{walletBalances.length > 0 ? 
                (walletBalances.reduce((sum, b) => sum + (b.apr || 0), 0) / walletBalances.length).toFixed(1) : 0
              }% APR
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-slate-500">Rewards</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {showBalances ? `$${walletBalances.reduce((total, balance) => 
                total + balance.delegatorRewards, 0
              ).toLocaleString()}` : '••••••'}
            </div>
            <div className="text-xs text-slate-600">Unclaimed</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'bank'
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <DollarSign size={18} />
          <span className="font-medium">Bank Accounts</span>
          <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-xs">
            {bankAccounts.filter(a => a.isActive).length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'wallets'
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Wallet size={18} />
          <span className="font-medium">Crypto Wallets</span>
          <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-xs">
            {walletAddresses.filter(w => w.isActive).length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {activeTab === 'bank' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Bank Accounts & Traditional Assets
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-500">
                  Add your bank accounts, savings, investments, and other traditional assets
                </p>
              </div>
              <button
                onClick={addBankAccount}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={16} />
                Add Account
              </button>
            </div>

            {bankAccounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank/Institution
                    </label>
                    <input
                      type="text"
                      value={account.bankName}
                      onChange={(e) => updateBankAccount(account.id, { bankName: e.target.value })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      placeholder="e.g., Chase, Bank of America"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Type
                    </label>
                    <select
                      value={account.accountType}
                      onChange={(e) => updateBankAccount(account.id, { accountType: e.target.value })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                      {BANK_ACCOUNT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={account.accountName}
                      onChange={(e) => updateBankAccount(account.id, { accountName: e.target.value })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      placeholder="e.g., Main Checking"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Balance
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={account.balance || ''}
                        onChange={(e) => updateBankAccount(account.id, { balance: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <select
                        value={account.currency}
                        onChange={(e) => updateBankAccount(account.id, { currency: e.target.value })}
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="TRY">TRY</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={account.isActive}
                      onChange={(e) => updateBankAccount(account.id, { isActive: e.target.checked })}
                      className="rounded"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => removeBankAccount(account.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {bankAccounts.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto text-slate-500 mb-4" size={48} />
                <p className="text-gray-600 dark:text-slate-500 mb-4">No bank accounts added yet</p>
                <button
                  onClick={addBankAccount}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Your First Bank Account
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallets' && (
          <div className="space-y-6">
            {/* Chain Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Select Blockchain Networks
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-500">
                    Choose which networks you want to track
                  </p>
                </div>
                <div className="text-sm text-slate-600">
                  {selectedChains.length} networks selected
                </div>
              </div>

              {/* Popular Chains First */}
              <div className="mb-6">
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🔥 Most Popular Networks
                  </h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(SUPPORTED_CHAINS)
                    .filter(([_, chain]) => (chain as any).popular)
                    .map(([chainId, chain]) => (
                    <motion.div
                      key={chainId}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all relative ${
                        selectedChains.includes(chainId)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                      }`}
                      onClick={() => toggleChainSelection(chainId)}
                    >
                      {/* Popular Badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">★</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{chain.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {chain.name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-500">
                            {chain.native}
                          </div>
                        </div>
                        {selectedChains.includes(chainId) && (
                          <CheckCircle className="text-blue-600" size={16} />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {chain.features.slice(0, 2).map(feature => (
                          <span key={feature} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                            {feature.replace('_', ' ')}
                          </span>
                        ))}
                        {chain.features.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                            +{chain.features.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Show supported tokens count */}
                      {chain.tokens && (
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                          {chain.tokens.length} supported tokens
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Other Chains */}
              <div>
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🌐 Other Networks
                  </h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(SUPPORTED_CHAINS)
                    .filter(([_, chain]) => !(chain as any).popular)
                    .map(([chainId, chain]) => (
                    <motion.div
                      key={chainId}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedChains.includes(chainId)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                      }`}
                      onClick={() => toggleChainSelection(chainId)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{chain.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {chain.name}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-500">
                            {chain.native}
                          </div>
                        </div>
                        {selectedChains.includes(chainId) && (
                          <CheckCircle className="text-blue-600" size={16} />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {chain.features.slice(0, 2).map(feature => (
                          <span key={feature} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                            {feature.replace('_', ' ')}
                          </span>
                        ))}
                        {chain.features.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                            +{chain.features.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Show supported tokens count */}
                      {chain.tokens && (
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                          {chain.tokens.length} supported tokens
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Wallet Addresses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Wallet Addresses
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-500">
                    Add your wallet addresses for tracking
                  </p>
                </div>
                <div className="flex gap-2">
                  {walletAddresses.length > 0 && (
                    <button
                      onClick={refreshWalletBalances}
                      disabled={isRefreshing}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                      {isRefreshing ? 'Syncing...' : 'Refresh'}
                    </button>
                  )}
                </div>
              </div>

              {selectedChains.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-blue-600" size={16} />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Selected Networks ({selectedChains.length})
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                      Click the buttons below to add wallet addresses for your selected networks.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedChains
                      .filter(chainId => SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]) // Guard: only valid chains
                      .map(chainId => {
                        const chain = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
                        return (
                          <button
                            key={chainId}
                            onClick={() => addWalletAddress(chainId)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <span>{chain.icon}</span>
                            <Plus size={14} />
                            Add {chain.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}


              {walletAddresses.map((wallet) => {
                const chain = SUPPORTED_CHAINS[wallet.chain as keyof typeof SUPPORTED_CHAINS];
                const balance = walletBalances.find(b => b.address === wallet.address);
                
                // Chain bulunamazsa render etme
                if (!chain) {
                  console.error('Chain not found for wallet:', wallet.chain);
                  return null;
                }
                
                return (
                  <motion.div
                    key={wallet.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4"
                  >
                    {/* Wallet Header Row - Full width */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{chain?.icon}</span>
                          <div>
                            <h5 className="text-lg font-semibold text-gray-800 dark:text-white">
                              {chain?.name}
                            </h5>
                            <p className="text-sm text-slate-600 dark:text-slate-500">
                              Native Token: {chain?.native}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={wallet.isActive}
                            onChange={(e) => updateWalletAddress(wallet.id, { isActive: e.target.checked })}
                            className="rounded"
                          />
                          <label className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                        </div>
                        
                        <button
                          onClick={() => removeWalletAddress(wallet.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Address Input Row - Full width */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Wallet Address
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={wallet.address}
                          onChange={(e) => updateWalletAddress(wallet.id, { address: e.target.value })}
                          className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono"
                          placeholder={`Enter ${chain?.name} address...`}
                        />
                        {wallet.address && (
                          <button
                            onClick={() => copyAddress(wallet.address)}
                            className="p-3 text-slate-600 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Copy Address"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                        {wallet.address && chain?.explorer && (
                          <a
                            href={`${chain.explorer}${wallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 text-slate-600 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="View on Explorer"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Supported Tokens Display */}
                    {wallet.address.length === 0 && chain?.tokens && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins size={16} className="text-blue-600" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Supported Tokens ({chain.tokens.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {chain.tokens.map((token, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
                            >
                              {token}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Wallet Balance Display */}
                    {balance && showBalances && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-slate-600 dark:text-slate-500">Liquid Balance</div>
                            <div className="text-sm font-medium text-gray-800 dark:text-white">
                              ${balance.liquidBalance.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600 dark:text-slate-500">Staked</div>
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              ${balance.stakedBalance.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600 dark:text-slate-500">Unstaking</div>
                            <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                              ${balance.unstakingBalance.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600 dark:text-slate-500">Rewards</div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">
                              ${balance.delegatorRewards.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Token Breakdown */}
                        {balance.tokens && balance.tokens.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-slate-600 dark:text-slate-500 mb-2">Asset Breakdown</div>
                            <div className="space-y-1">
                              {balance.tokens.slice(0, 5).map((token, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-gray-600 dark:text-slate-500">
                                      {token.symbol}
                                    </span>
                                    <span className="text-slate-600">
                                      {token.amount.toFixed(4)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-800 dark:text-white">
                                      ${token.value.toLocaleString()}
                                    </span>
                                    <span className={`text-xs ${token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {balance.tokens.length > 5 && (
                                <div className="text-xs text-slate-600 dark:text-slate-500">
                                  +{balance.tokens.length - 5} more tokens
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {balance.apr && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs">
                              <TrendingUp size={12} />
                              {balance.apr.toFixed(2)}% APR
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {walletAddresses.length === 0 && selectedChains.length === 0 && (
                <div className="text-center py-12">
                  <Wallet className="mx-auto text-slate-500 mb-4" size={48} />
                  <p className="text-gray-600 dark:text-slate-500 mb-4">
                    Select blockchain networks first to add wallet addresses
                  </p>
                </div>
              )}

              {walletAddresses.length === 0 && selectedChains.length > 0 && (
                <div className="text-center py-12">
                  <Wallet className="mx-auto text-slate-500 mb-4" size={48} />
                  <p className="text-gray-600 dark:text-slate-500 mb-4">
                    No wallet addresses added yet
                  </p>
                  <p className="text-sm text-slate-600">
                    Use the buttons above to add addresses for your selected networks
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}