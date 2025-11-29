import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Play, Trash2, Settings, CheckCircle } from 'lucide-react';
import { AVAILABLE_CATEGORIES } from '../utils/categoryUtils';

const TransactionRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    merchant_contains: '',
    amount_greater: '',
    amount_less: '',
    category_is: '',
    set_category: '',
    priority: 0
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const response = await api.get('/transactions/rules');
      setRules(response.data);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    try {
      const conditions = {};
      const actions = {};

      if (newRule.merchant_contains) conditions.merchant_contains = newRule.merchant_contains;
      if (newRule.amount_greater) conditions.amount_greater = parseFloat(newRule.amount_greater);
      if (newRule.amount_less) conditions.amount_less = parseFloat(newRule.amount_less);
      if (newRule.category_is) conditions.category_is = newRule.category_is;
      if (newRule.set_category) actions.set_category = newRule.set_category;

      await api.post('/transactions/rules', null, {
        params: {
          name: newRule.name,
          conditions: JSON.stringify(conditions),
          actions: JSON.stringify(actions),
          priority: newRule.priority
        }
      });

      setShowAddModal(false);
      setNewRule({
        name: '',
        merchant_contains: '',
        amount_greater: '',
        amount_less: '',
        category_is: '',
        set_category: '',
        priority: 0
      });
      loadRules();
    } catch (error) {
      console.error('Failed to create rule:', error);
      alert('Failed to create rule');
    }
  };

  const applyRule = async (ruleId) => {
    if (!confirm('Apply this rule to all existing transactions?')) return;
    try {
      const response = await api.post(`/transactions/rules/${ruleId}/apply`);
      alert(response.data.message);
      loadRules();
    } catch (error) {
      console.error('Failed to apply rule:', error);
      alert('Failed to apply rule');
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await api.delete(`/transactions/rules/${ruleId}`);
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const renderConditions = (conditions) => {
    const parts = [];
    if (conditions.merchant_contains) parts.push(`Merchant contains "${conditions.merchant_contains}"`);
    if (conditions.amount_greater) parts.push(`Amount > $${conditions.amount_greater}`);
    if (conditions.amount_less) parts.push(`Amount < $${conditions.amount_less}`);
    if (conditions.category_is) parts.push(`Category = ${conditions.category_is}`);
    return parts.join(' AND ');
  };

  const renderActions = (actions) => {
    const parts = [];
    if (actions.set_category) {
      const category = AVAILABLE_CATEGORIES.find(c => c.value === actions.set_category);
      parts.push(`Set category to ${category?.label || actions.set_category}`);
    }
    return parts.join(', ');
  };

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Rules</h1>
          <p className="text-gray-600 mt-1">Automatically categorize transactions based on rules</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-semibold text-gray-900">Create New Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g., Starbucks → Coffee"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Conditions (When...)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Merchant contains</Label>
                    <Input
                      placeholder="starbucks"
                      value={newRule.merchant_contains}
                      onChange={(e) => setNewRule({ ...newRule, merchant_contains: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Current Category</Label>
                    <select
                      value={newRule.category_is}
                      onChange={(e) => setNewRule({ ...newRule, category_is: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Any</option>
                      {AVAILABLE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Amount greater than</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newRule.amount_greater}
                      onChange={(e) => setNewRule({ ...newRule, amount_greater: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Amount less than</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newRule.amount_less}
                      onChange={(e) => setNewRule({ ...newRule, amount_less: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Actions (Then...)</h3>
                <div>
                  <Label>Set Category To</Label>
                  <select
                    value={newRule.set_category}
                    onChange={(e) => setNewRule({ ...newRule, set_category: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select category...</option>
                    {AVAILABLE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Priority (higher = runs first)</Label>
                <Input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                />
              </div>

              <Button onClick={createRule} className="w-full">
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
        </div>
      ) : rules.length === 0 ? (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No rules created yet</p>
              <p className="text-sm text-gray-500">Create rules to automatically categorize your transactions</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Priority: {rule.priority}</span>
                      {rule.times_applied > 0 && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Applied {rule.times_applied}x
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">When:</span> {renderConditions(rule.conditions)}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Then:</span> {renderActions(rule.actions)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyRule(rule.id)}
                      title="Apply to all existing transactions"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Apply Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionRules;
