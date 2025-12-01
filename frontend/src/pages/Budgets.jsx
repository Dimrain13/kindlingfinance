import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { PiggyBank, Plus, Trash2, TrendingDown, TrendingUp, AlertTriangle, Edit, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';
import { BUDGET_CATEGORIES, getBudgetCategoryInfo, BUDGET_GROUPS } from '../utils/budgetCategories';
import TimeFilterButtons from '../components/TimeFilterButtons';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [budgetStatuses, setBudgetStatuses] = useState({});
  const [currentMonth, setCurrentMonth] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deletingBudget, setDeletingBudget] = useState(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('THIS_MONTH');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [newBudget, setNewBudget] = useState({ 
    category: '', 
    amount: '', 
    period: 'monthly',
    rollover: false,
    icon: '💰',
    color: '#3B82F6'
  });

  useEffect(() => {
    loadBudgets();
    // Initialize default time filter (THIS_MONTH - current calendar month)
    handleTimeFilterChange('THIS_MONTH');
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadBudgetStatuses();
    }
  }, [dateRange]);

  const loadBudgets = async () => {
    try {
      const response = await api.get('/budgets');
      setBudgets(response.data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const handleTimeFilterChange = (filterValue, days) => {
    setSelectedTimeFilter(filterValue);
    const end = new Date();
    const start = new Date();
    
    if (filterValue === 'THIS_MONTH') {
      // Current calendar month (Nov 1 - Nov 28)
      start.setDate(1);
    } else if (filterValue === '1M') {
      // Last 30 days (Oct 29 - Nov 28)
      start.setDate(end.getDate() - 30);
    } else if (filterValue === '3M') {
      // Last 3 months (Sep 1 - Nov 28)
      start.setMonth(end.getMonth() - 2);
      start.setDate(1);
    } else if (filterValue === '6M') {
      // Last 6 months (Jun 1 - Nov 28)
      start.setMonth(end.getMonth() - 5);
      start.setDate(1);
    } else if (filterValue === '1Y') {
      // Last 12 months (Dec 1, 2024 - Nov 28, 2025)
      start.setMonth(end.getMonth() - 11);
      start.setDate(1);
    } else if (filterValue === 'YTD') {
      // Year to date (Jan 1 - Nov 28)
      start.setMonth(0);
      start.setDate(1);
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const loadBudgetStatuses = async () => {
    try {
      // Get comprehensive budget status with rollover calculations
      const response = await api.get('/budgets/status');
      setCurrentMonth(response.data.current_month);
      
      // Convert array to map for easy lookup
      const statusMap = {};
      response.data.budgets.forEach(status => {
        statusMap[status.budget_id] = status;
      });
      setBudgetStatuses(statusMap);
    } catch (error) {
      console.error('Failed to load budget status:', error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', {
        ...newBudget,
        amount: parseFloat(newBudget.amount),
        start_date: new Date().toISOString().split('T')[0]
      });
      setShowAdd(false);
      setNewBudget({ category: '', amount: '', period: 'monthly', rollover: false, icon: '💰', color: '#3B82F6' });
      loadBudgets();
      loadBudgetStatuses();
    } catch (error) {
      alert('Failed to add budget');
    }
  };
  
  const handleCategorySelect = (category) => {
    setNewBudget({
      ...newBudget,
      category: category.name,
      icon: category.emoji,
      color: category.color
    });
  };

  const confirmDelete = async () => {
    if (!deletingBudget) return;
    try {
      await api.delete(`/budgets/${deletingBudget.id}`);
      loadBudgets();
      loadBudgetStatuses();
      setDeletingBudget(null);
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const startEdit = (budget) => {
    setEditingBudget({
      id: budget.id,
      category: budget.category,
      amount: budget.amount,
      period: budget.period || 'monthly',
      rollover: budget.rollover || false,
      icon: budget.icon || '💰',
      color: budget.color || '#3B82F6'
    });
  };

  const saveEdit = async () => {
    if (!editingBudget) return;
    try {
      await api.put(`/budgets/${editingBudget.id}`, {
        category: editingBudget.category,
        amount: parseFloat(editingBudget.amount),
        period: editingBudget.period,
        rollover: editingBudget.rollover,
        icon: editingBudget.icon,
        color: editingBudget.color
      });
      loadBudgets();
      loadBudgetStatuses();
      setEditingBudget(null);
    } catch (error) {
      console.error('Failed to update budget:', error);
    }
  };

  // Calculate totals from budget statuses
  const totalBudgeted = budgets.reduce((sum, b) => {
    const status = budgetStatuses[b.id] || {};
    return sum + (status.available_this_month || b.amount);
  }, 0);

  const totalSpent = Object.values(budgetStatuses).reduce((sum, status) => {
    return sum + (status.current_month_spent || 0);
  }, 0);

  const totalRemaining = totalBudgeted - totalSpent;

  const getBudgetStatus = (budget) => {
    const spent = budgetStatuses[budget.id]?.current_month_spent || 0;
    const percentage = (spent / budget.amount) * 100;
    
    if (percentage >= 100) return { status: 'over', color: 'text-red-600', icon: AlertTriangle };
    if (percentage >= 80) return { status: 'warning', color: 'text-yellow-600', icon: TrendingUp };
    return { status: 'good', color: 'text-green-600', icon: TrendingDown };
  };

  // Totals are now calculated above from budgetStatuses

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-kindling-fire to-kindling-blaze bg-clip-text text-transparent">
              Budgets
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your spending against your goals
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-kindling-fire to-kindling-blaze shadow-lg">
            <Plus size={16} className="mr-2" />
            Add Budget
          </Button>
        </div>

        {/* Time Filter Buttons */}
        <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Period:</span>
              <TimeFilterButtons 
                value={selectedTimeFilter}
                onChange={handleTimeFilterChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Budgeted</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(totalBudgeted)}</p>
                </div>
                <PiggyBank className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Spent</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(totalSpent)}</p>
                </div>
                <TrendingUp className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Remaining</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(totalRemaining)}</p>
                </div>
                <TrendingDown className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((budget) => {
            // Get status data from new endpoint
            const statusData = budgetStatuses[budget.id] || {};
            const spent = statusData.current_month_spent || 0;
            const budgetCap = statusData.budget_cap || budget.amount;
            const rolloverAmount = statusData.rollover_from_prior || 0;
            const availableThisMonth = statusData.available_this_month || budgetCap;
            const priorMonthSavings = statusData.prior_month_savings || 0;
            const surplusOrDeficit = statusData.surplus_or_deficit || 0;
            const budgetStatus = statusData.status || 'under';
            
            const remaining = availableThisMonth - spent;
            const percentage = statusData.percentage || 0;
            
            // Determine status icon and color
            let StatusIcon, statusColor;
            if (budgetStatus === 'over') {
              StatusIcon = XCircle;
              statusColor = 'text-red-600';
            } else if (budgetStatus === 'on_track') {
              StatusIcon = AlertTriangle;
              statusColor = 'text-yellow-600';
            } else {
              StatusIcon = CheckCircle;
              statusColor = 'text-green-600';
            }
            
            const categoryInfo = getBudgetCategoryInfo(budget.category);

            return (
              <Card 
                key={budget.id} 
                className="shadow-lg hover:shadow-xl transition-all border-0"
                style={{ borderTop: `4px solid ${budget.color || categoryInfo.color}` }}
              >
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-3 rounded-lg text-2xl"
                        style={{ backgroundColor: (budget.color || categoryInfo.color) + '20' }}
                      >
                        {budget.icon || categoryInfo.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{budget.category}</CardTitle>
                          {budget.rollover && (
                            <Badge variant="outline" className="text-xs bg-green-50 border-green-300">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Rollover
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{budget.period}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(budget)}
                        className="hover:bg-orange-50 dark:hover:bg-orange-900/20 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                      >
                        <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-kindling-fire" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingBudget(budget)}
                        className="hover:bg-red-50 dark:hover:bg-red-900/20 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Current Month Display */}
                  {currentMonth && (
                    <div className="text-center pb-2 border-b">
                      <p className="text-xs text-gray-500">Tracking for {currentMonth}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Spent This Month</p>
                      <p className="text-2xl font-bold">{formatCurrency(spent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Cap</p>
                      <p className="text-2xl font-bold">{formatCurrency(budgetCap)}</p>
                    </div>
                  </div>

                  {/* Rollover Display */}
                  {rolloverAmount > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Rolled from last month
                        </span>
                        <span className="text-sm font-bold text-green-700 dark:text-green-300">
                          +{formatCurrency(rolloverAmount)}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Available this month: {formatCurrency(availableThisMonth)}
                      </p>
                    </div>
                  )}

                  {/* Prior Month Savings (if rollover disabled) */}
                  {!budget.rollover && priorMonthSavings > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          💰 Last month's savings
                        </span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(priorMonthSavings)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Great job staying under budget!
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                        <span className={`font-semibold ${statusColor}`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={percentage} 
                        className={`h-3 ${percentage >= 100 ? 'bg-red-100' : percentage >= 80 ? 'bg-yellow-100' : 'bg-green-100'}`}
                      />
                      {percentage >= 80 && percentage < 100 && (
                        <div className="absolute -top-6 right-0">
                          <Badge className="bg-yellow-500 text-white text-xs">Warning</Badge>
                        </div>
                      )}
                      {percentage >= 100 && (
                        <div className="absolute -top-6 right-0">
                          <Badge className="bg-red-500 text-white text-xs">Over Budget!</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {surplusOrDeficit >= 0 ? 'Remaining' : 'Over Budget'}
                    </span>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${surplusOrDeficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {surplusOrDeficit >= 0 ? formatCurrency(surplusOrDeficit) : `-${formatCurrency(Math.abs(surplusOrDeficit))}`}
                      </span>
                      {surplusOrDeficit < 0 && (
                        <p className="text-xs text-red-600 font-semibold">You're over by {formatCurrency(Math.abs(surplusOrDeficit))} this month</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {budgets.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <PiggyBank className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-600 mb-2">No budgets set yet</p>
              <p className="text-gray-500 mb-4">Create budgets to track your spending</p>
              <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-kindling-fire to-kindling-blaze">
                <Plus size={16} className="mr-2" />
                Create Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Budget Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
            <Card className="w-full max-w-2xl shadow-2xl my-8 bg-white dark:bg-gray-800 border-0">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-b-0">
                <CardTitle className="text-2xl">Create New Budget</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 bg-white dark:bg-gray-800">
                <form onSubmit={handleAdd} className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 block">
                      Select Category
                    </label>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {BUDGET_GROUPS.map(group => (
                        <div key={group.name}>
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {group.name} - {group.description}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {BUDGET_CATEGORIES.filter(c => c.group === group.name).map(category => (
                              <button
                                key={category.name}
                                type="button"
                                onClick={() => handleCategorySelect(category)}
                                className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-md bg-white dark:bg-gray-700 ${
                                  newBudget.category === category.name
                                    ? 'border-kindling-fire bg-amber-50 dark:bg-blue-900/40 ring-2 ring-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-kindling-blaze'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{category.emoji}</span>
                                  <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{category.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newBudget.amount}
                      onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                      placeholder="500.00"
                      required
                      className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Period</label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={newBudget.period}
                      onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  
                  {/* Rollover Option */}
                  <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
                    <input
                      type="checkbox"
                      id="rollover"
                      checked={newBudget.rollover}
                      onChange={(e) => setNewBudget({ ...newBudget, rollover: e.target.checked })}
                      className="mt-1 h-4 w-4 text-kindling-fire border-gray-300 rounded focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <label htmlFor="rollover" className="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">
                        Enable Budget Rollover
                      </label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Unused budget will carry over to next period
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      disabled={!newBudget.category}
                    >
                      Create Budget
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Budget Modal */}
        {editingBudget && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-2xl bg-white dark:bg-gray-800 border-0">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <CardTitle className="text-xl">Edit Budget</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Category</label>
                  <Input
                    type="text"
                    value={editingBudget.category}
                    disabled
                    className="mt-1 bg-gray-100 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amount ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingBudget.amount}
                    onChange={(e) => setEditingBudget({ ...editingBudget, amount: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Period</label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 mt-1 bg-white dark:bg-gray-700"
                    value={editingBudget.period}
                    onChange={(e) => setEditingBudget({ ...editingBudget, period: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                {/* Rollover Toggle */}
                <div className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200">
                  <input
                    type="checkbox"
                    id="edit-rollover"
                    checked={editingBudget.rollover}
                    onChange={(e) => setEditingBudget({ ...editingBudget, rollover: e.target.checked })}
                    className="h-4 w-4 text-kindling-fire border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="edit-rollover" className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer flex-1">
                    Enable Rollover
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Unused budget carries over to next period
                    </p>
                  </label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={saveEdit}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600"
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingBudget(null)} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingBudget && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-2xl bg-white dark:bg-gray-800 border-0">
              <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete the <strong>{deletingBudget.category}</strong> budget?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>

                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={confirmDelete}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDeletingBudget(null)} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Budgets;
