'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';

interface MacroCondition {
  metric: string;
  operator: string;
  threshold: number;
  isActive: boolean;
}

interface MacroAction {
  actionType: string;
  targetRatio?: number;
  maxSlippage: number;
  executeImmediately: boolean;
}

interface UserMacro {
  id: number;
  user: string;
  description: string;
  condition: MacroCondition;
  action: MacroAction;
  createdAt: number;
  lastTriggered: number;
  triggerCount: number;
  isActive: boolean;
}

const METRICS = [
  { value: 'IMPLIED_VOLATILITY', label: 'Implied Volatility (%)', icon: TrendingUp },
  { value: 'REALIZED_VOLATILITY', label: 'Realized Volatility (%)', icon: TrendingDown },
  { value: 'VIX_LEVEL', label: 'VIX Level', icon: AlertTriangle },
  { value: 'CORRELATION', label: 'Correlation (%)', icon: Target },
  { value: 'DRAWDOWN', label: 'Drawdown (%)', icon: TrendingDown },
  { value: 'NAV_RATIO', label: 'Senior/Junior NAV Ratio (%)', icon: Shield },
  { value: 'TIME_SINCE_EPOCH', label: 'Time Since Epoch (hours)', icon: Clock },
  { value: 'TOTAL_RETURN', label: 'Total Return (%)', icon: TrendingUp }
];

const OPERATORS = [
  { value: 'GREATER_THAN', label: '>', symbol: '>' },
  { value: 'LESS_THAN', label: '<', symbol: '<' },
  { value: 'GREATER_EQUAL', label: '>=', symbol: '>=' },
  { value: 'LESS_EQUAL', label: '<=', symbol: '<=' },
  { value: 'EQUAL', label: '==', symbol: '=' },
  { value: 'NOT_EQUAL', label: '!=', symbol: '≠' }
];

const ACTIONS = [
  { value: 'ALLOCATE_TO_SENIOR', label: 'Move All to Senior', icon: Shield, color: 'blue' },
  { value: 'ALLOCATE_TO_JUNIOR', label: 'Move All to Junior', icon: TrendingUp, color: 'purple' },
  { value: 'REBALANCE_RATIO', label: 'Rebalance to Ratio', icon: Target, color: 'green' },
  { value: 'PAUSE_DEPOSITS', label: 'Pause Deposits', icon: Pause, color: 'yellow' },
  { value: 'EMERGENCY_WITHDRAW', label: 'Emergency Withdraw', icon: AlertTriangle, color: 'red' }
];

