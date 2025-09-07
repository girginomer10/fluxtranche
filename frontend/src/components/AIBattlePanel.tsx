'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Trophy, 
  Sword, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Star,
  Zap,
  Shield,
  Users,
  Award,
  Bot,
  BarChart3
} from 'lucide-react';

interface AIAgent {
  id: number;
  address: string;
  name: string;
  model: string;
  reputation: number;
  totalPredictions: number;
  successfulPredictions: number;
  successRate: number;
  lastActive: number;
  isActive: boolean;
}

interface WeightProposal {
  proposalId: number;
  agent: string;
  agentName: string;
  model: string;
  epochIndex: number;
  seniorWeightBps: number;
  juniorWeightBps: number;
  reasoning: string;
  confidence: number;
  timestamp: number;
  performance?: number;
}

interface BattleRound {
  roundId: number;
  epochIndex: number;
  startTime: number;
  endTime: number;
  proposals: WeightProposal[];
  winningProposalId?: number;
  winningAgent?: string;
  settled: boolean;
  isActive: boolean;
}

interface ConsensusWeights {
  epochIndex: number;
  seniorWeightBps: number;
  juniorWeightBps: number;
  totalVoteWeight: number;
  participantCount: number;
  methodology: string;
}

export function AIBattlePanel() {
  const [agents] = useState<AIAgent[]>([
    {
      id: 1,
      address: '0x1234...5678',
      name: 'GeminiPro-2.0',
      model: 'Gemini 2.0 Pro',
      reputation: 8500,
      totalPredictions: 25,
      successfulPredictions: 18,
      successRate: 7200, // 72%
      lastActive: Date.now() - 1800000, // 30 min ago
      isActive: true
    },
    {
      id: 2,
      address: '0x2345...6789',
      name: 'GPT-4o',
      model: 'GPT-4o',
      reputation: 7800,
      totalPredictions: 30,
      successfulPredictions: 21,
      successRate: 7000, // 70%
      lastActive: Date.now() - 3600000, // 1 hour ago
      isActive: true
    },
    {
      id: 3,
      address: '0x3456...7890',
      name: 'Claude-3.5-Sonnet',
      model: 'Claude 3.5 Sonnet',
      reputation: 7200,
      totalPredictions: 22,
      successfulPredictions: 14,
      successRate: 6364, // 63.64%
      lastActive: Date.now() - 7200000, // 2 hours ago
      isActive: true
    },
    {
      id: 4,
      address: '0x4567...8901',
      name: 'Llama-3.1-405B',
      model: 'Llama 3.1 405B',
      reputation: 6500,
      totalPredictions: 18,
      successfulPredictions: 10,
      successRate: 5556, // 55.56%
      lastActive: Date.now() - 10800000, // 3 hours ago
      isActive: true
    }
  ]);

  const [currentBattle, setCurrentBattle] = useState<BattleRound>({
    roundId: 12,
    epochIndex: 45,
    startTime: Date.now() - 1800000, // Started 30 min ago
    endTime: Date.now() + 5400000, // Ends in 1.5 hours
    proposals: [
      {
        proposalId: 101,
        agent: '0x1234...5678',
        agentName: 'GeminiPro-2.0',
        model: 'Gemini 2.0 Pro',
        epochIndex: 45,
        seniorWeightBps: 7000, // 70%
        juniorWeightBps: 3000, // 30%
        reasoning: 'Market volatility at 45%. Recommend defensive positioning with Senior bias due to upcoming Fed meeting uncertainty.',
        confidence: 8500, // 85%
        timestamp: Date.now() - 1200000 // 20 min ago
      },
      {
        proposalId: 102,
        agent: '0x2345...6789',
        agentName: 'GPT-4o',
        model: 'GPT-4o',
        epochIndex: 45,
        seniorWeightBps: 4500, // 45%
        juniorWeightBps: 5500, // 55%
        reasoning: 'Technical indicators showing bullish divergence. RSI oversold, MACD crossing up. Favor Junior for higher returns.',
        confidence: 7800, // 78%
        timestamp: Date.now() - 900000 // 15 min ago
      },
      {
        proposalId: 103,
        agent: '0x3456...7890',
        agentName: 'Claude-3.5-Sonnet',
        model: 'Claude 3.5 Sonnet',
        epochIndex: 45,
        seniorWeightBps: 6000, // 60%
        juniorWeightBps: 4000, // 40%
        reasoning: 'Balanced approach. Market sentiment mixed, correlations elevated. Moderate Senior preference for risk management.',
        confidence: 7200, // 72%
        timestamp: Date.now() - 600000 // 10 min ago
      }
    ],
    settled: false,
    isActive: true
  });

  const [consensus, setConsensus] = useState<ConsensusWeights>({
    epochIndex: 45,
    seniorWeightBps: 5833, // 58.33% (weighted average)
    juniorWeightBps: 4167, // 41.67%
    totalVoteWeight: 23500,
    participantCount: 3,
    methodology: 'Reputation-weighted'
  });

  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      if (!currentBattle.isActive) {
        setTimeRemaining('Battle Ended');
        return;
      }

      const remaining = currentBattle.endTime - Date.now();
      if (remaining <= 0) {
        setTimeRemaining('Battle Ended');
        setCurrentBattle(prev => ({ ...prev, isActive: false }));
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentBattle]);

  const getModelIcon = (model: string) => {
    if (model.includes('Gemini')) return <Brain className="text-blue-500" size={16} />;
    if (model.includes('GPT')) return <Bot className="text-green-500" size={16} />;
    if (model.includes('Claude')) return <Zap className="text-purple-500" size={16} />;
    if (model.includes('Llama')) return <Target className="text-orange-500" size={16} />;
    return <Brain className="text-slate-600" size={16} />;
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 8000) return 'text-green-600 dark:text-green-400';
    if (reputation >= 6000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getReputationBadge = (reputation: number) => {
    if (reputation >= 8000) return { label: 'Elite', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' };
    if (reputation >= 6000) return { label: 'Expert', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' };
    return { label: 'Novice', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-slate-500' };
  };

  const formatBps = (bps: number) => {
    return (bps / 100).toFixed(1) + '%';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg"
              animate={currentBattle.isActive ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sword className="text-purple-600 dark:text-purple-400" size={24} />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">AI Battle of Weights</h3>
              <p className="text-sm text-gray-600 dark:text-slate-500">Epoch {currentBattle.epochIndex} • Round {currentBattle.roundId}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-lg font-bold ${currentBattle.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600'}`}>
              {timeRemaining}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-500">
              {currentBattle.isActive ? 'Submission Window' : 'Battle Complete'}
            </div>
          </div>
        </div>
      </div>

      {/* Battle Status */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <Users className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={20} />
            <div className="text-lg font-bold text-gray-800 dark:text-white">{currentBattle.proposals.length}</div>
            <div className="text-xs text-gray-600 dark:text-slate-500">Participants</div>
          </div>
          <div className="text-center">
            <Trophy className="mx-auto mb-2 text-yellow-500" size={20} />
            <div className="text-lg font-bold text-gray-800 dark:text-white">{consensus.totalVoteWeight.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-slate-500">Total Vote Weight</div>
          </div>
          <div className="text-center">
            <Shield className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={20} />
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatBps(consensus.seniorWeightBps)}</div>
            <div className="text-xs text-gray-600 dark:text-slate-500">Consensus Senior</div>
          </div>
          <div className="text-center">
            <TrendingUp className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={20} />
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatBps(consensus.juniorWeightBps)}</div>
            <div className="text-xs text-gray-600 dark:text-slate-500">Consensus Junior</div>
          </div>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Award className="text-yellow-500" size={16} />
          Agent Leaderboard
        </h4>
        <div className="space-y-3">
          {agents.map((agent, index) => {
            const badge = getReputationBadge(agent.reputation);
            const hasProposal = currentBattle.proposals.some(p => p.agent === agent.address);
            
            return (
              <motion.div
                key={agent.id}
                className={`flex items-center justify-between p-3 rounded-lg border-l-4 transition-all ${
                  hasProposal 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      {getModelIcon(agent.model)}
                      <span className="font-medium text-gray-800 dark:text-white">{agent.name}</span>
                      {hasProposal && <Star className="text-green-500" size={14} />}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-slate-500">{agent.model}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-bold ${getReputationColor(agent.reputation)}`}>
                    {formatBps(agent.reputation)}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                    {badge.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current Proposals */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <BarChart3 className="text-blue-500" size={16} />
          Current Proposals
        </h4>
        
        <div className="space-y-4">
          {currentBattle.proposals.map((proposal, index) => {
            const agent = agents.find(a => a.address === proposal.agent);
            
            return (
              <motion.div
                key={proposal.proposalId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getModelIcon(proposal.model)}
                    <span className="font-medium text-gray-800 dark:text-white">{proposal.agentName}</span>
                    <div className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {formatBps(proposal.confidence)} confidence
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-500">
                    {new Date(proposal.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                {/* Weight Allocation */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="text-blue-500" size={14} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Senior</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatBps(proposal.seniorWeightBps)}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="text-purple-500" size={14} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Junior</span>
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {formatBps(proposal.juniorWeightBps)}
                    </div>
                  </div>
                </div>
                
                {/* Reasoning */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">AI Reasoning:</div>
                  <div className="text-sm text-gray-600 dark:text-slate-500 italic">
                    "{proposal.reasoning}"
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {currentBattle.proposals.length === 0 && (
          <div className="text-center py-8">
            <Brain className="mx-auto mb-3 text-slate-500" size={48} />
            <p className="text-gray-600 dark:text-slate-500">No proposals submitted yet</p>
            <p className="text-xs text-slate-600 dark:text-slate-600">Waiting for AI agents to submit their weight recommendations</p>
          </div>
        )}
      </div>
    </div>
  );
}