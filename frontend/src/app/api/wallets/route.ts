import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WalletRouter } from '@/lib/wallet-router';
import { CHAIN_CONFIG } from '@/config/networks';
import { CosmosFetcher, EVMFetcher, SubstrateFetcher, SuiFetcher, MinaFetcher, SpecialFetcher } from '@/lib/wallet-fetchers';
import { EnhancedPriceFetcher } from '@/lib/ssotDataFetcher';

export async function GET() {
  const session = await getServerSession(authOptions);

  let userId = session?.user?.id;
  
  if (!userId) {
    console.log('[WALLET API] No session, using temp user for testing');
    // Temporarily use a test user ID for development
    userId = 'temp-user-dev-123';
  }

  try {
    const wallets = await prisma.walletAddress.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
    });

    if (wallets.length === 0) {
      return NextResponse.json([]);
    }

    // Group wallets by fetcher type
    const groupedWallets: Record<string, any[]> = {};
    for (const wallet of wallets) {
        const fetcherKey = WalletRouter.getChainType(wallet.chain);
        if (fetcherKey && fetcherKey !== 'unknown') {
            if (!groupedWallets[fetcherKey]) {
                groupedWallets[fetcherKey] = [];
            }
            // Use user's selected coin, fallback to chain default
            const selectedCoin = wallet.coin || CHAIN_CONFIG[wallet.chain]?.coin;
            if (selectedCoin) {
                groupedWallets[fetcherKey].push({
                    ...wallet,
                    address: wallet.address,
                    coin: selectedCoin,
                    network: wallet.chain,
                    validator: wallet.validatorAddress
                });
            } else {
                console.warn(`No coin found for chain ${wallet.chain}`);
            }
        }
    }

    // Fetch balances in parallel
    const allResults: Record<string, any> = {};
    const promises = Object.entries(groupedWallets).map(async ([chainType, walletList]) => {
        const fetcher = WalletRouter.getFetcherForChainType(chainType);
        if (fetcher) {
            const results = await fetcher.fetchBatch(walletList);
            Object.assign(allResults, results);
        }
    });

    await Promise.all(promises);
    
    // Get unique coins for VWAP batch fetching
    const uniqueCoins = [...new Set(wallets.map(w => w.coin || CHAIN_CONFIG[w.chain]?.coin).filter(Boolean))];
    
    console.log('📊 Fetching VWAP data for coins:', uniqueCoins);
    
    // Batch fetch VWAP data for all coins
    const vwapDataPromises = uniqueCoins.map(async (coin) => {
        try {
            const vwapResult = await EnhancedPriceFetcher.getVWAPMarketData(coin);
            return { coin, vwapData: vwapResult };
        } catch (error) {
            console.warn(`⚠️ Failed to fetch VWAP for ${coin}:`, error);
            // Fallback to regular market data
            try {
                const marketData = await EnhancedPriceFetcher.getEnhancedMarketData(coin);
                return { 
                    coin, 
                    vwapData: {
                        vwap: marketData.price,
                        totalVolume: marketData.volume24h,
                        exchangeCount: 1,
                        confidence: 0.5,
                        display: `$${marketData.price.toFixed(4)} (${marketData.exchange})`,
                        tooltip: `Price from ${marketData.exchange}`,
                        calculation: {
                            numerator: marketData.price * marketData.volume24h,
                            denominator: marketData.volume24h,
                            formula: `Price: $${marketData.price}`
                        }
                    }
                };
            } catch (fallbackError) {
                console.error(`❌ All price sources failed for ${coin}:`, fallbackError);
                return { coin, vwapData: null };
            }
        }
    });
    
    const vwapResults = await Promise.allSettled(vwapDataPromises);
    const coinVwapMap: Record<string, any> = {};
    
    vwapResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.vwapData) {
            coinVwapMap[result.value.coin] = result.value.vwapData;
        }
    });

    // Combine fetched data with original wallet data and VWAP pricing
    const combinedWallets = wallets.map(w => {
        // Use user's selected coin, fallback to chain default
        const selectedCoin = w.coin || CHAIN_CONFIG[w.chain]?.coin;
        // Construct a more robust key matching, trying with and without validator
        const keyWithValidator = `${w.chain}|${w.address}|${selectedCoin}|${w.validatorAddress || ''}`;
        const keyWithoutValidator = `${w.chain}|${w.address}|${selectedCoin}|`;
        
        const result = allResults[keyWithValidator] || allResults[keyWithoutValidator] || allResults[`${w.chain}|${w.address}|${selectedCoin}|undefined`];
        const vwapData = coinVwapMap[selectedCoin];
        const vwapPrice = vwapData?.vwap || 0;

        if (result && result.wallet) {
            const liquidBalance = result.wallet.liquid || 0;
            const stakedBalance = result.wallet.staked || 0;
            const unstakingBalance = result.wallet.unstaking || 0;
            const delegatorRewards = result.wallet.rewards || 0;
            const totalBalance = liquidBalance + stakedBalance + unstakingBalance + delegatorRewards;
            
            console.log(`💰 ${selectedCoin} wallet balance: ${totalBalance.toFixed(6)} tokens × $${vwapPrice.toFixed(4)} = $${(totalBalance * vwapPrice).toFixed(2)}`);

            return {
                ...w,
                liquidBalance,
                stakedBalance,
                unstakingBalance,
                delegatorRewards,
                totalBalance,
                // USD values using VWAP
                liquidBalanceUSD: liquidBalance * vwapPrice,
                stakedBalanceUSD: stakedBalance * vwapPrice,
                unstakingBalanceUSD: unstakingBalance * vwapPrice,
                delegatorRewardsUSD: delegatorRewards * vwapPrice,
                totalBalanceUSD: totalBalance * vwapPrice,
                // VWAP data for UI
                vwapData,
                symbol: selectedCoin,
                lastBalanceUpdate: new Date().toISOString()
            };
        }
        
        // Return wallet even if balance fetch failed, but with VWAP data if available
        return {
            ...w,
            symbol: selectedCoin,
            vwapData,
            liquidBalanceUSD: 0,
            stakedBalanceUSD: 0,
            unstakingBalanceUSD: 0,
            delegatorRewardsUSD: 0,
            totalBalanceUSD: 0
        };
    });


    return NextResponse.json(combinedWallets);
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Failed to fetch wallets', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  let userId = session?.user?.id;
  if (!userId) {
    console.log('[WALLET API] No session for POST, using temp user for testing');
    userId = 'temp-user-dev-123';
  }

  try {
    const { chain, address, name, coin } = await req.json()
    
    console.log('[WALLET API] POST request:', { chain, address, name, coin, userId });
    
    // First try to find existing wallet
    const existingWallet = await prisma.walletAddress.findFirst({
      where: {
        userId: userId,
        chain,
        address,
        coin: coin || null,
      },
    });
    
    let wallet;
    if (existingWallet) {
      // Update existing wallet
      wallet = await prisma.walletAddress.update({
        where: { id: existingWallet.id },
        data: {
          name,
          isActive: true,
        },
      });
      console.log('[WALLET API] Updated existing wallet:', wallet.id);
    } else {
      // Create new wallet
      wallet = await prisma.walletAddress.create({
        data: {
          chain,
          address,
          coin: coin || null,
          name,
          userId: userId,
        },
      });
      console.log('[WALLET API] Created new wallet:', wallet.id);
    }

    // Fetch initial balance and VWAP pricing
    const fetcher = WalletRouter.getFetcherForNetwork(chain);
    let balanceResult: any = null;
    let vwapData: any = null;
    
    const selectedCoin = coin || CHAIN_CONFIG[chain]?.coin;
    
    // Fetch balance data
    if (fetcher && selectedCoin) {
        const results = await fetcher.fetchBatch([{ network: chain, address, coin: selectedCoin }]);
        const key = `${chain}|${address}|${selectedCoin}|`;
        balanceResult = results[key] || results[`${chain}|${address}|${selectedCoin}|undefined`];
    }
    
    // Fetch VWAP data
    if (selectedCoin) {
        try {
            console.log(`📊 Fetching VWAP for new wallet coin: ${selectedCoin}`);
            vwapData = await EnhancedPriceFetcher.getVWAPMarketData(selectedCoin);
        } catch (error) {
            console.warn(`⚠️ Failed to fetch VWAP for ${selectedCoin}:`, error);
            // Fallback to regular market data
            try {
                const marketData = await EnhancedPriceFetcher.getEnhancedMarketData(selectedCoin);
                vwapData = {
                    vwap: marketData.price,
                    totalVolume: marketData.volume24h,
                    exchangeCount: 1,
                    confidence: 0.5,
                    display: `$${marketData.price.toFixed(4)} (${marketData.exchange})`,
                    tooltip: `Price from ${marketData.exchange}`,
                    calculation: {
                        numerator: marketData.price * marketData.volume24h,
                        denominator: marketData.volume24h,
                        formula: `Price: $${marketData.price}`
                    }
                };
            } catch (fallbackError) {
                console.error(`❌ All price sources failed for ${selectedCoin}:`, fallbackError);
            }
        }
    }

    if (balanceResult && balanceResult.wallet) {
        const liquidBalance = balanceResult.wallet.liquid || 0;
        const stakedBalance = balanceResult.wallet.staked || 0;
        const unstakingBalance = balanceResult.wallet.unstaking || 0;
        const delegatorRewards = balanceResult.wallet.rewards || 0;
        const totalBalance = liquidBalance + stakedBalance + unstakingBalance + delegatorRewards;
        const vwapPrice = vwapData?.vwap || 0;
        
        console.log(`💰 New ${selectedCoin} wallet: ${totalBalance.toFixed(6)} tokens × $${vwapPrice.toFixed(4)} = $${(totalBalance * vwapPrice).toFixed(2)}`);
        
        await prisma.walletAddress.update({
            where: { id: wallet.id },
            data: {
                liquidBalance,
                stakedBalance,
                unstakingBalance,
                delegatorRewards,
                totalBalance,
                lastBalanceUpdate: new Date().toISOString()
            },
        });
    }
    return NextResponse.json({ wallet })
  } catch (error: any) {
    console.error('Failed to create wallet:', error);
    return NextResponse.json({ error: 'Failed to create wallet', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    let userId = session?.user?.id;
    if (!userId) {
      console.log('[WALLET API] No session for DELETE, using temp user for testing');
      userId = 'temp-user-dev-123';
    }
  
    try {
      const { id } = await req.json();
      
      if (!id) {
        console.error('[WALLET API] No wallet ID provided for deletion');
        return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 });
      }
      
      console.log(`[WALLET API] Attempting to delete wallet: ${id} for user: ${userId}`);
      
      // First check if wallet exists
      const wallet = await prisma.walletAddress.findFirst({
        where: {
          id: id,
          userId: userId,
        },
      });
      
      if (!wallet) {
        console.error(`[WALLET API] Wallet not found: ${id} for user: ${userId}`);
        return NextResponse.json({ error: 'Wallet not found or unauthorized' }, { status: 404 });
      }
      
      await prisma.walletAddress.delete({
        where: {
          id: id,
        },
      });
      
      console.log(`[WALLET API] Successfully deleted wallet: ${id}`);
      return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[WALLET API] Failed to delete wallet:', error);
        return NextResponse.json({ error: 'Failed to delete wallet', details: error.message }, { status: 500 });
    }
}
