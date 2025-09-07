'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { DepositWithdrawFlow } from '@/components/DepositWithdrawFlow';
import { EpochPanel } from '@/components/EpochPanel';
import { AIDecisionViewer } from '@/components/AIDecisionViewer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Brain, Shield, TrendingUp, Globe, Menu, X } from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations();

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
                  {t('navigation.title')}
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('navigation.subtitle')}</p>
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
              <a href="https://docs.fluxtranche.io" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Docs
              </a>
              <LanguageSwitcher />
              <ConnectButton />
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
                <a href="https://docs.fluxtranche.io" className="text-sm font-medium text-gray-700 dark:text-gray-300">Docs</a>
                <div className="flex items-center gap-3 mt-3">
                  <LanguageSwitcher />
                  <ConnectButton />
                </div>
              </nav>
            </motion.div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('hero.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            {t('hero.subtitle')}
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

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Deposit/Withdraw */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DepositWithdrawFlow />
          </motion.div>

          {/* Middle Column - Epoch Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <EpochPanel />
          </motion.div>

          {/* Right Column - AI Decision */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <AIDecisionViewer />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white">
          {t('hero.whyFluxTranche')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Brain className="text-purple-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">{t('hero.aiRiskManagement')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('hero.aiDescription')}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Shield className="text-blue-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">{t('hero.chooseRisk')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('hero.chooseRiskDescription')}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <Globe className="text-green-500 mb-4" size={32} />
            <h4 className="text-lg font-semibold mb-2">{t('hero.risePowered')}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('hero.riseDescription')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 FluxTranche. Built for ETHIstanbul.
            </div>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="https://github.com/fluxtranche" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">
                GitHub
              </a>
              <a href="https://twitter.com/fluxtranche" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">
                Twitter
              </a>
              <a href="https://discord.gg/fluxtranche" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">
                Discord
              </a>
            </div>
          </div>
          <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-500">
            ⚠️ Experimental protocol. Not audited. Use at your own risk. Not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
}