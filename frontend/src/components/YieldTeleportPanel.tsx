'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, Clock, DollarSign, ArrowRight, Gift, Calendar, Target, RefreshCw } from 'lucide-react';
import { useYieldTeleport } from '@/hooks/useYieldTeleport';

export function YieldTeleportPanel() {
  const { enabled, state, isWritePending, advanceYield, redeemNote, earlyRedeem } = useYieldTeleport();
  const [selectedOption, setSelectedOption] = useState(1); // Medium-term default
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'advance' | 'notes' | 'forecast'>('advance');

  const selectedAdvance = state?.advanceOptions[selectedOption];
  const estimatedYield = advanceAmount && selectedAdvance ? 
    parseFloat(advanceAmount) * selectedAdvance.yieldRate * selectedAdvance.epochs : 0;

  const handleAdvance = async () => {
    if (!advanceAmount || !selectedAdvance) return;
    
    try {
      const amount = BigInt(Math.floor(parseFloat(advanceAmount) * 1e6)); // USDC decimals
      await advanceYield(selectedAdvance.epochs, amount);
      setAdvanceAmount('');
      setShowAdvanceModal(false);
    } catch (error) {
      console.error('Yield advance failed:', error);
    }
  };

  const handleRedeem = async (tokenId: string) => {
    try {
      await redeemNote(tokenId);
    } catch (error) {
      console.error('Note redemption failed:', error);
    }
  };

  const formatTimeToMaturity = (maturityEpoch: number, currentEpoch: number) => {
    const epochsLeft = maturityEpoch - currentEpoch;
    if (epochsLeft <= 0) return "Matured";
    if (epochsLeft === 1) return "1 epoch";
    return `${epochsLeft} epochs`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!state) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Yield Teleport</h3>
              <p className="text-sm text-gray-600 dark:text-slate-500">
                Future Yield to Present Cash {enabled ? '(on-chain)' : '(demo)'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-slate-500">Available Advance</div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">
                ${state.pool.availableAdvance.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium rounded-lg transition-all"
            >
              Get Advance
            </button>
          </div>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              ${state.pool.totalAdvanced.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Total Advanced</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {state.pool.activeNotes}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Active Notes</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">
              {state.pool.averageMaturity.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Avg Maturity (epochs)</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {((1 - state.pool.defaultRate) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-500">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-6 pb-0">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['advance', 'notes', 'forecast'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm capitalize -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-purple-500 text-purple-600'
                  : 'text-gray-600 dark:text-slate-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Advance Tab */}
        {activeTab === 'advance' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Advance Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.advanceOptions.map((option, index) => (
                  <motion.div
                    key={index}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedOption === index
                        ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedOption(index)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="text-purple-600" size={16} />
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {option.epochs} Epochs
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-slate-500">Max Advance</div>
                        <div className="font-bold text-gray-800 dark:text-white">
                          ${option.maxAdvance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-slate-500 mb-3">
                      {option.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-slate-500">Yield Rate:</span>
                        <div className="font-medium text-green-600">
                          {(option.yieldRate * 100).toFixed(1)}% per epoch
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-slate-500">Collateral:</span>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {option.collateralRatio.toFixed(2)}x
                        </div>
                      </div>
                    </div>
                    
                    {/* Yield Projection Bar */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Total Expected Return</span>
                        <span>{((option.yieldRate * option.epochs) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          style={{ width: `${Math.min((option.yieldRate * option.epochs) * 1000, 100)}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick Calculator */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="text-purple-600" size={16} />
                <h4 className="font-medium text-gray-800 dark:text-white">Advance Calculator</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Advance Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Term
                  </label>
                  <div className="p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <span className="text-gray-800 dark:text-white">
                      {selectedAdvance?.epochs} epochs @ {((selectedAdvance?.yieldRate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expected Total Yield
                  </label>
                  <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-800/30 dark:to-pink-800/30 rounded-lg">
                    <span className="text-lg font-bold text-purple-600">
                      ${estimatedYield.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 dark:text-slate-500">
                    You get now: <strong className="text-gray-800 dark:text-white">${advanceAmount || '0'}</strong>
                  </span>
                  <ArrowRight className="text-slate-500" size={16} />
                  <span className="text-gray-600 dark:text-slate-500">
                    Future yield claim: <strong className="text-purple-600">${estimatedYield.toFixed(2)}</strong>
                  </span>
                </div>
                
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  disabled={!advanceAmount || isWritePending}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {isWritePending ? 'Processing...' : 'Get Advance'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {state.userNotes.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="mx-auto mb-4 text-slate-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  No Yield Notes
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-500 mb-4">
                  Create your first yield advance to get started
                </p>
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                >
                  Get First Advance
                </button>
              </div>
            ) : (
              state.userNotes.map((note) => {
                const progress = (note.futureEpochs - note.remainingClaims) / note.futureEpochs;
                const canRedeem = note.remainingClaims === 0;
                
                return (
                  <div
                    key={note.tokenId}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          canRedeem ? 'bg-green-100 dark:bg-green-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
                        }`}>
                          {canRedeem ? (
                            <Gift className="text-green-600" size={20} />
                          ) : (
                            <Clock className="text-purple-600" size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white">
                            Yield Note #{note.tokenId}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-slate-500">
                            Created {formatDate(note.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-slate-500">
                          {formatTimeToMaturity(note.maturityEpoch, note.currentEpoch)}
                        </div>
                        <div className="font-bold text-gray-800 dark:text-white">
                          ${note.notional.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-slate-500">Yield Progress</span>
                        <span className="text-gray-800 dark:text-white">
                          {((1 - progress) * 100).toFixed(1)}% remaining
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="text-gray-600 dark:text-slate-500">Yield Rate</div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {(note.yieldRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-slate-500">Total Yield</div>
                        <div className="font-medium text-green-600">
                          ${note.totalExpectedYield.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-slate-500">Remaining Claims</div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {note.remainingClaims}/{note.futureEpochs}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-slate-500">Status</div>
                        <div className={`font-medium ${
                          canRedeem ? 'text-green-600' : note.isActive ? 'text-purple-600' : 'text-slate-600'
                        }`}>
                          {canRedeem ? 'Ready' : note.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRedeem(note.tokenId)}
                        disabled={isWritePending || !canRedeem}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                      >
                        {isWritePending ? 'Redeeming...' : canRedeem ? 'Redeem Note' : 'Not Ready'}
                      </button>
                      <button
                        onClick={() => earlyRedeem(note.tokenId, BigInt(Math.floor(note.notional * 0.8 * 1e6)))}
                        disabled={isWritePending || canRedeem}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        Early Exit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-800 dark:text-white">
                Junior Yield Forecast
              </h4>
              <button className="p-2 text-gray-600 hover:text-gray-800 dark:text-slate-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>
            
            {state.yieldForecast ? (
              <div className="space-y-3">
                {state.yieldForecast.epochs.map((forecast: any, index: number) => (
                  <div
                    key={forecast.epoch}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-purple-600">
                          {forecast.epoch}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          Epoch #{forecast.epoch}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-500">
                          {(forecast.confidence * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-800 dark:text-white">
                        ${forecast.expectedYield.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-600">
                        Risk-adj: ${forecast.riskAdjusted.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto mb-4 text-slate-500" size={48} />
                <p className="text-slate-600 dark:text-slate-500">
                  Yield forecast will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advance Modal */}
      <AnimatePresence>
        {showAdvanceModal && selectedAdvance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && setShowAdvanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Confirm Yield Advance
                </h3>
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="p-2 text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-slate-500">Advance Amount:</span>
                    <span className="font-bold text-gray-800 dark:text-white">
                      ${advanceAmount ? parseFloat(advanceAmount).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-slate-500">Term:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {selectedAdvance.epochs} epochs
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-slate-500">Yield Rate:</span>
                    <span className="font-medium text-green-600">
                      {(selectedAdvance.yieldRate * 100).toFixed(1)}% per epoch
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-purple-200 dark:border-purple-800">
                    <span className="text-gray-800 dark:text-white">Total Expected Yield:</span>
                    <span className="text-purple-600">
                      ${estimatedYield.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-slate-500 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <strong>Note:</strong> You will receive a Yield Note NFT representing your future yield claim.
                  The advance will be deducted from your Junior tranche earnings over the next {selectedAdvance.epochs} epochs.
                </div>
              </div>

              <button
                onClick={handleAdvance}
                disabled={!advanceAmount || isWritePending}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
              >
                {isWritePending ? 'Creating Advance...' : `Get $${advanceAmount || '0'} Now`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}