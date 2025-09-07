'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Calendar, 
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  Wallet
} from 'lucide-react';

interface FinancialProfile {
  personalInfo: {
    age: number;
    employmentStatus: string;
    dependents: number;
    riskTolerance: string;
    investmentExperience: string;
  };
  incomeStreams: Array<{
    id: string;
    source: string;
    amount: number;
    frequency: string;
    dayOfMonth: number;
    isActive: boolean;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    name: string;
    amount: number;
    frequency: string;
    dayOfMonth: number;
    isEssential: boolean;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    priority: string;
    category: string;
  }>;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  savingsRate: number;
}

interface FinancialAnalyticsDashboardProps {
  financialProfile: FinancialProfile | null;
}

export function FinancialAnalyticsDashboard({ financialProfile }: FinancialAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'goals' | 'recommendations'>('overview');

  if (!financialProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="text-center">
          <BarChart3 className="mx-auto text-slate-500 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Financial Analytics
          </h3>
          <p className="text-gray-600 dark:text-slate-500 mb-4">
            Complete your advanced setup to see detailed financial analytics
          </p>
          <div className="text-sm text-slate-600">
            Track income, expenses, goals, and get AI-powered recommendations
          </div>
        </div>
      </div>
    );
  }

  // Calculate analytics
  const emergencyFundTarget = financialProfile.monthlyExpenses * 6;
  const currentEmergencyFund = financialProfile.goals.find(g => g.category === 'emergency')?.currentAmount || 0;
  const emergencyFundProgress = (currentEmergencyFund / emergencyFundTarget) * 100;

  const totalGoalsProgress = financialProfile.goals.reduce((acc, goal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    return acc + Math.min(progress, 100);
  }, 0) / financialProfile.goals.length;

  const expensesByCategory = financialProfile.expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const getFinancialHealthScore = () => {
    let score = 0;
    
    // Savings rate (40% of score)
    if (financialProfile.savingsRate >= 20) score += 40;
    else if (financialProfile.savingsRate >= 10) score += 30;
    else if (financialProfile.savingsRate >= 5) score += 20;
    else score += 10;
    
    // Emergency fund (30% of score)
    if (emergencyFundProgress >= 100) score += 30;
    else if (emergencyFundProgress >= 50) score += 20;
    else if (emergencyFundProgress >= 25) score += 10;
    else score += 5;
    
    // Goals progress (30% of score)
    if (totalGoalsProgress >= 80) score += 30;
    else if (totalGoalsProgress >= 60) score += 25;
    else if (totalGoalsProgress >= 40) score += 20;
    else if (totalGoalsProgress >= 20) score += 15;
    else score += 10;
    
    return score;
  };

  const financialHealthScore = getFinancialHealthScore();

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'recommendations', label: 'AI Insights', icon: AlertCircle },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Financial Analytics
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-500">
              Comprehensive analysis of your financial profile
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-slate-500">Health Score</div>
            <div className={`text-2xl font-bold ${getHealthScoreColor(financialHealthScore)}`}>
              {financialHealthScore}/100
            </div>
            <div className={`text-sm ${getHealthScoreColor(financialHealthScore)}`}>
              {getHealthScoreLabel(financialHealthScore)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-green-600" />
                  <span className="text-sm text-gray-600 dark:text-slate-500">Net Income</span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  ${financialProfile.netIncome.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600">per month</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-slate-500">Savings Rate</span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  {financialProfile.savingsRate.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-600">of income</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-purple-600" />
                  <span className="text-sm text-gray-600 dark:text-slate-500">Goals Progress</span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  {totalGoalsProgress.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-600">average</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={16} className="text-orange-600" />
                  <span className="text-sm text-gray-600 dark:text-slate-500">Emergency Fund</span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  {emergencyFundProgress.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-600">of target</div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Expense Breakdown
              </h4>
              <div className="space-y-3">
                {Object.entries(expensesByCategory).map(([category, amount]) => {
                  const percentage = (amount / financialProfile.monthlyExpenses) * 100;
                  return (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {category}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-slate-500">
                          ${amount.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'cashflow' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Cash Flow Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">
                  Income Streams
                </h4>
                <div className="space-y-2">
                  {financialProfile.incomeStreams.filter(s => s.isActive).map((stream) => (
                    <div key={stream.id} className="flex justify-between items-center">
                      <span className="text-sm text-green-700 dark:text-green-400">
                        {stream.source}
                      </span>
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        ${stream.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-green-200 dark:border-green-700 pt-2 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-green-800 dark:text-green-300">Total Monthly</span>
                      <span className="text-green-800 dark:text-green-300">
                        ${financialProfile.monthlyIncome.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                <h4 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-3">
                  Monthly Expenses
                </h4>
                <div className="space-y-2">
                  {Object.entries(expensesByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-red-700 dark:text-red-400 capitalize">
                        {category}
                      </span>
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">
                        ${amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-red-200 dark:border-red-700 pt-2 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-red-800 dark:text-red-300">Total Monthly</span>
                      <span className="text-red-800 dark:text-red-300">
                        ${financialProfile.monthlyExpenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                    Net Monthly Cash Flow
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Available for savings and investments
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                    ${financialProfile.netIncome.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    {financialProfile.savingsRate.toFixed(1)}% savings rate
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'goals' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {financialProfile.goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const remaining = goal.targetAmount - goal.currentAmount;
              const monthsToTarget = Math.ceil(remaining / (financialProfile.netIncome * 0.3));
              
              return (
                <div key={goal.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {goal.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-500">
                        <span>Target: {goal.targetDate}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          goal.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                          goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                          'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        }`}>
                          {goal.priority} priority
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800 dark:text-white">
                        ${goal.currentAmount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-500">
                        of ${goal.targetAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-slate-500">Progress</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-slate-500">
                      ${remaining.toLocaleString()} remaining
                    </span>
                    <span className="text-gray-600 dark:text-slate-500">
                      ~{monthsToTarget} months at current pace
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* AI Recommendations */}
            <div className="space-y-4">
              {financialProfile.savingsRate < 20 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 mt-1" size={20} />
                    <div>
                      <h4 className="text-yellow-800 dark:text-yellow-300 font-semibold">
                        Increase Savings Rate
                      </h4>
                      <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                        Your current savings rate is {financialProfile.savingsRate.toFixed(1)}%. 
                        Consider aiming for 20% to build wealth faster. Review discretionary spending 
                        in categories like entertainment and dining out.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {emergencyFundProgress < 100 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-1" size={20} />
                    <div>
                      <h4 className="text-red-800 dark:text-red-300 font-semibold">
                        Build Emergency Fund
                      </h4>
                      <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                        Your emergency fund is only {emergencyFundProgress.toFixed(0)}% complete. 
                        Aim for ${emergencyFundTarget.toLocaleString()} (6 months of expenses). 
                        Consider allocating ${Math.ceil((emergencyFundTarget - currentEmergencyFund) / 12).toLocaleString()} 
                        monthly to reach this goal in 12 months.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {financialProfile.goals.some(g => g.priority === 'high' && (g.currentAmount / g.targetAmount) < 0.5) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start gap-3">
                    <Target className="text-blue-600 mt-1" size={20} />
                    <div>
                      <h4 className="text-blue-800 dark:text-blue-300 font-semibold">
                        Focus on High-Priority Goals
                      </h4>
                      <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                        You have high-priority goals that are behind schedule. Consider reallocating 
                        funds from lower-priority goals or reducing discretionary spending to accelerate progress.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1" size={20} />
                  <div>
                    <h4 className="text-green-800 dark:text-green-300 font-semibold">
                      Investment Strategy Recommendation
                    </h4>
                    <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                      Based on your profile (Age: {financialProfile.personalInfo.age}, 
                      Risk Tolerance: {financialProfile.personalInfo.riskTolerance}), 
                      consider a balanced approach with FluxTranche's Senior/Junior tranches. 
                      Your net income of ${financialProfile.netIncome.toLocaleString()}/month 
                      allows for systematic DCA investing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}