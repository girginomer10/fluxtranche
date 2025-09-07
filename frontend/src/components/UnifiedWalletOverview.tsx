'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Coins,
  PieChart,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { SUPPORTED_COINS, NETWORK_CONFIG, getCoinNetworkConfig } from '@/lib/coinNetworkConfig';
import { COIN_OPTIONS, COIN_TO_CHAINS, CHAIN_OPTIONS } from '@/lib/ssotRegistry';
import { CoinBasedWalletManager } from './CoinBasedWalletManager';

// Simple Add Wallet Form Component
function SimpleAddWalletForm({ onUpdate, onClose }: { onUpdate: (wallets: any[]) => void, onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedCoin, setSelectedCoin] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Use all available coins from SSOT registry
  const popularCoins = COIN_OPTIONS.map(coin => coin.value);
  
  const getAvailableNetworks = (coinSymbol: string) => {
    // First try SSOT system
    const ssotChains = COIN_TO_CHAINS[coinSymbol];
    if (ssotChains && ssotChains.length > 0) {
      return ssotChains.map(chain => chain.value);
    }
    
    // Fallback to legacy SUPPORTED_COINS
    const coin = SUPPORTED_COINS[coinSymbol as keyof typeof SUPPORTED_COINS];
    return coin ? coin.networks : [];
  };

  const handleAddWallet = async () => {
    if (!selectedCoin || !selectedNetwork || !address.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: selectedNetwork,
          address: address.trim(),
          name: name.trim() || `${selectedCoin} Wallet`,
          coin: selectedCoin,
        }),
      });

      if (response.ok) {
        onUpdate([]);
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to add wallet:', response.status, errorData);
        alert(`Failed to add wallet: ${errorData.details || errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding wallet:', error);
      alert('Error adding wallet: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Add New Wallet</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Step {step} of 3: {step === 1 ? 'Select Coin' : step === 2 ? 'Select Network' : 'Enter Address'}
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Select Coin</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
            {popularCoins.map(coin => {
              // Try legacy SUPPORTED_COINS first for icon/name
              const coinData = SUPPORTED_COINS[coin as keyof typeof SUPPORTED_COINS];
              
              // Default icons for major coins from SSOT
              const getDefaultIcon = (symbol: string) => {
                const iconMap: Record<string, string> = {
                  'BTC': '₿', 'ETH': '🔷', 'ATOM': '⚛️', 'OSMO': '🧪', 'TIA': '🔮', 'DYM': '💎',
                  'USDC': '💵', 'USDT': '💵', 'DAI': '💰', 'BNB': '🟨', 'MATIC': '🟣',
                  'AAVE': '👻', 'UNI': '🦄', 'LINK': '🔗', 'AVAX': '❄️', 'STRD': '🏃‍♂️',
                  'INJ': '💉', 'SEI': '🌊', 'MINA': '🧬', 'NEAR': '🔺', 'FTM': '👻'
                };
                return iconMap[symbol] || '🪙';
              };
              
              return (
                <button
                  key={coin}
                  onClick={() => {
                    setSelectedCoin(coin);
                    setStep(2);
                  }}
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
                >
                  <div className="text-xl mb-1">{coinData?.icon || getDefaultIcon(coin)}</div>
                  <div className="text-sm font-medium">{coin}</div>
                  <div className="text-xs text-slate-600 truncate">{coinData?.name || coin}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setStep(1)}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              ← Back
            </button>
            <h4 className="text-lg font-semibold">Select Network for {selectedCoin}</h4>
          </div>
          <div className="space-y-2">
            {getAvailableNetworks(selectedCoin).map(networkId => {
              // First try SSOT chain labels
              const ssotChain = CHAIN_OPTIONS.find(chain => chain.value === networkId);
              // Fallback to legacy NETWORK_CONFIG
              const network = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG];
              
              const displayName = ssotChain?.label || network?.name || networkId.charAt(0).toUpperCase() + networkId.slice(1);
              
              return (
                <button
                  key={networkId}
                  onClick={() => {
                    setSelectedNetwork(networkId);
                    setStep(3);
                  }}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="font-medium">{displayName}</div>
                  <div className="text-xs text-slate-600">{networkId}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setStep(2)}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              ← Back
            </button>
            <h4 className="text-lg font-semibold">Add {selectedCoin} Address</h4>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${selectedCoin} Wallet`}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter wallet address..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWallet}
                disabled={!address.trim() || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding...' : 'Add Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WalletBalance {
  id: string;
  chain: string;
  address: string;
  name?: string;
  liquidBalance?: number;
  stakedBalance?: number;
  unstakingBalance?: number;
  delegatorRewards?: number;
  totalBalance?: number;
  // USD values using VWAP
  liquidBalanceUSD?: number;
  stakedBalanceUSD?: number;
  unstakingBalanceUSD?: number;
  delegatorRewardsUSD?: number;
  totalBalanceUSD?: number;
  lastBalanceUpdate?: string;
  symbol?: string;
  // VWAP data
  vwapData?: {
    vwap: number;
    display: string;
    tooltip: string;
    totalVolume: number;
    exchangeCount: number;
    confidence: number;
    calculation: {
      numerator: number;
      denominator: number;
      formula: string;
    };
  };
  // Enhanced market data
  marketData?: {
    price: number;
    volume24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    high24h: number;
    low24h: number;
    spread: number;
    spreadPercent: number;
    exchange: string;
    liquidity?: any;
  };
  tokens?: Array<{
    symbol: string;
    amount: number;
    value: number;
    price: number;
    change24h: number;
  }>;
  stakingInfo?: Array<{
    validatorAddress?: string;
    validatorName?: string;
    apr: number;
    commission: number;
  }>;
  apr?: number;
}

interface UnifiedWalletOverviewProps {
  refreshKey?: number;
}

export function UnifiedWalletOverview({ refreshKey = 0 }: UnifiedWalletOverviewProps) {
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddWallet, setShowAddWallet] = useState(false);

  const loadWallets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 UnifiedWalletOverview: Loading all wallets...');
      const res = await fetch('/api/wallets');
      const json = await res.json();
      
      if (!res.ok) throw new Error(json?.error || 'Failed to load wallets');
      
      console.log('📥 UnifiedWalletOverview: Loaded wallets:', json);
      setWallets(Array.isArray(json) ? json : json.wallets || []);
      
    } catch (e: any) {
      console.error('❌ UnifiedWalletOverview: Error loading wallets:', e);
      setError(e?.message || 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalances = async () => {
    if (wallets.length === 0) {
      await loadWallets();
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 UnifiedWalletOverview: Refreshing balances for', wallets.length, 'wallets');
      
      // Refresh each wallet by re-saving (triggers balance fetch in API)
      const refreshPromises = wallets.map(async (wallet) => {
        try {
          const res = await fetch('/api/wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chain: wallet.chain,
              address: wallet.address,
              name: wallet.name || `${wallet.chain} Wallet`,
            }),
          });
          
          if (res.ok) {
            console.log('✅ UnifiedWalletOverview: Refreshed balance for', wallet.address.slice(0, 10) + '...');
          }
        } catch (error) {
          console.error('❌ UnifiedWalletOverview: Error refreshing wallet balance:', error);
        }
      });
      
      await Promise.all(refreshPromises);
      
      // Reload wallets to get updated balance data
      await loadWallets();
      
    } catch (error) {
      console.error('❌ UnifiedWalletOverview: Error during balance refresh:', error);
      setError('Failed to refresh balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [refreshKey]);

  const getTotalPortfolioValue = () => {
    return wallets.reduce((total, wallet) => total + (wallet.totalBalanceUSD || 0), 0);
  };

  const getTotalsByType = () => {
    const totals = wallets.reduce(
      (acc, wallet) => {
        acc.liquid += wallet.liquidBalanceUSD || 0;
        acc.staked += wallet.stakedBalanceUSD || 0;
        acc.unstaking += wallet.unstakingBalanceUSD || 0;
        acc.rewards += wallet.delegatorRewardsUSD || 0;
        return acc;
      },
      { liquid: 0, staked: 0, unstaking: 0, rewards: 0 }
    );
    return totals;
  };

  const getCoinFromChain = (chain: string, userSelectedCoin?: string) => {
    // First priority: User selected coin
    if (userSelectedCoin) {
      return userSelectedCoin;
    }
    
    // Map chain to coin symbol using our config
    const chainToCoin: Record<string, string> = {
      'cosmoshub': 'ATOM',
      'cosmos': 'ATOM', 
      'osmosis': 'OSMO',
      'celestia': 'TIA',
      'dymension': 'DYM',
      'stride': 'STRD',
      'lavanet': 'LAVA',
      'band': 'BAND',
      'umee': 'UMEE',
      'irisnet': 'IRIS',
      'ethereum': 'ETH',
      'bsc': 'BNB',
      'polygon': 'MATIC',
      'arbitrum': 'ETH',
      'optimism': 'ETH',
      'base': 'ETH',
      'functionx': 'FX',
      'avalanche': 'AVAX',
      'desmos': 'DSM',
      'saga': 'SAGA',
      'avail': 'AVAIL',
      'mina': 'MINA',
      'sui': 'SUI',
      'polkadot': 'DOT',
      'kusama': 'KSM'
    };
    return chainToCoin[chain] || 'ETH';
  };

  const getChainInfo = (wallet: any) => {
    const network = NETWORK_CONFIG[wallet.chain as keyof typeof NETWORK_CONFIG];
    // Use the wallet's coin field if available, otherwise fallback to chain default
    const coinSymbol = wallet.coin || getCoinFromChain(wallet.chain);
    const coin = SUPPORTED_COINS[coinSymbol as keyof typeof SUPPORTED_COINS];
    
    return {
      name: network?.name || wallet.chain.toUpperCase(),
      icon: coin?.icon || '🔗',
      explorer: network?.explorer,
      coinSymbol
    };
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const mask = (addr: string) => 
    addr?.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const handleWalletUpdate = (newWallets: any[]) => {
    console.log('📊 UnifiedWalletOverview: New wallets added:', newWallets);
    // Reload all wallets to get the updated list with balances
    loadWallets();
    setShowAddWallet(false);
  };

  const deleteWallet = async (walletId: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/wallets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: walletId }),
      });

      if (response.ok) {
        console.log('✅ Wallet deleted successfully');
        // Reload wallets to update the list
        await loadWallets();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to delete wallet:', response.status, errorData);
        setError(`Failed to delete wallet: ${errorData.details || errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting wallet:', error);
      setError('Error deleting wallet');
    } finally {
      setLoading(false);
    }
  };

  const totals = getTotalsByType();
  const totalValue = getTotalPortfolioValue();

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <PieChart className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Portfolio Overview
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {wallets.length} wallets • Coin-based tracking
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddWallet(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Wallet
            </button>
            
            <button
              onClick={refreshBalances}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-white/90 dark:hover:bg-gray-800/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh All'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-green-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Value</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ${totalValue.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={16} className="text-blue-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Liquid</span>
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              ${totals.liquid.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Staked</span>
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              ${totals.staked.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-orange-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Rewards</span>
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              ${totals.rewards.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <Wallet className="mx-auto mb-4 text-slate-500" size={48} />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            No Wallets Found
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-500">
            Add wallets in Advanced Setup to start tracking your portfolio
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {wallets.map((wallet) => {
            const chainInfo = getChainInfo(wallet);
            // Consider 0 as a valid loaded state; only undefined means loading
            const hasBalance = wallet.totalBalance !== undefined;
            
            return (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                {/* Coin Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{chainInfo.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {chainInfo.coinSymbol}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-500">
                        on {chainInfo.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyAddress(wallet.address)}
                      className="p-2 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      <Copy size={14} />
                    </button>
                    {chainInfo.explorer && (
                      <a
                        href={`${chainInfo.explorer}${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => deleteWallet(wallet.id)}
                      className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete wallet"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Address */}
                <div className="mb-4">
                  <div className="text-xs text-slate-600 dark:text-slate-500 mb-1">
                    {wallet.name || 'Wallet Address'}
                  </div>
                  <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                    {mask(wallet.address)}
                  </code>
                </div>

                {/* Balance Information */}
                {hasBalance ? (
                  <div className="space-y-4">
                    {/* Total Balance Header */}
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          💎 Total Portfolio Value
                        </span>
                        <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                          ${(wallet.totalBalanceUSD || 0).toLocaleString()}
                        </span>
                      </div>
                      {wallet.vwapData && (
                        <div className="text-xs text-blue-600 dark:text-blue-300" title={wallet.vwapData.tooltip}>
                          {wallet.vwapData.display} • {wallet.symbol}: {(wallet.totalBalance || 0).toLocaleString()} tokens
                        </div>
                      )}
                    </div>
                    
                    {/* Detailed Balance Breakdown */}
                    <div className="space-y-3">
                      {/* Liquid & Staked - Always show */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Coins size={14} className="text-blue-500" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Available</span>
                          </div>
                          <div className="text-sm font-bold text-gray-800 dark:text-white">
                            ${(wallet.liquidBalanceUSD || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {(wallet.liquidBalance || 0).toLocaleString()} {wallet.symbol}
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={14} className="text-purple-500" />
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-300">Staked</span>
                          </div>
                          <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            ${(wallet.stakedBalanceUSD || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                            {(wallet.stakedBalance || 0).toLocaleString()} {wallet.symbol}
                          </div>
                        </div>
                      </div>

                      {/* Unstaking & Rewards - Show if values exist */}
                      {((wallet.unstakingBalance || 0) > 0 || (wallet.delegatorRewards || 0) > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingDown size={14} className="text-orange-500" />
                              <span className="text-xs font-medium text-orange-600 dark:text-orange-300">Unstaking</span>
                            </div>
                            <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                              ${(wallet.unstakingBalanceUSD || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                              {(wallet.unstakingBalance || 0).toLocaleString()} {wallet.symbol}
                            </div>
                          </div>
                          
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign size={14} className="text-green-500" />
                              <span className="text-xs font-medium text-green-600 dark:text-green-300">Rewards</span>
                            </div>
                            <div className="text-sm font-bold text-green-700 dark:text-green-300">
                              ${(wallet.delegatorRewardsUSD || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-green-500 dark:text-green-400 mt-1">
                              {(wallet.delegatorRewards || 0).toLocaleString()} {wallet.symbol}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* APR Information */}
                    {wallet.apr && wallet.apr > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">Staking APR</span>
                          </div>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {wallet.apr.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Annual percentage rate for staked tokens
                        </div>
                      </div>
                    )}

                    {/* Update Time */}
                    {wallet.lastBalanceUpdate && (
                      <div className="text-xs text-slate-500 text-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        🕐 Last updated: {new Date(wallet.lastBalanceUpdate).toLocaleDateString()} at {new Date(wallet.lastBalanceUpdate).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <div className="text-sm text-slate-600 dark:text-slate-500 mb-2">
                      🔄 Loading balance...
                    </div>
                    <div className="text-xs text-slate-500">
                      Click refresh to update balances
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Add Wallet Modal */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Add New Wallet
              </h2>
              <button
                onClick={() => setShowAddWallet(false)}
                className="p-2 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Simple Add Wallet Form */}
              <SimpleAddWalletForm onUpdate={handleWalletUpdate} onClose={() => setShowAddWallet(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
