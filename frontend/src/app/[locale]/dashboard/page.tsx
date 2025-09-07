'use client';

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Shield, 
  Target, 
  Layers, 
  Zap, 
  BarChart3, 
  DollarSign, 
  Brain, 
  Bot,
  Wallet,
  PieChart,
  Activity,
  Clock,
  Sparkles,
  Layers3,
  TrendingDown,
  ArrowUpDown,
  Banknote,
  Calendar,
  Users,
  Gamepad2,
  ChevronRight,
  Home,
  Building2,
  Coins,
  LineChart,
  Settings,
  HelpCircle,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import all the panels
import { CPPIAutopilotPanel } from '@/components/CPPIAutopilotPanel';
import { AutoCallableNotePanel } from '@/components/AutoCallableNotePanel';
import { LadderedEpochsPanel } from '@/components/LadderedEpochsPanel';
import { DrawdownShieldPanel } from '@/components/DrawdownShieldPanel';
import { YieldTeleportPanel } from '@/components/YieldTeleportPanel';
import { LiquidityStaircasePanel } from '@/components/LiquidityStaircasePanel';
import { PortfolioDashboard } from '@/components/PortfolioDashboard';
import { AIDecisionViewer } from '@/components/AIDecisionViewer';
import { EpochPanel } from '@/components/EpochPanel';
import { DepositWithdrawFlow } from '@/components/DepositWithdrawFlow';
import { FlashEpochsPanel } from '@/components/FlashEpochsPanel';
import { AIBattlePanel } from '@/components/AIBattlePanel';
import { SessionKeyMacrosPanel } from '@/components/SessionKeyMacrosPanel';
import { KineticFeesPanel } from '@/components/KineticFeesPanel';
import { CosmosWalletPanel } from '@/components/CosmosWalletPanel';
import { PaydaySplitterPanel } from '@/components/PaydaySplitterPanel';
import { BillBufferPanel } from '@/components/BillBufferPanel';
import { RetirePathPanel } from '@/components/RetirePathPanel';
import { UnifiedWalletOverview } from '@/components/UnifiedWalletOverview';
import { WalletPortfolioSetup } from '@/components/WalletPortfolioSetup';
import { CoinBasedWalletManager } from '@/components/CoinBasedWalletManager';

const sidebarItems = [
  {
    category: 'Core Features',
    items: [
      { id: 'portfolio', label: 'Portfolio Dashboard', icon: PieChart, description: 'Complete portfolio overview' },
      { id: 'deposit-withdraw', label: 'Deposit & Withdraw', icon: ArrowUpDown, description: 'Manage your positions' },
      { id: 'epoch', label: 'Epoch Management', icon: Clock, description: 'Current epoch status' },
      { id: 'ai-decisions', label: 'AI Decision Center', icon: Brain, description: 'AI-powered risk insights' }
    ]
  },
  {
    category: 'Risk & AI',
    items: [
      { id: 'cppi-autopilot', label: 'CPPI Autopilot', icon: Target, description: 'Constant proportion portfolio insurance' },
      { id: 'autocallable', label: 'AutoCallable Note', icon: TrendingUp, description: 'Smart structured products' },
      { id: 'laddered-epochs', label: 'Laddered Epochs', icon: Layers, description: 'Time-based diversification' },
      { id: 'drawdown-shield', label: 'Drawdown Shield', icon: Shield, description: 'Downside protection' },
      { id: 'yield-teleport', label: 'Yield Teleport', icon: Zap, description: 'Cross-chain yield optimization' },
      { id: 'liquidity-staircase', label: 'Liquidity Staircase', icon: BarChart3, description: 'Graduated liquidity management' }
    ]
  },
  {
    category: 'Wall Street Tech',
    items: [
      { id: 'flash-epochs', label: 'Flash Epochs', icon: Sparkles, description: 'Ultra-fast settlement cycles' },
      { id: 'ai-battle', label: 'AI Battle Arena', icon: Gamepad2, description: 'Competing AI strategies' },
      { id: 'session-macros', label: 'Session Key Macros', icon: Bot, description: 'Automated trading sequences' },
      { id: 'kinetic-fees', label: 'Kinetic Fee Engine', icon: Activity, description: 'Dynamic fee optimization' }
    ]
  },
  {
    category: 'Wallet & Portfolio',
    items: [
      { id: 'unified-wallet', label: 'Unified Wallet View', icon: Wallet, description: 'Multi-chain wallet aggregation' },
      { id: 'wallet-setup', label: 'Portfolio Setup', icon: Settings, description: 'Configure your portfolio' },
      { id: 'coin-manager', label: 'Coin-Based Manager', icon: Coins, description: 'Asset-specific management' },
      { id: 'cosmos-wallet', label: 'Cosmos Integration', icon: Building2, description: 'Cosmos ecosystem access' }
    ]
  },
  {
    category: 'Personal Finance',
    items: [
      { id: 'payday-splitter', label: 'Payday Splitter', icon: Calendar, description: 'Automated salary allocation' },
      { id: 'bill-buffer', label: 'Bill Buffer', icon: Banknote, description: 'Smart bill management' },
      { id: 'retire-path', label: 'Retirement Path', icon: TrendingUp, description: 'Long-term wealth building' }
    ]
  }
];

