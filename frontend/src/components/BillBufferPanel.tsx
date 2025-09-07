'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign, AlertCircle, CheckCircle2, Plus, Trash2, Edit } from 'lucide-react';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: 'rent' | 'utilities' | 'phone' | 'internet' | 'other';
  isPaid: boolean;
  autoReserved: number; // Amount already reserved
}

interface BillPlan {
  totalMonthlyBills: number;
  totalReserved: number;
  nextDueDate: Date;
  daysUntilNext: number;
  progressPercentage: number;
}

export function BillBufferPanel() {
  const [bills, setBills] = useState<Bill[]>([
    {
      id: '1',
      name: 'Rent',
      amount: 1200,
      dueDate: new Date(2025, 0, 1), // Jan 1, 2025
      category: 'rent',
      isPaid: false,
      autoReserved: 600
    },
    {
      id: '2',
      name: 'Electricity',
      amount: 150,
      dueDate: new Date(2025, 0, 5),
      category: 'utilities',
      isPaid: false,
      autoReserved: 120
    },
    {
      id: '3',
      name: 'Phone',
      amount: 80,
      dueDate: new Date(2025, 0, 10),
      category: 'phone',
      isPaid: false,
      autoReserved: 80
    }
  ]);

  const [showAddBill, setShowAddBill] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    dueDate: '',
    category: 'other' as const
  });

  const [billPlan, setBillPlan] = useState<BillPlan | null>(null);

  useEffect(() => {
    // Calculate bill plan
    const totalMonthlyBills = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalReserved = bills.reduce((sum, bill) => sum + bill.autoReserved, 0);
    
    const nextBill = bills
      .filter(bill => !bill.isPaid)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    if (nextBill) {
      const daysUntilNext = Math.ceil((nextBill.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const progressPercentage = Math.min(100, (totalReserved / totalMonthlyBills) * 100);

      setBillPlan({
        totalMonthlyBills,
        totalReserved,
        nextDueDate: nextBill.dueDate,
        daysUntilNext,
        progressPercentage
      });
    }
  }, [bills]);

  const handleAddBill = () => {
    if (!newBill.name || !newBill.amount || !newBill.dueDate) return;

    const bill: Bill = {
      id: Date.now().toString(),
      name: newBill.name,
      amount: parseFloat(newBill.amount),
      dueDate: new Date(newBill.dueDate),
      category: newBill.category,
      isPaid: false,
      autoReserved: 0
    };

    setBills(prev => [...prev, bill]);
    setNewBill({ name: '', amount: '', dueDate: '', category: 'other' });
    setShowAddBill(false);
  };

  const handlePayBill = (billId: string) => {
    setBills(prev => prev.map(bill => 
      bill.id === billId 
        ? { ...bill, isPaid: true, autoReserved: 0 }
        : bill
    ));
  };

  const handleDeleteBill = (billId: string) => {
    setBills(prev => prev.filter(bill => bill.id !== billId));
  };

  const simulateReservation = () => {
    setBills(prev => prev.map(bill => {
      if (!bill.isPaid && bill.autoReserved < bill.amount) {
        return {
          ...bill,
          autoReserved: Math.min(bill.amount, bill.autoReserved + (bill.amount * 0.1))
        };
      }
      return bill;
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rent': return '🏠';
      case 'utilities': return '⚡';
      case 'phone': return '📱';
      case 'internet': return '🌐';
      default: return '💳';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rent': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'utilities': return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
      case 'phone': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      case 'internet': return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      default: return 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-slate-500';
    }
  };

  if (!billPlan) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calendar className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Bill Buffer
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-500">
                Ready when bills are due
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddBill(true)}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-slate-500">Buffer Progress</span>
            <span className="text-lg font-bold text-gray-800 dark:text-white">
              ${billPlan.totalReserved.toLocaleString()} / ${billPlan.totalMonthlyBills.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              initial={{ width: 0 }}
              animate={{ width: `${billPlan.progressPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-slate-500 mt-1">
            {billPlan.progressPercentage.toFixed(1)}% ready
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="text-sm text-gray-600 dark:text-slate-500">Next Due</div>
            <div className="font-bold text-gray-800 dark:text-white">
              {billPlan.daysUntilNext} days
            </div>
            <div className="text-xs text-gray-600 dark:text-slate-500">
              {billPlan.nextDueDate.toLocaleDateString()}
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-sm text-gray-600 dark:text-slate-500">Auto Reserve</div>
            <div className="font-bold text-green-600 dark:text-green-400">
              Active
            </div>
            <div className="text-xs text-gray-600 dark:text-slate-500">
              Daily micro-savings
            </div>
          </div>
        </div>

        <button
          onClick={simulateReservation}
          className="w-full mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors"
        >
          Demo: Add Daily Reservation
        </button>
      </div>

      {/* Bills List */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Upcoming Bills
        </h3>
        
        <div className="space-y-3">
          {bills
            .filter(bill => !bill.isPaid)
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
            .map((bill) => {
              const daysUntil = Math.ceil((bill.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const reservationProgress = (bill.autoReserved / bill.amount) * 100;
              const isOverdue = daysUntil < 0;
              const isUrgent = daysUntil <= 3 && daysUntil >= 0;

              return (
                <motion.div
                  key={bill.id}
                  layout
                  className={`p-4 rounded-lg border ${
                    isOverdue 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                      : isUrgent 
                        ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg text-sm ${getCategoryColor(bill.category)}`}>
                        {getCategoryIcon(bill.category)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-800 dark:text-white">
                            {bill.name}
                          </h4>
                          {isOverdue && (
                            <AlertCircle className="text-red-500" size={16} />
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-slate-500">
                          Due: {bill.dueDate.toLocaleDateString()}
                          {daysUntil >= 0 ? ` (${daysUntil} days)` : ` (${Math.abs(daysUntil)} days overdue)`}
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 dark:text-slate-500 mb-1">
                            <span>Reserved</span>
                            <span>${bill.autoReserved.toFixed(0)} / ${bill.amount}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                reservationProgress >= 100 ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(100, reservationProgress)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold text-gray-800 dark:text-white">
                          ${bill.amount}
                        </div>
                        {reservationProgress >= 100 && (
                          <button
                            onClick={() => handlePayBill(bill.id)}
                            className="text-xs px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded mt-1 transition-colors"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        className="p-1 text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>

        {/* Paid Bills */}
        {bills.some(bill => bill.isPaid) && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Recently Paid
            </h4>
            <div className="space-y-2">
              {bills
                .filter(bill => bill.isPaid)
                .map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <CheckCircle2 className="text-green-500" size={16} />
                    <div className="flex-1">
                      <span className="text-sm text-gray-800 dark:text-white">
                        {bill.name} - ${bill.amount}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Paid
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      <AnimatePresence>
        {showAddBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddBill(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Add New Bill
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bill Name
                  </label>
                  <input
                    type="text"
                    value={newBill.name}
                    onChange={(e) => setNewBill(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Internet Bill"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={newBill.amount}
                    onChange={(e) => setNewBill(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newBill.dueDate}
                    onChange={(e) => setNewBill(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newBill.category}
                    onChange={(e) => setNewBill(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="rent">Rent</option>
                    <option value="utilities">Utilities</option>
                    <option value="phone">Phone</option>
                    <option value="internet">Internet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddBill(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBill}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  Add Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}