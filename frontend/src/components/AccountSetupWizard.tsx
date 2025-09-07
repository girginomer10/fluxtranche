'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, DollarSign, Calendar, TrendingUp, PieChart, Target, Plus, Trash2, Edit3, CheckCircle, AlertCircle, User, Briefcase, Home, CreditCard, Zap } from 'lucide-react';

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  dayOfMonth?: number; // For monthly income
  dayOfWeek?: number; // For weekly income
  isGuaranteed: boolean;
  category: 'salary' | 'freelance' | 'business' | 'investment' | 'other';
  nextPayment: Date;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dueDay?: number; // Day of month for monthly expenses
  category: 'housing' | 'utilities' | 'food' | 'transport' | 'healthcare' | 'entertainment' | 'debt' | 'savings' | 'other';
  isFixed: boolean; // Fixed vs variable expense
  priority: 'essential' | 'important' | 'optional';
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
    employmentStatus: 'employed' | 'self-employed' | 'student' | 'retired' | 'unemployed';
    dependents: number;
    riskTolerance: number; // 1-10
  };
  incomeStreams: IncomeSource[];
  expenses: Expense[];
  goals: FinancialGoal[];
  monthlyNetIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  emergencyFundMonths: number;
}

const STEP_TITLES = [
  'Personal Information',
  'Income Sources',
  'Monthly Expenses',
  'Financial Goals',
  'Budget Analysis',
  'Investment Strategy'
];

const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary/Wages', icon: Briefcase, color: 'bg-blue-500' },
  { id: 'freelance', label: 'Freelance/Consulting', icon: User, color: 'bg-purple-500' },
  { id: 'business', label: 'Business Income', icon: TrendingUp, color: 'bg-green-500' },
  { id: 'investment', label: 'Investment Returns', icon: DollarSign, color: 'bg-yellow-500' },
  { id: 'other', label: 'Other Income', icon: Plus, color: 'bg-gray-500' }
];

const EXPENSE_CATEGORIES = [
  { id: 'housing', label: 'Housing & Rent', icon: Home, color: 'bg-red-500' },
  { id: 'utilities', label: 'Utilities', icon: Zap, color: 'bg-yellow-500' },
  { id: 'food', label: 'Food & Groceries', icon: PieChart, color: 'bg-green-500' },
  { id: 'transport', label: 'Transportation', icon: TrendingUp, color: 'bg-blue-500' },
  { id: 'healthcare', label: 'Healthcare', icon: Plus, color: 'bg-purple-500' },
  { id: 'entertainment', label: 'Entertainment', icon: Target, color: 'bg-pink-500' },
  { id: 'debt', label: 'Debt Payments', icon: CreditCard, color: 'bg-orange-500' },
  { id: 'savings', label: 'Savings & Investments', icon: DollarSign, color: 'bg-emerald-500' },
  { id: 'other', label: 'Other Expenses', icon: Plus, color: 'bg-gray-500' }
];

