'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, DollarSign, Calendar, TrendingUp, PieChart, Target, 
  Plus, Trash2, CheckCircle, AlertCircle, User, Briefcase, Home, CreditCard, 
  Zap, Shield, Users, TrendingDown
} from 'lucide-react';

import { StrategyEngine, AdvancedProfile, UserAnswers } from '@/lib/strategyEngine';

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth?: number;
  category: 'salary' | 'freelance' | 'business' | 'investment' | 'other';
  isGuaranteed: boolean;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dueDay?: number;
  category: 'housing' | 'utilities' | 'food' | 'transport' | 'healthcare' | 'entertainment' | 'debt' | 'other';
  priority: 'essential' | 'important' | 'optional';
  isFixed: boolean;
}

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'high' | 'medium' | 'low';
  category: 'emergency' | 'retirement' | 'house' | 'car' | 'vacation' | 'education' | 'other';
}

interface FinancialProfile {
  personalInfo: {
    age: number;
    employmentStatus: 'employed' | 'self-employed' | 'student' | 'retired';
    dependents: number;
    riskTolerance: number;
  };
  incomeStreams: IncomeSource[];
  expenses: Expense[];
  goals: FinancialGoal[];
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetIncome: number;
  savingsRate: number;
}

const EXPENSE_CATEGORIES = [
  { id: 'housing', label: 'Housing & Rent', color: 'bg-red-500' },
  { id: 'utilities', label: 'Utilities', color: 'bg-yellow-500' },
  { id: 'food', label: 'Food & Groceries', color: 'bg-green-500' },
  { id: 'transport', label: 'Transportation', color: 'bg-blue-500' },
  { id: 'healthcare', label: 'Healthcare', color: 'bg-purple-500' },
  { id: 'entertainment', label: 'Entertainment', color: 'bg-pink-500' },
  { id: 'debt', label: 'Debt Payments', color: 'bg-orange-500' },
  { id: 'other', label: 'Other Expenses', color: 'bg-gray-500' }
];

