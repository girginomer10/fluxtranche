'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  DollarSign, 
  TrendingDown, 
  Target, 
  Plus, 
  Trash2, 
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  Globe,
  Repeat,
  Clock,
  Wallet,
  PieChart
} from 'lucide-react';


// Risk tolerance scale 0-10 with detailed explanations and examples
const riskToleranceOptions = [
  { 
    value: 0, 
    label: 'Ultra Conservative (0)', 
    description: 'Absolute capital preservation priority',
    example: 'Government bonds, high-yield savings accounts. Max 2-3% annual loss tolerance.',
    profile: 'Perfect for retirees or those needing guaranteed principal protection.'
  },
  { 
    value: 1, 
    label: 'Very Conservative (1)', 
    description: 'Minimal risk tolerance',
    example: 'CDs, treasury bills, AAA corporate bonds. Max 5% annual loss tolerance.',
    profile: 'Suitable for emergency funds or short-term goals (< 2 years).'
  },
  { 
    value: 2, 
    label: 'Conservative (2)', 
    description: 'Stability over growth',
    example: '80% bonds, 20% stable stocks. Max 8% annual loss tolerance.',
    profile: 'Good for pre-retirees or risk-averse investors.'
  },
  { 
    value: 3, 
    label: 'Moderately Conservative (3)', 
    description: 'Slight growth with high stability',
    example: '70% bonds, 30% blue-chip stocks. Max 12% annual loss tolerance.',
    profile: 'Appropriate for conservative long-term investors.'
  },
  { 
    value: 4, 
    label: 'Conservative Balanced (4)', 
    description: 'Balanced approach favoring stability',
    example: '60% bonds, 40% diversified stocks. Max 15% annual loss tolerance.',
    profile: 'Suitable for moderate-term goals (3-7 years).'
  },
  { 
    value: 5, 
    label: 'Moderate (5)', 
    description: 'Equal balance of growth and stability',
    example: '50/50 stocks and bonds. Max 20% annual loss tolerance.',
    profile: 'Classic balanced approach for average investors.'
  },
  { 
    value: 6, 
    label: 'Moderately Aggressive (6)', 
    description: 'Growth focus with some stability',
    example: '65% stocks, 35% bonds. Max 25% annual loss tolerance.',
    profile: 'Good for long-term investors (7+ years) with moderate risk appetite.'
  },
  { 
    value: 7, 
    label: 'Aggressive Balanced (7)', 
    description: 'Strong growth orientation',
    example: '75% stocks, 25% bonds. Max 30% annual loss tolerance.',
    profile: 'Suitable for younger investors with long time horizons.'
  },
  { 
    value: 8, 
    label: 'Aggressive (8)', 
    description: 'High growth with volatility acceptance',
    example: '85% stocks (including growth/small-cap), 15% bonds. Max 35% annual loss tolerance.',
    profile: 'For experienced investors comfortable with significant volatility.'
  },
  { 
    value: 9, 
    label: 'Very Aggressive (9)', 
    description: 'Maximum growth, high volatility',
    example: '95% stocks (growth, international, emerging markets). Max 45% annual loss tolerance.',
    profile: 'For sophisticated investors with long horizons and high risk tolerance.'
  },
  { 
    value: 10, 
    label: 'Ultra Aggressive (10)', 
    description: 'Speculative investments, maximum volatility',
    example: 'Growth stocks, crypto, options, leveraged products. 50%+ annual loss tolerance.',
    profile: 'Only for expert investors who can afford significant losses.'
  }
];

// Popular currencies with symbols and names
const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', flag: '🇵🇱' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿' }
];

