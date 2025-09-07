"use client"

import { useEffect, useState } from "react"
import { Wallet, RefreshCcw } from "lucide-react"

type Summary = {
  address: string
  liquidATOM: number
  stakedATOM: number
  unbondingATOM: number
  rewardsATOM: number
  source?: string
}

export function CosmosWalletPanel({ address }: { address: string }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cosmos/summary?address=${encodeURIComponent(address)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setData(json)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  return (
    <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Wallet className="text-purple-600" size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Cosmos Wallet</div>
            <div className="text-xs text-slate-600 dark:text-slate-500">{address}</div>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Liquid" value={data?.liquidATOM} />
        <Stat label="Staked" value={data?.stakedATOM} />
        <Stat label="Unbonding" value={data?.unbondingATOM} />
        <Stat label="Rewards" value={data?.rewardsATOM} />
      </div>

      <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-600">
        Data source: {data?.source || 'LCD'}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string, value?: number }) {
  const display = value === undefined || value === null ? '—' : (Math.round(value * 1000) / 1000).toLocaleString()
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
      <div className="text-xs text-slate-600 dark:text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{display} ATOM</div>
    </div>
  )
}

