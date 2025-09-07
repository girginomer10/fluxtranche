'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  Filter,
  TrendingUp
} from 'lucide-react';

import { 
  SUPPORTED_COINS, 
  NETWORK_CONFIG, 
  getCoinNetworkConfig,
  getAvailableNetworks,
  getPopularCoins,
  getCoinsByCategory 
} from '@/lib/coinNetworkConfig';

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CHAIN_CONFIG } from "@/config/networks";

// Types
interface WalletEntry {
  id: string;
  coinSymbol: string;
  networkId: string;
  address: string;
  name?: string;
  isActive: boolean;
  balance?: {
    amount: number;
    value: number;
    lastUpdated: string;
  };
}

// Prepare coins for the dropdown
const supportedCoins = Object.entries(CHAIN_CONFIG).map(([id, config]) => ({
  value: id,
  label: `${config.name} (${config.coin})`,
  coin: config.coin,
})).filter((v, i, a) => a.findIndex(t => (t.label === v.label)) === i); // Unique labels


interface CoinBasedWalletManagerProps {
  onUpdate?: (wallets: WalletEntry[]) => void;
}

export function CoinBasedWalletManager({ onUpdate }: CoinBasedWalletManagerProps) {
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newWalletAddress, setNewWalletAddress] = useState('')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load wallets from database on mount
  useEffect(() => {
    loadWallets();
  }, []);

  // Notify parent when wallets change
  useEffect(() => {
    onUpdate?.(wallets);
  }, [wallets, onUpdate]);

  const loadWallets = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        if (data.wallets && data.wallets.length > 0) {
          const coinBasedWallets: WalletEntry[] = data.wallets.map((w: any) => ({
            id: w.id,
            coinSymbol: mapChainToCoinSymbol(w.chain),
            networkId: w.chain,
            address: w.address,
            name: w.name,
            isActive: w.isActive ?? true,
            balance: w.totalBalance ? {
              amount: w.totalBalance,
              value: w.totalBalance,
              lastUpdated: w.lastBalanceUpdate || new Date().toISOString()
            } : undefined
          }));
          setWallets(coinBasedWallets);
        }
      }
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  // Map legacy chain names to coin symbols
  const mapChainToCoinSymbol = (chain: string): string => {
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
      'avalanche': 'AVAX'
    };
    return chainToCoin[chain] || 'ETH';
  };

  const addWallet = async (coinSymbol: string, networkId: string, address: string) => {
    if (!coinSymbol || !networkId || !address) {
      setError('Coin, network, and address are required.')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: networkId,
          address: address,
          name: `${coinSymbol} Wallet`,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to add wallet')
      }

      const newWallet = await res.json()
      setWallets((prev) => [...prev, newWallet.wallet])
      if (onUpdate) {
        onUpdate([...wallets, newWallet.wallet])
      }

      setNewWalletAddress('')
      setSelectedCoin('')
      setIsPopoverOpen(false) // Close popover on success
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const removeWallet = async (id: string) => {
    const wallet = wallets.find(w => w.id === id);
    if (!wallet) return;

    // Remove from database
    try {
      const res = await fetch('/api/wallets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: wallet.networkId,
          address: wallet.address
        }),
      });

      if (res.ok) {
        console.log('✅ Wallet removed from database');
      }
    } catch (error) {
      console.error('Error removing wallet:', error);
    }

    setWallets(prev => prev.filter(w => w.id !== id));
  };

  const refreshBalances = async () => {
    setIsRefreshing(true);
    try {
      // Trigger balance refresh for active wallets
      const activeWallets = wallets.filter(w => w.isActive);
      
      for (const wallet of activeWallets) {
        try {
          const res = await fetch('/api/wallets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chain: wallet.networkId,
              address: wallet.address,
              name: wallet.name
            }),
          });
          
          if (res.ok) {
            console.log(`✅ Refreshed balance for ${wallet.coinSymbol}`);
          }
        } catch (error) {
          console.warn(`Failed to refresh balance for ${wallet.coinSymbol}:`, error);
        }
      }

      // Reload wallets to get updated balances
      await loadWallets();
      
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  // Filter coins based on search and category
  const getFilteredCoins = () => {
    if (!searchQuery) return supportedCoins
    return supportedCoins.filter((coin) =>
      coin.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const categories = ['all', 'layer 1', 'cosmos', 'stablecoin', 'layer 2', 'substrate'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
            <Wallet className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              Coin Portfolio ({wallets.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-500">
              Add coins first, then select networks
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refreshBalances}
            disabled={isRefreshing || wallets.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            Add Coin
          </button>
        </div>
      </div>

      {/* Wallet List */}
      {wallets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl"
        >
          <Wallet className="mx-auto mb-4 text-slate-500" size={48} />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            No Coins Added Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-500 mb-6">
            Start by adding your first coin to track your portfolio
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Your First Coin
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => {
            const coin = SUPPORTED_COINS[wallet.coinSymbol as keyof typeof SUPPORTED_COINS];
            const network = NETWORK_CONFIG[wallet.networkId as keyof typeof NETWORK_CONFIG];
            
            return (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                {/* Coin Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{coin?.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {wallet.coinSymbol}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-500">
                        on {network?.name}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeWallet(wallet.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Address */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <code className="text-xs font-mono text-gray-600 dark:text-gray-300 flex-1 truncate">
                      {wallet.address}
                    </code>
                    <button
                      onClick={() => copyAddress(wallet.address)}
                      className="p-1 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Copy size={12} />
                    </button>
                    {network?.explorer && (
                      <a
                        href={`${network.explorer}${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Balance */}
                {wallet.balance ? (
                  <div className="border-t border-gray-100 dark:border-gray-600 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-500">Balance</span>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          ${wallet.balance.value.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-500">
                          {wallet.balance.amount.toFixed(4)} {wallet.coinSymbol}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 dark:border-gray-600 pt-3">
                    <div className="text-center text-sm text-slate-600 dark:text-slate-500">
                      🔄 Loading balance...
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Add New Coin
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-500 mt-1">
                Select a coin first, then choose the network
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search coins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 1: Coin Selection */}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">
                  1. Select Coin
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                  {getFilteredCoins().map(coin => (
                    <button
                      key={coin.value}
                      onClick={() => {
                        setSelectedCoin(coin.value);
                        setSelectedNetwork(''); // Reset network selection
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedCoin === coin.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className="text-lg">{coin.label}</span>
                      {(coin as any).popular && (
                        <TrendingUp size={12} className="text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Network Selection */}
              {selectedCoin && (
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white mb-3">
                    2. Select Network for {supportedCoins.find(c => c.value === selectedCoin)?.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAvailableNetworks(selectedCoin as any).map(networkId => {
                      const network = CHAIN_CONFIG[networkId as keyof typeof CHAIN_CONFIG];
                      const coinNetworkConfig = getCoinNetworkConfig(supportedCoins.find(c => c.value === selectedCoin)?.coin || 'ETH', networkId);
                      
                      return (
                        <button
                          key={networkId}
                          onClick={() => setSelectedNetwork(networkId)}
                          disabled={!coinNetworkConfig}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            selectedNetwork === networkId
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          } ${!coinNetworkConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">{network?.name}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-500">
                              {network?.type.toUpperCase()} • {network?.features?.join(', ')}
                            </div>
                          </div>
                          {coinNetworkConfig?.isNative && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              Native
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Address Input */}
              {selectedCoin && selectedNetwork && (
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white mb-3">
                    3. Enter Wallet Address
                  </h4>
                  <input
                    type="text"
                    placeholder={`Enter your ${supportedCoins.find(c => c.value === selectedCoin)?.label} address on ${CHAIN_CONFIG[selectedNetwork as keyof typeof CHAIN_CONFIG]?.name}...`}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const address = (e.target as HTMLInputElement).value;
                        if (address) {
                          addWallet(supportedCoins.find(c => c.value === selectedCoin)?.coin || 'ETH', selectedNetwork, address);
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedCoin('');
                  setSelectedNetwork('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-slate-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const addressInput = document.querySelector('input[placeholder*="Enter your"]') as HTMLInputElement;
                  if (addressInput?.value && selectedCoin) {
                    addWallet(supportedCoins.find(c => c.value === selectedCoin)?.coin || 'ETH', selectedNetwork, addressInput.value);
                  }
                }}
                disabled={isAdding || !selectedCoin}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Wallet
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}