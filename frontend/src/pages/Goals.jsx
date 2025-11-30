import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Modal from '../components/Modal';
import {
  Target,
  Plus,
  TrendingUp,
  Home,
  Car,
  GraduationCap,
  Heart,
  Plane,
  Shield,
  DollarSign,
  Trash2,
  Edit,
  Calendar,
  CheckCircle2
} from 'lucide-react';

const goalIcons = {
  emergency_fund: { icon: Shield, emoji: '🛡️', label: 'Emergency Fund' },
  vacation: { icon: Plane, emoji: '✈️', label: 'Vacation' },
  home_down_payment: { icon: Home, emoji: '🏠', label: 'Home Down Payment' },
  car: { icon: Car, emoji: '🚗', label: 'Car' },
  debt_payoff: { icon: TrendingUp, emoji: '💳', label: 'Debt Payoff' },
  wedding: { icon: Heart, emoji: '💍', label: 'Wedding' },
  education: { icon: GraduationCap, emoji: '🎓', label: 'Education' },
  custom: { icon: Target, emoji: '🎯', label: 'Custom Goal' }
};

const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316'  // Orange
];

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    icon: '🎯',
    color: '#3B82F6',
    description: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const goalData = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount),
        target_date: formData.target_date || null
      };

      if (editingGoal) {
        await api.patch(`/goals/${editingGoal.id}`, goalData);
      } else {
        await api.post('/goals', goalData);
      }

      await loadGoals();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;

    try {
      await api.delete(`/goals/${selectedGoal.id}`);
      await loadGoals();
      setShowDeleteModal(false);
      setSelectedGoal(null);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleAddToGoal = async () => {
    if (!selectedGoal || !addAmount || isNaN(addAmount)) return;

    try {
      await api.post(`/goals/${selectedGoal.id}/deposit?amount=${parseFloat(addAmount)}`);
      await loadGoals();
      setShowAddMoneyModal(false);
      setSelectedGoal(null);
      setAddAmount('');
    } catch (error) {
      console.error('Failed to add to goal:', error);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      type: goal.type,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date || '',
      icon: goal.icon || '🎯',
      color: goal.color || '#3B82F6',
      description: goal.description || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      name: '',
      type: 'custom',
      target_amount: '',
      current_amount: '0',
      target_date: '',
      icon: '🎯',
      color: '#3B82F6',
      description: ''
    });
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      icon: goalIcons[type].emoji,
      name: formData.name || goalIcons[type].label
    });
  };

  const calculateDaysRemaining = (targetDate) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const completedGoals = goals.filter(g => g.progress_percentage >= 100);
  const activeGoals = goals.filter(g => g.progress_percentage < 100);

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Financial Goals
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your progress and keep your financial dreams glowing
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Summary Stats */}
      {goals.length > 0 && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-stone-600 via-stone-700 to-stone-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{goals.length}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedGoals.length}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Target Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(goals.reduce((sum, g) => sum + g.target_amount, 0))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-1">
                Total Saved
                <span className="text-xs opacity-75" title="Sum of money allocated to all savings goals (excludes debt)">ℹ️</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(
                  goals.reduce((sum, g) => {
                    // Only count positive savings goals, not debt payoff
                    if (g.type !== 'debt_payoff') {
                      return sum + g.current_amount;
                    }
                    return sum;
                  }, 0)
                )}
              </div>
              <p className="text-xs opacity-75 mt-1">
                {goals.filter(g => g.type !== 'debt_payoff').length} savings goals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown if there are debt goals */}
        {goals.some(g => g.type === 'debt_payoff') && (
          <Card className="shadow-lg border-l-4 border-orange-600">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">Breakdown:</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">💰 Savings:</span>
                      <span className="font-bold">
                        {formatCurrency(goals.filter(g => g.type !== 'debt_payoff').reduce((sum, g) => sum + g.current_amount, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">💳 Debt Paid:</span>
                      <span className="font-bold">
                        {formatCurrency(goals.filter(g => g.type === 'debt_payoff').reduce((sum, g) => sum + g.current_amount, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-700 dark:text-gray-300">📊 Net Progress:</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(goals.reduce((sum, g) => sum + g.current_amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Active Goals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeGoals.map((goal) => {
              const daysRemaining = calculateDaysRemaining(goal.target_date);
              const IconComponent = goalIcons[goal.type]?.icon || Target;

              return (
                <Card
                  key={goal.id}
                  className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group"
                  style={{ borderTop: `4px solid ${goal.color}` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="text-4xl"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        >
                          {goal.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                          <p className="text-sm text-gray-500 capitalize">
                            {goal.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title="Edit goal"
                        >
                          <Edit className="h-4 w-4 text-orange-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete goal"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold">
                          {formatCurrency(goal.current_amount)}
                        </span>
                        <span className="text-gray-500">
                          of {formatCurrency(goal.target_amount)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(goal.progress_percentage, 100)}%`,
                            backgroundColor: goal.color
                          }}
                        ></div>
                        {/* Milestone markers */}
                        {[25, 50, 75].map(milestone => (
                          <div
                            key={milestone}
                            className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                            style={{ left: `${milestone}%` }}
                            title={`${milestone}% milestone`}
                          />
                        ))}
                      </div>
                      <div className="text-center mt-2 flex items-center justify-center gap-2">
                        <span className="text-2xl font-bold" style={{ color: goal.color }}>
                          {goal.progress_percentage.toFixed(0)}%
                        </span>
                        {/* Celebration emojis for milestones */}
                        {goal.progress_percentage >= 100 && <span className="text-2xl animate-bounce">🎉</span>}
                        {goal.progress_percentage >= 75 && goal.progress_percentage < 100 && <span className="text-xl">🔥</span>}
                        {goal.progress_percentage >= 50 && goal.progress_percentage < 75 && <span className="text-xl">💪</span>}
                        {goal.progress_percentage >= 25 && goal.progress_percentage < 50 && <span className="text-xl">✨</span>}
                      </div>
                    </div>

                    {/* Target Date */}
                    {goal.target_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {daysRemaining > 0
                            ? `${daysRemaining} days remaining`
                            : daysRemaining === 0
                            ? 'Due today!'
                            : 'Past due'}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {goal.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {goal.description}
                      </p>
                    )}

                    {/* Add Money Button */}
                    <Button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setShowAddMoneyModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Money
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Completed Goals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedGoals.map((goal) => (
              <Card
                key={goal.id}
                className="relative overflow-hidden shadow-xl opacity-75 hover:opacity-100 transition-all duration-300"
                style={{ borderTop: `4px solid #10B981` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{goal.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <p className="text-sm text-green-600 font-semibold">✓ Completed</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(goal.current_amount)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Goal achieved! 🎉</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="shadow-xl">
          <CardContent className="text-center py-12">
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Goals Yet</h3>
            <p className="text-gray-500 mb-6">
              Start tracking your financial goals and watch your progress grow!
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Goal Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingGoal ? 'Edit Goal' : 'Create New Goal'} size="2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Goal Type</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(goalIcons).map(([type, { icon: Icon, emoji, label }]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.type === type
                        ? 'border-amber-600 bg-amber-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="text-xs">{label.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Goal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">Target Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            {/* Current Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">Current Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.current_amount}
                onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Target Date (Optional)</label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-full transition-all ${
                      formData.color === color ? 'ring-4 ring-offset-2 ring-blue-600' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded-lg"
                rows="3"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Button>
              <Button
                type="button"
                onClick={handleCloseModal}
                className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>

      {/* Add Money Modal */}
      {showAddMoneyModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl bg-white dark:bg-gray-800 border-0">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              <CardTitle className="text-xl flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Add Money to {selectedGoal.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-gray-300">Current Amount:</span>
                  <span className="font-bold">{formatCurrency(selectedGoal.current_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Target Amount:</span>
                  <span className="font-bold">{formatCurrency(selectedGoal.target_amount)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-orange-300">
                  <span className="text-gray-700 dark:text-gray-300">Remaining:</span>
                  <span className="font-bold text-orange-600">{formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amount to Add ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="100.00"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 mt-1 bg-white dark:bg-gray-700 text-lg font-semibold"
                  autoFocus
                />
              </div>

              {addAmount && !isNaN(addAmount) && parseFloat(addAmount) > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">New Total:</span>
                    <span className="font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(selectedGoal.current_amount + parseFloat(addAmount))}
                    </span>
                  </div>
                  {(selectedGoal.current_amount + parseFloat(addAmount)) >= selectedGoal.target_amount && (
                    <div className="mt-2 text-center">
                      <p className="text-lg font-bold text-green-600">🎉 Goal Complete! 🎉</p>
                      <p className="text-xs text-green-600 mt-1">You'll reach your goal with this deposit!</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handleAddToGoal}
                  disabled={!addAmount || isNaN(addAmount) || parseFloat(addAmount) <= 0}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                >
                  Add {addAmount && !isNaN(addAmount) ? formatCurrency(parseFloat(addAmount)) : 'Money'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddMoneyModal(false);
                    setSelectedGoal(null);
                    setAddAmount('');
                  }} 
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
      {showDeleteModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl bg-white dark:bg-gray-800 border-0">
            <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
              <CardTitle className="text-xl flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <strong>{selectedGoal.name}</strong>?
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ This will permanently delete this goal and all its progress ({formatCurrency(selectedGoal.current_amount)} saved).
                </p>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handleDelete}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedGoal(null);
                  }} 
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
  );
};

export default Goals;
