import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const AddTransactionModal = ({ isOpen, onClose, onSuccess }) => {
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    account_id: '',
    amount: '',
    description: '',
    transaction_type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    merchant_name: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, account_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/transactions', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      alert('Transaction added successfully!');
      onSuccess();
      handleClose();
    } catch (error) {
      alert('Failed to add transaction: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      account_id: accounts[0]?.id || '',
      amount: '',
      description: '',
      transaction_type: 'expense',
      category: '',
      date: new Date().toISOString().split('T')[0],
      merchant_name: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  const categories = [
    'Groceries', 'Dining', 'Transportation', 'Gas', 'Utilities',
    'Entertainment', 'Healthcare', 'Shopping', 'Bills', 'Mortgage',
    'Rent', 'Insurance', 'Subscriptions', 'Travel', 'Gifts',
    'Clothing', 'Electronics', 'Home', 'Fitness', 'Education',
    'Personal Care', 'Pet Care', 'Charity', 'Income', 'Salary',
    'Transfer', 'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Add Transaction</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account *</label>
                <select
                  className="w-full border rounded-md p-2 mt-1"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type *</label>
                <select
                  className="w-full border rounded-md p-2 mt-1"
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                  required
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount ($) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description *</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Grocery shopping at Whole Foods"
                required
                className="mt-1"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Category (Optional - AI will suggest if empty)
              </label>
              <select
                className="w-full border rounded-md p-2 mt-1"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Auto-categorize with AI</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Merchant */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Merchant (Optional)
              </label>
              <Input
                value={formData.merchant_name}
                onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                placeholder="e.g., Whole Foods Market"
                className="mt-1"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-kindling-fire to-kindling-blaze hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? 'Adding...' : 'Add Transaction'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddTransactionModal;