export function AccountSetupWizard({ onComplete }: { onComplete: (profile: FinancialProfile) => void }) {
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
    monthlyNetIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    emergencyFundMonths: 0
  });

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const [newIncome, setNewIncome] = useState<Partial<IncomeSource>>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    category: 'salary',
    isGuaranteed: true
  });

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    priority: 'essential'
  });

  const [newGoal, setNewGoal] = useState<Partial<FinancialGoal>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    priority: 'medium',
    category: 'other'
  });

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
      monthlyNetIncome: netIncome,
      monthlyExpenses,
      savingsRate
    }));
  }, [profile.incomeStreams, profile.expenses]);

  const addIncomeSource = () => {
    if (!newIncome.name || !newIncome.amount) return;

    const income: IncomeSource = {
      id: Date.now().toString(),
      name: newIncome.name,
      amount: newIncome.amount,
      frequency: newIncome.frequency || 'monthly',
      category: newIncome.category || 'salary',
      isGuaranteed: newIncome.isGuaranteed || true,
      dayOfMonth: newIncome.dayOfMonth || 1,
      nextPayment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    setProfile(prev => ({
      ...prev,
      incomeStreams: [...prev.incomeStreams, income]
    }));

    setNewIncome({ name: '', amount: 0, frequency: 'monthly', category: 'salary', isGuaranteed: true });
    setShowAddIncome(false);
  };

  const addExpense = () => {
    if (!newExpense.name || !newExpense.amount) return;

    const expense: Expense = {
      id: Date.now().toString(),
      name: newExpense.name,
      amount: newExpense.amount,
      frequency: newExpense.frequency || 'monthly',
      category: newExpense.category || 'housing',
      isFixed: newExpense.isFixed || true,
      priority: newExpense.priority || 'essential',
      dueDay: newExpense.dueDay || 1
    };

    setProfile(prev => ({
      ...prev,
      expenses: [...prev.expenses, expense]
    }));

    setNewExpense({ name: '', amount: 0, frequency: 'monthly', category: 'housing', isFixed: true, priority: 'essential' });
    setShowAddExpense(false);
  };

  const addGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;

    const goal: FinancialGoal = {
      id: Date.now().toString(),
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount || 0,
      targetDate: newGoal.targetDate || new Date(),
      priority: newGoal.priority || 'medium',
      category: newGoal.category || 'other'
    };

    setProfile(prev => ({
      ...prev,
      goals: [...prev.goals, goal]
    }));

    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, priority: 'medium', category: 'other' });
    setShowAddGoal(false);
  };

  const removeItem = (type: 'income' | 'expense' | 'goal', id: string) => {
    if (type === 'income') {
      setProfile(prev => ({
        ...prev,
        incomeStreams: prev.incomeStreams.filter(item => item.id !== id)
      }));
    } else if (type === 'expense') {
      setProfile(prev => ({
        ...prev,
        expenses: prev.expenses.filter(item => item.id !== id)
      }));
    } else if (type === 'goal') {
      setProfile(prev => ({
        ...prev,
        goals: prev.goals.filter(item => item.id !== id)
      }));
    }
  };

  const nextStep = () => {
    if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(profile);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCategoryIcon = (categories: any[], categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || Plus;
  };

  const getCategoryColor = (categories: any[], categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || 'bg-gray-500';
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
            <option value="unemployed">Unemployed</option>
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
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Conservative</span>
            <span>Aggressive</span>
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
        {profile.incomeStreams.map((income) => {
          const IconComponent = getCategoryIcon(INCOME_CATEGORIES, income.category);
          const colorClass = getCategoryColor(INCOME_CATEGORIES, income.category);
          
          return (
            <motion.div
              key={income.id}
              layout
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 ${colorClass} rounded-lg`}>
                  <IconComponent className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    {income.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-500">
                    ${income.amount.toLocaleString()} {income.frequency}
                    {income.dayOfMonth && ` • ${income.dayOfMonth}th of month`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {income.isGuaranteed ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <AlertCircle className="text-yellow-500" size={16} />
                )}
                <button
                  onClick={() => removeItem('income', income.id)}
                  className="p-1 text-red-500 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={() => setShowAddIncome(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-slate-500 hover:text-blue-500"
      >
        <Plus size={20} />
        Add Income Source
      </button>

      {/* Add Income Modal */}
      {showAddIncome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Add Income Source
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Income Name
                </label>
                <input
                  type="text"
                  value={newIncome.name || ''}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Job Salary"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={newIncome.amount || ''}
                    onChange={(e) => setNewIncome(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={newIncome.frequency}
                    onChange={(e) => setNewIncome(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="irregular">Irregular</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newIncome.category}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {INCOME_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {newIncome.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newIncome.dayOfMonth || 1}
                    onChange={(e) => setNewIncome(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newIncome.isGuaranteed}
                  onChange={(e) => setNewIncome(prev => ({ ...prev, isGuaranteed: e.target.checked }))}
                  className="rounded"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Guaranteed income (not variable)
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddIncome(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={addIncomeSource}
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Progress Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Financial Profile Setup
            </h2>
            <div className="text-sm text-gray-600 dark:text-slate-500">
              Step {currentStep + 1} of {STEP_TITLES.length}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEP_TITLES.length) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-500">
            {STEP_TITLES.map((title, index) => (
              <span
                key={index}
                className={index <= currentStep ? 'text-blue-500 font-medium' : ''}
              >
                {title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-8 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {currentStep === 0 && renderPersonalInfo()}
              {currentStep === 1 && renderIncomeStreams()}
              {/* Will add other steps */}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            {currentStep === STEP_TITLES.length - 1 ? 'Complete Setup' : 'Next Step'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}