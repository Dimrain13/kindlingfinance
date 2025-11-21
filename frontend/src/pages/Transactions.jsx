import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Receipt, Search, Filter, Download, Plus } from 'lucide-react';
import AddTransactionModal from '../components/AddTransactionModal';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, selectedCategory, selectedType]);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/transactions?limit=500');
      setTransactions(response.data);
      setFilteredTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(txn =>
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (txn.merchant_name && txn.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()))
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

    setFilteredTransactions(filtered);
  };

  const categories = ['All', ...new Set(transactions.map(t => t.category || 'Other'))];
  const types = ['All', 'Income', 'Expense'];

  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Transactions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {filteredTransactions.length} transactions
            </p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
          >
            <Plus size={16} className="mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <p className="text-sm opacity-90">Total Income</p>
              <p className="text-3xl font-bold mt-2">${totalIncome.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="pt-6">
              <p className="text-sm opacity-90">Total Expenses</p>
              <p className="text-3xl font-bold mt-2">${totalExpenses.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <p className="text-sm opacity-90">Net</p>
              <p className="text-3xl font-bold mt-2">${(totalIncome - totalExpenses).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-md p-2 bg-white dark:bg-gray-800"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border rounded-md p-2 bg-white dark:bg-gray-800"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

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
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Merchant</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-3 px-4 text-sm">
                          {new Date(txn.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{txn.description}</span>
                          {txn.ai_categorized && (
                            <Badge variant="outline" className="ml-2 text-xs bg-purple-50">AI</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {txn.category || 'Other'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {txn.merchant_name || '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {txn.transaction_type === 'income' ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
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
      </div>
    </div>
  );
};

export default Transactions;
