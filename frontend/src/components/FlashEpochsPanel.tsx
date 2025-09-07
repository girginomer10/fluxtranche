'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, AlertTriangle, Clock, BarChart3, Activity } from 'lucide-react';
import { useFlashEpochs } from '@/hooks/useFlashEpochs';

interface FlashEpochsState {
  currentVolatility: number;
  adaptiveDuration: number;
  baseDuration: number;
  lastUpdate: number;
  flashTriggerActive: boolean;
  volThresholdLow: number;
  volThresholdHigh: number;
  epochSpeedMultiplier: number;
}

export function FlashEpochsPanel() {
  const { enabled, state: chainState, triggerFlashCheck, updateVolatility, isWritePending } = useFlashEpochs();
  const [isClient, setIsClient] = useState(false);
  const [flashState, setFlashState] = useState<FlashEpochsState>({
    currentVolatility: 35, // Mock 35% volatility
    adaptiveDuration: 20 * 3600, // 20 hours
    baseDuration: 24 * 3600, // 24 hours
    lastUpdate: Date.now(),
    flashTriggerActive: false,
    volThresholdLow: 20,
    volThresholdHigh: 60,
    epochSpeedMultiplier: 1.5,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [isFlashMode, setIsFlashMode] = useState(false);
  
  // Simulate real-time volatility changes (disabled when on-chain enabled)
  useEffect(() => {
    if (enabled) return;
    const interval = setInterval(() => {
      setFlashState(prev => {
        const timeVariation = Math.sin(Date.now() / 10000) * 15; // ±15% variation
        const newVol = Math.max(10, Math.min(80, 35 + timeVariation));
        
        let newDuration = 24 * 3600; // Base 24 hours
        let flashActive = false;
        
        // Apply Flash Epochs logic
        if (newVol >= prev.volThresholdHigh) {
          // High vol → shorter epochs
          const reduction = (newVol - prev.volThresholdHigh) * prev.epochSpeedMultiplier / 100;
          newDuration = Math.max(1 * 3600, newDuration * (100 - reduction) / 100);
          flashActive = true;
        } else if (newVol <= prev.volThresholdLow) {
          // Low vol → longer epochs  
          const extension = (prev.volThresholdLow - newVol) * prev.epochSpeedMultiplier / 100;
          newDuration = Math.min(72 * 3600, newDuration * (100 + extension) / 100);
        }
        
        return {
          ...prev,
          currentVolatility: newVol,
          adaptiveDuration: newDuration,
          lastUpdate: Date.now(),
          flashTriggerActive: flashActive,
        };
      });
    }, 2000); // Update every 2 seconds for demo

    return () => clearInterval(interval);
  }, [enabled]);

  // Map on-chain state to UI state when available
  useEffect(() => {
    if (enabled && chainState) {
      setFlashState(prev => ({
        ...prev,
        currentVolatility: chainState.currentVolatility,
        adaptiveDuration: chainState.adaptiveDuration,
        baseDuration: chainState.baseDuration,
        lastUpdate: chainState.lastUpdate,
        flashTriggerActive: chainState.flashTriggerActive,
        volThresholdLow: chainState.volThresholdLow,
        volThresholdHigh: chainState.volThresholdHigh,
        epochSpeedMultiplier: chainState.epochSpeedMultiplier,
      }));
    }
  }, [enabled, chainState]);

  useEffect(() => {
    setIsFlashMode(flashState.flashTriggerActive);
  }, [flashState.flashTriggerActive]);

  const getVolatilityColor = () => {
    if (flashState.currentVolatility >= flashState.volThresholdHigh) return 'text-red-500';
    if (flashState.currentVolatility <= flashState.volThresholdLow) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getVolatilityIcon = () => {
    if (flashState.currentVolatility >= flashState.volThresholdHigh) return <TrendingUp className="text-red-500" />;
    if (flashState.currentVolatility <= flashState.volThresholdLow) return <TrendingDown className="text-green-500" />;
    return <BarChart3 className="text-yellow-500" />;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const durationChange = ((flashState.adaptiveDuration - flashState.baseDuration) / flashState.baseDuration * 100);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-500 ${
      isFlashMode ? 'ring-2 ring-red-500 ring-opacity-50' : ''
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className={`p-2 rounded-lg ${isFlashMode ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}
              animate={isFlashMode ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: isFlashMode ? Infinity : 0, repeatDelay: 1 }}
            >
              <Zap className={`${isFlashMode ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} size={24} />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Flash Epochs</h3>
              <p className="text-sm text-gray-600 dark:text-slate-500">
                Adaptive Volatility Response {enabled ? '(on-chain)' : '(demo)'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:opacity-90"
              onClick={() => updateVolatility()}
              disabled={isWritePending || !enabled}
              title="Update volatility from oracle"
            >
              Update Vol
            </button>
            <button
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:opacity-90"
              onClick={() => triggerFlashCheck()}
              disabled={isWritePending || !enabled}
              title="Check flash trigger"
            >
              Flash Check
            </button>
          </div>
          
          <AnimatePresence>
            {isFlashMode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full"
              >
                <AlertTriangle className="text-red-600 dark:text-red-400" size={16} />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">FLASH ACTIVE</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-6">
        {/* Current Volatility */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Market Volatility</span>
            <div className="flex items-center gap-2">
              {getVolatilityIcon()}
              <span className={`font-bold ${getVolatilityColor()}`}>
                {flashState.currentVolatility.toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Volatility Bar */}
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            {/* Background thresholds */}
            <div 
              className="absolute top-0 left-0 h-full bg-green-200 dark:bg-green-800/30"
              style={{ width: `${flashState.volThresholdLow}%` }}
            />
            <div 
              className="absolute top-0 h-full bg-red-200 dark:bg-red-800/30"
              style={{ left: `${flashState.volThresholdHigh}%`, right: '0' }}
            />
            
            {/* Current volatility indicator */}
            <motion.div
              className={`absolute top-0 h-full rounded-full transition-all duration-1000 ${
                flashState.currentVolatility >= flashState.volThresholdHigh 
                  ? 'bg-red-500' 
                  : flashState.currentVolatility <= flashState.volThresholdLow
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(flashState.currentVolatility, 100)}%` }}
              animate={isFlashMode ? { opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 1, repeat: isFlashMode ? Infinity : 0 }}
            />
          </div>
          
          {/* Threshold labels */}
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-500 mt-1">
            <span>Low: {flashState.volThresholdLow}%</span>
            <span>High: {flashState.volThresholdHigh}%</span>
          </div>
        </div>

        {/* Adaptive Duration */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-gray-600 dark:text-slate-500" size={16} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Epoch</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {formatDuration(flashState.adaptiveDuration)}
            </div>
            <div className={`text-xs ${
              durationChange > 0 ? 'text-red-500' : durationChange < 0 ? 'text-green-500' : 'text-slate-600'
            }`}>
              {durationChange > 0 ? '+' : ''}{durationChange.toFixed(1)}% from base
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="text-gray-600 dark:text-slate-500" size={16} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Speed Multiplier</span>
            </div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {flashState.epochSpeedMultiplier}x
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-500">
              Response sensitivity
            </div>
          </div>
        </div>

        {/* Flash Status */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Epoch Adaptation Status
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-500">
                Last update: {isClient ? new Date(flashState.lastUpdate).toLocaleTimeString('en-US', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                }) : '--:--:--'}
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isFlashMode 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : flashState.currentVolatility <= flashState.volThresholdLow
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
              {isFlashMode 
                ? 'HIGH VOLATILITY' 
                : flashState.currentVolatility <= flashState.volThresholdLow
                ? 'LOW VOLATILITY'
                : 'NORMAL VOLATILITY'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
