'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Chrome, 
  Wallet,
  Mail,
  Lock,
  User,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { ethers } from 'ethers'

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'wallet' | 'google' | 'email'>('wallet')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleWalletConnect = async () => {
    setIsLoading(true)
    setError('')
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask or another Web3 wallet')
        return
      }

      const ethereum = (window as any).ethereum
      const provider = (ethers as any).providers?.Web3Provider
        ? new (ethers as any).providers.Web3Provider(ethereum)
        : new (ethers as any).BrowserProvider(ethereum)

      // Request account access before reading signer address
      if (ethereum?.request) {
        await ethereum.request({ method: 'eth_requestAccounts' })
      } else if ((provider as any).send) {
        await (provider as any).send('eth_requestAccounts', [])
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      // Create message to sign
      const message = `Welcome to FluxTranche! Please sign this message to create your account.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`
      const signature = await signer.signMessage(message)

      // Sign up with wallet
      const result = await signIn('wallet', {
        message,
        signature,
        address,
        redirect: false,
      })

      if (result?.ok) {
        setSuccess('Account created successfully!')
        setTimeout(() => router.push('/'), 2000)
      } else {
        setError('Failed to create account with wallet')
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      setError('Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      })
      
      if (result?.ok) {
        setSuccess('Account created successfully!')
        setTimeout(() => router.push('/'), 2000)
      }
    } catch (error) {
      console.error('Google sign up error:', error)
      setError('Failed to create account with Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    
    try {
      // Create user account via API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Account created successfully! Please sign in.')
        setTimeout(() => router.push('/auth/signin'), 3000)
      } else {
        setError(data.message || 'Failed to create account')
      }
    } catch (error) {
      console.error('Email sign up error:', error)
      setError('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-purple-900/20">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 xl:px-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FluxTranche
                </h1>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Start Your DeFi Journey
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Join thousands of users optimizing their crypto portfolios with AI-powered strategies.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Free to Start</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">No upfront costs, pay only for active strategies</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Smart Portfolio Management</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">AI optimizes your risk and returns automatically</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Bank-Level Security</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your funds remain in your custody</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right side - Signup form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred method to get started
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
              >
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2"
              >
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
              </motion.div>
            )}

            {/* Tab Navigation */}
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
              <button
                onClick={() => setActiveTab('wallet')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'wallet'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Wallet size={16} />
                Wallet
              </button>
              <button
                onClick={() => setActiveTab('google')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'google'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Chrome size={16} />
                Google
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'email'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Mail size={16} />
                Email
              </button>
            </div>

            {/* Signup Methods */}
            <div className="space-y-4">
              {activeTab === 'wallet' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    onClick={handleWalletConnect}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wallet size={20} />
                    {isLoading ? 'Connecting...' : 'Create Account with Wallet'}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    Connect with MetaMask, Keplr, or any WalletConnect wallet
                  </p>
                </motion.div>
              )}

              {activeTab === 'google' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Chrome size={20} />
                    {isLoading ? 'Creating account...' : 'Continue with Google'}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </motion.div>
              )}

              {activeTab === 'email' && (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleEmailSignUp}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <User size={20} />
                    {isLoading ? 'Creating account...' : 'Create Account'}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </motion.form>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <a 
                  href="/auth/signin"
                  className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Sign in here
                </a>
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
