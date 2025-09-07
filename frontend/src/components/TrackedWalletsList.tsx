"use client"

import { useEffect, useState } from 'react'
import { RefreshCw, Wallet as WalletIcon, Copy, ExternalLink } from 'lucide-react'

// Import the same chain definitions from WalletPortfolioSetup
const CHAIN_DISPLAY_NAMES: { [key: string]: { name: string; icon: string; explorer?: string } } = {
  ethereum: { name: 'Ethereum', icon: '🔷', explorer: 'https://etherscan.io/address/' },
  bsc: { name: 'BNB Chain', icon: '🟨', explorer: 'https://bscscan.com/address/' },
  polygon: { name: 'Polygon', icon: '🔺', explorer: 'https://polygonscan.com/address/' },
  arbitrum: { name: 'Arbitrum', icon: '🔵', explorer: 'https://arbiscan.io/address/' },
  optimism: { name: 'Optimism', icon: '🔴', explorer: 'https://optimistic.etherscan.io/address/' },
  base: { name: 'Base', icon: '🔵', explorer: 'https://basescan.org/address/' },
  avalanche: { name: 'Avalanche', icon: '❄️', explorer: 'https://snowtrace.io/address/' },
  cosmos: { name: 'Cosmos Hub', icon: '⚛️', explorer: 'https://www.mintscan.io/cosmos/account/' },
  osmosis: { name: 'Osmosis', icon: '🧪', explorer: 'https://www.mintscan.io/osmosis/account/' },
  celestia: { name: 'Celestia', icon: '🔮', explorer: 'https://www.mintscan.io/celestia/account/' },
  injective: { name: 'Injective', icon: '🚀', explorer: 'https://explorer.injective.network/account/' },
  solana: { name: 'Solana', icon: '☀️', explorer: 'https://solscan.io/account/' },
  sui: { name: 'Sui', icon: '💧', explorer: 'https://explorer.sui.io/address/' },
  near: { name: 'NEAR', icon: '🌊', explorer: 'https://nearblocks.io/address/' },
  aptos: { name: 'Aptos', icon: '🍎', explorer: 'https://explorer.aptoslabs.com/account/' },
  polkadot: { name: 'Polkadot', icon: '⭕', explorer: 'https://polkadot.subscan.io/account/' },
  dymension: { name: 'Dymension', icon: '💎', explorer: 'https://www.mintscan.io/dymension/account/' },
  stride: { name: 'Stride', icon: '🏃‍♂️', explorer: 'https://www.mintscan.io/stride/account/' },
};

type Wallet = {
  id: string
  chain: string
  address: string
  name?: string | null
  // Balance fields
  liquidBalance?: number
  stakedBalance?: number
  unstakingBalance?: number
  delegatorRewards?: number
  totalBalance?: number
  lastBalanceUpdate?: string
}

export function TrackedWalletsList({ refreshKey }: { refreshKey: number }) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔄 TrackedWalletsList: Loading wallets...')
      const res = await fetch('/api/wallets')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load wallets')
      console.log('📥 TrackedWalletsList: Loaded wallets:', json)
      setWallets(Array.isArray(json) ? json : json.wallets || [])
    } catch (e: any) {
      console.error('❌ TrackedWalletsList: Error loading wallets:', e)
      setError(e?.message || 'Failed to load wallets')
    } finally {
      setLoading(false)
    }
  }

  const refreshBalances = async () => {
    if (wallets.length === 0) {
      await load()
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 TrackedWalletsList: Refreshing balances for', wallets.length, 'wallets')
      
      // Update each wallet's balance by re-saving it (which triggers balance fetch)
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
          })
          
          if (res.ok) {
            console.log('✅ TrackedWalletsList: Refreshed balance for', wallet.address.slice(0, 10) + '...')
          } else {
            console.warn('⚠️ TrackedWalletsList: Failed to refresh balance for', wallet.address.slice(0, 10) + '...')
          }
        } catch (error) {
          console.error('❌ TrackedWalletsList: Error refreshing wallet balance:', error)
        }
      })
      
      await Promise.all(refreshPromises)
      
      // Reload wallets to get updated balance data
      await load()
      
    } catch (error) {
      console.error('❌ TrackedWalletsList: Error during balance refresh:', error)
      setError('Failed to refresh balances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const mask = (addr: string) => addr?.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const getChainInfo = (chainId: string) => {
    return CHAIN_DISPLAY_NAMES[chainId] || { name: chainId.toUpperCase(), icon: '🔗' }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <WalletIcon size={16} className="text-purple-600" />
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Tracked Wallets ({wallets.length})
          </div>
        </div>
        <button 
          onClick={refreshBalances} 
          disabled={loading} 
          className="flex items-center gap-1 text-xs px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          title="Refresh wallet balances"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Balances'}
        </button>
      </div>
      
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      
      {wallets.length === 0 ? (
        <div className="text-center py-6">
          <WalletIcon className="mx-auto text-slate-500 mb-2" size={24} />
          <div className="text-xs text-gray-600 dark:text-slate-500">
            No wallets tracked yet. Add wallets in Advanced Setup to see them here.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {wallets.map(w => {
            const chainInfo = getChainInfo(w.chain)
            const hasBalance = w.totalBalance !== undefined && w.totalBalance > 0
            return (
              <div key={w.id} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500">
                    <span className="text-sm">{chainInfo.icon}</span>
                    <span className="font-medium">{chainInfo.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyAddress(w.address)}
                      className="p-1 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Copy address"
                    >
                      <Copy size={12} />
                    </button>
                    {chainInfo.explorer && (
                      <a
                        href={`${chainInfo.explorer}${w.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="View on explorer"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Wallet Info */}
                <div className="mb-3">
                  <div className="text-xs text-slate-600 dark:text-slate-500 mb-1">
                    {w.name || 'Unnamed wallet'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {mask(w.address)}
                  </div>
                </div>

                {/* Balance Information */}
                {hasBalance ? (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <div className="text-xs text-slate-600 dark:text-slate-500">Total Balance</div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          ${(w.totalBalance || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600 dark:text-slate-500">Liquid</div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white">
                          ${(w.liquidBalance || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {(w.stakedBalance || 0) > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-600 dark:text-slate-500">Staked</div>
                          <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            ${(w.stakedBalance || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600 dark:text-slate-500">Rewards</div>
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${(w.delegatorRewards || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                    {w.lastBalanceUpdate && (
                      <div className="text-xs text-slate-500 mt-2">
                        Updated: {new Date(w.lastBalanceUpdate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="text-xs text-slate-600 dark:text-slate-500 text-center py-2">
                      🔄 Balance loading... Click refresh to update
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

