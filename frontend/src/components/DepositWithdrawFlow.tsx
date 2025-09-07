'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Loader2, Shield, Zap } from 'lucide-react';
import { useTrancheVault, Tranche } from '@/hooks/useTrancheVault';

interface FormData {
  amount: string;
  action: 'deposit' | 'withdraw';
  tranche: Tranche;
}

export function DepositWithdrawFlow() {
  const { address } = useAccount();
  const { 
    deposit, 
    withdraw, 
    isApproving, 
    isDepositing, 
    isWithdrawing,
    seniorNAV,
    juniorNAV,
    seniorAPY,
    usdcBalance 
  } = useTrancheVault();
  
  const [selectedTranche, setSelectedTranche] = useState<Tranche>(Tranche.SENIOR);
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const amount = watch('amount');

  const onSubmit = async (data: FormData) => {
    if (!address) return;
    
    try {
      if (action === 'deposit') {
        await deposit(data.amount, selectedTranche, address);
      } else {
        await withdraw(data.amount, selectedTranche, address);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  const isLoading = isApproving || isDepositing || isWithdrawing;

  const getEstimatedShares = () => {
    if (!amount || isNaN(Number(amount))) return '0';
    const nav = selectedTranche === Tranche.SENIOR ? seniorNAV : juniorNAV;
    return (Number(amount) / nav).toFixed(6);
  };

  const getEstimatedAssets = () => {
    if (!amount || isNaN(Number(amount))) return '0';
    const nav = selectedTranche === Tranche.SENIOR ? seniorNAV : juniorNAV;
    return (Number(amount) * nav).toFixed(6);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md mx-auto">
      {/* Action Toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
        <button
          onClick={() => setAction('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
            action === 'deposit' 
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ArrowUpRight size={18} />
          Deposit
        </button>
        <button
          onClick={() => setAction('withdraw')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
            action === 'withdraw' 
              ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' 
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ArrowDownLeft size={18} />
          Withdraw
        </button>
      </div>

      {/* Tranche Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Select Tranche
        </label>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedTranche(Tranche.SENIOR)}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedTranche === Tranche.SENIOR
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600'
            }`}
          >
            <Shield className="w-6 h-6 mb-2 mx-auto text-blue-500" />
            <div className="font-semibold">Senior</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Fixed {(seniorAPY / 100).toFixed(1)}% APY
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              NAV: ${seniorNAV.toFixed(4)}
            </div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedTranche(Tranche.JUNIOR)}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedTranche === Tranche.JUNIOR
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-600'
            }`}
          >
            <Zap className="w-6 h-6 mb-2 mx-auto text-purple-500" />
            <div className="font-semibold">Junior</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Variable Returns
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              NAV: ${juniorNAV.toFixed(4)}
            </div>
          </motion.button>
        </div>
      </div>

      {/* Amount Input */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
            Amount {action === 'deposit' ? '(USDC)' : '(Shares)'}
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              placeholder="0.00"
              {...register('amount', { 
                required: 'Amount is required',
                min: { value: 0.000001, message: 'Amount must be greater than 0' }
              })}
              className="w-full px-4 py-3 pr-20 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">
              {action === 'deposit' ? 'USDC' : 'Shares'}
            </div>
          </div>
          <div className="flex justify-between items-center mt-1">
            {errors.amount ? (
              <p className="text-red-500 text-xs">{errors.amount.message}</p>
            ) : (
              <div></div>
            )}
            {address && (
              <p className="text-xs text-slate-600">
                Balance: {Number(usdcBalance).toFixed(2)} USDC
              </p>
            )}
          </div>
        </div>

        {/* Estimated Output */}
        <AnimatePresence>
          {amount && Number(amount) > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Estimated {action === 'deposit' ? 'Shares' : 'USDC'}:
                </span>
                <span className="font-medium">
                  {action === 'deposit' ? getEstimatedShares() : getEstimatedAssets()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || !address}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isLoading || !address
              ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              : action === 'deposit'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              {isApproving ? 'Approving...' : isDepositing ? 'Depositing...' : 'Withdrawing...'}
            </>
          ) : !address ? (
            'Connect Wallet'
          ) : (
            <>
              {action === 'deposit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
              {action === 'deposit' ? 'Deposit' : 'Withdraw'}
            </>
          )}
        </motion.button>
      </form>

      {/* Info Text */}
      <div className="mt-4 text-xs text-center text-slate-600 dark:text-slate-400">
        {action === 'deposit' 
          ? 'Deposits are locked until epoch end for optimal yield generation'
          : 'Withdrawals may be subject to available liquidity'}
      </div>
    </div>
  );
}