// Comprehensive income categories and subcategories
const incomeCategories = {
  'employment': {
    name: 'Employment Income',
    subcategories: {
      'salary': 'Base Salary',
      'bonus': 'Bonus & Incentives',
      'overtime': 'Overtime Pay',
      'commission': 'Sales Commission',
      'tips': 'Tips & Gratuities',
      'severance': 'Severance Pay',
      'stock_options': 'Stock Options/RSUs'
    }
  },
  'business': {
    name: 'Business & Self-Employment',
    subcategories: {
      'business_income': 'Business Revenue',
      'consulting': 'Consulting Fees',
      'freelance': 'Freelance Work',
      'partnership': 'Partnership Distributions',
      'royalties': 'Royalties & Patents',
      'licensing': 'Licensing Income'
    }
  },
  'investments': {
    name: 'Investment Income',
    subcategories: {
      'dividends': 'Dividend Income',
      'interest': 'Interest Income',
      'capital_gains': 'Capital Gains',
      'rental_income': 'Rental Properties',
      'reit': 'REIT Distributions',
      'crypto': 'Cryptocurrency Gains'
    }
  },
  'government': {
    name: 'Government Benefits',
    subcategories: {
      'social_security': 'Social Security',
      'unemployment': 'Unemployment Benefits',
      'disability': 'Disability Benefits',
      'veteran': 'Veteran Benefits',
      'child_support': 'Child Support',
      'welfare': 'Welfare/SNAP'
    }
  },
  'retirement': {
    name: 'Retirement Income',
    subcategories: {
      'pension': 'Pension Payments',
      'ira_401k': 'IRA/401k Withdrawals',
      'annuity': 'Annuity Payments',
      'reverse_mortgage': 'Reverse Mortgage'
    }
  },
  'other': {
    name: 'Other Income',
    subcategories: {
      'gifts': 'Gifts & Inheritance',
      'alimony': 'Alimony/Spousal Support',
      'insurance': 'Insurance Payouts',
      'tax_refund': 'Tax Refunds',
      'lawsuit': 'Legal Settlements',
      'lottery': 'Lottery/Gambling',
      'side_hustle': 'Side Business',
      'cashback': 'Cashback & Rewards'
    }
  }
};

// Comprehensive expense categories and subcategories
const expenseCategories = {
  'housing': {
    name: 'Housing & Utilities',
    essential: true,
    subcategories: {
      'rent_mortgage': 'Rent/Mortgage',
      'property_tax': 'Property Taxes',
      'home_insurance': 'Home Insurance',
      'electricity': 'Electricity',
      'gas': 'Gas/Heating',
      'water': 'Water & Sewer',
      'internet': 'Internet & Cable',
      'phone': 'Phone Service',
      'maintenance': 'Home Maintenance',
      'hoa': 'HOA Fees'
    }
  },
  'transportation': {
    name: 'Transportation',
    essential: true,
    subcategories: {
      'car_payment': 'Car Payment/Lease',
      'fuel': 'Fuel & Gas',
      'insurance': 'Auto Insurance',
      'maintenance': 'Car Maintenance',
      'registration': 'Registration & DMV',
      'public_transport': 'Public Transportation',
      'uber_taxi': 'Rideshare & Taxi',
      'parking': 'Parking Fees',
      'tolls': 'Tolls & Fees'
    }
  },
  'food': {
    name: 'Food & Dining',
    essential: true,
    subcategories: {
      'groceries': 'Groceries',
      'restaurants': 'Restaurants',
      'delivery': 'Food Delivery',
      'coffee': 'Coffee & Beverages',
      'work_lunch': 'Work Meals',
      'alcohol': 'Alcohol & Bar',
      'supplements': 'Vitamins & Supplements'
    }
  },
  'healthcare': {
    name: 'Healthcare & Medical',
    essential: true,
    subcategories: {
      'health_insurance': 'Health Insurance',
      'doctor': 'Doctor Visits',
      'dental': 'Dental Care',
      'vision': 'Vision Care',
      'prescription': 'Prescription Drugs',
      'therapy': 'Therapy/Counseling',
      'medical_devices': 'Medical Equipment',
      'emergency': 'Emergency Medical'
    }
  },
  'debt': {
    name: 'Debt Payments',
    essential: true,
    subcategories: {
      'credit_cards': 'Credit Card Payments',
      'student_loans': 'Student Loans',
      'personal_loans': 'Personal Loans',
      'medical_debt': 'Medical Debt',
      'business_loans': 'Business Loans',
      'other_debt': 'Other Debt Payments'
    }
  },
  'savings_investment': {
    name: 'Savings & Investment',
    essential: false,
    subcategories: {
      'emergency_fund': 'Emergency Fund',
      'retirement_401k': '401k Contribution',
      'retirement_ira': 'IRA Contribution',
      'investment': 'Investment Accounts',
      'savings_account': 'Savings Account',
      'education_fund': 'Education Savings'
    }
  },
  'personal': {
    name: 'Personal Care',
    essential: false,
    subcategories: {
      'clothing': 'Clothing & Apparel',
      'haircut': 'Haircut & Grooming',
      'gym': 'Gym & Fitness',
      'personal_care': 'Personal Care Items',
      'beauty': 'Beauty & Cosmetics',
      'laundry': 'Laundry & Dry Cleaning'
    }
  },
  'entertainment': {
    name: 'Entertainment & Recreation',
    essential: false,
    subcategories: {
      'streaming': 'Streaming Services',
      'movies': 'Movies & Theater',
      'hobbies': 'Hobbies & Crafts',
      'sports': 'Sports & Recreation',
      'travel': 'Travel & Vacation',
      'books': 'Books & Media',
      'gaming': 'Video Games',
      'events': 'Events & Concerts'
    }
  },
  'family': {
    name: 'Family & Children',
    essential: true,
    subcategories: {
      'childcare': 'Childcare & Daycare',
      'child_support': 'Child Support',
      'school_fees': 'School Fees',
      'kids_activities': 'Children\'s Activities',
      'baby_supplies': 'Baby Supplies',
      'pet_care': 'Pet Care',
      'family_support': 'Family Support'
    }
  },
  'professional': {
    name: 'Professional & Business',
    essential: false,
    subcategories: {
      'professional_dev': 'Professional Development',
      'business_expenses': 'Business Expenses',
      'office_supplies': 'Office Supplies',
      'software': 'Software Subscriptions',
      'networking': 'Networking Events',
      'certifications': 'Certifications & Training'
    }
  },
  'other': {
    name: 'Other Expenses',
    essential: false,
    subcategories: {
      'gifts': 'Gifts & Donations',
      'charity': 'Charitable Donations',
      'legal': 'Legal & Professional Fees',
      'bank_fees': 'Bank & Service Fees',
      'taxes': 'Tax Payments',
      'miscellaneous': 'Miscellaneous'
    }
  }
};