export function SessionKeyMacrosPanel() {
  const [userMacros, setUserMacros] = useState<UserMacro[]>([
    {
      id: 1,
      user: '0x123...abc',
      description: 'IV > 60% → Move to Senior',
      condition: {
        metric: 'IMPLIED_VOLATILITY',
        operator: 'GREATER_THAN',
        threshold: 6000, // 60%
        isActive: true
      },
      action: {
        actionType: 'ALLOCATE_TO_SENIOR',
        maxSlippage: 100, // 1%
        executeImmediately: true
      },
      createdAt: Date.now() - 86400000,
      lastTriggered: 0,
      triggerCount: 0,
      isActive: true
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMacro, setNewMacro] = useState({
    description: '',
    metric: 'IMPLIED_VOLATILITY',
    operator: 'GREATER_THAN',
    threshold: 0,
    actionType: 'ALLOCATE_TO_SENIOR',
    targetRatio: 5000, // 50%
    maxSlippage: 100 // 1%
  });

  // Mock real-time metric values
  const [currentMetrics, setCurrentMetrics] = useState({
    IMPLIED_VOLATILITY: 45.2,
    REALIZED_VOLATILITY: 38.7,
    VIX_LEVEL: 22.1,
    CORRELATION: 73.5,
    DRAWDOWN: 5.8,
    NAV_RATIO: 102.3,
    TIME_SINCE_EPOCH: 14.2,
    TOTAL_RETURN: 8.7
  });

  // Simulate metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetrics(prev => ({
        ...prev,
        IMPLIED_VOLATILITY: Math.max(10, Math.min(80, prev.IMPLIED_VOLATILITY + (Math.random() - 0.5) * 2)),
        REALIZED_VOLATILITY: Math.max(8, Math.min(70, prev.REALIZED_VOLATILITY + (Math.random() - 0.5) * 1.5)),
        VIX_LEVEL: Math.max(10, Math.min(50, prev.VIX_LEVEL + (Math.random() - 0.5) * 1)),
        CORRELATION: Math.max(30, Math.min(95, prev.CORRELATION + (Math.random() - 0.5) * 1)),
        DRAWDOWN: Math.max(0, Math.min(20, prev.DRAWDOWN + (Math.random() - 0.5) * 0.5)),
        NAV_RATIO: Math.max(90, Math.min(110, prev.NAV_RATIO + (Math.random() - 0.5) * 0.2)),
        TIME_SINCE_EPOCH: (Date.now() % 86400000) / 3600000, // Hours since epoch start
        TOTAL_RETURN: Math.max(-15, Math.min(20, prev.TOTAL_RETURN + (Math.random() - 0.5) * 0.3))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const createMacro = () => {
    const macro: UserMacro = {
      id: userMacros.length + 1,
      user: '0x123...abc',
      description: newMacro.description || generateDescription(),
      condition: {
        metric: newMacro.metric,
        operator: newMacro.operator,
        threshold: newMacro.threshold * 100, // Convert to BPS
        isActive: true
      },
      action: {
        actionType: newMacro.actionType,
        targetRatio: newMacro.actionType === 'REBALANCE_RATIO' ? newMacro.targetRatio * 100 : undefined,
        maxSlippage: newMacro.maxSlippage,
        executeImmediately: true
      },
      createdAt: Date.now(),
      lastTriggered: 0,
      triggerCount: 0,
      isActive: true
    };

    setUserMacros([...userMacros, macro]);
    setShowCreateForm(false);
    setNewMacro({
      description: '',
      metric: 'IMPLIED_VOLATILITY',
      operator: 'GREATER_THAN',
      threshold: 0,
      actionType: 'ALLOCATE_TO_SENIOR',
      targetRatio: 5000,
      maxSlippage: 100
    });
  };

  const generateDescription = () => {
    const metric = METRICS.find(m => m.value === newMacro.metric)?.label || 'Metric';
    const operator = OPERATORS.find(o => o.value === newMacro.operator)?.symbol || '>';
    const action = ACTIONS.find(a => a.value === newMacro.actionType)?.label || 'Action';
    return `${metric} ${operator} ${newMacro.threshold}% → ${action}`;
  };

  const toggleMacro = (id: number) => {
    setUserMacros(macros => 
      macros.map(macro => 
        macro.id === id ? { ...macro, isActive: !macro.isActive } : macro
      )
    );
  };

  const deleteMacro = (id: number) => {
    setUserMacros(macros => macros.filter(macro => macro.id !== id));
  };

  const checkTrigger = (macro: UserMacro) => {
    const currentValue = currentMetrics[macro.condition.metric as keyof typeof currentMetrics];
    const threshold = macro.condition.threshold / 100;
    
    switch (macro.condition.operator) {
      case 'GREATER_THAN': return currentValue > threshold;
      case 'LESS_THAN': return currentValue < threshold;
      case 'GREATER_EQUAL': return currentValue >= threshold;
      case 'LESS_EQUAL': return currentValue <= threshold;
      case 'EQUAL': return Math.abs(currentValue - threshold) < 0.1;
      case 'NOT_EQUAL': return Math.abs(currentValue - threshold) >= 0.1;
      default: return false;
    }
  };

  const getActionColor = (actionType: string) => {
    const action = ACTIONS.find(a => a.value === actionType);
    return action?.color || 'gray';
  };

  const getActionIcon = (actionType: string) => {
    const action = ACTIONS.find(a => a.value === actionType);
    return action?.icon || Settings;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Settings className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Session-Key Macros</h3>
              <p className="text-sm text-gray-600 dark:text-slate-500">Conditional Rules & Automation</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} />
            Add Macro
          </button>
        </div>
      </div>

      {/* Current Metrics */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(currentMetrics).slice(0, 4).map(([key, value]) => {
            const metric = METRICS.find(m => m.value === key);
            return (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  {metric?.icon && <metric.icon size={14} className="text-slate-600" />}
                  <span className="text-xs text-gray-600 dark:text-slate-500 truncate">
                    {metric?.label.replace(' (%)', '') || key}
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  {value.toFixed(1)}{key.includes('VOLATILITY') || key.includes('RATIO') || key.includes('RETURN') || key.includes('CORRELATION') || key.includes('DRAWDOWN') ? '%' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Macro List */}
      <div className="p-6">
        <div className="space-y-4">
          {userMacros.map((macro) => {
            const triggered = macro.isActive && checkTrigger(macro);
            const ActionIcon = getActionIcon(macro.action.actionType);
            const actionColor = getActionColor(macro.action.actionType);
            
            return (
              <motion.div
                key={macro.id}
                layout
                className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-l-4 transition-all duration-300 ${
                  triggered 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                    : macro.isActive 
                    ? 'border-green-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      triggered 
                        ? 'bg-orange-100 dark:bg-orange-900/30' 
                        : `bg-${actionColor}-100 dark:bg-${actionColor}-900/30`
                    }`}>
                      <ActionIcon className={`${
                        triggered 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : `text-${actionColor}-600 dark:text-${actionColor}-400`
                      }`} size={16} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 dark:text-white">
                        {macro.description}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-slate-500">
                        <span>Triggers: {macro.triggerCount}</span>
                        <span>Last: {macro.lastTriggered ? new Date(macro.lastTriggered).toLocaleDateString() : 'Never'}</span>
                        {triggered && (
                          <motion.span 
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium"
                          >
                            <Zap size={12} />
                            TRIGGERED
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      macro.isActive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-500'
                    }`}>
                      {macro.isActive ? 'Active' : 'Paused'}
                    </div>
                    
                    <button
                      onClick={() => toggleMacro(macro.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {macro.isActive ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    
                    <button
                      onClick={() => deleteMacro(macro.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {userMacros.length === 0 && (
          <div className="text-center py-8">
            <Settings className="mx-auto mb-3 text-slate-500" size={48} />
            <p className="text-gray-600 dark:text-slate-500 mb-4">No macros created yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Your First Macro
            </button>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Create New Macro</h3>
              
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newMacro.description}
                    onChange={(e) => setNewMacro({...newMacro, description: e.target.value})}
                    placeholder={generateDescription()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>

                {/* Condition */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Metric
                    </label>
                    <select
                      value={newMacro.metric}
                      onChange={(e) => setNewMacro({...newMacro, metric: e.target.value})}
                      className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-xs"
                    >
                      {METRICS.map(metric => (
                        <option key={metric.value} value={metric.value}>
                          {metric.label.replace(' (%)', '').replace(' (hours)', '').replace(' (seconds)', '')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Operator
                    </label>
                    <select
                      value={newMacro.operator}
                      onChange={(e) => setNewMacro({...newMacro, operator: e.target.value})}
                      className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.symbol}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      value={newMacro.threshold}
                      onChange={(e) => setNewMacro({...newMacro, threshold: Number(e.target.value)})}
                      className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      placeholder="60"
                    />
                  </div>
                </div>

                {/* Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Action
                  </label>
                  <select
                    value={newMacro.actionType}
                    onChange={(e) => setNewMacro({...newMacro, actionType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  >
                    {ACTIONS.map(action => (
                      <option key={action.value} value={action.value}>{action.label}</option>
                    ))}
                  </select>
                </div>

                {/* Target Ratio (if rebalance) */}
                {newMacro.actionType === 'REBALANCE_RATIO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Senior Ratio (%)
                    </label>
                    <input
                      type="number"
                      value={newMacro.targetRatio / 100}
                      onChange={(e) => setNewMacro({...newMacro, targetRatio: Number(e.target.value) * 100})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      placeholder="50"
                      min="0"
                      max="100"
                    />
                  </div>
                )}

                {/* Max Slippage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Slippage (%)
                  </label>
                  <input
                    type="number"
                    value={newMacro.maxSlippage / 100}
                    onChange={(e) => setNewMacro({...newMacro, maxSlippage: Number(e.target.value) * 100})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    placeholder="1"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createMacro}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Macro
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}