'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, TrendingUp, Shield, Zap } from 'lucide-react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface AIDecision {
  epochLength: number;
  seniorTargetBps: number;
  maxDrawdownBps: number;
  slippageBps: number;
  strategies: string[];
  targetWeightsBps: number[];
  caps: number[];
  reasons: string[];
  confidence: number;
  timestamp: number;
  signals: {
    impliedVol: number;
    fundingRate: number;
    liquidityDepth: number;
    correlation: number;
    twapDeviation: number;
  };
}

export function AIDecisionViewer() {
  const [aiDecision, setAiDecision] = useState<AIDecision | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAIDecision = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/decision');
      if (response.ok) {
        const data = await response.json();
        setAiDecision(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI decision:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAIDecision();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAIDecision, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getRiskLevel = () => {
    if (!aiDecision) return 'Unknown';
    const drawdown = aiDecision.maxDrawdownBps / 100;
    if (drawdown <= 10) return 'Low';
    if (drawdown <= 20) return 'Medium';
    return 'High';
  };

  const getRiskColor = () => {
    const risk = getRiskLevel();
    if (risk === 'Low') return 'text-green-600 dark:text-green-400';
    if (risk === 'Medium') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                AI Risk Engine
              </h2>
              <p className="text-slate-600 font-medium">
                Powered by Gemini 2.0 Pro
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-3 rounded-lg transition-all duration-200 ${
                autoRefresh 
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RefreshCw size={18} className={autoRefresh ? 'animate-spin' : ''} />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all duration-200"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {aiDecision && (
        <div className="p-6 grid grid-cols-3 gap-4 border-b border-slate-200">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield size={18} className="text-blue-500" />
              <span className="text-xs text-slate-600 font-medium">Risk Level</span>
            </div>
            <div className={`text-lg font-bold ${getRiskColor()}`}>
              {getRiskLevel()}
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-slate-50 to-green-50 border border-slate-200 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-500" />
              <span className="text-xs text-slate-600 font-medium">Confidence</span>
            </div>
            <div className="text-lg font-bold text-slate-800">
              {typeof aiDecision.confidence === 'number' ? aiDecision.confidence.toFixed(1) : 0}%
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-slate-50 to-purple-50 border border-slate-200 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap size={18} className="text-purple-500" />
              <span className="text-xs text-slate-600 font-medium">Strategies</span>
            </div>
            <div className="text-lg font-bold text-slate-800">
              {typeof aiDecision.strategies === 'number' ? aiDecision.strategies : aiDecision.strategies?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {aiDecision && aiDecision.reasons && aiDecision.reasons.length > 0 && (
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            AI Reasoning
          </h3>
          <div className="space-y-2">
            {aiDecision.reasons.map((reason, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">{reason}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Market Signals */}
      {aiDecision && (
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Market Signals
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {aiDecision.signals && Object.entries(aiDecision.signals).map(([key, value]) => (
              <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-600 font-medium mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expanded JSON View */}
      <AnimatePresence>
        {isExpanded && aiDecision && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                Raw Decision Data
              </h3>
              <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
                <JsonView 
                  data={aiDecision} 
                  style={{
                    container: 'font-mono text-xs',
                    basicChildStyle: 'ml-4',
                    label: 'text-purple-600',
                    nullValue: 'text-red-600',
                    undefinedValue: 'text-red-600',
                    numberValue: 'text-blue-600',
                    stringValue: 'text-green-600',
                    booleanValue: 'text-orange-600',
                    otherValue: 'text-slate-600',
                    punctuation: 'text-slate-500',
                    collapseIcon: 'text-slate-600',
                    expandIcon: 'text-slate-600',
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Brain className="text-purple-600 animate-pulse" size={32} />
            <p className="text-sm text-slate-700 font-medium">Analyzing market conditions...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!aiDecision && !isLoading && (
        <div className="p-6 text-center">
          <AlertTriangle className="text-yellow-500 mx-auto mb-3" size={32} />
          <p className="text-sm text-slate-700">
            No AI decision available. Please check your connection.
          </p>
          <button
            onClick={fetchAIDecision}
            className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}