// Frequency options
const frequencyOptions = [
  { value: 'weekly', label: 'Weekly', multiplier: 52 },
  { value: 'bi-weekly', label: 'Bi-weekly', multiplier: 26 },
  { value: 'semi-monthly', label: 'Semi-monthly', multiplier: 24 },
  { value: 'monthly', label: 'Monthly', multiplier: 12 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 4 },
  { value: 'annually', label: 'Annually', multiplier: 1 },
  { value: 'one-time', label: 'One-time', multiplier: 0 }
];

interface IncomeSource {
  id: string;
  category: string;
  subcategory: string;
  customName?: string;
  amount: number;
  currency: string;
  frequency: string;
  dayOfMonth: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  isRecurring: boolean;
  notes?: string;
}

interface Expense {
  id: string;
  category: string;
  subcategory: string;
  customName?: string;
  amount: number;
  currency: string;
  frequency: string;
  dayOfMonth: number;
  startDate?: string;
  endDate?: string;
  isEssential: boolean;
  isRecurring: boolean;
  notes?: string;
}

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  description?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountName: string;
  balance: number;
  currency: string;
  isActive: boolean;
}


interface FinancialProfile {
  personalInfo: {
    age: number;
    employmentStatus: string;
    dependents: number;
    riskTolerance: number;
    investmentExperience: string;
    primaryCurrency: string;
    location: string;
    currentNetWorth: number;
  };
  incomeStreams: IncomeSource[];
  expenses: Expense[];
  goals: FinancialGoal[];
  bankAccounts: BankAccount[];
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  savingsRate: number;
}

interface EnhancedAdvancedAccountSetupProps {
  onComplete: (profile: FinancialProfile) => void;
}