export default function Dashboard() {
  const [selectedFeature, setSelectedFeature] = useState('portfolio');
  const [selectedCategory, setSelectedCategory] = useState('Core Features');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = sidebarItems.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const renderFeaturePanel = () => {
    const components = {
      'portfolio': PortfolioDashboard,
      'deposit-withdraw': DepositWithdrawFlow,
      'epoch': EpochPanel,
      'ai-decisions': AIDecisionViewer,
      'cppi-autopilot': CPPIAutopilotPanel,
      'autocallable': AutoCallableNotePanel,
      'laddered-epochs': LadderedEpochsPanel,
      'drawdown-shield': DrawdownShieldPanel,
      'yield-teleport': YieldTeleportPanel,
      'liquidity-staircase': LiquidityStaircasePanel,
      'flash-epochs': FlashEpochsPanel,
      'ai-battle': AIBattlePanel,
      'session-macros': SessionKeyMacrosPanel,
      'kinetic-fees': KineticFeesPanel,
      'unified-wallet': UnifiedWalletOverview,
      'wallet-setup': WalletPortfolioSetup,
      'coin-manager': CoinBasedWalletManager,
      'cosmos-wallet': CosmosWalletPanel,
      'payday-splitter': PaydaySplitterPanel,
      'bill-buffer': BillBufferPanel,
      'retire-path': RetirePathPanel
    };

    const Component = components[selectedFeature as keyof typeof components];
    
    if (!Component) {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Feature Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This feature is currently under development.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Suspense fallback={
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      }>
        {selectedFeature === 'wallet-setup' ? (
          <Component onUpdate={() => {}} address="0x1234567890123456789012345678901234567890" />
        ) : (
          <Component />
        )}
      </Suspense>
    );
  };

  const selectedItem = sidebarItems
    .flatMap(cat => cat.items)
    .find(item => item.id === selectedFeature);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 320 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="bg-white border-r border-gray-200 shadow-sm relative"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Layers3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-gray-900">FluxTranche</h1>
                  <p className="text-xs text-gray-500">AI-Powered DeFi</p>
                </div>
              </motion.div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 p-0"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
          
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4"
            >
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Categories and Items */}
        <div className="flex-1 overflow-y-auto p-2">
          {sidebarOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {filteredCategories.map((category, categoryIndex) => (
                <div key={category.category} className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: categoryIndex * 0.1 }}
                  >
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {category.category}
                    </h3>
                  </motion.div>
                  <div className="space-y-1">
                    {category.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      const isSelected = selectedFeature === item.id;
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (categoryIndex * 0.1) + (itemIndex * 0.05) }}
                        >
                          <Button
                            variant={isSelected ? 'secondary' : 'ghost'}
                            className={`w-full justify-start h-auto p-3 ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-200 text-blue-900' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedFeature(item.id)}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                              <div className="text-left flex-1 min-w-0">
                                <div className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {item.label}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {item.description}
                                </div>
                              </div>
                              {isSelected && (
                                <ChevronRight className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                  {categoryIndex < filteredCategories.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            // Collapsed sidebar - show only icons
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {sidebarItems.flatMap(category => category.items).map((item) => {
                const Icon = item.icon;
                const isSelected = selectedFeature === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isSelected ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`w-full p-3 ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFeature(item.id)}
                    title={item.label}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                  </Button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-gray-200"
          >
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedItem && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <selectedItem.icon className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedItem.label}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedItem.description}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live
              </Badge>
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Content */}
        <div className="flex-1 p-6 overflow-auto">
          <motion.div
            key={selectedFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderFeaturePanel()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}