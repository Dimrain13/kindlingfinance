import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Modal from './Modal';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Edit, CheckCircle, Circle, AlertTriangle } from 'lucide-react';

const ModernBillCalendar = () => {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [manualBills, setManualBills] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, billId: null, billName: '' });
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_date: '',
    frequency: 'monthly',
    category: '',
    icon: '📄',
    auto_pay: false
  });
  
  // Transaction linking state
  const [showLinkTxnModal, setShowLinkTxnModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [suggestedTransactions, setSuggestedTransactions] = useState([]);
  const [linkedTransactions, setLinkedTransactions] = useState([]);

  useEffect(() => {
    loadRecurringExpenses();
    loadManualBills();
  }, []);

  const loadRecurringExpenses = async () => {
    try {
      // Load last 2 years of transactions (limit=1000 to ensure we get everything)
      const response = await api.get('/transactions?limit=1000');
      const transactions = response.data;
      
      // Filter to only last 2 years
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      const recentTransactions = transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        return txnDate >= twoYearsAgo;
      });
      
      // Find recurring expenses (same merchant appearing on consistent schedule)
      const recurringMap = {};
      
      recentTransactions.forEach(txn => {
        if (txn.transaction_type !== 'expense') return;
        
        const merchant = (txn.merchant_name || txn.description).trim();
        const date = new Date(txn.date);
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        
        if (!recurringMap[merchant]) {
          recurringMap[merchant] = {
            merchant: merchant,
            amounts: [],
            dates: [],
            months: [],
            category: txn.category,
            count: 0
          };
        }
        
        recurringMap[merchant].amounts.push(Math.abs(txn.amount));
        recurringMap[merchant].dates.push(day);
        recurringMap[merchant].months.push(`${year}-${month}`);
        recurringMap[merchant].count++;
      });
      
      // Filter to only truly recurring expenses (monthly bills)
      const recurring = Object.values(recurringMap)
        .filter(item => {
          const merchantLower = item.merchant.toLowerCase();
          
          // ALWAYS include financial obligations
          const isFinancial = 
            merchantLower.includes('mortgage') ||
            merchantLower.includes('rent') ||
            merchantLower.includes('credit card payment') ||
            merchantLower.includes('loan payment') ||
            merchantLower.includes('wells fargo') ||
            merchantLower.includes('chase auto') ||
            merchantLower.includes('car payment') ||
            merchantLower.includes('auto payment') ||
            merchantLower.includes('insurance') ||
            merchantLower.includes('state farm');
          
          // ALWAYS include utilities and subscriptions
          const isUtilityOrSubscription =
            merchantLower.includes('electric') ||
            merchantLower.includes('dte') ||
            merchantLower.includes('consumers energy') ||
            merchantLower.includes('comcast') ||
            merchantLower.includes('spectrum') ||
            merchantLower.includes('internet') ||
            merchantLower.includes('mobile') ||
            merchantLower.includes('verizon') ||
            merchantLower.includes('t-mobile') ||
            merchantLower.includes('at&t') ||
            merchantLower.includes('sprint') ||
            merchantLower.includes('netflix') ||
            merchantLower.includes('spotify') ||
            merchantLower.includes('hulu') ||
            merchantLower.includes('disney') ||
            merchantLower.includes('hbo') ||
            merchantLower.includes('gym') ||
            merchantLower.includes('fitness') ||
            merchantLower.includes('planet fitness') ||
            merchantLower.includes('water') ||
            merchantLower.includes('gas') ||
            merchantLower.includes('sewer') ||
            merchantLower.includes('trash');
          
          if (isFinancial || isUtilityOrSubscription) {
            // For critical bills, require at least 3 occurrences over 2 years
            // Don't check date variance for these - they're important regardless
            return item.count >= 3;
          }
          
          // For other merchants, require strong recurring pattern
          // Must appear at least 6 times (roughly every 4 months over 2 years)
          if (item.count < 6) return false;
          
          // Must span at least 6 unique months
          const uniqueMonths = new Set(item.months);
          if (uniqueMonths.size < 6) return false;
          
          // Check if dates are consistent (within 7 days variance for monthly bills)
          const dateVariance = Math.max(...item.dates) - Math.min(...item.dates);
          const isConsistentSchedule = dateVariance <= 7; // Dates within 7 days of each other
          
          // Exclude random purchases (Amazon, Target, etc.) unless on very consistent schedule
          const isRandomPurchase = 
            merchantLower.includes('amazon') ||
            merchantLower.includes('target') ||
            merchantLower.includes('walmart') ||
            merchantLower.includes('ebay') ||
            merchantLower.includes('etsy') ||
            merchantLower.includes('gas station') ||
            merchantLower.includes('grocery') ||
            merchantLower.includes('coffee');
          
          if (isRandomPurchase) return false; // Never show random purchases
          
          return isConsistentSchedule;
        })
        .map(item => {
          // Find most common date
          const dateFreq = {};
          item.dates.forEach(d => {
            dateFreq[d] = (dateFreq[d] || 0) + 1;
          });
          const mostCommonDate = Object.keys(dateFreq).reduce((a, b) => 
            dateFreq[a] > dateFreq[b] ? a : b
          );
          
          // Calculate average amount
          const avgAmount = item.amounts.reduce((a, b) => a + b, 0) / item.amounts.length;
          
          return {
            id: item.merchant,
            name: item.merchant,
            amount: avgAmount,
            day: parseInt(mostCommonDate),
            category: item.category,
            logoUrl: getMerchantLogo(item.merchant, item.category),
            emojiIcon: getEmojiForCategory(item.category),
            is_paid: false // Will check against current month later
          };
        });
      
      console.log(`📊 Analyzed ${recentTransactions.length} transactions from last 2 years`);
      console.log(`📅 Found ${recurring.length} recurring monthly bills:`);
      recurring.forEach(bill => {
        console.log(`  - ${bill.name}: ${formatCurrency(bill.amount)} on day ${bill.day}`);
      });
      
      setRecurringExpenses(recurring);
    } catch (error) {
      console.error('Failed to load recurring expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManualBills = async () => {
    try {
      console.log('🔵 Loading manual bills...');
      const response = await api.get('/bills');
      console.log('✅ Manual bills loaded:', response.data);
      setManualBills(response.data);
    } catch (error) {
      console.error('❌ Failed to load manual bills:', error);
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    console.log('🔵 Form submitted, formData:', formData);
    
    try {
      const billData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        frequency: formData.frequency,
        category: formData.category || '',
        icon: formData.icon,
        auto_pay: formData.auto_pay
      };

      console.log('🔵 Sending bill data:', billData);

      if (editingBill) {
        console.log('🔵 Updating bill:', editingBill.id);
        const response = await api.patch(`/bills/${editingBill.id}`, billData);
        console.log('✅ Bill updated:', response.data);
      } else {
        console.log('🔵 Creating new bill...');
        const response = await api.post('/bills', billData);
        console.log('✅ Bill created:', response.data);
      }

      console.log('🔵 Reloading bills...');
      await loadManualBills();
      console.log('✅ Bills reloaded');
      
      handleCloseModal();
      alert('Bill saved successfully!');
    } catch (error) {
      console.error('❌ Failed to save bill:', error);
      console.error('Error response:', error.response?.data);
      alert(`Failed to save bill: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteBill = (billId, billName) => {
    console.log('🗑️ Delete button clicked for bill:', billName, billId);
    setDeleteConfirmModal({ show: true, billId, billName });
  };

  const confirmDeleteBill = async () => {
    const { billId } = deleteConfirmModal;
    console.log('🔵 Confirming deletion for bill ID:', billId);

    try {
      await api.delete(`/bills/${billId}`);
      console.log('✅ Bill deleted successfully');
      
      // Close modals and reload
      setDeleteConfirmModal({ show: false, billId: null, billName: '' });
      setShowDayModal(false);
      await loadManualBills();
    } catch (error) {
      console.error('❌ Failed to delete bill:', error);
      alert(`Failed to delete bill: ${error.response?.data?.detail || error.message}`);
      setDeleteConfirmModal({ show: false, billId: null, billName: '' });
    }
  };

  const handleTogglePaid = async (billId, currentStatus) => {
    try {
      await api.patch(`/bills/${billId}/pay?is_paid=${!currentStatus}`);
      await loadManualBills();
    } catch (error) {
      console.error('Failed to update bill:', error);
    }
  };

  const handleOpenLinkTransaction = async (bill) => {
    setSelectedBill(bill);
    setShowLinkTxnModal(true);
    
    try {
      // Load suggested transactions
      const response = await api.get(`/bills/${bill.id}/suggested-transactions`);
      setSuggestedTransactions(response.data);
      
      // Load already linked transactions
      if (bill.linked_transaction_ids && bill.linked_transaction_ids.length > 0) {
        const linkedTxns = await Promise.all(
          bill.linked_transaction_ids.map(id => api.get(`/transactions/${id}`))
        );
        setLinkedTransactions(linkedTxns.map(r => r.data));
      } else {
        setLinkedTransactions([]);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setSuggestedTransactions([]);
      setLinkedTransactions([]);
    }
  };

  const handleLinkTransaction = async (transactionId) => {
    try {
      await api.post(`/bills/${selectedBill.id}/link-transaction?transaction_id=${transactionId}`);
      
      // Reload
      await handleOpenLinkTransaction(selectedBill);
      await loadManualBills();
    } catch (error) {
      console.error('Failed to link transaction:', error);
      alert('Failed to link transaction');
    }
  };

  const handleUnlinkTransaction = async (transactionId) => {
    try {
      await api.delete(`/bills/${selectedBill.id}/unlink-transaction/${transactionId}`);
      
      // Reload
      await handleOpenLinkTransaction(selectedBill);
      await loadManualBills();
    } catch (error) {
      console.error('Failed to unlink transaction:', error);
    }
  };

  const handleEditBill = (bill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      due_date: bill.due_date,
      frequency: bill.frequency,
      category: bill.category || '',
      icon: bill.icon || '📄',
      auto_pay: bill.auto_pay
    });
    setShowDayModal(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBill(null);
    setFormData({
      name: '',
      amount: '',
      due_date: '',
      frequency: 'monthly',
      category: '',
      icon: '📄',
      auto_pay: false
    });
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setShowDayModal(true);
  };

  // Map merchants to actual logo URLs
  const getMerchantLogo = (merchant, category) => {
    const merchantLower = merchant.toLowerCase();
    
    // Known service logos (direct URLs)
    const knownLogos = {
      // Streaming
      'netflix': 'https://logo.clearbit.com/netflix.com',
      'hulu': 'https://logo.clearbit.com/hulu.com',
      'disney': 'https://logo.clearbit.com/disneyplus.com',
      'spotify': 'https://logo.clearbit.com/spotify.com',
      'apple music': 'https://logo.clearbit.com/apple.com',
      'youtube': 'https://logo.clearbit.com/youtube.com',
      'amazon prime': 'https://logo.clearbit.com/amazon.com',
      'hbo': 'https://logo.clearbit.com/hbomax.com',
      'paramount': 'https://logo.clearbit.com/paramountplus.com',
      'peacock': 'https://logo.clearbit.com/peacocktv.com',
      
      // Internet/Cable
      'comcast': 'https://logo.clearbit.com/xfinity.com',
      'spectrum': 'https://logo.clearbit.com/spectrum.com',
      'att': 'https://logo.clearbit.com/att.com',
      'cox': 'https://logo.clearbit.com/cox.com',
      'optimum': 'https://logo.clearbit.com/optimum.net',
      
      // Utilities
      'dte': 'https://logo.clearbit.com/dteenergy.com',
      'consumers energy': 'https://logo.clearbit.com/consumersenergy.com',
      'duke energy': 'https://logo.clearbit.com/duke-energy.com',
      'pge': 'https://logo.clearbit.com/pge.com',
      'con edison': 'https://logo.clearbit.com/coned.com',
      
      // Mobile
      't-mobile': 'https://logo.clearbit.com/t-mobile.com',
      'verizon': 'https://logo.clearbit.com/verizon.com',
      'at&t': 'https://logo.clearbit.com/att.com',
      'sprint': 'https://logo.clearbit.com/sprint.com',
      'mint mobile': 'https://logo.clearbit.com/mintmobile.com',
      'cricket': 'https://logo.clearbit.com/cricketwireless.com',
      
      // Software/Subscriptions
      'adobe': 'https://logo.clearbit.com/adobe.com',
      'microsoft': 'https://logo.clearbit.com/microsoft.com',
      'dropbox': 'https://logo.clearbit.com/dropbox.com',
      'icloud': 'https://logo.clearbit.com/icloud.com',
      'google one': 'https://logo.clearbit.com/google.com',
      'github': 'https://logo.clearbit.com/github.com',
      
      // Fitness
      'planet fitness': 'https://logo.clearbit.com/planetfitness.com',
      'la fitness': 'https://logo.clearbit.com/lafitness.com',
      'peloton': 'https://logo.clearbit.com/onepeloton.com',
      
      // Food/Groceries
      'hellofresh': 'https://logo.clearbit.com/hellofresh.com',
      'blue apron': 'https://logo.clearbit.com/blueapron.com',
      'starbucks': 'https://logo.clearbit.com/starbucks.com',
      'doordash': 'https://logo.clearbit.com/doordash.com',
      'uber eats': 'https://logo.clearbit.com/uber.com',
      'whole foods': 'https://logo.clearbit.com/wholefoodsmarket.com',
      'trader joe': 'https://logo.clearbit.com/traderjoes.com',
      
      // Banks/Financial
      'wells fargo': 'https://logo.clearbit.com/wellsfargo.com',
      'chase': 'https://logo.clearbit.com/chase.com',
      'bank of america': 'https://logo.clearbit.com/bankofamerica.com',
      'capital one': 'https://logo.clearbit.com/capitalone.com',
      'citi': 'https://logo.clearbit.com/citi.com',
      'discover': 'https://logo.clearbit.com/discover.com',
      'american express': 'https://logo.clearbit.com/americanexpress.com',
    };
    
    // Check for exact matches
    for (const [key, logoUrl] of Object.entries(knownLogos)) {
      if (merchantLower.includes(key)) {
        return logoUrl;
      }
    }
    
    // Try to extract domain and use Clearbit
    // For unknown merchants, try common patterns
    if (merchantLower.includes('.com') || merchantLower.includes('.net')) {
      const matches = merchantLower.match(/([a-z0-9-]+\.(com|net|org))/);
      if (matches) {
        return `https://logo.clearbit.com/${matches[1]}`;
      }
    }
    
    // Fallback: return null (will show emoji fallback)
    return null;
  };

  // Emoji fallback for when logo fails to load
  const getEmojiForCategory = (category) => {
    if (!category) return '💵';
    const catLower = category.toLowerCase();
    if (catLower.includes('entertainment')) return '🎬';
    if (catLower.includes('utilities')) return '⚡';
    if (catLower.includes('food')) return '🍔';
    if (catLower.includes('transport')) return '🚗';
    if (catLower.includes('shopping')) return '🛍️';
    if (catLower.includes('health')) return '🏥';
    if (catLower.includes('subscriptions')) return '📱';
    return '💵';
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getExpensesForDate = (day) => {
    // Get auto-detected recurring expenses
    const autoExpenses = recurringExpenses.filter(expense => expense.day === day);
    
    // Get manual bills for this day
    const manualBillsForDay = manualBills.filter(bill => {
      const billDate = new Date(bill.due_date);
      return billDate.getDate() === day && 
             billDate.getMonth() === currentDate.getMonth() &&
             billDate.getFullYear() === currentDate.getFullYear();
    }).map(bill => ({
      ...bill,
      isManual: true,
      emojiIcon: bill.icon,
      day: new Date(bill.due_date).getDate()
    }));
    
    return [...autoExpenses, ...manualBillsForDay];
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate total for current month (auto + manual bills)
  const autoTotal = recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const manualTotal = manualBills
    .filter(bill => {
      const billDate = new Date(bill.due_date);
      return billDate.getMonth() === currentDate.getMonth() &&
             billDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, bill) => sum + bill.amount, 0);
  const totalDue = autoTotal + manualTotal;

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-1.5 rounded-lg">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Bills & Recurring Expenses</CardTitle>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatCurrency(totalDue)}/mo • {recurringExpenses.length + manualBills.length} bills
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            type="button"
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs h-7 px-2 rounded flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={previousMonth}
            className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={day + idx} className="text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 py-1">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square"></div>
          ))}

          {/* Calendar days */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayExpenses = getExpensesForDate(day);
            const today = isToday(day);
            
            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`aspect-square relative rounded-lg transition-all duration-200 ${
                  today
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md'
                    : dayExpenses.length > 0
                    ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                } cursor-pointer`}
              >
                {/* Day number */}
                <div className={`absolute top-0.5 left-1 text-[10px] font-semibold ${
                  today ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {day}
                </div>

                {/* Expense logos */}
                {dayExpenses.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-0.5 pt-3 pointer-events-none">
                    {dayExpenses.slice(0, 1).map((expense, idx) => (
                      <div
                        key={expense.id}
                        className="flex flex-col items-center transform hover:scale-105 transition-transform"
                        title={`${expense.name} - ${formatCurrency(expense.amount)}/mo`}
                      >
                        {expense.logoUrl ? (
                          <img
                            src={expense.logoUrl}
                            alt={expense.name}
                            className="w-8 h-8 rounded object-contain bg-white p-1 shadow-sm"
                            onError={(e) => {
                              // Fallback to emoji if logo fails to load
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <span 
                          className="text-lg"
                          style={{ display: expense.logoUrl ? 'none' : 'block' }}
                        >
                          {expense.emojiIcon}
                        </span>
                        <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                          {formatCurrency(expense.amount).replace('$', '')}
                        </span>
                      </div>
                    ))}
                    {dayExpenses.length > 1 && (
                      <div className="text-[8px] text-violet-600 dark:text-violet-400 font-semibold bg-violet-100 dark:bg-violet-900/50 px-1 rounded">
                        +{dayExpenses.length - 1}
                      </div>
                    )}
                  </div>
                )}

                {/* Amount indicator */}
                {dayExpenses.length > 0 && (
                  <div className={`absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold py-0.5 rounded-b-lg ${
                    today 
                      ? 'bg-white/20 text-white'
                      : 'bg-violet-100 dark:bg-violet-900/50 text-violet-900 dark:text-violet-100'
                  }`}>
                    {formatCurrency(dayExpenses.reduce((sum, e) => sum + e.amount, 0), 0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {(recurringExpenses.length > 0 || manualBills.length > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-xs text-gray-600 dark:text-gray-400">
              {recurringExpenses.length} auto-detected • {manualBills.length} manual
            </div>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Bill Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingBill ? 'Edit Bill' : 'Add New Bill'} size="lg">
          <form onSubmit={handleCreateBill} className="space-y-6">
            {/* Bill Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Bill Icon
              </label>
              <div className="grid grid-cols-5 gap-3">
                {['💡', '🏠', '📱', '📺', '🚗', '💳', '🏥', '🍽️', '📄'].map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-4 rounded-lg border-2 text-3xl transition-all hover:scale-105 ${
                      formData.icon === icon 
                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 shadow-lg' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Bill Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bill Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Electric Bill"
                className="w-full"
                required
              />
            </div>

            {/* Amount and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full"
                  required
                />
              </div>
            </div>

            {/* Frequency and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category (Optional)
                </label>
                <Input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Utilities"
                  className="w-full"
                />
              </div>
            </div>

            {/* Auto-pay Toggle */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_pay"
                  checked={formData.auto_pay}
                  onChange={(e) => setFormData({ ...formData, auto_pay: e.target.checked })}
                  className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                />
                <label htmlFor="auto_pay" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  This bill is on auto-pay
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg"
              >
                {editingBill ? 'Update Bill' : 'Add Bill'}
              </Button>
              <Button 
                type="button" 
                onClick={handleCloseModal} 
                className="px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>

      {/* Day Details Modal */}
      <Modal 
        isOpen={showDayModal && selectedDay !== null}
        onClose={() => setShowDayModal(false)} 
        title={`Bills & Expenses - ${currentDate.toLocaleDateString('en-US', { month: 'long' })} ${selectedDay}`}
        size="lg"
      >
          <div className="space-y-4">
            {getExpensesForDate(selectedDay).map((expense, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                  expense.isManual
                    ? expense.is_paid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {expense.isManual && (
                      <button
                        onClick={() => handleTogglePaid(expense.id, expense.is_paid)}
                        className="transition-transform hover:scale-110"
                      >
                        {expense.is_paid ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 hover:text-violet-600" />
                        )}
                      </button>
                    )}
                    <span className="text-3xl">{expense.emojiIcon || expense.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {expense.name || expense.merchant}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-semibold text-base">
                          {formatCurrency(expense.amount)}
                        </span>
                        {expense.isManual && (
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs">
                            {expense.frequency}
                          </span>
                        )}
                        {!expense.isManual && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                            Auto-detected
                          </span>
                        )}
                        {expense.auto_pay && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                            Auto-pay
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {expense.isManual && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenLinkTransaction(expense)}
                        size="sm"
                        variant="outline"
                        className="hover:bg-blue-50 dark:hover:bg-blue-900/30 text-amber-600"
                        title="Link Transaction"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </Button>
                      <Button
                        onClick={() => handleEditBill(expense)}
                        size="sm"
                        variant="outline"
                        className="hover:bg-violet-50 dark:hover:bg-violet-900/30"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteBill(expense.id, expense.name)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {getExpensesForDate(selectedDay).length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No bills or expenses on this day</p>
              </div>
            )}
          </div>
        </Modal>

      {/* Link Transaction Modal */}
      <Modal
        isOpen={showLinkTxnModal}
        onClose={() => setShowLinkTxnModal(false)}
        title={`Link Transactions - ${selectedBill?.name}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Already Linked Transactions */}
          {linkedTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Linked Transactions</h3>
              <div className="space-y-2">
                {linkedTransactions.map(txn => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{txn.merchant_name || txn.description}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(txn.date).toLocaleDateString()} • {formatCurrency(txn.amount)}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUnlinkTransaction(txn.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                    >
                      Unlink
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Transactions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Suggested Transactions
              <span className="text-sm font-normal text-gray-500 ml-2">
                (within ±5 days, similar amount)
              </span>
            </h3>
            
            {suggestedTransactions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suggestedTransactions
                  .filter(txn => !linkedTransactions.find(lt => lt.id === txn.id))
                  .map(txn => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{txn.merchant_name || txn.description}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(txn.date).toLocaleDateString()} • {formatCurrency(txn.amount)}
                          {txn.category && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {txn.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleLinkTransaction(txn.id)}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Link
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No matching transactions found</p>
                <p className="text-sm mt-1">Try adjusting your bill's due date or amount</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Bill</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirmModal.billName}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setDeleteConfirmModal({ show: false, billId: null, billName: '' })}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteBill}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Bill
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ModernBillCalendar;
