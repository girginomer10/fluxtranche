'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Target, Clock, Shield, TrendingUp, Zap } from 'lucide-react';

interface Question {
  id: string;
  key: string;
  type: 'single' | 'scale';
  title: string;
  description: string;
  options?: { value: string; label: string; icon?: any }[];
  min?: number;
  max?: number;
  labels?: string[];
}

interface UserProfile {
  profileId: string;
  profileName: string;
  description: string;
  seniorBps: number;
  juniorBps: number;
  modules: string[];
  features: {
    ladder?: string;
    shieldBps?: number;
    macro?: string;
    goalBar?: boolean;
    flashEpochs?: boolean;
  };
}

const questions: Question[] = [
  {
    id: 'S1',
    key: 'goal_type',
    type: 'single',
    title: 'What\'s your primary goal?',
    description: 'Choose your main investment objective',
    options: [
      { value: 'long_retirement', label: 'Retirement / Long-term Security', icon: Shield },
      { value: 'mid_big_goal', label: 'Medium-term Goal (House, Car)', icon: Target },
      { value: 'short_goal', label: 'Short-term Goal (PC, Vacation)', icon: Zap },
      { value: 'cashflow_monthly', label: 'Daily/Monthly Cash Management', icon: TrendingUp },
      { value: 'income_business', label: 'Business/Income Flow Management', icon: Target },
      { value: 'fx_sensitive', label: 'Currency/FX Management', icon: TrendingUp }
    ]
  },
  {
    id: 'S2',
    key: 'horizon',
    type: 'single',
    title: 'What\'s your time horizon?',
    description: 'When do you need this money?',
    options: [
      { value: '<1m', label: '< 1 month' },
      { value: '1-3m', label: '1-3 months' },
      { value: '3-12m', label: '3-12 months' },
      { value: '1-5y', label: '1-5 years' },
      { value: '>5y', label: '5+ years' }
    ]
  },
  {
    id: 'S3',
    key: 'risk_score',
    type: 'scale',
    title: 'What\'s your risk appetite?',
    description: 'How much volatility can you handle?',
    min: 0,
    max: 100,
    labels: ['Very Low', 'Low', 'Medium', 'High', 'Very High']
  },
  {
    id: 'S4',
    key: 'income_pattern',
    type: 'single',
    title: 'What\'s your income pattern?',
    description: 'How do you earn money?',
    options: [
      { value: 'salary', label: 'Regular Salary' },
      { value: 'freelance', label: 'Freelance/Irregular' },
      { value: 'allowance', label: 'Allowance/Student' },
      { value: 'pension', label: 'Pension/Retirement' },
      { value: 'smb_cash', label: 'Small Business Daily Cash' }
    ]
  },
  {
    id: 'S5',
    key: 'liquidity_need',
    type: 'single',
    title: 'How quickly do you need access?',
    description: 'Withdrawal speed preference',
    options: [
      { value: 'instant', label: 'Instant Access' },
      { value: '24-72h', label: '24-72 hours' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ]
  },
  {
    id: 'S6',
    key: 'fx_need',
    type: 'single',
    title: 'Currency preference?',
    description: 'How important is FX stability?',
    options: [
      { value: 'usd_only', label: 'USD Stables Only' },
      { value: 'local_fx', label: 'Local Currency Important' },
      { value: 'mixed', label: 'Mixed Currencies' }
    ]
  },
  {
    id: 'S7',
    key: 'withdrawal_style',
    type: 'single',
    title: 'Withdrawal priority?',
    description: 'How do you prefer to queue for withdrawals?',
    options: [
      { value: 'queue_ok', label: 'Queue is Fine (Lower Fees)' },
      { value: 'medium', label: 'Medium Priority' },
      { value: 'priority', label: 'Priority Access (Higher Fees/NFT)' }
    ]
  },
  {
    id: 'S8',
    key: 'experience',
    type: 'single',
    title: 'Your DeFi experience level?',
    description: 'How comfortable are you with complex features?',
    options: [
      { value: 'simple', label: 'Simple Mode (Beginner)' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'pro', label: 'Advanced (Pro Features)' }
    ]
  },
  {
    id: 'S9',
    key: 'automation_pref',
    type: 'single',
    title: 'Automation preference?',
    description: 'How much control do you want?',
    options: [
      { value: 'auto_first', label: 'Full Automation (Recommended)' },
      { value: 'rules', label: 'Rule-based Semi-Auto' },
      { value: 'manual', label: 'Manual Control' }
    ]
  }
];

const profilePresets: { [key: string]: UserProfile } = {
  P1: {
    profileId: 'P1',
    profileName: 'Retirement Saver',
    description: 'Risk adjusts down as target date approaches; retirement goal on track.',
    seniorBps: 8000,
    juniorBps: 2000,
    modules: ['RetirePath', 'Payday Splitter', 'Drawdown Shield', 'Kinetic Fees', 'Flash Epochs'],
    features: {
      ladder: '24h/7d/30d=20/40/40',
      shieldBps: 75,
      flashEpochs: true
    }
  },
  P2: {
    profileId: 'P2',
    profileName: 'Young Professional',
    description: 'Smart payday splits; goals fill up automatically.',
    seniorBps: 7000,
    juniorBps: 3000,
    modules: ['Payday Splitter', 'BillBuffer', 'Session-Key Macros', 'Kinetic Fees'],
    features: {
      ladder: '1h/24h/7d=10/40/50',
      macro: 'IV>60 => J-10%'
    }
  },
  P3: {
    profileId: 'P3',
    profileName: 'Short-term Goal',
    description: 'PC budget fills weekly; grab your badge when you reach the target.',
    seniorBps: 9000,
    juniorBps: 1000,
    modules: ['Rainy-Day Ladder', 'BillBuffer', 'Gamified SBT'],
    features: {
      ladder: 'instant/7d/30d=40/40/20',
      goalBar: true
    }
  },
  P4: {
    profileId: 'P4',
    profileName: 'Retiree',
    description: 'Every month on schedule; one-tap "All to Safe Mode".',
    seniorBps: 9500,
    juniorBps: 500,
    modules: ['Senior Vault', 'RetirePath (Safe)', 'Punctuality SBT'],
    features: {
      ladder: '7d/30d=30/70'
    }
  },
  P5: {
    profileId: 'P5',
    profileName: 'Freelancer',
    description: 'Invoice doesn\'t sit idle until paid; auto-redeems on target date.',
    seniorBps: 8500,
    juniorBps: 1500,
    modules: ['InvoiceNote', 'BillBuffer', 'Session-Key Macros'],
    features: {}
  },
  P6: {
    profileId: 'P6',
    profileName: 'Small Business',
    description: 'End-of-day surplus parks safely; instant access when needed.',
    seniorBps: 9000,
    juniorBps: 1000,
    modules: ['Daily Sweep', 'BillBuffer', 'Flash Epochs'],
    features: {
      ladder: 'instant/24h/7d=40/40/20',
      flashEpochs: true
    }
  },
  P7: {
    profileId: 'P7',
    profileName: 'Expat/FX Sensitive',
    description: 'Smooth out currency swings; vacation budget ready on time.',
    seniorBps: 8500,
    juniorBps: 1500,
    modules: ['Travel Vault + FX Stabilizer', 'BillBuffer', 'Session-Key Macros'],
    features: {}
  },
  P8: {
    profileId: 'P8',
    profileName: 'Family Saver',
    description: 'Achievement badges unlock limits; saving becomes a game.',
    seniorBps: 9000,
    juniorBps: 1000,
    modules: ['EduFund', 'MatchBoost (Family)', 'Gamified SBT'],
    features: {}
  },
  P9: {
    profileId: 'P9',
    profileName: 'Medium-term Goal',
    description: 'Risk automatically tightens as target approaches.',
    seniorBps: 8500,
    juniorBps: 1500,
    modules: ['Laddered Epochs', 'Drawdown Shield', 'Payday Splitter'],
    features: {
      shieldBps: 100,
      ladder: '24h/7d/30d=20/40/40'
    }
  },
  P10: {
    profileId: 'P10',
    profileName: 'Pro User',
    description: 'Wall Street tactics, one-click control.',
    seniorBps: 6000,
    juniorBps: 4000,
    modules: ['CPPI Autopilot', 'Vol-Target', 'Risk Parity', 'AI Battle of Weights'],
    features: {}
  },
  P11: {
    profileId: 'P11',
    profileName: 'Ultra Conservative',
    description: 'Near-zero risk, clear cards.',
    seniorBps: 10000,
    juniorBps: 0,
    modules: ['Senior Only', 'Drawdown Shield'],
    features: {
      shieldBps: 75
    }
  },
  P12: {
    profileId: 'P12',
    profileName: 'Shared Pot',
    description: 'Who pays what? Fair collection, safe investment of surplus.',
    seniorBps: 9000,
    juniorBps: 1000,
    modules: ['Social Pot', 'SettleUp Splitting', 'BillBuffer'],
    features: {}
  }
};

function determineProfile(answers: { [key: string]: string | number }): UserProfile {
  const { goal_type, horizon, risk_score, income_pattern, experience } = answers;
  
  // Simple rule-based routing
  if (goal_type === 'long_retirement' && horizon === '>5y' && (risk_score as number) <= 50) {
    return profilePresets.P1;
  }
  if (goal_type === 'short_goal' && ['<1m', '1-3m', '3-12m'].includes(horizon as string)) {
    return profilePresets.P3;
  }
  if (income_pattern === 'pension' && (risk_score as number) <= 30) {
    return profilePresets.P4;
  }
  if (income_pattern === 'freelance') {
    return profilePresets.P5;
  }
  if (income_pattern === 'smb_cash') {
    return profilePresets.P6;
  }
  if (answers.fx_need !== 'usd_only') {
    return profilePresets.P7;
  }
  if (experience === 'pro' && (risk_score as number) >= 70) {
    return profilePresets.P10;
  }
  if ((risk_score as number) <= 20) {
    return profilePresets.P11;
  }
  if (['cashflow_monthly', 'short_goal'].includes(goal_type as string) && answers.withdrawal_style === 'priority') {
    return profilePresets.P12;
  }
  
  // Default to Young Professional
  return profilePresets.P2;
}

export function OnboardingWizard({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string | number }>({});
  const [showResults, setShowResults] = useState(false);
  const [recommendedProfile, setRecommendedProfile] = useState<UserProfile | null>(null);

  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleAnswer = (value: string | number) => {
    const newAnswers = { ...answers, [currentQuestion.key]: value };
    setAnswers(newAnswers);

    if (isLastStep) {
      // Calculate profile
      const profile = determineProfile(newAnswers);
      setRecommendedProfile(profile);
      setShowResults(true);
    } else {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAcceptProfile = () => {
    if (recommendedProfile) {
      onComplete(recommendedProfile);
    }
  };

  if (showResults && recommendedProfile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto p-6"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Perfect Match Found!
            </h2>
            <p className="text-gray-600 dark:text-slate-500">
              Based on your answers, here's your recommended strategy
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {recommendedProfile.profileName}
            </h3>
            <p className="text-gray-600 dark:text-slate-500 mb-4">
              {recommendedProfile.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-600 dark:text-slate-500">Senior Tranche</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {recommendedProfile.seniorBps / 100}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm text-gray-600 dark:text-slate-500">Junior Tranche</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {recommendedProfile.juniorBps / 100}%
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-slate-500 mb-2">Included Features</div>
              <div className="flex flex-wrap gap-2">
                {recommendedProfile.modules.map((module, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                  >
                    {module}
                  </span>
                ))}
              </div>
            </div>

            {recommendedProfile.features.ladder && (
              <div className="text-sm text-gray-600 dark:text-slate-500">
                <span className="font-medium">Liquidity Ladder:</span> {recommendedProfile.features.ladder}
              </div>
            )}
            {recommendedProfile.features.shieldBps && (
              <div className="text-sm text-gray-600 dark:text-slate-500">
                <span className="font-medium">Shield Protection:</span> {recommendedProfile.features.shieldBps} bps
              </div>
            )}
            {recommendedProfile.features.macro && (
              <div className="text-sm text-gray-600 dark:text-slate-500">
                <span className="font-medium">Auto Rules:</span> {recommendedProfile.features.macro}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowResults(false)}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Retake Quiz
            </button>
            <button
              onClick={handleAcceptProfile}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors font-medium"
            >
              Apply This Strategy
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-slate-500 mb-2">
            <span>Step {currentStep + 1} of {questions.length}</span>
            <span>{Math.round(((currentStep + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {currentQuestion.title}
            </h2>
            <p className="text-gray-600 dark:text-slate-500 mb-6">
              {currentQuestion.description}
            </p>

            {currentQuestion.type === 'single' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswer(option.value)}
                      className="w-full p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {IconComponent && (
                          <IconComponent className="text-slate-500 group-hover:text-blue-500" size={20} />
                        )}
                        <span className="text-gray-800 dark:text-white">{option.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'scale' && (
              <div className="space-y-4">
                <div className="px-4">
                  <input
                    type="range"
                    min={currentQuestion.min}
                    max={currentQuestion.max}
                    step={10}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                    onChange={(e) => handleAnswer(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-500">
                  {currentQuestion.labels?.map((label, index) => (
                    <span key={index}>{label}</span>
                  ))}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleAnswer(50)}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Select Medium Risk
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          
          <div className="text-sm text-slate-600 dark:text-slate-500">
            Press any option to continue
          </div>
        </div>
      </div>
    </div>
  );
}