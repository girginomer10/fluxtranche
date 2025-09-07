"use client"

import { useEffect, useMemo, useState } from 'react'
import { CHAIN_OPTIONS, COIN_OPTIONS, COIN_TO_CHAINS } from '@/lib/ssotRegistry'


type Props = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function AddTrackedWalletModal({ open, onClose, onSaved }: Props) {
  const defaultCoin = useMemo(() => (COIN_OPTIONS.find(c => c.value === 'ETH')?.value) || COIN_OPTIONS[0]?.value || '' , [])
  const [coin, setCoin] = useState<string>(defaultCoin)
  const defaultChain = useMemo(() => {
    const chains = COIN_TO_CHAINS[defaultCoin] || []
    return chains[0]?.value || (CHAIN_OPTIONS.find(c => c.value === 'ethereum')?.value) || CHAIN_OPTIONS[0]?.value || ''
  }, [defaultCoin])
  const [chain, setChain] = useState(defaultChain)
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // When coin changes, reset chain to first available for that coin
  useEffect(() => {
    const chains = COIN_TO_CHAINS[coin] || []
    if (!chains.find((c) => c.value === chain)) {
      setChain(chains[0]?.value || '')
    }
  }, [coin])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!chain || !address || !coin) {
      setError('Please fill required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, coin, address, name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save wallet')
      onSaved?.()
      onClose()
      setChain(defaultChain); setCoin(''); setAddress(''); setName('')
    } catch (e: any) {
      setError(e?.message || 'Failed to save wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Wallet to Portfolio</h3>
            <p className="text-sm text-gray-600 dark:text-slate-500 mt-1">
              Track balances, staking rewards, and transactions
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-gray-700 text-xl p-1">✕</button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coin/Token</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={coin}
                onChange={(e) => setCoin(e.target.value)}
              >
                {COIN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Network</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
              >
                {(COIN_TO_CHAINS[coin] || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wallet Address</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste your wallet address here..."
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              required
            />
            <div className="text-xs text-slate-600 dark:text-slate-500 mt-1">
              Your address is never stored insecurely and is only used for balance tracking
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wallet Name (optional)</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Main Wallet, DeFi Portfolio, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 text-sm">ℹ️</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <div className="font-medium mb-1">What happens next:</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Balance data will be fetched automatically</li>
                  <li>Staking rewards and delegation info will be tracked</li>
                  <li>Portfolio overview will be updated</li>
                  <li>You can view detailed analytics in Advanced Setup</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !address || !chain} 
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding Wallet...
                </>
              ) : (
                'Add Wallet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
