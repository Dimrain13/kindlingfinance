import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { PiggyBank, Plus, Trash2, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [spending, setSpending] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newBudget, setNewBudget] = useState({ 
    category: '', 
    amount: '', 
    period: 'monthly' 
  });

  useEffect(() => {
    loadBudgets();
    loadSpending();
  }, []);

  const loadBudgets = async () => {
    try {
      const response = await api.get('/budgets');
      setBudgets(response.data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const loadSpending = async () => {
    try {
      // Get current month spending by category
      const response = await api.get('/analytics/dashboard');
      const spendingMap = {};
      response.data.spending_by_category?.forEach(item => {
        spendingMap[item.category] = item.amount;
      });
      setSpending(spendingMap);
    } catch (error) {
      console.error('Failed to load spending:', error);
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
      setNewBudget({ category: '', amount: '', period: 'monthly' });
      loadBudgets();
    } catch (error) {
      alert('Failed to add budget');
    }
  };

  const deleteBudget = async (id) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      loadBudgets();
    } catch (error) {
      alert('Failed to delete budget');
    }
  };

  const getBudgetStatus = (budget) => {
    const spent = spending[budget.category] || 0;
    const percentage = (spent / budget.amount) * 100;
    
    if (percentage >= 100) return { status: 'over', color: 'text-red-600', icon: AlertTriangle };
    if (percentage >= 80) return { status: 'warning', color: 'text-yellow-600', icon: TrendingUp };
    return { status: 'good', color: 'text-green-600', icon: TrendingDown };
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = Object.values(spending).reduce((sum, amt) => sum + amt, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Budgets
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your spending against your goals
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
            <Plus size={16} className="mr-2" />
            Add Budget
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Budgeted</p>
                  <p className="text-3xl font-bold mt-2">${totalBudgeted.toFixed(2)}</p>
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
                  <p className="text-3xl font-bold mt-2">${totalSpent.toFixed(2)}</p>
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
                  <p className="text-3xl font-bold mt-2">${totalRemaining.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((budget) => {
            const spent = spending[budget.category] || 0;
            const remaining = budget.amount - spent;
            const percentage = Math.min((spent / budget.amount) * 100, 100);
            const status = getBudgetStatus(budget);
            const StatusIcon = status.icon;

            return (
              <Card key={budget.id} className="shadow-lg hover:shadow-xl transition-all border-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-600 p-2 rounded-lg">
                        <PiggyBank className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{budget.category}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{budget.period}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBudget(budget.id)}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Spent</p>
                      <p className="text-2xl font-bold">${spent.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Budget</p>
                      <p className="text-2xl font-bold">${budget.amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <span className={`font-semibold ${status.color}`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-3 ${percentage >= 100 ? 'bg-red-100' : percentage >= 80 ? 'bg-yellow-100' : 'bg-green-100'}`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
                    <span className={`text-lg font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(remaining).toFixed(2)} {remaining < 0 && 'over'}
                    </span>
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
              <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus size={16} className="mr-2" />
                Create Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Budget Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                <CardTitle>Create New Budget</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                    <Input
                      value={newBudget.category}
                      onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                      placeholder="e.g., Groceries, Dining, Entertainment"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newBudget.amount}
                      onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                      placeholder="500.00"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Period</label>
                    <select
                      className="w-full border rounded-md p-2 mt-1"
                      value={newBudget.period}
                      onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600">
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
      </div>
    </div>
  );
};

export default Budgets;
