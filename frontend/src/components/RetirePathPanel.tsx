'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingDown, Shield, Target, Settings } from 'lucide-react';

interface GlidepathData {
  currentDate: Date;
  targetDate: Date;
  daysRemaining: number;
  currentSeniorBps: number;
  targetSeniorBps: number;
  progressPercentage: number;
  nextAdjustment: Date;
}

export function RetirePathPanel() {
  const [glidepathData, setGlidepathData] = useState<GlidepathData | null>(null);
  const [targetDate, setTargetDate] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Initialize with mock data - normally would come from contract/API
    const mockTargetDate = new Date();
    mockTargetDate.setFullYear(mockTargetDate.getFullYear() + 3); // 3 years from now
    
    const currentDate = new Date();
    const daysRemaining = Math.floor((mockTargetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = 3 * 365; // 3 years
    const progressPercentage = ((totalDays - daysRemaining) / totalDays) * 100;
    
    // Glidepath: Start at 60% Senior, end at 90% Senior
    const startSeniorBps = 6000;
    const endSeniorBps = 9000;
    const currentSeniorBps = startSeniorBps + ((endSeniorBps - startSeniorBps) * progressPercentage / 100);
    
    const nextAdjustment = new Date();
    nextAdjustment.setDate(nextAdjustment.getDate() + 30); // Next adjustment in 30 days

    setGlidepathData({
      currentDate,
      targetDate: mockTargetDate,
      daysRemaining,
      currentSeniorBps: Math.round(currentSeniorBps),
      targetSeniorBps: endSeniorBps,
      progressPercentage,
      nextAdjustment
    });

    setTargetDate(mockTargetDate.toISOString().split('T')[0]);
  }, []);

  const handleTargetDateChange = (newDate: string) => {
    setTargetDate(newDate);
    // Would update contract here
  };

  const simulateTimePass = () => {
    if (!glidepathData) return;
    
    // Simulate 6 months passing
    const newDate = new Date();
    newDate.setMonth(newDate.getMonth() + 6);
    
    const daysRemaining = Math.floor((glidepathData.targetDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = 3 * 365;
    const progressPercentage = ((totalDays - daysRemaining) / totalDays) * 100;
    
    const startSeniorBps = 6000;
    const endSeniorBps = 9000;
    const currentSeniorBps = startSeniorBps + ((endSeniorBps - startSeniorBps) * progressPercentage / 100);
    
    setGlidepathData({
      ...glidepathData,
      currentDate: newDate,
      daysRemaining,
      currentSeniorBps: Math.round(currentSeniorBps),
      progressPercentage
    });
  };

  if (!glidepathData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Calendar className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                RetirePath
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-500">
                Target-Date Glidepath
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-slate-500 hover:text-green-600"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Retirement Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => handleTargetDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <button
              onClick={simulateTimePass}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
            >
              Demo: Fast Forward 6 Months
            </button>
          </div>
        </motion.div>
      )}

      {/* Progress Overview */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {Math.round(glidepathData.progressPercentage)}% Complete
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">
              {glidepathData.daysRemaining} days to retirement
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-slate-500">Target Date</div>
            <div className="font-medium text-gray-800 dark:text-white">
              {glidepathData.targetDate.toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${glidepathData.progressPercentage}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      {/* Current Allocation */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Current Risk Allocation
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-blue-500" size={18} />
              <span className="text-sm text-gray-600 dark:text-slate-500">Senior (Safe)</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(glidepathData.currentSeniorBps / 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="text-purple-500" size={18} />
              <span className="text-sm text-gray-600 dark:text-slate-500">Junior (Growth)</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {((10000 - glidepathData.currentSeniorBps) / 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Glidepath Visualization */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Risk Reduction Path
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-slate-500">Today</span>
            <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" 
                style={{ width: `${(glidepathData.currentSeniorBps / 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              {(glidepathData.currentSeniorBps / 100).toFixed(0)}% Safe
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-slate-500">Target</span>
            <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full" 
                style={{ width: `${(glidepathData.targetSeniorBps / 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              {(glidepathData.targetSeniorBps / 100).toFixed(0)}% Safe
            </span>
          </div>
        </div>
      </div>

      {/* Next Actions */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Automatic Adjustments
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Target className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-white">
                Next Adjustment: {glidepathData.nextAdjustment.toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-500">
                Risk will automatically decrease as retirement approaches
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-white">
                Glidepath Protection Active
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-500">
                Drawdown shield increases automatically near retirement
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}