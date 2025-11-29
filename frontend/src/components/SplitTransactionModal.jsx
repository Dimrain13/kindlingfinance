import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { AVAILABLE_CATEGORIES } from '../utils/categoryUtils';
import { formatCurrency } from '../utils/formatNumber';
import api from '../utils/api';

const SplitTransactionModal = ({ isOpen, onClose, transaction, onSuccess }) => {
  const [splits, setSplits] = useState([
    { category: '', amount: '', notes: '' }
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && transaction) {
      loadExistingSplits();
    }
  }, [isOpen, transaction]);

  const loadExistingSplits = async () => {
    try {
      const response = await api.get(`/transactions/${transaction.id}/splits`);
      if (response.data && response.data.length > 0) {
        setSplits(response.data.map(s => ({
          category: s.category,
          amount: s.amount,
          notes: s.notes || ''
        })));
      } else {
        // Start with original transaction amount
        setSplits([{ category: transaction.category, amount: Math.abs(transaction.amount), notes: '' }]);
      }
    } catch (error) {
      console.error('Failed to load splits:', error);
      setSplits([{ category: transaction.category, amount: Math.abs(transaction.amount), notes: '' }]);
    }
  };

  const addSplit = () => {
    setSplits([...splits, { category: '', amount: '', notes: '' }]);
  };

  const removeSplit = (index) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };

  const updateSplit = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index][field] = value;
    
    // Auto-adjust other splits when amount changes
    if (field === 'amount') {
      const changedAmount = parseFloat(value) || 0;
      const transactionAmount = Math.abs(transaction?.amount || 0);
      
      // Find all other splits with amounts
      const otherSplitsWithAmounts = newSplits
        .map((split, i) => ({ split, index: i }))
        .filter(({ index: i }) => i !== index && parseFloat(newSplits[i].amount) > 0);
      
      // Calculate total of all entered amounts
      const totalEntered = newSplits.reduce((sum, split) => {
        return sum + (parseFloat(split.amount) || 0);
      }, 0);
      
      const remaining = transactionAmount - changedAmount;
      
      // Auto-adjust: If user enters an amount, set the other splits to make up the difference
      if (newSplits.length > 1 && remaining >= 0) {
        // Distribute remaining amount to other splits
        if (otherSplitsWithAmounts.length > 0) {
          // Adjust the first split with an amount
          const adjustIndex = otherSplitsWithAmounts[0].index;
          const otherAmountsSum = newSplits.reduce((sum, split, i) => {
            if (i !== index && i !== adjustIndex) {
              return sum + (parseFloat(split.amount) || 0);
            }
            return sum;
          }, 0);
          
          const newAmount = transactionAmount - changedAmount - otherAmountsSum;
          if (newAmount >= 0) {
            newSplits[adjustIndex].amount = newAmount.toFixed(2);
          }
        } else {
          // No other splits have amounts yet, find first empty one and fill it
          const emptyIndex = newSplits.findIndex((s, i) => i !== index && !parseFloat(s.amount));
          if (emptyIndex !== -1 && remaining > 0) {
            newSplits[emptyIndex].amount = remaining.toFixed(2);
          }
        }
      }
    }
    
    setSplits(newSplits);
  };

  const totalSplit = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const transactionAmount = Math.abs(transaction?.amount || 0);
  const isValid = Math.abs(totalSplit - transactionAmount) < 0.01;

  const handleSave = async () => {
    if (!isValid) {
      setError('Split amounts must equal transaction amount');
      return;
    }

    try {
      await api.post(`/transactions/${transaction.id}/splits`, splits.map(s => ({
        category: s.category,
        amount: parseFloat(s.amount),
        notes: s.notes
      })));
      onSuccess?.();
      onClose();
    } catch (error) {
      setError('Failed to save splits: ' + error.message);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/transactions/${transaction.id}/splits`);
      onSuccess?.();
      onClose();
    } catch (error) {
      setError('Failed to delete splits: ' + error.message);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">Split Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Transaction Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-700">{transaction.merchant_name}</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
            <p className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
          </div>

          {/* Splits */}
          <div className="space-y-3">
            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <select
                      value={split.category}
                      onChange={(e) => updateSplit(index, 'category', e.target.value)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="">Select...</option>
                      {AVAILABLE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input
                      type="text"
                      value={split.notes}
                      onChange={(e) => updateSplit(index, 'notes', e.target.value)}
                      placeholder="Notes"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSplit(index)}
                  disabled={splits.length === 1}
                  className="mt-6"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={addSplit} variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Split
          </Button>

          {/* Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Split:</span>
              <span className={`text-lg font-bold ${
                isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(totalSplit)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-500">Transaction Amount:</span>
              <span className="text-sm text-gray-700">{formatCurrency(transactionAmount)}</span>
            </div>
            {!isValid && (
              <p className="text-xs text-red-600 mt-2">Difference: {formatCurrency(Math.abs(totalSplit - transactionAmount))}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!isValid} className="flex-1">
              Save Splits
            </Button>
            <Button onClick={handleDelete} variant="outline" className="flex-1">
              Remove Splits
            </Button>
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitTransactionModal;
