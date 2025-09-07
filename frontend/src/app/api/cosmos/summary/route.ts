import { NextRequest, NextResponse } from "next/server"

// Simple server-side proxy to aggregate Cosmos Hub (ATOM) balances
// Uses LCD REST endpoints to avoid browser CORS issues

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get("address")
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 })
    }

    const LCD = process.env.NEXT_PUBLIC_COSMOS_LCD || process.env.COSMOS_LCD || "https://rest.cosmos.directory/cosmoshub"

    const headers: Record<string, string> = {
      "Accept": "application/json",
    }

    const [balancesRes, delegationsRes, unbondingRes, rewardsRes] = await Promise.all([
      fetch(`${LCD}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=2000`, { headers }),
      fetch(`${LCD}/cosmos/staking/v1beta1/delegations/${address}`, { headers }),
      fetch(`${LCD}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`, { headers }),
      fetch(`${LCD}/cosmos/distribution/v1beta1/delegators/${address}/rewards`, { headers }),
    ])

    const [balances, delegations, unbondings, rewards] = await Promise.all([
      balancesRes.ok ? balancesRes.json() : { balances: [] },
      delegationsRes.ok ? delegationsRes.json() : { delegation_responses: [] },
      unbondingRes.ok ? unbondingRes.json() : { unbonding_responses: [] },
      rewardsRes.ok ? rewardsRes.json() : { total: [], rewards: [] },
    ])

    // Helpers
    const toAtom = (u: string | number) => {
      const n = typeof u === 'string' ? Number(u) : u
      if (!isFinite(n)) return 0
      return n / 1e6
    }

    // Liquid uatom
    const liquidUatom = (() => {
      if (!balances?.balances) return 0
      const coin = balances.balances.find((c: any) => c.denom === 'uatom')
      return coin ? Number(coin.amount || 0) : 0
    })()

    // Staked uatom (delegations)
    const stakedUatom = (() => {
      const arr = delegations?.delegation_responses || []
      return arr.reduce((sum: number, d: any) => sum + Number(d?.balance?.amount || 0), 0)
    })()

    // Unbonding uatom
    const unbondingUatom = (() => {
      const arr = unbondings?.unbonding_responses || []
      return arr.reduce((sum: number, u: any) => {
        const entries = u?.entries || []
        const s = entries.reduce((s2: number, e: any) => s2 + Number(e?.balance || 0), 0)
        return sum + s
      }, 0)
    })()

    // Rewards (distribution) are decimal strings in uatom
    const rewardsUatom = (() => {
      const total = rewards?.total || []
      const coin = total.find((c: any) => (c?.denom || '').includes('uatom'))
      // amount can be decimal (e.g., "123.456789") in micro units
      const amt = coin?.amount ? Number(coin.amount) : 0
      return isFinite(amt) ? amt : 0
    })()

    return NextResponse.json({
      address,
      liquidATOM: toAtom(liquidUatom),
      stakedATOM: toAtom(stakedUatom),
      unbondingATOM: toAtom(unbondingUatom),
      rewardsATOM: toAtom(rewardsUatom),
      source: LCD,
    })
  } catch (e: any) {
    console.error('Cosmos summary error:', e)
    return NextResponse.json({ error: 'Failed to fetch Cosmos data' }, { status: 500 })
  }
}

