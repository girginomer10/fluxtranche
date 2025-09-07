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
  BarChart3, 
  PieChart,
  DollarSign,
  Eye,
  Plus,
  Search,
  Filter,
  Star,
  Zap,
  Globe,
  Coins,
  Building,
  Wheat,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Settings,
  Wallet,
  Power,
  Link,
  Copy,
  X
} from 'lucide-react';
import { usePortfolioTracker } from '@/hooks/usePortfolioTracker';
import { UnifiedWalletOverview } from './UnifiedWalletOverview';

export function PortfolioDashboard() {
  const { state, isWritePending, createPortfolio, addPosition, calculateMetrics, calculateAllocation } = usePortfolioTracker();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(0);
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [refreshWallets, setRefreshWallets] = useState(0);

  const currentPortfolio = state.portfolios[selectedPortfolio];
  const metrics = currentPortfolio ? calculateMetrics(currentPortfolio) : null;
  const allocation = currentPortfolio ? calculateAllocation(currentPortfolio) : [];

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'crypto': return <Coins className="w-4 h-4" />;
      case 'stock': return <Building className="w-4 h-4" />;
      case 'commodity': return <Wheat className="w-4 h-4" />;
      case 'bond': return <CreditCard className="w-4 h-4" />;
      case 'etf': return <BarChart3 className="w-4 h-4" />;
      case 'index': return <Target className="w-4 h-4" />;
      case 'forex': return <Globe className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />;
  };

  const filteredAssets = state.assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                         asset.symbol.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesType = selectedAssetType === 'all' || asset.type === selectedAssetType;
    return matchesSearch && matchesType;
  });

  const getMarketSentiment = () => {
    if (state.marketData.fearGreedIndex >= 75) return { text: 'Extreme Greed', color: 'text-red-600' };
    if (state.marketData.fearGreedIndex >= 55) return { text: 'Greed', color: 'text-orange-600' };
    if (state.marketData.fearGreedIndex >= 45) return { text: 'Neutral', color: 'text-blue-600' };
    if (state.marketData.fearGreedIndex >= 25) return { text: 'Fear', color: 'text-yellow-600' };
    return { text: 'Extreme Fear', color: 'text-green-600' };
  };

  const sentiment = getMarketSentiment();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Portfolio Dashboard</h2>
            <p className="text-slate-800 font-medium">Comprehensive asset tracking across all markets</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm"
            onClick={() => setShowWalletModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Add Wallet
          </Button>
          
          <Button variant="outline" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-50">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200">
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Global Markets Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${(state.marketData.totalMarketCap / 1e12).toFixed(2)}T
              </div>
              <div className="text-sm text-slate-700">Total Market Cap</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${(state.marketData.totalVolume24h / 1e9).toFixed(0)}B
              </div>
              <div className="text-sm text-slate-700">24h Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(state.marketData.dominanceBTC * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-slate-700">BTC Dominance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(state.marketData.dominanceETH * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-slate-700">ETH Dominance</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${sentiment.color}`}>
                {state.marketData.fearGreedIndex}
              </div>
              <div className="text-sm text-slate-700">Fear & Greed</div>
              <Badge variant="outline" className={`text-xs ${sentiment.color} mt-1`}>
                {sentiment.text}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Manager - Always visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <UnifiedWalletOverview refreshKey={refreshWallets} />
      </motion.div>

      {/* Portfolio Selector */}
      {state.portfolios.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {state.portfolios.map((portfolio, index) => (
                <Button
                  key={portfolio.id}
                  variant={selectedPortfolio === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPortfolio(index)}
                >
                  {portfolio.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentPortfolio && (
        <>
          {/* Portfolio Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{currentPortfolio.name}</span>
                <Badge className={getChangeColor(currentPortfolio.dayChangePercent)}>
                  {getChangeIcon(currentPortfolio.dayChangePercent)}
                  {currentPortfolio.dayChangePercent >= 0 ? '+' : ''}
                  {(currentPortfolio.dayChangePercent * 100).toFixed(2)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    ${currentPortfolio.totalValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">Total Value</div>
                  <div className={`text-sm font-medium ${getChangeColor(currentPortfolio.dayChange)}`}>
                    {currentPortfolio.dayChange >= 0 ? '+' : ''}${currentPortfolio.dayChange.toLocaleString()} today
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getChangeColor(currentPortfolio.totalReturn)}`}>
                    ${currentPortfolio.totalReturn.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">Total Return</div>
                  <div className={`text-sm font-medium ${getChangeColor(currentPortfolio.totalReturnPercent)}`}>
                    {currentPortfolio.totalReturnPercent >= 0 ? '+' : ''}
                    {(currentPortfolio.totalReturnPercent * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    ${currentPortfolio.totalCost.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">Total Invested</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentPortfolio.positions.length}
                  </div>
                  <div className="text-sm text-slate-600">Positions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="markets">Markets</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Your Positions</h3>
                <Button size="sm" onClick={() => setShowAddPosition(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Position
                </Button>
              </div>

              <div className="grid gap-4">
                {currentPortfolio.positions.map((position, index) => {
                  const asset = state.assets.find(a => a.id === position.assetId);
                  
                  return (
                    <motion.div
                      key={position.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-muted">
                                {getAssetIcon(asset?.type || 'unknown')}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{position.symbol}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {asset?.type?.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {asset?.exchange}
                                  </Badge>
                                </div>
                                <div className="text-sm text-slate-600">
                                  {asset?.name} • {position.quantity.toLocaleString()} shares
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                ${position.currentValue.toLocaleString()}
                              </div>
                              <div className={`text-sm font-medium ${getChangeColor(position.unrealizedPnL)}`}>
                                {getChangeIcon(position.unrealizedPnL)}
                                {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toLocaleString()}
                                ({(position.unrealizedPnLPercent * 100).toFixed(2)}%)
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-slate-800 font-medium">Avg Cost</div>
                              <div className="font-medium">${position.avgCost.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-slate-800 font-medium">Market Price</div>
                              <div className="font-medium">${asset?.price.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-slate-800 font-medium">Weight</div>
                              <div className="font-medium">{(position.weight * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-slate-800 font-medium">24h Change</div>
                              <div className={`font-medium ${getChangeColor(asset?.change24h || 0)}`}>
                                {((asset?.change24h || 0) * 100).toFixed(2)}%
                              </div>
                            </div>
                          </div>

                          {position.notes && (
                            <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                              <strong>Notes:</strong> {position.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="allocation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Asset Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allocation.map((item, index) => (
                        <div key={item.type} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              />
                              {item.type}
                            </span>
                            <span className="font-medium">
                              ${item.value.toLocaleString()} ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {metrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Sharpe Ratio</span>
                          <span className="font-medium">{metrics.sharpeRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Drawdown</span>
                          <span className="font-medium text-red-600">{(metrics.maxDrawdown * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Volatility</span>
                          <span className="font-medium">{(metrics.volatility * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Beta</span>
                          <span className="font-medium">{metrics.beta.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Alpha</span>
                          <span className={`font-medium ${getChangeColor(metrics.alpha)}`}>
                            {(metrics.alpha * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>VaR (95%)</span>
                          <span className="font-medium text-red-600">${metrics.valueAtRisk95.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="markets" className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search assets..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select 
                  value={selectedAssetType}
                  onChange={(e) => setSelectedAssetType(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="crypto">Crypto</option>
                  <option value="stock">Stocks</option>
                  <option value="commodity">Commodities</option>
                  <option value="bond">Bonds</option>
                  <option value="etf">ETFs</option>
                  <option value="index">Indices</option>
                  <option value="forex">Forex</option>
                </select>
              </div>

              <div className="grid gap-2">
                {filteredAssets.slice(0, 20).map((asset, index) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      // Handle asset selection for adding to portfolio
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{asset.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {asset.type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          {asset.name} • {asset.exchange}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${asset.price.toLocaleString()}</div>
                      <div className={`text-sm ${getChangeColor(asset.change24h)}`}>
                        {getChangeIcon(asset.change24h)}
                        {(asset.change24h * 100).toFixed(2)}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentPortfolio.positions
                        .sort((a, b) => b.totalReturn - a.totalReturn)
                        .slice(0, 5)
                        .map((position) => {
                          const asset = state.assets.find(a => a.id === position.assetId);
                          return (
                            <div key={position.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded bg-muted">
                                  {getAssetIcon(asset?.type || 'unknown')}
                                </div>
                                <span className="font-medium">{position.symbol}</span>
                              </div>
                              <span className={`font-medium ${getChangeColor(position.totalReturn)}`}>
                                {(position.totalReturn * 100).toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sector Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(
                        currentPortfolio.positions.reduce((acc, position) => {
                          const asset = state.assets.find(a => a.id === position.assetId);
                          const sector = asset?.sector || asset?.type || 'Other';
                          acc[sector] = (acc[sector] || 0) + position.currentValue;
                          return acc;
                        }, {} as { [key: string]: number })
                      ).map(([sector, value]) => (
                        <div key={sector} className="space-y-1">
                          <div className="flex justify-between">
                            <span>{sector}</span>
                            <span className="font-medium">
                              ${value.toLocaleString()} ({((value / currentPortfolio.totalValue) * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <Progress value={(value / currentPortfolio.totalValue) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentPortfolio.transactions.slice(0, 10).map((tx, index) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant={tx.type === 'buy' ? 'default' : 'secondary'}>
                            {tx.type.toUpperCase()}
                          </Badge>
                          <div>
                            <div className="font-medium">{tx.symbol}</div>
                            <div className="text-sm text-slate-600">
                              {tx.quantity.toLocaleString()} @ ${tx.price.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${tx.value.toLocaleString()}</div>
                          <div className="text-sm text-slate-600">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add Position Modal would go here */}
      <AnimatePresence>
        {showAddPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddPosition(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Add New Position</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset-search">Search Asset</Label>
                  <Input
                    id="asset-search"
                    placeholder="Search for stocks, crypto, etc..."
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="avg-cost">Average Cost</Label>
                  <Input
                    id="avg-cost"
                    type="number"
                    placeholder="Enter average cost"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowAddPosition(false)}>
                    Add Position
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddPosition(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Wallet Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWalletModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Add New Wallet
                </h2>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Wallet className="text-white" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Manual Wallet Setup
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Add wallets by coin, network, and address for balance tracking
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Track your portfolio across multiple chains without connecting MetaMask. 
                    Support for staking, liquid balances, and USD conversions.
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Use the sidebar to navigate to <strong>"Unified Wallet View"</strong> 
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    The full wallet management interface is available in the Unified Wallet View panel.
                  </p>
                  <div className="mt-6">
                    <Button 
                      onClick={() => {
                        setShowWalletModal(false);
                        // You can add navigation logic here if needed
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                    >
                      Go to Unified Wallet View
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}