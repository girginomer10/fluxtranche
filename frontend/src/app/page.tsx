'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { DepositWithdrawFlow } from '@/components/DepositWithdrawFlow';
import { EpochPanel } from '@/components/EpochPanel';
import { AIDecisionViewer } from '@/components/AIDecisionViewer';
import { FlashEpochsPanel } from '@/components/FlashEpochsPanel';
import { KineticFeesPanel } from '@/components/KineticFeesPanel';
import { SessionKeyMacrosPanel } from '@/components/SessionKeyMacrosPanel';
import { AIBattlePanel } from '@/components/AIBattlePanel';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { EnhancedAdvancedAccountSetup } from '@/components/EnhancedAdvancedAccountSetup';
import { FinancialAnalyticsDashboard } from '@/components/FinancialAnalyticsDashboard';
import { RetirePathPanel } from '@/components/RetirePathPanel';
import { PaydaySplitterPanel } from '@/components/PaydaySplitterPanel';
import { BillBufferPanel } from '@/components/BillBufferPanel';
import { Brain, Shield, TrendingUp, Globe, Menu, X, Zap, Settings } from 'lucide-react';
import { UnifiedWalletOverview } from '@/components/UnifiedWalletOverview';

interface UserProfile {
  profileId: string;
  profileName: string;
  description: string;
  seniorBps: number;
  juniorBps: number;
  modules: string[];
  features: any;
}

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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null);
  const [walletsRefreshKey, setWalletsRefreshKey] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading FluxTranche...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FluxTranche
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI-Powered DeFi Vault</p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <button
                onClick={() => setShowOnboarding(true)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <Settings size={16} />
                Quick Setup
              </button>
              <button
                onClick={() => setShowAdvancedSetup(true)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg"
              >
                <TrendingUp size={16} />
                Advanced Setup
              </button>
              <a href="https://docs.fluxtranche.io" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Docs
              </a>
              
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {session?.user?.name || session?.user?.email || 'User'}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-sm px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
                <ConnectButton />
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-400"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-gray-700"
            >
              <nav className="flex flex-col gap-3 mt-4">
                <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-300">Features</a>
                <a href="#how-it-works" className="text-sm font-medium text-gray-700 dark:text-gray-300">How It Works</a>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"
                >
                  <Settings size={16} />
                  Quick Setup
                </button>
                <button
                  onClick={() => setShowAdvancedSetup(true)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1"
                >
                  <TrendingUp size={16} />
                  Advanced Setup
                </button>
                <a href="https://docs.fluxtranche.io" className="text-sm font-medium text-gray-700 dark:text-gray-300">Docs</a>
                <div className="mt-3">
                  <ConnectButton />
                </div>
              </nav>
            </motion.div>
          )}
        </div>
      </header>

      {/* Unified Wallet Overview Section */}
      <div className="container mx-auto px-4 mt-6">
        <UnifiedWalletOverview refreshKey={walletsRefreshKey} />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            <span className="block sm:inline">Intelligent</span>{' '}
            <span className="block sm:inline">Risk-Tranched Yields</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Choose your risk profile. Let AI optimize your returns. Built on RISE Chain for maximum efficiency.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">$10M+</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">TVL</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">12%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avg APY</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">1,000+</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Users</div>
            </div>
          </div>
        </motion.div>

        {/* Profile Banner */}
        {userProfile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {userProfile.profileName} Profile Active
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userProfile.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Allocation</div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {userProfile.seniorBps / 100}% Senior / {userProfile.juniorBps / 100}% Junior
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Financial Profile Banner */}
        {financialProfile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    ${financialProfile.monthlyIncome.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Expenses</div>
                  <div className="font-bold text-red-600 dark:text-red-400">
                    ${financialProfile.monthlyExpenses.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Net Income</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    ${financialProfile.netIncome.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Savings Rate</div>
                  <div className="font-bold text-purple-600 dark:text-purple-400">
                    {financialProfile.savingsRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile-based components */}
          {userProfile?.modules.includes('RetirePath') && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <RetirePathPanel />
            </motion.div>
          )}

          {userProfile?.modules.includes('Payday Splitter') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <PaydaySplitterPanel />
            </motion.div>
          )}

          {userProfile?.modules.includes('BillBuffer') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <BillBufferPanel />
            </motion.div>
          )}

          {/* Default components */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DepositWithdrawFlow />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <FlashEpochsPanel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <EpochPanel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <AIDecisionViewer />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <KineticFeesPanel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <AIBattlePanel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <SessionKeyMacrosPanel />
          </motion.div>

          {/* Financial Analytics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-3"
          >
            <FinancialAnalyticsDashboard financialProfile={financialProfile} />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white">
          Why FluxTranche?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Zap className="text-orange-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">Flash Epochs</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adaptive epochs that shrink during high volatility, expand during calm markets
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Brain className="text-purple-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">AI Risk Management</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gemini 2.0 Pro analyzes markets 24/7 to optimize your risk/reward ratio
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Shield className="text-blue-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">Choose Your Risk</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Senior tranches for stable returns, Junior for higher yields
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Globe className="text-green-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">RISE Chain Powered</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              100k+ TPS, passkey support, and gas sponsorship for seamless UX
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 FluxTranche. Built for ETHIstanbul. 🇹🇷
            </div>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="http://localhost:4002/demo/client.html" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">
                Yellow Demo
              </a>
              <a href="https://twitter.com/fluxtranche" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">
                Twitter
              </a>
            </div>
          </div>
          <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-500">
            ⚠️ Experimental protocol. Not audited. Use at your own risk. Not financial advice.
          </div>
        </div>
      </footer>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Quick Investment Profile Setup
              </h2>
              <button
                onClick={() => setShowOnboarding(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <OnboardingWizard
              onComplete={(profile) => {
                setUserProfile(profile);
                setShowOnboarding(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Advanced Account Setup Modal */}
      {showAdvancedSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Advanced Financial Profile Setup
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete financial analysis with income, expenses, and investment goals
                </p>
              </div>
              <button
                onClick={() => setShowAdvancedSetup(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <EnhancedAdvancedAccountSetup
              onComplete={(profile) => {
                setFinancialProfile(profile as any);
                setShowAdvancedSetup(false);
                // Refresh wallets to show newly added ones in TrackedWalletsList
                setWalletsRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
