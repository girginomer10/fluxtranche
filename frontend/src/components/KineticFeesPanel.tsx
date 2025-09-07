'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Zap,
  AlertTriangle,
  Info,
  RefreshCw,
  Activity
} from 'lucide-react';

interface MarketConditions {
  volatility: number;
  tradingVolume: number;
  liquidity: number;
  correlations: number;
  momentum: number;
}

interface DynamicRates {
  managementFeeBps: number;
  performanceFeeBps: number;
  seniorCouponBps: number;
  entryFeeBps: number;
  exitFeeBps: number;
  lastUpdateTime: number;
}

interface FeeStructure {
  managementFeeBaseBps: number;
  performanceFeeBaseBps: number;
  seniorCouponBaseBps: number;
  maxFeeBps: number;
  minFeeBps: number;
}

export function KineticFeesPanel() {
  const [mounted, setMounted] = useState(false);
  const [marketConditions, setMarketConditions] = useState<MarketConditions>({
    volatility: 35,    // 35%
    tradingVolume: 750000,
    liquidity: 4500,   // 45%
    correlations: 65,  // 65%
    momentum: 6000     // 60%
  });

  const [baseFees] = useState<FeeStructure>({
    managementFeeBaseBps: 100,    // 1%
    performanceFeeBaseBps: 1000,  // 10%
    seniorCouponBaseBps: 500,     // 5%
    maxFeeBps: 300,               // 3% max
    minFeeBps: 50                 // 0.5% min
  });

  const [currentRates, setCurrentRates] = useState<DynamicRates>({
    managementFeeBps: 100,
    performanceFeeBps: 1000,
    seniorCouponBps: 500,
    entryFeeBps: 25,    // 0.25%
    exitFeeBps: 25,     // 0.25%
    lastUpdateTime: Date.now()
  });

  const [lastRates, setLastRates] = useState<DynamicRates>(currentRates);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fix hydration issue
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simulate real-time market condition changes
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketConditions(prev => {
        const timeVar = Date.now() / 10000;
        
        return {
          volatility: Math.max(10, Math.min(80, 35 + Math.sin(timeVar) * 15 + (Math.random() - 0.5) * 5)),
          tradingVolume: Math.max(100000, Math.min(2000000, 750000 + Math.sin(timeVar * 0.7) * 400000 + (Math.random() - 0.5) * 100000)),
          liquidity: Math.max(20, Math.min(80, 45 + Math.sin(timeVar * 0.8) * 15 + (Math.random() - 0.5) * 3)),
          correlations: Math.max(30, Math.min(90, 65 + Math.sin(timeVar * 0.6) * 10 + (Math.random() - 0.5) * 2)),
          momentum: Math.max(30, Math.min(90, 60 + Math.sin(timeVar * 0.9) * 20 + (Math.random() - 0.5) * 5))
        };
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate dynamic rates based on market conditions
  useEffect(() => {
    const calculateDynamicRates = () => {
      setIsUpdating(true);
      
      // Store previous rates for comparison
      setLastRates(currentRates);
      
      // Calculate multipliers
      const volMultiplier = marketConditions.volatility <= 30 ? 1 : 
                          1 + (marketConditions.volatility - 30) * 1.5 / 100;
      
      const volumeMultiplier = marketConditions.tradingVolume >= 1000000 ? 1 :
                             1 + (1000000 - marketConditions.tradingVolume) / 1000000;
      
      const liquidityMultiplier = marketConditions.liquidity >= 50 ? 1 :
                                1 + (50 - marketConditions.liquidity) * 0.75 / 100;
      
      const momentumMultiplier = marketConditions.momentum <= 70 ? 1 :
                               1 + (marketConditions.momentum - 70) * 0.2 / 100;
      
      // Apply multipliers to base fees
      const applyMultipliers = (baseFee: number) => {
        let adjustedFee = baseFee;
        adjustedFee *= volMultiplier;
        adjustedFee *= volumeMultiplier;
        adjustedFee *= liquidityMultiplier;
        adjustedFee *= momentumMultiplier;
        
        // Apply caps
        return Math.max(baseFees.minFeeBps, Math.min(baseFees.maxFeeBps, Math.round(adjustedFee)));
      };

      const newRates = {
        managementFeeBps: applyMultipliers(baseFees.managementFeeBaseBps),
        performanceFeeBps: applyMultipliers(baseFees.performanceFeeBaseBps),
        seniorCouponBps: applyMultipliers(baseFees.seniorCouponBaseBps),
        entryFeeBps: marketConditions.volatility > 60 ? 50 : 25, // 0.5% vs 0.25%
        exitFeeBps: marketConditions.liquidity < 30 ? 75 : 25,   // 0.75% vs 0.25%
        lastUpdateTime: Date.now()
      };

      setTimeout(() => {
        setCurrentRates(newRates);
        setIsUpdating(false);
      }, 500);
    };

    calculateDynamicRates();
  }, [marketConditions, baseFees]);

  const formatBps = (bps: number) => {
    return (bps / 100).toFixed(2) + '%';
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    }
    return (volume / 1000).toFixed(0) + 'K';
  };

  const getRateChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const getRateChangeColor = (current: number, previous: number) => {
    const change = getRateChange(current, previous);
    if (Math.abs(change) < 1) return 'text-slate-600';
    return change > 0 ? 'text-red-500' : 'text-green-500';
  };

  const getRateChangeIcon = (current: number, previous: number) => {
    const change = getRateChange(current, previous);
    if (Math.abs(change) < 1) return null;
    return change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const getConditionColor = (value: number, metric: string) => {
    if (metric === 'volatility') {
      if (value >= 60) return 'text-red-500';
      if (value <= 20) return 'text-green-500';
      return 'text-yellow-500';
    }
    if (metric === 'liquidity') {
      if (value >= 60) return 'text-green-500';
      if (value <= 30) return 'text-red-500';
      return 'text-yellow-500';
    }
    if (metric === 'momentum') {
      if (value >= 70) return 'text-red-500';
      if (value <= 40) return 'text-green-500';
      return 'text-yellow-500';
    }
    return 'text-slate-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"
              animate={isUpdating ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Kinetic Fees</h3>
              <p className="text-sm text-gray-600 dark:text-slate-500">Dynamic Fee Adjustment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isUpdating && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="text-blue-500" size={16} />
              </motion.div>
            )}
            {mounted && (
              <div className="text-xs text-slate-600 dark:text-slate-500">
                Updated: {new Date(currentRates.lastUpdateTime).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Market Conditions */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Market Conditions</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="text-slate-600" size={14} />
              <span className="text-xs text-gray-600 dark:text-slate-500">Volatility</span>
            </div>
            <div className={`text-lg font-bold ${getConditionColor(marketConditions.volatility, 'volatility')}`}>
              {marketConditions.volatility.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="text-slate-600" size={14} />
              <span className="text-xs text-gray-600 dark:text-slate-500">Volume (24h)</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              ${formatVolume(marketConditions.tradingVolume)}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-slate-600" size={14} />
              <span className="text-xs text-gray-600 dark:text-slate-500">Liquidity</span>
            </div>
            <div className={`text-lg font-bold ${getConditionColor(marketConditions.liquidity, 'liquidity')}`}>
              {marketConditions.liquidity.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="text-slate-600" size={14} />
              <span className="text-xs text-gray-600 dark:text-slate-500">Correlation</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {marketConditions.correlations.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-slate-600" size={14} />
              <span className="text-xs text-gray-600 dark:text-slate-500">Momentum</span>
            </div>
            <div className={`text-lg font-bold ${getConditionColor(marketConditions.momentum, 'momentum')}`}>
              {marketConditions.momentum.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Dynamic Rates */}
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Current Dynamic Rates</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {/* Management Fee */}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Management Fee</div>
                <div className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                  Base: {formatBps(baseFees.managementFeeBaseBps)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatBps(currentRates.managementFeeBps)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${getRateChangeColor(currentRates.managementFeeBps, lastRates.managementFeeBps)}`}>
                  {getRateChangeIcon(currentRates.managementFeeBps, lastRates.managementFeeBps)}
                  <span>{Math.abs(getRateChange(currentRates.managementFeeBps, lastRates.managementFeeBps)).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Performance Fee */}
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance Fee</div>
                <div className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                  Base: {formatBps(baseFees.performanceFeeBaseBps)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {formatBps(currentRates.performanceFeeBps)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${getRateChangeColor(currentRates.performanceFeeBps, lastRates.performanceFeeBps)}`}>
                  {getRateChangeIcon(currentRates.performanceFeeBps, lastRates.performanceFeeBps)}
                  <span>{Math.abs(getRateChange(currentRates.performanceFeeBps, lastRates.performanceFeeBps)).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Senior Coupon */}
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Senior Coupon</div>
                <div className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                  Base: {formatBps(baseFees.seniorCouponBaseBps)}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatBps(currentRates.seniorCouponBps)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${getRateChangeColor(currentRates.seniorCouponBps, lastRates.seniorCouponBps)}`}>
                  {getRateChangeIcon(currentRates.seniorCouponBps, lastRates.seniorCouponBps)}
                  <span>{Math.abs(getRateChange(currentRates.seniorCouponBps, lastRates.seniorCouponBps)).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Entry Fee */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Entry Fee</div>
                <div className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                  High vol adjustment
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {formatBps(currentRates.entryFeeBps)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${getRateChangeColor(currentRates.entryFeeBps, lastRates.entryFeeBps)}`}>
                  {getRateChangeIcon(currentRates.entryFeeBps, lastRates.entryFeeBps)}
                  <span>{Math.abs(getRateChange(currentRates.entryFeeBps, lastRates.entryFeeBps)).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Exit Fee */}
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Exit Fee</div>
                <div className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                  Low liquidity adjustment
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatBps(currentRates.exitFeeBps)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${getRateChangeColor(currentRates.exitFeeBps, lastRates.exitFeeBps)}`}>
                  {getRateChangeIcon(currentRates.exitFeeBps, lastRates.exitFeeBps)}
                  <span>{Math.abs(getRateChange(currentRates.exitFeeBps, lastRates.exitFeeBps)).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Fee Adjustment Status */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-slate-600" size={14} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Status</span>
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-500">
                {marketConditions.volatility >= 60 && "High volatility: Entry fees increased"}
                {marketConditions.liquidity <= 30 && "Low liquidity: Exit fees increased"}
                {marketConditions.volatility < 60 && marketConditions.liquidity > 30 && "Normal market conditions"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}