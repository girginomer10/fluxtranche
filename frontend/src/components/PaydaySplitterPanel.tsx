'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Zap, Settings, PieChart, Calendar, CheckCircle } from 'lucide-react';

interface PaydayRule {
  seniorBps: number;
  juniorBps: number;
  billsBps: number;
  enabled: boolean;
  nextPayday: Date;
  lastAmount?: number;
}

interface PaydaySimulation {
  amount: number;
  seniorAllocation: number;
  juniorAllocation: number;
  billsAllocation: number;
  timestamp: Date;
}

export function PaydaySplitterPanel() {
  const [paydayRule, setPaydayRule] = useState<PaydayRule>({
    seniorBps: 6000, // 60%
    juniorBps: 3000, // 30%
    billsBps: 1000,  // 10%
    enabled: true,
    nextPayday: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    lastAmount: 5000
  });

  const [recentSplits, setRecentSplits] = useState<PaydaySimulation[]>([
    {
      amount: 5000,
      seniorAllocation: 3000,
      juniorAllocation: 1500,
      billsAllocation: 500,
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      amount: 5200,
      seniorAllocation: 3120,
      juniorAllocation: 1560,
      billsAllocation: 520,
      timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [simulationAmount, setSimulationAmount] = useState('5000');

  const handleRuleUpdate = (field: keyof PaydayRule, value: number | boolean | Date) => {
    setPaydayRule(prev => ({ ...prev, [field]: value }));
  };

  const simulatePayday = () => {
    const amount = parseFloat(simulationAmount);
    if (isNaN(amount) || amount <= 0) return;

    const seniorAllocation = (amount * paydayRule.seniorBps) / 10000;
    const juniorAllocation = (amount * paydayRule.juniorBps) / 10000;
    const billsAllocation = (amount * paydayRule.billsBps) / 10000;

    const newSplit: PaydaySimulation = {
      amount,
      seniorAllocation,
      juniorAllocation,
      billsAllocation,
      timestamp: new Date()
    };

    setRecentSplits(prev => [newSplit, ...prev.slice(0, 4)]);
    setPaydayRule(prev => ({ ...prev, lastAmount: amount }));
  };

  const daysUntilPayday = Math.ceil((paydayRule.nextPayday.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Payday Splitter
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-500">
                Smart salary allocation
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs ${
              paydayRule.enabled 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-500'
            }`}>
              {paydayRule.enabled ? 'Active' : 'Inactive'}
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-slate-500 hover:text-green-600"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
          >
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 dark:text-white mb-4">
                Allocation Rules
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-slate-500 mb-2">
                    Senior (Safe) %
                  </label>
                  <input
                    type="number"
                    value={paydayRule.seniorBps / 100}
                    onChange={(e) => handleRuleUpdate('seniorBps', parseFloat(e.target.value) * 100)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 dark:text-slate-500 mb-2">
                    Junior (Growth) %
                  </label>
                  <input
                    type="number"
                    value={paydayRule.juniorBps / 100}
                    onChange={(e) => handleRuleUpdate('juniorBps', parseFloat(e.target.value) * 100)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 dark:text-slate-500 mb-2">
                    Bills Buffer %
                  </label>
                  <input
                    type="number"
                    value={paydayRule.billsBps / 100}
                    onChange={(e) => handleRuleUpdate('billsBps', parseFloat(e.target.value) * 100)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={paydayRule.enabled}
                    onChange={(e) => handleRuleUpdate('enabled', e.target.checked)}
                    className="rounded text-green-600"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Auto-split enabled
                  </label>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-slate-500">
                  Total: {((paydayRule.seniorBps + paydayRule.juniorBps + paydayRule.billsBps) / 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Payday Countdown */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-500" size={18} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Next Payday
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {daysUntilPayday} days
            </div>
            <div className="text-xs text-gray-600 dark:text-slate-500">
              {paydayRule.nextPayday.toLocaleDateString()}
            </div>
          </div>
        </div>
        
        {paydayRule.lastAmount && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-sm text-gray-600 dark:text-slate-500 mb-1">
              Expected split for ${paydayRule.lastAmount.toLocaleString()}:
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  ${((paydayRule.lastAmount * paydayRule.seniorBps) / 10000).toLocaleString()}
                </span>
                <div className="text-xs text-slate-600">Senior</div>
              </div>
              <div>
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  ${((paydayRule.lastAmount * paydayRule.juniorBps) / 10000).toLocaleString()}
                </span>
                <div className="text-xs text-slate-600">Junior</div>
              </div>
              <div>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ${((paydayRule.lastAmount * paydayRule.billsBps) / 10000).toLocaleString()}
                </span>
                <div className="text-xs text-slate-600">Bills</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulation */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Test Your Split
        </h3>
        
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={simulationAmount}
              onChange={(e) => setSimulationAmount(e.target.value)}
              placeholder="Enter salary amount"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={simulatePayday}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Zap size={16} />
            Split Now
          </button>
        </div>
      </div>

      {/* Recent Splits */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Recent Splits
        </h3>
        
        <div className="space-y-3">
          {recentSplits.map((split, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="font-medium text-gray-800 dark:text-white">
                    ${split.amount.toLocaleString()} Split
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-500">
                  {split.timestamp.toLocaleDateString()}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    ${split.seniorAllocation.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-500">Senior</div>
                </div>
                
                <div className="text-center p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                  <div className="font-medium text-purple-600 dark:text-purple-400">
                    ${split.juniorAllocation.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-500">Junior</div>
                </div>
                
                <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                  <div className="font-medium text-green-600 dark:text-green-400">
                    ${split.billsAllocation.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-500">Bills</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {recentSplits.length === 0 && (
          <div className="text-center py-8 text-slate-600 dark:text-slate-500">
            <PieChart className="mx-auto mb-2" size={32} />
            <p>No recent splits</p>
            <p className="text-sm">Your payday splits will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}