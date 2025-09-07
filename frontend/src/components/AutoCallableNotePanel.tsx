'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  FileText,
  TrendingUp, 
  TrendingDown,
  Shield, 
  Zap, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  Eye,
  Bell,
  Award,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { useAutoCallableNote } from '@/hooks/useAutoCallableNote';

export function AutoCallableNotePanel() {
  const { state, isWritePending, issueNote, triggerObservation, claimMaturedNote, claimAutoCalledNote, calculateCurrentValue } = useAutoCallableNote();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');

  const handleIssueNote = async () => {
    if (!selectedTemplate || !investmentAmount) return;
    try {
      await issueNote(
        selectedTemplate, 
        BigInt(Math.floor(parseFloat(investmentAmount) * 1e6))
      );
      setInvestmentAmount('');
    } catch (error) {
      console.error('Issue note failed:', error);
    }
  };

  const handleObservation = async (tokenId: string) => {
    try {
      await triggerObservation(tokenId);
    } catch (error) {
      console.error('Observation failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'called': return 'text-green-600 bg-green-100';
      case 'matured': return 'text-purple-600 bg-purple-100';
      case 'knocked_in': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevel = (knockInBarrier: number, bufferLevel: number) => {
    const bufferSize = 1 - bufferLevel;
    if (bufferSize >= 0.25) return { level: 'Conservative', color: 'text-green-600' };
    if (bufferSize >= 0.15) return { level: 'Moderate', color: 'text-blue-600' };
    return { level: 'Aggressive', color: 'text-red-600' };
  };

  const formatTimeRemaining = (timestamp: number) => {
    const remaining = timestamp - Date.now();
    if (remaining <= 0) return 'Due now';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    
    if (months > 0) return `${months}m ${days % 30}d`;
    return `${days}d`;
  };

  const getBarrierStatus = (currentPrice: number, initialPrice: number, callBarrier: number, knockInBarrier: number) => {
    const performance = currentPrice / initialPrice;
    const callLevel = callBarrier;
    const knockInLevel = knockInBarrier / initialPrice;

    if (performance >= callLevel) {
      return { status: 'callable', color: 'text-green-600', text: 'Auto-Call Triggered' };
    }
    if (performance <= knockInLevel) {
      return { status: 'knocked_in', color: 'text-red-600', text: 'Barrier Breached' };
    }
    return { status: 'monitoring', color: 'text-blue-600', text: 'Monitoring' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AutoCallable Buffer Notes</h2>
          <p className="text-slate-700 font-medium">Structured notes with auto-call and downside buffer protection</p>
        </div>
      </div>

      {/* Pool Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Note Pool Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">${state.pool.totalNotional.toLocaleString()}</div>
              <div className="text-sm text-slate-600 font-medium">Total Notional</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{state.pool.totalNotes}</div>
              <div className="text-sm text-slate-600 font-medium">Active Notes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{(state.pool.averageCouponRate * 100).toFixed(1)}%</div>
              <div className="text-sm text-slate-600 font-medium">Avg Coupon</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{state.pool.averageTimeToMaturity}</div>
              <div className="text-sm text-slate-600 font-medium">Avg Days to Maturity</div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Auto-Call Rate:</span>
              <span className="font-medium text-green-600">{(state.pool.autoCallRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Knock-In Rate:</span>
              <span className="font-medium text-red-600">{(state.pool.knockInRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Coupons Distributed:</span>
              <span className="font-medium text-blue-600">${state.pool.totalCouponsDistributed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Available Assets:</span>
              <span className="font-medium">{state.pool.underlyingAssets.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span className="font-medium text-green-600">{((1 - state.pool.knockInRate) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Note Templates</TabsTrigger>
          <TabsTrigger value="portfolio">My Notes</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {state.templates.map((template, index) => {
              const riskLevel = getRiskLevel(template.knockInBarrier, template.bufferLevel);
              const isSelected = selectedTemplate === template.id;
              const bufferSize = (1 - template.bufferLevel) * 100;
              
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-green-500' : ''} ${!template.issuanceOpen ? 'opacity-60' : ''}`}
                    onClick={() => template.issuanceOpen && setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{template.name}</h3>
                              <Badge className={`${riskLevel.color} border-0 bg-opacity-20`}>
                                {riskLevel.level}
                              </Badge>
                              {!template.issuanceOpen && (
                                <Badge variant="secondary">Closed</Badge>
                              )}
                            </div>
                            <div className="text-sm text-slate-600">
                              {template.underlyingAsset} • {template.term} days • {bufferSize.toFixed(0)}% buffer
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {(template.couponRate * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-slate-600 font-medium">Annual Coupon</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-green-600">
                            {(template.callBarrier * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-slate-600 font-medium">Auto-Call Level</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-red-600">
                            {(template.knockInBarrier * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-slate-600 font-medium">Knock-In Barrier</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-blue-600">
                            {(template.bufferLevel * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-slate-600 font-medium">Buffer Level</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-semibold text-purple-600">
                            {Math.floor(template.term / template.observationFrequency)}x
                          </div>
                          <div className="text-xs text-slate-600 font-medium">Observations</div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="text-sm text-slate-600">{template.description}</div>
                        <div className="flex justify-between text-sm">
                          <span>Investment Range:</span>
                          <span>${template.minimumInvestment.toLocaleString()} - ${template.maximumInvestment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Observation Frequency:</span>
                          <span>Every {template.observationFrequency} days</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-slate-600 font-medium">Risk/Reward Profile</div>
                        <div className="flex h-2 rounded-full overflow-hidden">
                          <div className="bg-red-500" style={{ width: `${(1 - template.bufferLevel) * 100}%` }} title="At Risk" />
                          <div className="bg-green-500" style={{ width: `${template.bufferLevel * 100}%` }} title="Protected" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>At Risk: {bufferSize.toFixed(0)}%</span>
                          <span>Protected: {(template.bufferLevel * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Issue New Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="investment-amount">Investment Amount (USDC)</Label>
                  <Input
                    id="investment-amount"
                    type="number"
                    placeholder="Enter USDC amount"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                  />
                  {selectedTemplate && (
                    <div className="text-xs text-slate-600 mt-1">
                      Min: ${state.templates.find(t => t.id === selectedTemplate)?.minimumInvestment.toLocaleString()} | 
                      Max: ${state.templates.find(t => t.id === selectedTemplate)?.maximumInvestment.toLocaleString()}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleIssueNote} 
                  disabled={isWritePending || !investmentAmount}
                  className="w-full"
                >
                  {isWritePending ? 'Processing...' : 'Issue AutoCallable Note'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          {state.userNotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No AutoCallable Notes</h3>
                <p className="text-slate-600 mb-4">Issue your first structured note to get started</p>
                <Button variant="outline">
                  View Available Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {state.userNotes.map((note, index) => {
                const currentValue = calculateCurrentValue(note);
                const performance = note.currentPrice / note.initialPrice;
                const barrierStatus = getBarrierStatus(note.currentPrice, note.initialPrice, note.callBarrier, note.knockInBarrier);
                const daysToMaturity = Math.floor((note.maturityDate - Date.now()) / (1000 * 60 * 60 * 24));
                const daysToObservation = Math.floor((note.nextObservation - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <motion.div
                    key={note.tokenId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{note.underlyingAsset} Note</h3>
                                <Badge variant="outline">#{note.tokenId.slice(-3)}</Badge>
                                <Badge className={getStatusColor(note.status)}>
                                  {note.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-600">
                                Principal: ${note.principal.toLocaleString()} USDC
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">
                              ${currentValue.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-600 font-medium">Current Value</div>
                            <div className={`text-sm font-medium ${performance >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                              {(performance * 100).toFixed(1)}% vs Initial
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-blue-600">
                              ${note.initialPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600 font-medium">Initial Price</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-purple-600">
                              ${note.currentPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600 font-medium">Current Price</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-green-600">
                              {(note.couponRate * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-600 font-medium">Coupon Rate</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-orange-600">
                              ${note.totalCouponsEarned.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600 font-medium">Coupons Earned</div>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Barrier Status:</span>
                            <Badge className={`${barrierStatus.color} border-0 bg-opacity-20`}>
                              {barrierStatus.text}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Auto-Call Level:</span>
                              <span className={note.currentPrice >= note.callBarrier ? 'text-green-600 font-medium' : ''}>
                                ${note.callBarrier.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Knock-In Barrier:</span>
                              <span className={note.currentPrice <= note.knockInBarrier ? 'text-red-600 font-medium' : ''}>
                                ${note.knockInBarrier.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Buffer Level:</span>
                              <span>${note.bufferLevel.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                              <div 
                                className="bg-red-500" 
                                style={{ width: `${(note.knockInBarrier / note.callBarrier) * 100}%` }}
                                title="Knock-In Zone"
                              />
                              <div 
                                className="bg-yellow-500" 
                                style={{ width: `${((note.bufferLevel - note.knockInBarrier) / note.callBarrier) * 100}%` }}
                                title="Buffer Zone"
                              />
                              <div 
                                className="bg-green-500" 
                                style={{ width: `${((note.callBarrier - note.bufferLevel) / note.callBarrier) * 100}%` }}
                                title="Protected Zone"
                              />
                            </div>
                            <div 
                              className="absolute top-0 w-1 h-3 bg-blue-600"
                              style={{ left: `${(note.currentPrice / note.callBarrier) * 100}%` }}
                              title="Current Price"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="flex justify-between">
                            <span>Maturity:</span>
                            <span>{daysToMaturity > 0 ? `${daysToMaturity}d` : 'Matured'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Next Observation:</span>
                            <span>{note.nextObservation ? `${daysToObservation}d` : 'None'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Observations Left:</span>
                            <span>{note.observationDates.filter(d => d > Date.now()).length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Barrier Breached:</span>
                            <span className={note.hasKnockedIn ? 'text-red-600' : 'text-green-600'}>
                              {note.hasKnockedIn ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {note.status === 'active' && note.nextObservation <= Date.now() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleObservation(note.tokenId)}
                              disabled={isWritePending}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Trigger Observation
                            </Button>
                          )}
                          {note.status === 'called' && (
                            <Button
                              size="sm"
                              onClick={() => claimAutoCalledNote(note.tokenId)}
                              disabled={isWritePending}
                            >
                              <Award className="w-4 h-4 mr-2" />
                              Claim + Coupon
                            </Button>
                          )}
                          {note.status === 'matured' && (
                            <Button
                              size="sm"
                              onClick={() => claimMaturedNote(note.tokenId)}
                              disabled={isWritePending}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Claim Principal
                            </Button>
                          )}
                          {note.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              Monitoring
                            </Button>
                          )}
                        </div>

                        {note.nextObservation > Date.now() && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-700 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Next observation: {new Date(note.nextObservation).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="observations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Observation Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {state.recentObservations.map((observation, index) => {
                  const getObservationIcon = () => {
                    if (observation.wasAutoCalled) return <ArrowUpCircle className="w-4 h-4 text-green-600" />;
                    if (observation.wasKnockedIn) return <ArrowDownCircle className="w-4 h-4 text-red-600" />;
                    return <Eye className="w-4 h-4 text-blue-600" />;
                  };

                  const getObservationColor = () => {
                    if (observation.wasAutoCalled) return 'text-green-600';
                    if (observation.wasKnockedIn) return 'text-red-600';
                    return 'text-blue-600';
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="p-2 bg-background rounded-full">
                        {getObservationIcon()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Note #{observation.noteId.slice(-3)}</span>
                          <Badge variant="outline" className={getObservationColor()}>
                            {observation.wasAutoCalled ? 'Auto-Called' : observation.wasKnockedIn ? 'Knocked-In' : 'Monitored'}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          Price: ${observation.underlyingPrice.toLocaleString()} 
                          ({(observation.pricePerformance * 100).toFixed(1)}% vs initial ${observation.initialPrice.toLocaleString()})
                        </div>
                        <div className="text-sm text-slate-600">
                          Call: ${observation.callBarrierLevel.toLocaleString()} | 
                          Knock-In: ${observation.knockInBarrierLevel.toLocaleString()}
                          {observation.couponPaid > 0 && (
                            <span className="text-green-600 font-medium ml-2">
                              Coupon: ${observation.couponPaid.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(observation.observationDate).toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.userNotes.map((note) => {
                    const currentValue = calculateCurrentValue(note);
                    const totalReturn = (currentValue - note.principal) / note.principal;
                    
                    return (
                      <div key={note.tokenId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{note.underlyingAsset} #{note.tokenId.slice(-3)}</span>
                          <Badge className={totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {totalReturn >= 0 ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, (totalReturn + 0.5) * 100))} className="h-2" />
                        <div className="text-xs text-slate-600">
                          Value: ${currentValue.toLocaleString()} | 
                          Coupons: ${note.totalCouponsEarned.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Risk Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.userNotes.filter(note => note.status === 'active').map((note) => {
                    const performance = note.currentPrice / note.initialPrice;
                    const callDistance = (note.callBarrier / note.initialPrice - performance) * 100;
                    const knockInDistance = (performance - note.knockInBarrier / note.initialPrice) * 100;
                    
                    return (
                      <div key={note.tokenId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{note.underlyingAsset} #{note.tokenId.slice(-3)}</span>
                          <Badge variant="outline">
                            {performance >= note.callBarrier / note.initialPrice ? 'Callable' : 'Active'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-600">
                          To Auto-Call: {callDistance > 0 ? `+${callDistance.toFixed(1)}%` : 'Triggered'} | 
                          To Knock-In: {knockInDistance > 0 ? `-${knockInDistance.toFixed(1)}%` : 'Breached'}
                        </div>
                        <div className="relative">
                          <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                            <div className="bg-red-500" style={{ width: '25%' }} />
                            <div className="bg-yellow-500" style={{ width: '50%' }} />
                            <div className="bg-green-500" style={{ width: '25%' }} />
                          </div>
                          <div 
                            className="absolute top-0 w-1 h-2 bg-blue-600"
                            style={{ left: `${Math.max(0, Math.min(100, performance * 50))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}