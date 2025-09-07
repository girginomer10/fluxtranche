'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Layers, 
  Clock, 
  Zap, 
  ArrowUp, 
  ArrowDown, 
  Trophy,
  Target,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Gift,
  BarChart3,
  Timer
} from 'lucide-react';
import { useLiquidityStaircase } from '@/hooks/useLiquidityStaircase';

export function LiquidityStaircasePanel() {
  const { state, isWritePending, depositToRung, withdrawFromNFT, emergencyExit, upgradeNFT, claimYield } = useLiquidityStaircase();
  const [selectedRung, setSelectedRung] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [upgradeTokenId, setUpgradeTokenId] = useState('');
  const [upgradeRungId, setUpgradeRungId] = useState(1);
  const [upgradeAmount, setUpgradeAmount] = useState('');

  const handleDeposit = async () => {
    if (!depositAmount || !selectedRung) return;
    try {
      await depositToRung(selectedRung, BigInt(Math.floor(parseFloat(depositAmount) * 1e6)));
      setDepositAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleWithdraw = async (tokenId: string) => {
    try {
      await withdrawFromNFT(tokenId);
    } catch (error) {
      console.error('Withdraw failed:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!upgradeTokenId || !upgradeAmount) return;
    try {
      await upgradeNFT(upgradeTokenId, upgradeRungId, BigInt(Math.floor(parseFloat(upgradeAmount) * 1e6)));
      setUpgradeTokenId('');
      setUpgradeAmount('');
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  const handleClaimYield = async (tokenId: string) => {
    try {
      await claimYield(tokenId);
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  const getRungColor = (rungId: number) => {
    const colors = [
      'from-slate-500 to-slate-600',
      'from-blue-500 to-blue-600', 
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-yellow-500 to-yellow-600'
    ];
    return colors[rungId] || colors[0];
  };

  const getRungIcon = (rungId: number) => {
    const icons = [Target, Layers, Trophy, Zap, Gift];
    const Icon = icons[rungId] || Target;
    return Icon;
  };

  const formatTimeRemaining = (timestamp: number) => {
    const remaining = timestamp - Date.now();
    if (remaining <= 0) return 'Unlocked';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Liquidity Staircase NFTs</h2>
          <p className="text-slate-600">Lock liquidity in tiered NFTs for premium yields</p>
        </div>
      </div>

      {/* Pool Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Pool Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${state.pool.totalLiquidity.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total Liquidity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{state.pool.averageYield.toFixed(1)}%</div>
              <div className="text-sm text-slate-600">Avg Yield</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{state.pool.totalNFTs}</div>
              <div className="text-sm text-slate-600">Active NFTs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">${state.pool.rewardsPool.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Rewards Pool</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rungs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rungs">Staircase Rungs</TabsTrigger>
          <TabsTrigger value="portfolio">My NFTs</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="rungs" className="space-y-4">
          <div className="grid gap-4">
            {state.rungs.map((rung, index) => {
              const Icon = getRungIcon(rung.rungId);
              return (
                <motion.div
                  key={rung.rungId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`cursor-pointer transition-all ${selectedRung === rung.rungId ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => setSelectedRung(rung.rungId)}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${getRungColor(rung.rungId)}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{rung.name}</h3>
                              <Badge variant="outline">Rung {rung.rungId}</Badge>
                            </div>
                            <div className="text-sm text-slate-600">
                              ${rung.minLiquidity.toLocaleString()} - ${rung.maxLiquidity.toLocaleString()} USDC
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">+{(rung.yieldBoost * 100).toFixed(1)}%</div>
                          <div className="text-sm text-slate-600">Yield Boost</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-purple-600">{rung.premium}x</div>
                          <div className="text-xs text-slate-600">Premium</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-blue-600">{rung.lockDuration}h</div>
                          <div className="text-xs text-slate-600">Lock Time</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-orange-600">{(rung.utilization * 100).toFixed(0)}%</div>
                          <div className="text-xs text-slate-600">Utilized</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-green-600">${rung.available.toLocaleString()}</div>
                          <div className="text-xs text-slate-600">Available</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Utilization</span>
                          <span>{(rung.utilization * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={rung.utilization * 100} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {selectedRung !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Deposit to {state.rungs[selectedRung]?.name} Rung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="Enter USDC amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <div className="text-xs text-slate-600 mt-1">
                    Min: ${state.rungs[selectedRung]?.minLiquidity.toLocaleString()} 
                    | Max: ${state.rungs[selectedRung]?.maxLiquidity.toLocaleString()}
                  </div>
                </div>
                <Button 
                  onClick={handleDeposit} 
                  disabled={isWritePending || !depositAmount}
                  className="w-full"
                >
                  {isWritePending ? 'Processing...' : `Mint ${state.rungs[selectedRung]?.name} NFT`}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          {state.userNFTs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Liquidity NFTs</h3>
                <p className="text-slate-600 mb-4">Start by depositing to a staircase rung to mint your first NFT</p>
                <Button variant="outline">
                  View Available Rungs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {state.userNFTs.map((nft, index) => {
                const rung = state.rungs[nft.rungId];
                const Icon = getRungIcon(nft.rungId);
                const isUnlocked = nft.lockedUntil <= Date.now();
                const yieldProgress = nft.totalYieldPotential > 0 ? (nft.yieldAccrued / nft.totalYieldPotential) * 100 : 0;

                return (
                  <motion.div
                    key={nft.tokenId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${getRungColor(nft.rungId)}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{nft.premiumTier} NFT</h3>
                                <Badge variant="outline">#{nft.tokenId.slice(-3)}</Badge>
                                {isUnlocked ? (
                                  <Badge className="bg-green-500">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Unlocked
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Timer className="w-3 h-3 mr-1" />
                                    {formatTimeRemaining(nft.lockedUntil)}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-slate-600">
                                Principal: ${nft.principal.toLocaleString()} USDC
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">
                              +${nft.yieldAccrued.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-600">Yield Earned</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <div className="font-semibold text-blue-600">
                              {rung ? `+${(rung.yieldBoost * 100).toFixed(1)}%` : 'N/A'}
                            </div>
                            <div className="text-xs text-slate-600">Yield Boost</div>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <div className="font-semibold text-purple-600">
                              ${nft.totalYieldPotential.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">Max Potential</div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Yield Progress</span>
                            <span>{yieldProgress.toFixed(1)}%</span>
                          </div>
                          <Progress value={yieldProgress} className="h-2" />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleClaimYield(nft.tokenId)}
                            disabled={isWritePending || nft.yieldAccrued === 0}
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            Claim Yield
                          </Button>
                          {isUnlocked ? (
                            <Button
                              size="sm"
                              onClick={() => handleWithdraw(nft.tokenId)}
                              disabled={isWritePending}
                            >
                              <ArrowDown className="w-4 h-4 mr-2" />
                              Withdraw
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => emergencyExit(nft.tokenId)}
                              disabled={isWritePending}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Emergency Exit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upgrade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUp className="w-5 h-5" />
                Upgrade NFT to Higher Rung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="upgrade-token">Select NFT Token ID</Label>
                <Input
                  id="upgrade-token"
                  placeholder="Enter token ID (e.g., stair_001)"
                  value={upgradeTokenId}
                  onChange={(e) => setUpgradeTokenId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="upgrade-rung">Target Rung</Label>
                <select 
                  id="upgrade-rung"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={upgradeRungId}
                  onChange={(e) => setUpgradeRungId(parseInt(e.target.value))}
                >
                  {state.rungs.map((rung) => (
                    <option key={rung.rungId} value={rung.rungId}>
                      {rung.name} (Rung {rung.rungId}) - +{(rung.yieldBoost * 100).toFixed(1)}% yield
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="upgrade-amount">Additional Amount (USDC)</Label>
                <Input
                  id="upgrade-amount"
                  type="number"
                  placeholder="Additional USDC to add"
                  value={upgradeAmount}
                  onChange={(e) => setUpgradeAmount(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleUpgrade}
                disabled={isWritePending || !upgradeTokenId || !upgradeAmount}
                className="w-full"
              >
                {isWritePending ? 'Processing...' : 'Upgrade NFT'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {state.recentEvents.map((event, index) => {
                  const getEventIcon = () => {
                    switch (event.type) {
                      case 'deposit': return <ArrowUp className="w-4 h-4 text-green-600" />;
                      case 'withdraw': return <ArrowDown className="w-4 h-4 text-blue-600" />;
                      case 'yield': return <Gift className="w-4 h-4 text-purple-600" />;
                      case 'upgrade': return <TrendingUp className="w-4 h-4 text-orange-600" />;
                      default: return <Clock className="w-4 h-4 text-gray-600" />;
                    }
                  };

                  const getEventColor = () => {
                    switch (event.type) {
                      case 'deposit': return 'text-green-600';
                      case 'withdraw': return 'text-blue-600';
                      case 'yield': return 'text-purple-600';
                      case 'upgrade': return 'text-orange-600';
                      default: return 'text-gray-600';
                    }
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="p-2 bg-background rounded-full">
                        {getEventIcon()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium capitalize ${getEventColor()}`}>
                            {event.type}
                          </span>
                          <Badge variant="outline">
                            {state.rungs[event.rung]?.name || `Rung ${event.rung}`}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          ${event.amount.toLocaleString()} USDC • #{event.tokenId.slice(-3)} • {event.premium}x premium
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}