export function AdvancedAccountSetup({ onComplete }: { onComplete: (profile: AdvancedProfile) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<FinancialProfile>({
    personalInfo: {
      age: 25,
      employmentStatus: 'employed',
      dependents: 0,
      riskTolerance: 5
    },
    incomeStreams: [],
    expenses: [],
    goals: [],
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyNetIncome: 0,
    savingsRate: 0
  });

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newIncome, setNewIncome] = useState({
    name: '', amount: 0, frequency: 'monthly' as const, category: 'salary' as const
  });
  const [newExpense, setNewExpense] = useState({
    name: '', amount: 0, category: 'housing' as const, priority: 'essential' as const
  });

  const stepTitles = [
    'Personal Info',
    'Income Sources', 
    'Monthly Expenses',
    'Financial Goals',
    'Budget Analysis',
    'Investment Strategy'
  ];

  // Calculate financial metrics
  useEffect(() => {
    const monthlyIncome = profile.incomeStreams.reduce((total, income) => {
      let monthlyAmount = income.amount;
      switch (income.frequency) {
        case 'weekly': monthlyAmount = income.amount * 4.33; break;
        case 'biweekly': monthlyAmount = income.amount * 2.17; break;
        case 'quarterly': monthlyAmount = income.amount / 3; break;
        case 'yearly': monthlyAmount = income.amount / 12; break;
      }
      return total + monthlyAmount;
    }, 0);

    const monthlyExpenses = profile.expenses.reduce((total, expense) => {
      let monthlyAmount = expense.amount;
      switch (expense.frequency) {
        case 'weekly': monthlyAmount = expense.amount * 4.33; break;
        case 'quarterly': monthlyAmount = expense.amount / 3; break;
        case 'yearly': monthlyAmount = expense.amount / 12; break;
      }
      return total + monthlyAmount;
    }, 0);

    const netIncome = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (netIncome / monthlyIncome) * 100 : 0;

    setProfile(prev => ({
      ...prev,
      monthlyIncome,
      monthlyExpenses,
      monthlyNetIncome: netIncome,
      savingsRate
    }));
  }, [profile.incomeStreams, profile.expenses]);

  const addIncome = () => {
    if (!newIncome.name || !newIncome.amount) return;
    
    const income: IncomeSource = {
      id: Date.now().toString(),
      ...newIncome,
      dayOfMonth: 1,
      isGuaranteed: true
    };

    setProfile(prev => ({
      ...prev,
      incomeStreams: [...prev.incomeStreams, income]
    }));

    setNewIncome({ name: '', amount: 0, frequency: 'monthly', category: 'salary' });
    setShowAddIncome(false);
  };

  const addExpense = () => {
    if (!newExpense.name || !newExpense.amount) return;
    
    const expense: Expense = {
      id: Date.now().toString(),
      ...newExpense,
      frequency: 'monthly',
      dueDay: 1,
      isFixed: true
    };

    setProfile(prev => ({
      ...prev,
      expenses: [...prev.expenses, expense]
    }));

    setNewExpense({ name: '', amount: 0, category: 'housing', priority: 'essential' });
    setShowAddExpense(false);
  };

  const removeItem = (type: 'income' | 'expense', id: string) => {
    if (type === 'income') {
      setProfile(prev => ({
        ...prev,
        incomeStreams: prev.incomeStreams.filter(item => item.id !== id)
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        expenses: prev.expenses.filter(item => item.id !== id)
      }));
    }
  };

  const nextStep = () => {
    if (currentStep < stepTitles.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Generate investment strategy
      const answers: UserAnswers = {
        goal_type: profile.goals.length > 0 ? 'mid_big_goal' : 'cashflow_monthly',
        horizon: '1-5y',
        risk_score: profile.personalInfo.riskTolerance * 10,
        income_pattern: profile.personalInfo.employmentStatus === 'employed' ? 'salary' : 'freelance',
        liquidity_need: 'weekly',
        fx_need: 'usd_only',
        withdrawal_style: 'medium',
        experience: 'intermediate',
        automation_pref: 'auto_first'
      };
      
      const strategy = StrategyEngine.deriveStrategy(answers);
      onComplete(strategy);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Tell us about yourself
        </h3>
        <p className="text-gray-600 dark:text-slate-500">
          This helps us personalize your investment strategy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Age
          </label>
          <input
            type="number"
            value={profile.personalInfo.age}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, age: parseInt(e.target.value) || 0 }
            }))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Employment Status
          </label>
          <select
            value={profile.personalInfo.employmentStatus}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, employmentStatus: e.target.value as any }
            }))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="employed">Employed</option>
            <option value="self-employed">Self-Employed</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dependents
          </label>
          <input
            type="number"
            value={profile.personalInfo.dependents}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, dependents: parseInt(e.target.value) || 0 }
            }))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Risk Tolerance (1-10)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="10"
              value={profile.personalInfo.riskTolerance}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                personalInfo: { ...prev.personalInfo, riskTolerance: parseInt(e.target.value) }
              }))}
              className="flex-1"
            />
            <span className="w-8 text-center font-medium text-gray-800 dark:text-white">
              {profile.personalInfo.riskTolerance}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIncomeStreams = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Income Sources
        </h3>
        <p className="text-gray-600 dark:text-slate-500">
          Add all sources of income with amounts and timing
        </p>
      </div>

      <div className="space-y-4">
        {profile.incomeStreams.map((income) => (
          <div key={income.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Briefcase className="text-green-500" size={20} />
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">
                  {income.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-500">
                  ${income.amount.toLocaleString()} {income.frequency}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeItem('income', income.id)}
              className="p-1 text-red-500 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAddIncome(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-slate-500 hover:text-blue-500"
      >
        <Plus size={20} />
        Add Income Source
      </button>

      {/* Income Summary */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
          Monthly Income: ${profile.monthlyIncome.toLocaleString()}
        </h4>
      </div>

      {/* Add Income Modal */}
      {showAddIncome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Add Income Source
            </h4>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newIncome.name}
                onChange={(e) => setNewIncome(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Income name (e.g., Main Job Salary)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <input
                type="number"
                value={newIncome.amount || ''}
                onChange={(e) => setNewIncome(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Amount"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <select
                value={newIncome.frequency}
                onChange={(e) => setNewIncome(prev => ({ ...prev, frequency: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddIncome(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={addIncome}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                Add Income
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Monthly Expenses
        </h3>
        <p className="text-gray-600 dark:text-slate-500">
          Track your regular monthly expenses
        </p>
      </div>

      <div className="space-y-4">
        {profile.expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Home className="text-red-500" size={20} />
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">
                  {expense.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-500">
                  ${expense.amount.toLocaleString()} • {expense.priority}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeItem('expense', expense.id)}
              className="p-1 text-red-500 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAddExpense(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-red-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-slate-500 hover:text-red-500"
      >
        <Plus size={20} />
        Add Expense
      </button>

      {/* Expense Summary */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
          Monthly Expenses: ${profile.monthlyExpenses.toLocaleString()}
        </h4>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Add Monthly Expense
            </h4>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newExpense.name}
                onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Expense name (e.g., Rent, Electricity)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <input
                type="number"
                value={newExpense.amount || ''}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Amount"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              
              <select
                value={newExpense.priority}
                onChange={(e) => setNewExpense(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="essential">Essential (Must Pay)</option>
                <option value="important">Important</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddExpense(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={addExpense}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBudgetAnalysis = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Your Financial Overview
        </h3>
        <p className="text-gray-600 dark:text-slate-500">
          Let's analyze your cash flow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-green-600" size={24} />
            <h4 className="font-semibold text-green-800 dark:text-green-200">Monthly Income</h4>
          </div>
          <div className="text-2xl font-bold text-green-600">${profile.monthlyIncome.toLocaleString()}</div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="text-red-600" size={24} />
            <h4 className="font-semibold text-red-800 dark:text-red-200">Monthly Expenses</h4>
          </div>
          <div className="text-2xl font-bold text-red-600">${profile.monthlyExpenses.toLocaleString()}</div>
        </div>

        <div className={`rounded-xl p-6 ${profile.monthlyNetIncome >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className={profile.monthlyNetIncome >= 0 ? 'text-blue-600' : 'text-orange-600'} size={24} />
            <h4 className={`font-semibold ${profile.monthlyNetIncome >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>
              Net Cash Flow
            </h4>
          </div>
          <div className={`text-2xl font-bold ${profile.monthlyNetIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {profile.monthlyNetIncome >= 0 ? '+' : ''}${profile.monthlyNetIncome.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 ${profile.monthlyNetIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {profile.savingsRate.toFixed(1)}% savings rate
          </div>
        </div>
      </div>

      {/* Financial Health Analysis */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-4">Financial Health Check</h4>
        
        <div className="space-y-3">
          {profile.monthlyNetIncome < 0 && (
            <div className="flex items-start gap-2 text-red-600">
              <AlertCircle size={16} className="mt-0.5" />
              <span>Warning: You're spending more than you earn. Consider reducing expenses.</span>
            </div>
          )}
          
          {profile.savingsRate >= 20 && profile.monthlyNetIncome > 0 && (
            <div className="flex items-start gap-2 text-green-600">
              <CheckCircle size={16} className="mt-0.5" />
              <span>Excellent! Your {profile.savingsRate.toFixed(1)}% savings rate is fantastic.</span>
            </div>
          )}
          
          {profile.savingsRate < 10 && profile.monthlyNetIncome > 0 && (
            <div className="flex items-start gap-2 text-orange-600">
              <AlertCircle size={16} className="mt-0.5" />
              <span>Try to increase your savings rate to at least 10-20%.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInvestmentStrategy = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Your Investment Strategy
        </h3>
        <p className="text-gray-600 dark:text-slate-500">
          Based on your profile, here's our recommendation
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-blue-500" size={24} />
          <h4 className="text-xl font-bold text-gray-800 dark:text-white">
            Recommended: Balanced Growth Strategy
          </h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">Senior (Safe)</div>
            <div className="text-xl font-bold text-blue-700">70%</div>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">Junior (Growth)</div>
            <div className="text-xl font-bold text-purple-700">30%</div>
          </div>
        </div>

        {profile.monthlyNetIncome > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h5 className="font-medium mb-3">Monthly Investment Plan</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Senior Tranche (Stable)</span>
                <span className="font-bold text-blue-600">${(profile.monthlyNetIncome * 0.7).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Junior Tranche (Growth)</span>
                <span className="font-bold text-purple-600">${(profile.monthlyNetIncome * 0.3).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-green-600 dark:text-green-400 mb-4">
          ✅ You're ready to start investing with FluxTranche!
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-500">
          Click "Complete Setup" to apply this strategy and start building your wealth.
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Progress Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Complete Financial Setup
            </h2>
            <div className="text-sm text-gray-600 dark:text-slate-500">
              Step {currentStep + 1} of {stepTitles.length}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              animate={{ width: `${((currentStep + 1) / stepTitles.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8 min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {currentStep === 0 && renderPersonalInfo()}
              {currentStep === 1 && renderIncomeStreams()}
              {currentStep === 2 && renderExpenses()}
              {currentStep === 3 && renderBudgetAnalysis()}
              {currentStep === 4 && renderInvestmentStrategy()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            {currentStep === stepTitles.length - 1 ? 'Complete Setup' : 'Next Step'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}