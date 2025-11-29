import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Receipt, Search, Filter, Download, Plus, Edit2, Check, X, CheckCircle2, Circle, Eye, Split } from 'lucide-react';
import AddTransactionModal from '../components/AddTransactionModal';
import TransactionFilters from '../components/TransactionFilters';
import SplitTransactionModal from '../components/SplitTransactionModal';
import TimeFilterButtons from '../components/TimeFilterButtons';
import ExpenseDonutChart from '../components/ExpenseDonutChart';
import { formatCurrency } from '../utils/formatNumber';
import { getCategoryDisplayName, getCategoryIcon, AVAILABLE_CATEGORIES } from '../utils/categoryUtils';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [reviewFilter, setReviewFilter] = useState('All');
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [showRecategoryModal, setShowRecategoryModal] = useState(false);
  const [recategoryTxn, setRecategoryTxn] = useState(null);
  const [recategoryOption, setRecategoryOption] = useState('single');
  
  // New filter states - will be initialized by useEffect
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('THIS_MONTH');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitTransaction, setSplitTransaction] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'

  useEffect(() => {
    loadTransactions();
    // Initialize the default time filter
    handleTimeFilterChange('THIS_MONTH');
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, selectedCategory, selectedType, reviewFilter, minAmount, maxAmount, dateRange]);
  
  useEffect(() => {
    loadUnreviewedCount();
  }, [transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions?limit=1000');
      const txns = response.data;
      
      // Check which transactions have splits
      const txnsWithSplitStatus = await Promise.all(
        txns.map(async (txn) => {
          try {
            const splitsResponse = await api.get(`/transactions/${txn.id}/splits`);
            return {
              ...txn,
              hasSplits: splitsResponse.data && splitsResponse.data.length > 0,
              splitCount: splitsResponse.data ? splitsResponse.data.length : 0
            };
          } catch (error) {
            // If no splits or error, just return transaction as-is
            return { ...txn, hasSplits: false, splitCount: 0 };
          }
        })
      );
      
      setTransactions(txnsWithSplitStatus);
      
      // Count unreviewed transactions
      const unreviewed = txnsWithSplitStatus.filter(t => t.reviewed === false).length;
      setUnreviewedCount(unreviewed);
      
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUnreviewedCount = async () => {
    try {
      const response = await api.get('/transactions/unreviewed-count');
      setUnreviewedCount(response.data.count);
    } catch (error) {
      console.error('Failed to load unreviewed count:', error);
    }
  };
  
  const toggleReview = async (txnId) => {
    try {
      await api.patch(`/transactions/${txnId}/review`);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to toggle review:', error);
    }
  };
  
  const markAllReviewed = async () => {
    if (!window.confirm('Mark all transactions as reviewed?')) return;
    
    try {
      await api.post('/transactions/mark-all-reviewed');
      await loadTransactions();
    } catch (error) {
      console.error('Failed to mark all reviewed:', error);
    }
  };

  const startEditing = (txn) => {
    setEditingTxn(txn.id);
    setNewCategory(txn.category);
  };

  const cancelEditing = () => {
    setEditingTxn(null);
    setNewCategory('');
  };

  const saveCategory = async (txnId) => {
    // Find the transaction being edited
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;
    
    // Check if there are other transactions from the same merchant
    const sameVendor = transactions.filter(
      t => t.merchant_name === txn.merchant_name && t.id !== txn.id
    );
    
    if (sameVendor.length >= 2) {
      // This is a recurring transaction - ask if they want to update all
      setRecategoryTxn(txn);
      setShowRecategoryModal(true);
    } else {
      // Just update this one transaction
      await updateSingleCategory(txnId, newCategory);
    }
  };

  const updateSingleCategory = async (txnId, category) => {
    try {
      await api.patch(`/transactions/${txnId}`, { category });
      await loadTransactions();
      setEditingTxn(null);
      setNewCategory('');
      setShowRecategoryModal(false);
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category. Please try again.');
    }
  };

  const updateAllVendorCategories = async (merchantName, category) => {
    try {
      await api.patch('/transactions/bulk-category', {
        merchant_name: merchantName,
        category
      });
      await loadTransactions();
      setEditingTxn(null);
      setNewCategory('');
      setShowRecategoryModal(false);
    } catch (error) {
      console.error('Failed to update categories:', error);
      alert('Failed to update categories. Please try again.');
    }
  };

  const handleConfirmRecategory = () => {
    if (!recategoryTxn) return;
    
    if (recategoryOption === 'single') {
      updateSingleCategory(recategoryTxn.id, newCategory);
    } else {
      updateAllVendorCategories(recategoryTxn.merchant_name, newCategory);
    }
  };


  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(txn =>
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (txn.merchant_name && txn.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        Math.abs(txn.amount).toString().includes(searchTerm)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(txn => txn.category === selectedCategory);
    }

    // Type filter
    if (selectedType !== 'All') {
      filtered = filtered.filter(txn => txn.transaction_type === selectedType.toLowerCase());
    }
    
    // Review filter
    if (reviewFilter === 'Reviewed') {
      filtered = filtered.filter(txn => txn.reviewed === true);
    } else if (reviewFilter === 'Unreviewed') {
      filtered = filtered.filter(txn => txn.reviewed === false);
    }

    // Amount filters
    if (minAmount) {
      filtered = filtered.filter(txn => Math.abs(txn.amount) >= parseFloat(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter(txn => Math.abs(txn.amount) <= parseFloat(maxAmount));
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(txn => txn.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(txn => txn.date <= dateRange.end);
    }

    setFilteredTransactions(filtered);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      
      const response = await api.get(`/transactions/export?${params.toString()}`);
      
      // Create and download CSV file
      const blob = new Blob([response.data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export transactions');
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setMinAmount('');
    setMaxAmount('');
    handleTimeFilterChange('THIS_MONTH');
  };

  const handleSplitClick = (txn) => {
    setSplitTransaction(txn);
    setShowSplitModal(true);
  };

  const categories = ['All', ...new Set(transactions.map(t => t.category || 'Other'))];
  const types = ['All', 'Income', 'Expense'];

  // Transfer categories that should not be counted as expenses
  const transferCategories = ['TRANSFER', 'TRANSFER_IN', 'TRANSFER_OUT', 'CREDIT_CARD_PAYMENT', 'LOAN_PAYMENT', 'LOAN_PAYMENTS'];
  
  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.transaction_type === 'expense' && !transferCategories.includes(t.category))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Transactions
              </h1>
              {unreviewedCount > 0 && (
                <Badge className="bg-orange-500 text-white px-3 py-1 text-sm">
                  {unreviewedCount} to review
                </Badge>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {filteredTransactions.length} transactions
            </p>
          </div>
          <div className="flex gap-2">
            {unreviewedCount > 0 && (
              <Button 
                onClick={markAllReviewed}
                variant="outline"
                className="shadow-lg"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Mark All Reviewed
              </Button>
            )}
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Plus size={16} className="mr-2" />
              Add Transaction
            </Button>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <p className="text-sm opacity-90">Total Income</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="pt-6">
              <p className="text-sm opacity-90">Total Expenses</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <p className="text-sm opacity-90">Net</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalIncome - totalExpenses)}</p>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {viewMode === 'chart' ? 'Expense Breakdown' : 'Transactions'}
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              className={viewMode === 'table' ? 'bg-gradient-to-r from-amber-600 to-orange-600' : ''}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Table
            </Button>
            <Button
              onClick={() => setViewMode('chart')}
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              className={viewMode === 'chart' ? 'bg-gradient-to-r from-amber-600 to-orange-600' : ''}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Chart
            </Button>
          </div>
        </div>

        {/* Chart View */}
        {viewMode === 'chart' && (
          <ExpenseDonutChart
            transactions={filteredTransactions}
            onCategoryClick={(category) => setSelectedCategory(category || 'All')}
            selectedCategory={selectedCategory !== 'All' ? selectedCategory : null}
          />
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            {/* Advanced Filters */}
            <TransactionFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              dateRange={dateRange}
              setDateRange={setDateRange}
              minAmount={minAmount}
              setMinAmount={setMinAmount}
              maxAmount={maxAmount}
              setMaxAmount={setMaxAmount}
              onExport={handleExport}
              onClearFilters={handleClearFilters}
            />

            {/* Transactions Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-3 px-2 font-semibold w-12">
                        <Eye className="h-4 w-4 mx-auto" />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Merchant</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id} className="group border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => toggleReview(txn.id)}
                            className="hover:scale-110 transition-transform"
                            title={txn.reviewed ? "Mark as unreviewed" : "Mark as reviewed"}
                          >
                            {txn.reviewed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300 hover:text-orange-500" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(txn.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{txn.description}</span>
                          {txn.ai_categorized && (
                            <Badge variant="outline" className="ml-2 text-xs bg-purple-50">AI</Badge>
                          )}
                          {txn.hasSplits && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 border-blue-300 text-blue-700">
                              <Split className="h-3 w-3 mr-1" />
                              Split ({txn.splitCount})
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingTxn === txn.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
                                autoFocus
                              >
                                {AVAILABLE_CATEGORIES.map(cat => (
                                  <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => saveCategory(txn.id)}
                                className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="h-7 w-7 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => startEditing(txn)}
                              title="Click to change category"
                            >
                              <span className="text-lg">{getCategoryIcon(txn.category)}</span>
                              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {getCategoryDisplayName(txn.category || 'Other')}
                              </Badge>
                              <Edit2 className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {txn.merchant_name || '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {txn.transaction_type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {txn.pending ? (
                            <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-300">
                              Posted
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSplitClick(txn)}
                            className="h-8 w-8 p-0"
                            title="Split transaction"
                          >
                            <Split className="h-4 w-4 text-gray-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-600 mb-2">No transactions found</p>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Transaction Modal */}
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadTransactions}
        />

          </>
        )}

        {/* Recategorization Modal */}
        {showRecategoryModal && recategoryTxn && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-md my-8 shadow-2xl animate-fadeIn">
              <CardHeader className="border-b">
                <CardTitle className="text-xl font-bold">Update Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 max-h-[70vh] overflow-y-auto">
                <p className="text-gray-600 dark:text-gray-400">
                  You're updating the category for <strong>{recategoryTxn.merchant_name}</strong> to{' '}
                  <strong>{getCategoryDisplayName(newCategory)}</strong>.
                </p>
                
                {transactions.filter(t => t.merchant_name === recategoryTxn.merchant_name).length > 1 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      You have {transactions.filter(t => t.merchant_name === recategoryTxn.merchant_name).length} transactions from {recategoryTxn.merchant_name}
                    </p>
                    
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recategoryOption"
                          value="single"
                          checked={recategoryOption === 'single'}
                          onChange={(e) => setRecategoryOption(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium">Update only this transaction</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Change category for ${Math.abs(recategoryTxn.amount)} on {new Date(recategoryTxn.date).toLocaleDateString()}
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recategoryOption"
                          value="all"
                          checked={recategoryOption === 'all'}
                          onChange={(e) => setRecategoryOption(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium">Update all {recategoryTxn.merchant_name} transactions</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Change category for all {transactions.filter(t => t.merchant_name === recategoryTxn.merchant_name).length} transactions from this vendor
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-6 border-t mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecategoryModal(false);
                      setRecategoryTxn(null);
                      setEditingTxn(null);
                      setNewCategory('');
                    }}
                    className="flex-1 h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmRecategory}
                    className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Update {recategoryOption === 'all' ? 'All' : 'Transaction'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Split Transaction Modal */}
        <SplitTransactionModal
          isOpen={showSplitModal}
          onClose={() => {
            setShowSplitModal(false);
            setSplitTransaction(null);
          }}
          transaction={splitTransaction}
          onSuccess={loadTransactions}
        />
      </div>
    </div>
  );
};

export default Transactions;
