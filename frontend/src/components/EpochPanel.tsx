'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { useTrancheVault } from '@/hooks/useTrancheVault';

export function EpochPanel() {
  const { epochData, totalAssets } = useTrancheVault();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [mockData, setMockData] = useState<any>(null);

  // Generate mock data if no real data
  useEffect(() => {
    if (!epochData) {
      const now = Date.now() / 1000;
      setMockData({
        index: 1,
        startTime: now - 3600,
        endTime: now + 82800,
        seniorAssets: '500000',
        juniorAssets: '250000',
        totalReturn: '2.5',
        settled: false,
        timeRemaining: 82800,
      });
    }
  }, [epochData]);

  const currentData = epochData || mockData;

  useEffect(() => {
    if (!currentData) return;

    const interval = setInterval(() => {
      const remaining = currentData.timeRemaining;
      if (remaining <= 0) {
        setTimeLeft('Epoch Ended');
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = Math.floor(remaining % 60);
      
      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      const secondsStr = seconds.toString().padStart(2, '0');
      
      setTimeLeft(`${hoursStr}:${minutesStr}:${secondsStr}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentData]);

  if (!currentData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentData.startTime - Date.now() / 1000 + 86400 - currentData.timeRemaining) / 86400) * 100;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Epoch #{currentData.index}
            </h2>
            <p className="text-slate-600 font-medium">Current tranche epoch status and metrics</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-6 ${
          currentData.settled 
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'bg-blue-50 text-blue-600 border border-blue-200'
        }`}>
          {currentData.settled ? (
            <>
              <CheckCircle size={14} />
              Settled
            </>
          ) : (
            <>
              <Clock size={14} />
              Active
            </>
          )}
        </div>

        {/* Timer */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600 font-medium">Time Remaining</span>
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {timeLeft || '00:00:00'}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-blue-500" size={18} />
              <span className="text-xs text-slate-600 font-medium">Senior Pool</span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              ${Number(currentData.seniorAssets).toLocaleString()}
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-purple-500" size={18} />
              <span className="text-xs text-slate-600 font-medium">Junior Pool</span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              ${Number(currentData.juniorAssets).toLocaleString()}
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-emerald-500" size={18} />
              <span className="text-xs text-slate-600 font-medium">Total Assets</span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              ${Number(totalAssets || (parseInt(currentData.seniorAssets) + parseInt(currentData.juniorAssets))).toLocaleString()}
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              {Number(currentData.totalReturn) >= 0 ? (
                <TrendingUp className="text-emerald-500" size={18} />
              ) : (
                <AlertCircle className="text-red-500" size={18} />
              )}
              <span className="text-xs text-slate-600 font-medium">Last Return</span>
            </div>
            <div className={`text-xl font-bold ${
              Number(currentData.totalReturn) >= 0 
                ? 'text-emerald-600' 
                : 'text-red-600'
            }`}>
              {Number(currentData.totalReturn) >= 0 ? '+' : ''}{currentData.totalReturn}%
            </div>
          </motion.div>
        </div>

        {/* Epoch Info */}
        <div className="pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600 font-medium">Started</span>
              <div className="text-slate-900 font-semibold">
                {new Date(currentData.startTime * 1000).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-slate-600 font-medium">Ends</span>
              <div className="text-slate-900 font-semibold">
                {new Date(currentData.endTime * 1000).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}