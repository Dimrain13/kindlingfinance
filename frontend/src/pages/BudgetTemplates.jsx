import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  PieChart, 
  Target, 
  Folder, 
  TrendingUp, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const BudgetTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/budgets/templates');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate || !monthlyIncome) {
      alert('Please select a template and enter your monthly income');
      return;
    }

    try {
      setApplying(true);
      const response = await api.post(
        `/budgets/apply-template/${selectedTemplate.id}`,
        null,
        { params: { monthly_income: parseFloat(monthlyIncome) } }
      );
      
      alert(`Successfully applied ${response.data.template_id} budget! Created ${response.data.total_budgets} budgets.`);
      window.location.href = '/budgets';
    } catch (error) {
      console.error('Failed to apply template:', error);
      alert('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  const getTemplateIcon = (iconName) => {
    const iconClass = "h-12 w-12";
    switch (iconName) {
      case 'pie-chart':
        return <PieChart className={iconClass} />;
      case 'target':
        return <Target className={iconClass} />;
      case 'folder':
        return <Folder className={iconClass} />;
      case 'trending-up':
        return <TrendingUp className={iconClass} />;
      case 'dollar-sign':
        return <DollarSign className={iconClass} />;
      default:
        return <PieChart className={iconClass} />;
    }
  };

  const calculatePreview = () => {
    if (!selectedTemplate || !monthlyIncome) return null;

    const income = parseFloat(monthlyIncome);
    return selectedTemplate.categories.map(cat => ({
      name: cat.category.replace(/_/g, ' '),
      value: (cat.percentage / 100) * income,
      percentage: cat.percentage
    }));
  };

  const previewData = calculatePreview();

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Budget Templates
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Quick-start your budget with proven budgeting methods
        </p>
      </div>

      {/* Income Input */}
      <Card className="shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <Label className="text-lg font-semibold mb-2 block">Enter Your Monthly Income</Label>
              <Input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="e.g., 5000"
                className="text-lg"
              />
            </div>
            {monthlyIncome && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Monthly Income</p>
                <p className="text-3xl font-bold text-kindling-fire">
                  {formatCurrency(parseFloat(monthlyIncome))}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
              selectedTemplate?.id === template.id
                ? 'border-4 border-kindling-blaze shadow-2xl'
                : 'border-2 border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-2 mb-2">
                    {template.name}
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle className="h-5 w-5 text-kindling-fire" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
                <div className="text-kindling-fire">
                  {getTemplateIcon(template.icon)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Special breakdown for 50/30/20 */}
                {template.total_needs && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-kindling-fire">{template.total_needs}%</p>
                      <p className="text-xs text-gray-600">Needs</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-kindling-fire">{template.total_wants}%</p>
                      <p className="text-xs text-gray-600">Wants</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{template.total_savings}%</p>
                      <p className="text-xs text-gray-600">Savings</p>
                    </div>
                  </div>
                )}

                {/* Categories preview */}
                <div className="space-y-1">
                  {template.categories.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{cat.category.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{cat.percentage}%</Badge>
                    </div>
                  ))}
                  {template.categories.length > 5 && (
                    <p className="text-xs text-gray-500 pt-1">
                      +{template.categories.length - 5} more categories
                    </p>
                  )}
                </div>

                {/* Principle note */}
                {template.principle && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <Info className="h-4 w-4 text-kindling-fire mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">{template.principle}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Section */}
      {selectedTemplate && monthlyIncome && previewData && (
        <Card className="shadow-2xl border-4 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-kindling-fire to-kindling-blaze text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              Budget Preview: {selectedTemplate.name}
            </CardTitle>
            <p className="text-blue-100 mt-2">
              Based on monthly income of {formatCurrency(parseFloat(monthlyIncome))}
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Budget Allocation</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={previewData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {previewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              {/* Budget Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Budget Breakdown</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {previewData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                        <span className="font-medium text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(item.value)}</div>
                        <div className="text-xs text-gray-500">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={applyTemplate}
                disabled={applying}
                size="lg"
                className="bg-gradient-to-r from-kindling-fire to-kindling-blaze text-white text-lg px-12"
              >
                {applying ? (
                  'Applying...'
                ) : (
                  <>
                    Apply This Budget
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>

            {/* Warning */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-1">Note:</p>
                <p>Applying this template will create {selectedTemplate.categories.length} budget categories. You can adjust individual amounts later in the Budgets page.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      {!selectedTemplate && (
        <Card className="shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-6 w-6 text-kindling-fire" />
              How Budget Templates Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
              <p className="text-gray-700">
                <strong>Select a template</strong> that matches your financial philosophy
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
              <p className="text-gray-700">
                <strong>Enter your monthly income</strong> to see how the budget would look
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
              <p className="text-gray-700">
                <strong>Review the preview</strong> and adjust if needed
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-kindling-fire rounded-full mt-2"></div>
              <p className="text-gray-700">
                <strong>Apply the template</strong> to automatically create your budget categories
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetTemplates;
