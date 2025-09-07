'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, TrendingDown, AlertTriangle, DollarSign, Clock, Target, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useDrawdownShield } from '@/hooks/useDrawdownShield';

interface ShieldTier {
  name: string;
  threshold: number;
  premium: number;
  color: string;
  bgColor: string;
  icon: any;
  description: string;
}

const SHIELD_TIERS: ShieldTier[] = [
  {
    name: "Basic Shield",
    threshold: 50, // 0.5%
    premium: 12.5,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: Shield,
    description: "Protects against minor downturns"
  },
  {
    name: "Standard Shield", 
    threshold: 100, // 1%
    premium: 25,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Target,
    description: "Balanced protection for most scenarios"
  },
  {
    name: "Premium Shield",
    threshold: 200, // 2%
    premium: 60,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    icon: AlertTriangle,
    description: "Enhanced coverage for volatile periods"
  },
  {
    name: "Max Shield",
    threshold: 500, // 5%
    premium: 200,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: Activity,
    description: "Maximum protection against major losses"
  }
];

export function DrawdownShieldPanel() {
  const { enabled, state, isWritePending, purchaseShield, claimShield, cancelShield } = useDrawdownShield();
  const [selectedTier, setSelectedTier] = useState(1); // Standard Shield
  const [notionalAmount, setNotionalAmount] = useState('');
  const [duration, setDuration] = useState(12); // epochs
  const [showPurchase, setShowPurchase] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'history'>('overview');

  const selectedShieldTier = SHIELD_TIERS[selectedTier];
  const estimatedPremium = notionalAmount ? 
    (parseFloat(notionalAmount) * selectedShieldTier.premium / 10000 * duration) : 0;

  const handlePurchase = async () => {
    if (!notionalAmount) return;
    
    try {
      const notional = BigInt(Math.floor(parseFloat(notionalAmount) * 1e6)); // USDC decimals
      await purchaseShield(selectedShieldTier.threshold, notional, duration);
      setNotionalAmount('');
      setShowPurchase(false);
    } catch (error) {
      console.error('Shield purchase failed:', error);
    }
  };

  const handleClaim = async (shieldId: string) => {
    try {
      await claimShield(shieldId);
    } catch (error) {
      console.error('Shield claim failed:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  if (!state) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Drawdown Shield</h3>
              <p className="text-sm text-gray-600 dark:text-slate-500">
                Parametric Loss Protection {enabled ? '(on-chain)' : '(demo)'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-slate-500">Pool Reserves</div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">
                ${state.pool.totalReserves.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setShowPurchase(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium rounded-lg transition-all"
            >
              Get Shield
            </button>
          </div>
        </div>
      </div>

      {/* Pool Status */}
      <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {state.pool.totalPolicies}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Active Policies</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(state.pool.utilizationRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Pool Utilization</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {state.pool.fundingSourceAPY.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Funding APY</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {state.pool.activeClaims}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Active Claims</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-6 pb-0">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['overview', 'policies', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm capitalize -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-600 dark:text-slate-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Shield Tiers */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Protection Tiers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SHIELD_TIERS.map((tier, index) => {
                  const Icon = tier.icon;
                  return (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 ${tier.bgColor} rounded-lg`}>
                          <Icon className={tier.color} size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {tier.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-500">
                            {tier.threshold / 100}% threshold
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-slate-500 mb-3">
                        {tier.description}
                      </p>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-slate-500">Premium Rate:</span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {tier.premium / 100}% per epoch
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Drawdown Events */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Recent Drawdown Events
              </h4>
              <div className="space-y-3">
                {state.recentEvents.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        event.drawdownBps >= 100 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                        <TrendingDown className={
                          event.drawdownBps >= 100 ? 'text-red-600' : 'text-yellow-600'
                        } size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          Epoch #{event.epoch}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-500">
                          {formatTimeAgo(event.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-800 dark:text-white">
                        -{(event.drawdownBps / 100).toFixed(2)}%
                      </div>
                      {event.shieldsTriggered > 0 && (
                        <div className="text-sm text-green-600">
                          {event.shieldsTriggered} shields paid ${event.totalPayout.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            {state.userShields.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="mx-auto mb-4 text-slate-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  No Active Shields
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-500 mb-4">
                  Purchase a shield policy to protect your Senior tranche positions
                </p>
                <button
                  onClick={() => setShowPurchase(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  Get Your First Shield
                </button>
              </div>
            ) : (
              state.userShields.map((shield) => (
                <div
                  key={shield.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        shield.active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {shield.active ? (
                          <CheckCircle className="text-green-600" size={20} />
                        ) : (
                          <XCircle className="text-slate-600" size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">
                          {(shield.threshold / 100).toFixed(1)}% Shield
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-500">
                          ${shield.notional.toLocaleString()} coverage
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-slate-500">
                        {shield.epochsRemaining} epochs remaining
                      </div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        Premium: ${shield.premium.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-slate-500">Total Claimed:</span>
                      <span className="ml-2 font-medium text-gray-800 dark:text-white">
                        ${shield.totalClaimed.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-500">Max Claim:</span>
                      <span className="ml-2 font-medium text-gray-800 dark:text-white">
                        ${shield.maxClaim.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleClaim(shield.id)}
                      disabled={isWritePending || !shield.active}
                      className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                      {isWritePending ? 'Processing...' : 'Claim Payout'}
                    </button>
                    <button
                      onClick={() => cancelShield(shield.id)}
                      disabled={isWritePending}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Clock className="mx-auto mb-4 text-slate-500" size={48} />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Claim History
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-500">
                Your shield claims and payouts will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && setShowPurchase(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Purchase Shield
                </h3>
                <button
                  onClick={() => setShowPurchase(false)}
                  className="p-2 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Tier Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Protection Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SHIELD_TIERS.map((tier, index) => {
                    const Icon = tier.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedTier(index)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedTier === index
                            ? 'border-orange-500 ring-2 ring-orange-500/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={tier.color} size={16} />
                          <span className="font-medium text-gray-800 dark:text-white text-sm">
                            {tier.threshold / 100}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-500">
                          {tier.premium / 100}% premium
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coverage Amount (USDC)
                </label>
                <input
                  type="number"
                  value={notionalAmount}
                  onChange={(e) => setNotionalAmount(e.target.value)}
                  placeholder="10000"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration ({duration} epochs)
                </label>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>1 epoch</span>
                  <span>24 epochs</span>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-slate-500">Coverage:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    ${notionalAmount ? parseFloat(notionalAmount).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-slate-500">Threshold:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {selectedShieldTier.threshold / 100}%
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-slate-500">Duration:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {duration} epochs
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-800 dark:text-white">Total Premium:</span>
                  <span className="text-orange-600">
                    ${estimatedPremium.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={!notionalAmount || isWritePending}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
              >
                {isWritePending ? 'Purchasing Shield...' : 'Purchase Shield'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}