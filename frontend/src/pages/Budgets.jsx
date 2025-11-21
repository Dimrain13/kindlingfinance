import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { PiggyBank, Plus } from 'lucide-react';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', amount: '', period: 'monthly' });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const response = await api.get('/budgets');
      setBudgets(response.data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} className="mr-2" />
          Add Budget
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map((budget) => (
          <Card key={budget.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{budget.category}</span>
                <span className="text-lg font-bold">${budget.amount}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={50} className="mb-2" />
              <p className="text-sm text-gray-600">Period: {budget.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-12">
          <PiggyBank className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No budgets set yet</p>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">Add</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Budgets;
