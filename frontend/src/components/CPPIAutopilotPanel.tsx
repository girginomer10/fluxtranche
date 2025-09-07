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
  TrendingDown,
  Shield, 
  Zap, 
  Settings, 
  AlertCircle, 
  CheckCircle,
  Play,
  Pause,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  DollarSign,
  Gauge
} from 'lucide-react';
import { useCPPIAutopilot } from '@/hooks/useCPPIAutopilot';

export function CPPIAutopilotPanel() {
  const { state, isWritePending, createPosition, rebalancePosition, updatePosition, closePosition, calculateOptimalAllocation } = useCPPIAutopilot();
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [customFloor, setCustomFloor] = useState('');
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState(true);

  const handleCreatePosition = async () => {
    if (!selectedStrategy || !investmentAmount) return;
    try {
      const floorValue = customFloor ? BigInt(Math.floor(parseFloat(customFloor) * 1e6)) : undefined;
      await createPosition(
        selectedStrategy, 
        BigInt(Math.floor(parseFloat(investmentAmount) * 1e6)),
        floorValue,
        autoRebalanceEnabled
      );
      setInvestmentAmount('');
      setCustomFloor('');
    } catch (error) {
      console.error('Create position failed:', error);
    }
  };

  const handleRebalance = async (positionId: string) => {
    try {
      await rebalancePosition(positionId);
    } catch (error) {
      console.error('Rebalance failed:', error);
    }
  };

  const getStrategyRiskLevel = (multiplier: number) => {
    if (multiplier <= 3) return { level: 'Conservative', color: 'text-green-600', bg: 'bg-green-100' };
    if (multiplier <= 4.5) return { level: 'Balanced', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { level: 'Aggressive', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getHealthScore = (position: any) => {
    const cushionRatio = position.cushion / position.principal;
    const floorDistance = (position.currentValue - position.guaranteedFloor) / position.guaranteedFloor;
    
    if (floorDistance > 0.3 && cushionRatio > 0.2) return { score: 95, status: 'Excellent', color: 'text-green-600' };
    if (floorDistance > 0.15 && cushionRatio > 0.1) return { score: 80, status: 'Good', color: 'text-blue-600' };
    if (floorDistance > 0.05) return { score: 65, status: 'Fair', color: 'text-yellow-600' };
    return { score: 40, status: 'At Risk', color: 'text-red-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
          <Gauge className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">CPPI Autopilot</h2>
          <p className="text-slate-800 font-medium">Constant Proportion Portfolio Insurance with automated rebalancing</p>
        </div>
      </div>

      {/* Pool Overview */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <h3 className="text-xl font-bold text-slate-900">CPPI Pool Overview</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl">
              <div className="text-2xl font-bold text-slate-900">${state.pool.totalAUM.toLocaleString()}</div>
              <div className="text-sm text-slate-600 font-medium">Total AUM</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl">
              <div className="text-2xl font-bold text-slate-900">{state.pool.totalPositions}</div>
              <div className="text-sm text-slate-600 font-medium">Active Positions</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl">
              <div className="text-2xl font-bold text-slate-900">{(state.pool.successRate * 100).toFixed(1)}%</div>
              <div className="text-sm text-slate-600 font-medium">Success Rate</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl">
              <div className="text-2xl font-bold text-slate-900">{state.pool.avgDailyRebalances.toFixed(1)}</div>
              <div className="text-sm text-slate-600 font-medium">Avg Daily Rebalances</div>
            </div>
          </div>
          
          <div className="my-4 h-px bg-slate-200"></div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Avg Multiplier:</span>
              <span className="font-medium text-slate-900">{state.pool.averageMultiplier.toFixed(1)}x</span>
            </div>
            <div className="flex justify-between">
              <span>Floor Protection:</span>
              <span className="font-medium text-slate-900">{(state.pool.averageFloorProtection * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Risk Budget Used:</span>
              <span className="font-medium text-slate-900">{(state.pool.riskBudgetUtilization * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Safe Asset APY:</span>
              <span className="font-medium text-emerald-600">{state.pool.safeAssetAPY.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Risky Asset Vol:</span>
              <span className="font-medium text-red-600">{state.pool.riskyAssetVolatility.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Total Rebalances:</span>
              <span className="font-medium text-slate-900">{state.pool.totalRebalances.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="strategies" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="positions">My Positions</TabsTrigger>
          <TabsTrigger value="rebalances">Rebalances</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid gap-4">
            {state.strategies.map((strategy, index) => {
              const riskLevel = getStrategyRiskLevel(strategy.multiplier);
              const isSelected = selectedStrategy === strategy.id;
              
              return (
                <motion.div
                  key={strategy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedStrategy(strategy.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{strategy.name}</h3>
                              <Badge className={`${riskLevel.bg} ${riskLevel.color} border-0`}>
                                {riskLevel.level}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600">
                              {strategy.multiplier}x multiplier • {(strategy.floor * 100).toFixed(0)}% floor protection
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            ${strategy.currentCushion.toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-600">Risk Cushion</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-green-600">
                            {(strategy.safeAssetAllocation * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-slate-600">Safe Assets</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-red-600">
                            {(strategy.riskyAssetAllocation * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-slate-600">Risky Assets</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-blue-600">
                            ${strategy.exposure.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">Total Exposure</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-purple-600">
                            {(strategy.rebalanceThreshold * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-600">Rebal. Threshold</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Asset Allocation</span>
                          <span>Safe: {(strategy.safeAssetAllocation * 100).toFixed(0)}% | Risky: {(strategy.riskyAssetAllocation * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500" 
                            style={{ width: `${strategy.safeAssetAllocation * 100}%` }}
                          />
                          <div 
                            className="bg-red-500" 
                            style={{ width: `${strategy.riskyAssetAllocation * 100}%` }}
                          />
                        </div>
                      </div>

                      {strategy.cap && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="text-sm text-amber-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Upside capped at {(strategy.cap * 100).toFixed(0)}% of initial investment
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {selectedStrategy && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="investment-amount">Investment Amount (USDC)</Label>
                  <Input
                    id="investment-amount"
                    type="number"
                    placeholder="Enter USDC amount"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-floor">Custom Floor (Optional USDC)</Label>
                  <Input
                    id="custom-floor"
                    type="number"
                    placeholder="Leave empty for default floor"
                    value={customFloor}
                    onChange={(e) => setCustomFloor(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-rebalance">Auto-Rebalancing</Label>
                  <Button
                    variant={autoRebalanceEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoRebalanceEnabled(!autoRebalanceEnabled)}
                  >
                    {autoRebalanceEnabled ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                    {autoRebalanceEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <Button 
                  onClick={handleCreatePosition} 
                  disabled={isWritePending || !investmentAmount}
                  className="w-full"
                >
                  {isWritePending ? 'Creating...' : 'Create CPPI Position'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          {state.userPositions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Gauge className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No CPPI Positions</h3>
                <p className="text-slate-600 mb-4">Create your first position to start automated portfolio insurance</p>
                <Button variant="outline">
                  View Available Strategies
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {state.userPositions.map((position, index) => {
                const strategy = state.strategies.find(s => s.id === position.strategyId);
                const health = getHealthScore(position);
                const cushionRatio = position.cushion / position.principal;
                const floorDistance = (position.currentValue - position.guaranteedFloor) / position.guaranteedFloor;

                return (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                              <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{strategy?.name || 'Unknown Strategy'}</h3>
                                <Badge variant="outline">#{position.id.slice(-3)}</Badge>
                                <Badge className={`${health.color}`}>
                                  {health.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-600">
                                Principal: ${position.principal.toLocaleString()} USDC
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">
                              ${position.currentValue.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-600">Current Value</div>
                            <div className={`text-sm font-medium ${position.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {position.totalReturn >= 0 ? '+' : ''}{(position.totalReturn * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-blue-600">
                              ${position.guaranteedFloor.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">Floor Protection</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-purple-600">
                              ${position.cushion.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">Risk Cushion</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-green-600">
                              ${position.safeExposure.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">Safe Assets</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-red-600">
                              ${position.riskyExposure.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">Risky Assets</div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Asset Allocation</span>
                            <span>
                              Safe: {((position.safeExposure / position.currentValue) * 100).toFixed(0)}% | 
                              Risky: {((position.riskyExposure / position.currentValue) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-green-500" 
                              style={{ width: `${(position.safeExposure / position.currentValue) * 100}%` }}
                            />
                            <div 
                              className="bg-red-500" 
                              style={{ width: `${(position.riskyExposure / position.currentValue) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="flex justify-between">
                            <span>Max Drawdown:</span>
                            <span className="text-red-600">{(position.maxDrawdown * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rebalances:</span>
                            <span>{position.rebalanceCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Floor Distance:</span>
                            <span className={floorDistance > 0.1 ? 'text-green-600' : 'text-red-600'}>
                              {(floorDistance * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cushion Ratio:</span>
                            <span className={cushionRatio > 0.15 ? 'text-green-600' : 'text-yellow-600'}>
                              {(cushionRatio * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRebalance(position.id)}
                            disabled={isWritePending}
                          >
                            <Activity className="w-4 h-4 mr-2" />
                            Rebalance
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={position.autoRebalanceEnabled ? 'text-green-600' : 'text-red-600'}
                          >
                            {position.autoRebalanceEnabled ? (
                              <><Play className="w-4 h-4 mr-2" />Auto: ON</>
                            ) : (
                              <><Pause className="w-4 h-4 mr-2" />Auto: OFF</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closePosition(position.id)}
                            disabled={isWritePending}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Close
                          </Button>
                        </div>

                        {position.maturityDate && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-700 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Maturity: {new Date(position.maturityDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rebalances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Rebalance Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {state.recentRebalances.map((rebalance, index) => {
                  const getRebalanceIcon = (trigger: string) => {
                    switch (trigger) {
                      case 'threshold': return <Target className="w-4 h-4 text-blue-600" />;
                      case 'volatility': return <TrendingUp className="w-4 h-4 text-red-600" />;
                      case 'manual': return <Settings className="w-4 h-4 text-purple-600" />;
                      case 'scheduled': return <Clock className="w-4 h-4 text-green-600" />;
                      default: return <Activity className="w-4 h-4 text-gray-600" />;
                    }
                  };

                  const safeChange = rebalance.afterSafeAllocation - rebalance.beforeSafeAllocation;
                  const riskyChange = rebalance.afterRiskyAllocation - rebalance.beforeRiskyAllocation;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="p-2 bg-background rounded-full">
                        {getRebalanceIcon(rebalance.trigger)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Position #{rebalance.positionId.slice(-3)}</span>
                          <Badge variant="outline" className="capitalize">
                            {rebalance.trigger}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          Safe: {(rebalance.beforeSafeAllocation * 100).toFixed(0)}% → {(rebalance.afterSafeAllocation * 100).toFixed(0)}%
                          <span className={safeChange > 0 ? 'text-green-600 ml-1' : safeChange < 0 ? 'text-red-600 ml-1' : ''}>
                            ({safeChange > 0 ? '+' : ''}{(safeChange * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          Risky: {(rebalance.beforeRiskyAllocation * 100).toFixed(0)}% → {(rebalance.afterRiskyAllocation * 100).toFixed(0)}%
                          <span className={riskyChange > 0 ? 'text-green-600 ml-1' : riskyChange < 0 ? 'text-red-600 ml-1' : ''}>
                            ({riskyChange > 0 ? '+' : ''}{(riskyChange * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {new Date(rebalance.timestamp).toLocaleString()} • 
                          Gas: {rebalance.gasUsed.toLocaleString()} • 
                          Slippage: {(rebalance.slippage * 100).toFixed(3)}%
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Portfolio Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.userPositions.map((position, index) => {
                    const safeRatio = position.safeExposure / position.currentValue;
                    const riskyRatio = position.riskyExposure / position.currentValue;
                    
                    return (
                      <div key={position.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Position #{position.id.slice(-3)}</span>
                          <span>${position.currentValue.toLocaleString()}</span>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500" 
                            style={{ width: `${safeRatio * 100}%` }}
                            title={`Safe: ${(safeRatio * 100).toFixed(1)}%`}
                          />
                          <div 
                            className="bg-red-500" 
                            style={{ width: `${riskyRatio * 100}%` }}
                            title={`Risky: ${(riskyRatio * 100).toFixed(1)}%`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.userPositions.map((position) => {
                    const health = getHealthScore(position);
                    
                    return (
                      <div key={position.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Position #{position.id.slice(-3)}</span>
                          <Badge className={`${health.color} border-0`}>
                            {health.score}/100
                          </Badge>
                        </div>
                        <Progress value={health.score} className="h-2" />
                        <div className="text-xs text-slate-600">
                          Return: {(position.totalReturn * 100).toFixed(2)}% | 
                          Max DD: {(position.maxDrawdown * 100).toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}