export function EnhancedAdvancedAccountSetup({ onComplete }: EnhancedAdvancedAccountSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRiskTolerance, setSelectedRiskTolerance] = useState<number | null>(null);
  
  const [personalInfo, setPersonalInfo] = useState({
    age: 30,
    employmentStatus: 'employed',
    dependents: 0,
    riskTolerance: 5,
    investmentExperience: 'intermediate',
    primaryCurrency: 'USD',
    location: 'United States',
    currentNetWorth: 0
  });

  const [incomeStreams, setIncomeStreams] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const steps = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Income Sources', icon: DollarSign },
    { id: 3, title: 'Expenses', icon: TrendingDown },
    { id: 4, title: 'Financial Goals', icon: Target },
  ];

  const addIncomeSource = () => {
    const newIncome: IncomeSource = {
      id: Date.now().toString(),
      category: 'employment',
      subcategory: 'salary',
      amount: 0,
      currency: personalInfo.primaryCurrency,
      frequency: 'monthly',
      dayOfMonth: 1,
      isActive: true,
      isRecurring: true
    };
    setIncomeStreams([...incomeStreams, newIncome]);
  };

  const addExpense = () => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      category: 'housing',
      subcategory: 'rent_mortgage',
      amount: 0,
      currency: personalInfo.primaryCurrency,
      frequency: 'monthly',
      dayOfMonth: 1,
      isEssential: true,
      isRecurring: true
    };
    setExpenses([...expenses, newExpense]);
  };

  const addGoal = () => {
    const newGoal: FinancialGoal = {
      id: Date.now().toString(),
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      currency: personalInfo.primaryCurrency,
      targetDate: '',
      priority: 'medium',
      category: 'savings'
    };
    setGoals([...goals, newGoal]);
  };

  const calculateMonthlyAmount = (amount: number, frequency: string) => {
    const freq = frequencyOptions.find(f => f.value === frequency);
    if (!freq || freq.multiplier === 0) return 0;
    return (amount * freq.multiplier) / 12;
  };

  const calculateFinancials = () => {
    const monthlyIncome = incomeStreams
      .filter(income => income.isActive && income.isRecurring)
      .reduce((total, income) => total + calculateMonthlyAmount(income.amount, income.frequency), 0);

    const monthlyExpenses = expenses
      .filter(expense => expense.isRecurring)
      .reduce((total, expense) => total + calculateMonthlyAmount(expense.amount, expense.frequency), 0);

    const netIncome = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (netIncome / monthlyIncome) * 100 : 0;

    return { monthlyIncome, monthlyExpenses, netIncome, savingsRate };
  };

  const handleComplete = () => {
    const financials = calculateFinancials();
    const profile: FinancialProfile = {
      personalInfo,
      incomeStreams,
      expenses,
      goals,
      bankAccounts,
      ...financials
    };
    onComplete(profile);
  };

  const getCurrencyByCode = (code: string) => {
    return currencies.find(c => c.code === code) || currencies[0];
  };

  return (
    <div className="p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-slate-500'
              }`}>
                <step.icon size={16} />
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-slate-600'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-[400px]"
      >
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={personalInfo.age}
                  onChange={(e) => setPersonalInfo({...personalInfo, age: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="18"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employment Status
                </label>
                <select
                  value={personalInfo.employmentStatus}
                  onChange={(e) => setPersonalInfo({...personalInfo, employmentStatus: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Dependents
                </label>
                <input
                  type="number"
                  value={personalInfo.dependents}
                  onChange={(e) => setPersonalInfo({...personalInfo, dependents: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Currency
                </label>
                <select
                  value={personalInfo.primaryCurrency}
                  onChange={(e) => setPersonalInfo({...personalInfo, primaryCurrency: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Net Worth Question */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
              <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">
                💰 What's your current net worth?
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                Include all your assets (bank accounts, investments, crypto, property) minus debts. This helps us understand your financial starting point.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Current Net Worth
                  </label>
                  <input
                    type="number"
                    value={personalInfo.currentNetWorth || ''}
                    onChange={(e) => setPersonalInfo({...personalInfo, currentNetWorth: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="0"
                    step="1000"
                    placeholder="Enter total net worth"
                  />
                </div>
                
                <div className="flex items-end">
                  <div className="text-sm text-gray-600 dark:text-slate-500">
                    <div className="mb-1">Quick estimates:</div>
                    <div className="space-y-1 text-xs">
                      <div>Early career: $0 - $50k</div>
                      <div>Mid career: $50k - $500k</div>
                      <div>Advanced: $500k+</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-blue-600 dark:text-blue-400">
                💡 Tip: We'll help you track specific assets in the next step. This is just a starting estimate.
              </div>
            </div>

            {/* Risk Tolerance Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Risk Tolerance (0-10 Scale)
              </label>
              <div className="space-y-3">
                {riskToleranceOptions.map((option) => (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedRiskTolerance === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setSelectedRiskTolerance(option.value);
                      setPersonalInfo({...personalInfo, riskTolerance: option.value});
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-800 dark:text-white">
                            {option.label}
                          </span>
                          {selectedRiskTolerance === option.value && (
                            <CheckCircle className="text-blue-600" size={16} />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-500 mb-2">
                          {option.description}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                          <strong>Example:</strong> {option.example}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-600">
                          <strong>Best for:</strong> {option.profile}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Income Sources</h3>
              <button
                onClick={addIncomeSource}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Income
              </button>
            </div>

            <div className="space-y-4">
              {incomeStreams.map((income, index) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <select
                        value={income.category}
                        onChange={(e) => {
                          const updated = [...incomeStreams];
                          updated[index] = {...income, category: e.target.value, subcategory: Object.keys(incomeCategories[e.target.value as keyof typeof incomeCategories].subcategories)[0]};
                          setIncomeStreams(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {Object.entries(incomeCategories).map(([key, category]) => (
                          <option key={key} value={key}>{category.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        value={income.subcategory}
                        onChange={(e) => {
                          const updated = [...incomeStreams];
                          updated[index] = {...income, subcategory: e.target.value};
                          setIncomeStreams(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {Object.entries(incomeCategories[income.category as keyof typeof incomeCategories].subcategories).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount ({getCurrencyByCode(income.currency).symbol})
                      </label>
                      <input
                        type="number"
                        value={income.amount || ''}
                        onChange={(e) => {
                          const updated = [...incomeStreams];
                          updated[index] = {...income, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0};
                          setIncomeStreams(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={income.frequency}
                        onChange={(e) => {
                          const updated = [...incomeStreams];
                          updated[index] = {...income, frequency: e.target.value, isRecurring: e.target.value !== 'one-time'};
                          setIncomeStreams(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {frequencyOptions.map(freq => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Currency
                      </label>
                      <select
                        value={income.currency}
                        onChange={(e) => {
                          const updated = [...incomeStreams];
                          updated[index] = {...income, currency: e.target.value};
                          setIncomeStreams(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {income.isRecurring && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Day of Month
                        </label>
                        <input
                          type="number"
                          value={income.dayOfMonth}
                          onChange={(e) => {
                            const updated = [...incomeStreams];
                            updated[index] = {...income, dayOfMonth: parseInt(e.target.value) || 1};
                            setIncomeStreams(updated);
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          min="1"
                          max="31"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={income.isActive}
                        onChange={(e) => {
                          const updated = [...incomeStreams];
                          updated[index] = {...income, isActive: e.target.checked};
                          setIncomeStreams(updated);
                        }}
                        className="rounded"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setIncomeStreams(incomeStreams.filter(s => s.id !== income.id))}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {incomeStreams.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto text-slate-500 mb-4" size={48} />
                <p className="text-gray-600 dark:text-slate-500 mb-4">No income sources added yet</p>
                <button
                  onClick={addIncomeSource}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Your First Income Source
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Expenses</h3>
              <button
                onClick={addExpense}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus size={16} />
                Add Expense
              </button>
            </div>

            <div className="space-y-4">
              {expenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <select
                        value={expense.category}
                        onChange={(e) => {
                          const updated = [...expenses];
                          const categoryData = expenseCategories[e.target.value as keyof typeof expenseCategories];
                          updated[index] = {
                            ...expense, 
                            category: e.target.value, 
                            subcategory: Object.keys(categoryData.subcategories)[0],
                            isEssential: categoryData.essential
                          };
                          setExpenses(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {Object.entries(expenseCategories).map(([key, category]) => (
                          <option key={key} value={key}>{category.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        value={expense.subcategory}
                        onChange={(e) => {
                          const updated = [...expenses];
                          updated[index] = {...expense, subcategory: e.target.value};
                          setExpenses(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {Object.entries(expenseCategories[expense.category as keyof typeof expenseCategories].subcategories).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount ({getCurrencyByCode(expense.currency).symbol})
                      </label>
                      <input
                        type="number"
                        value={expense.amount || ''}
                        onChange={(e) => {
                          const updated = [...expenses];
                          updated[index] = {...expense, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0};
                          setExpenses(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={expense.frequency}
                        onChange={(e) => {
                          const updated = [...expenses];
                          updated[index] = {...expense, frequency: e.target.value, isRecurring: e.target.value !== 'one-time'};
                          setExpenses(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {frequencyOptions.map(freq => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Currency
                      </label>
                      <select
                        value={expense.currency}
                        onChange={(e) => {
                          const updated = [...expenses];
                          updated[index] = {...expense, currency: e.target.value};
                          setExpenses(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {expense.isRecurring && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Day of Month
                        </label>
                        <input
                          type="number"
                          value={expense.dayOfMonth}
                          onChange={(e) => {
                            const updated = [...expenses];
                            updated[index] = {...expense, dayOfMonth: parseInt(e.target.value) || 1};
                            setExpenses(updated);
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          min="1"
                          max="31"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={expense.isEssential}
                        onChange={(e) => {
                          const updated = [...expenses];
                          updated[index] = {...expense, isEssential: e.target.checked};
                          setExpenses(updated);
                        }}
                        className="rounded"
                      />
                      <label className="text-sm text-gray-700 dark:text-gray-300">Essential</label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setExpenses(expenses.filter(e => e.id !== expense.id))}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {expenses.length === 0 && (
              <div className="text-center py-12">
                <TrendingDown className="mx-auto text-slate-500 mb-4" size={48} />
                <p className="text-gray-600 dark:text-slate-500 mb-4">No expenses added yet</p>
                <button
                  onClick={addExpense}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Add Your First Expense
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Financial Goals</h3>
              <button
                onClick={addGoal}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus size={16} />
                Add Goal
              </button>
            </div>

            <div className="space-y-4">
              {goals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Goal Name
                      </label>
                      <input
                        type="text"
                        value={goal.name}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[index] = {...goal, name: e.target.value};
                          setGoals(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="e.g., Emergency Fund"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Target Amount ({getCurrencyByCode(goal.currency).symbol})
                      </label>
                      <input
                        type="number"
                        value={goal.targetAmount || ''}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[index] = {...goal, targetAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0};
                          setGoals(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Current Amount ({getCurrencyByCode(goal.currency).symbol})
                      </label>
                      <input
                        type="number"
                        value={goal.currentAmount || ''}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[index] = {...goal, currentAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0};
                          setGoals(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={goal.targetDate}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[index] = {...goal, targetDate: e.target.value};
                          setGoals(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={goal.priority}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[index] = {...goal, priority: e.target.value as 'high' | 'medium' | 'low'};
                          setGoals(updated);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setGoals(goals.filter(g => g.id !== goal.id))}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {goals.length === 0 && (
              <div className="text-center py-12">
                <Target className="mx-auto text-slate-500 mb-4" size={48} />
                <p className="text-gray-600 dark:text-slate-500 mb-4">No financial goals added yet</p>
                <button
                  onClick={addGoal}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add Your First Goal
                </button>
              </div>
            )}

            {/* Financial Summary */}
            {(incomeStreams.length > 0 || expenses.length > 0) && (
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">
                  Financial Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Monthly Income</div>
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {getCurrencyByCode(personalInfo.primaryCurrency).symbol}
                      {calculateFinancials().monthlyIncome.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Monthly Expenses</div>
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {getCurrencyByCode(personalInfo.primaryCurrency).symbol}
                      {calculateFinancials().monthlyExpenses.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Net Income</div>
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {getCurrencyByCode(personalInfo.primaryCurrency).symbol}
                      {calculateFinancials().netIncome.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Savings Rate</div>
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {calculateFinancials().savingsRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
            currentStep === 1
              ? 'text-slate-500 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-gray-700'
          }`}
        >
          <ArrowLeft size={16} />
          Previous
        </button>

        {currentStep < steps.length ? (
          <button
            onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle size={16} />
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );
}