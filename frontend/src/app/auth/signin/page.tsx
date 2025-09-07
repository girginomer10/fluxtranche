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
  TrendingUp
} from 'lucide-react'
import { ethers } from 'ethers'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'wallet' | 'google' | 'email'>('wallet')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    try {
      console.log('🔍 Starting wallet connection...')
      
      if (!window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet')
        return
      }

      console.log('✅ Ethereum provider found')
      const ethereum = (window as any).ethereum
      const provider = (ethers as any).providers?.Web3Provider
        ? new (ethers as any).providers.Web3Provider(ethereum)
        : new (ethers as any).BrowserProvider(ethereum)

      console.log('🔗 Provider created:', provider.constructor.name)

      // Request account access for both ethers v5 and v6 setups
      if (ethereum?.request) {
        await ethereum.request({ method: 'eth_requestAccounts' })
        console.log('✅ Account access requested via ethereum.request')
      } else if ((provider as any).send) {
        await (provider as any).send('eth_requestAccounts', [])
        console.log('✅ Account access requested via provider.send')
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      console.log('👤 Address obtained:', address)
      
      // Create message to sign
      const message = `Welcome to FluxTranche! Please sign this message to authenticate.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`
      console.log('📝 Message to sign:', message)
      
      const signature = await signer.signMessage(message)
      console.log('✍️ Signature obtained:', signature.slice(0, 20) + '...')

      // Sign in with wallet
      console.log('🔐 Calling NextAuth signIn...')
      const result = await signIn('wallet', {
        message,
        signature,
        address,
        redirect: false,
      })

      console.log('📋 NextAuth result:', result)

      if (result?.ok) {
        console.log('✅ Wallet authentication successful')
        router.push('/')
      } else {
        console.error('❌ Wallet authentication failed:', result)
        alert(`Wallet authentication failed: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('💥 Wallet connection error:', error)
      alert(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      })
      
      if (result?.ok) {
        router.push('/')
      }
    } catch (error) {
      console.error('Google sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await signIn('email', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
      } else {
        alert('Invalid email or password')
      }
    } catch (error) {
      console.error('Email sign in error:', error)
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
                Welcome Back to Your Financial Future
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Access your DeFi portfolio, AI-powered strategies, and advanced risk management tools.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Secure & Private</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your data is encrypted and never shared</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Smart insights for better decisions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Multi-Chain Support</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Track assets across 30+ blockchains</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right side - Login form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred method to continue
              </p>
            </div>

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

            {/* Login Methods */}
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
                    {isLoading ? 'Connecting...' : 'Connect Wallet'}
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
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Chrome size={20} />
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </motion.div>
              )}

              {activeTab === 'email' && (
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleEmailSignIn}
                  className="space-y-4"
                >
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
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <User size={20} />
                    {isLoading ? 'Signing in...' : 'Sign in'}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </motion.form>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <a 
                  href="/auth/signup"
                  className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Sign up for free
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
