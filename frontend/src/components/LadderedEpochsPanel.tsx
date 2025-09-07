'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, TrendingUp, Clock, Zap, Settings, BarChart3, Target, DollarSign } from 'lucide-react';
import { useLadderedEpochs } from '@/hooks/useLadderedEpochs';

interface RungConfig {
  label: string;
  duration: string;
  icon: any;
  color: string;
  bgColor: string;
}

const RUNG_CONFIGS: RungConfig[] = [
  {
    label: "Express",
    duration: "1h",
    icon: Zap,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  {
    label: "Standard", 
    duration: "6h",
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    label: "Premium",
    duration: "24h", 
    icon: Target,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  }
];

export function LadderedEpochsPanel() {
  const { enabled, state, isWritePending, depositLadder, settleRung, rebalanceLadder } = useLadderedEpochs();
  const [selectedRung, setSelectedRung] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [customWeights, setCustomWeights] = useState([30, 45, 25]);
  const [showRebalance, setShowRebalance] = useState(false);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const formatTimeUntil = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return "Ready to settle";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleDepositLadder = async () => {
    if (!depositAmount || !state) return;
    
    try {
      const assets = BigInt(Math.floor(parseFloat(depositAmount) * 1e6)); // USDC decimals
      await depositLadder(assets, customWeights);
      setDepositAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleSettleRung = async (rungIndex: number) => {
    try {
      await settleRung(rungIndex);
    } catch (error) {
      console.error('Settlement failed:', error);
    }
  };

  const handleRebalance = async () => {
    try {
      await rebalanceLadder(customWeights);
      setShowRebalance(false);
    } catch (error) {
      console.error('Rebalance failed:', error);
    }
  };

  if (!state) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
              <Layers className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Laddered Epochs</h3>
              <p className="text-sm text-slate-600 font-medium">
                Multi-tier Settlement System {enabled ? '(on-chain)' : '(demo)'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRebalance(!showRebalance)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
              title="Rebalance weights"
            >
              <Settings size={18} />
            </button>
            <div className="text-right">
              <div className="text-sm text-slate-600 font-medium">Total Portfolio</div>
              <div className="text-xl font-bold text-slate-900">
                ${state.totalDeposits.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ladder Overview */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {state.rungs.map((rung, index) => {
            const config = RUNG_CONFIGS[index];
            const Icon = config.icon;
            const isSelected = selectedRung === index;
            const canSettle = rung.nextSettlement <= Date.now();
            
            return (
              <motion.div
                key={index}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white/70 backdrop-blur-sm'
                }`}
                onClick={() => setSelectedRung(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {canSettle && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                )}
                
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 ${config.bgColor} rounded-lg`}>
                    <Icon className={config.color} size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {config.label}
                    </div>
                    <div className="text-sm text-slate-600">
                      {config.duration} cycles
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Assets</span>
                    <span className="font-medium text-slate-900">
                      ${rung.totalAssets.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Share</span>
                    <span className="font-medium text-slate-900">
                      {rung.share}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">APY</span>
                    <span className="font-bold text-green-600">
                      {rung.apy.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">
                      Next Settlement
                    </span>
                    <span className={`text-xs font-medium ${
                      canSettle ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                      {formatTimeUntil(rung.nextSettlement)}
                    </span>
                  </div>
                  
                  {canSettle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSettleRung(index);
                      }}
                      disabled={isWritePending}
                      className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm"
                    >
                      {isWritePending ? 'Settling...' : 'Settle Now'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Rung Details */}
        <AnimatePresence>
          {selectedRung !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="text-blue-600" size={16} />
                <h4 className="font-semibold text-slate-900">
                  {RUNG_CONFIGS[selectedRung].label} Rung Details
                </h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-600 font-medium">Epochs Count</div>
                  <div className="font-semibold text-slate-900">
                    {state.rungs[selectedRung].epochCount}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 font-medium">Duration</div>
                  <div className="font-semibold text-slate-900">
                    {formatDuration(state.rungs[selectedRung].duration)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 font-medium">Current APY</div>
                  <div className="font-semibold text-emerald-600">
                    {state.rungs[selectedRung].apy.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 font-medium">Total Assets</div>
                  <div className="font-semibold text-slate-900">
                    ${state.rungs[selectedRung].totalAssets.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deposit Interface */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="text-blue-600" size={16} />
            <h4 className="font-semibold text-slate-900">Ladder Deposit</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Deposit Amount (USDC)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="10000"
                className="w-full p-3 border border-slate-300 rounded-lg bg-white/80 backdrop-blur-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Distribution ({customWeights.join('% / ')}% / {100 - customWeights.reduce((a,b) => a+b, 0)}%)
              </label>
              <div className="flex gap-2">
                {customWeights.map((weight, index) => (
                  <input
                    key={index}
                    type="range"
                    min="0"
                    max="100"
                    value={weight}
                    onChange={(e) => {
                      const newWeights = [...customWeights];
                      newWeights[index] = parseInt(e.target.value);
                      // Auto-adjust others to maintain 100% total
                      const total = newWeights.reduce((sum, w) => sum + w, 0);
                      if (total <= 100) {
                        setCustomWeights(newWeights);
                      }
                    }}
                    className="flex-1"
                  />
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDepositLadder}
            disabled={!depositAmount || isWritePending}
            className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isWritePending ? 'Creating Ladder...' : 'Deposit to Ladder'}
          </button>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {state.activeRungs}
            </div>
            <div className="text-sm text-slate-600 font-medium">Active Rungs</div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">
              {state.averageAPY.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-600 font-medium">Avg APY</div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatTimeUntil(state.nextSettlement)}
            </div>
            <div className="text-sm text-slate-600 font-medium">Next Settlement</div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              ${state.liquidityBuffer.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 font-medium">Liquidity Buffer</div>
          </div>
        </div>

        {/* Rebalance Panel */}
        <AnimatePresence>
          {showRebalance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <Settings className="text-yellow-600" size={16} />
                <h4 className="font-semibold text-slate-900">Rebalance Ladder</h4>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">
                Adjust the weight distribution across ladder rungs. Changes will apply to new deposits and gradually rebalance existing positions.
              </p>
              
              <div className="flex gap-4 mb-4">
                {customWeights.map((weight, index) => (
                  <div key={index} className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      {RUNG_CONFIGS[index].label} ({weight}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weight}
                      onChange={(e) => {
                        const newWeights = [...customWeights];
                        newWeights[index] = parseInt(e.target.value);
                        setCustomWeights(newWeights);
                      }}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRebalance}
                  disabled={isWritePending}
                  className="flex-1 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm"
                >
                  {isWritePending ? 'Rebalancing...' : 'Apply Rebalance'}
                </button>
                <button
                  onClick={() => setShowRebalance(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}