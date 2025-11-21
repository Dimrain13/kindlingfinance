import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, CheckCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';

const BillCalendarWidget = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const response = await api.get('/bills');
      // Sort by due date
      const sortedBills = response.data.sort((a, b) => 
        new Date(a.due_date) - new Date(b.due_date)
      );
      setBills(sortedBills);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBillStatus = (bill) => {
    if (bill.is_paid) {
      return { text: 'Paid', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle };
    }
    
    const daysUntil = getDaysUntilDue(bill.due_date);
    
    if (daysUntil < 0) {
      return { text: `${Math.abs(daysUntil)}d overdue`, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle };
    } else if (daysUntil === 0) {
      return { text: 'Due today', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: Clock };
    } else if (daysUntil <= 3) {
      return { text: `${daysUntil}d left`, color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', icon: Clock };
    } else {
      return { text: `${daysUntil}d left`, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock };
    }
  };

  const upcomingBills = bills.slice(0, 5);
  const totalUpcoming = bills.filter(b => !b.is_paid).reduce((sum, b) => sum + b.amount, 0);
  const overdueCount = bills.filter(b => !b.is_paid && getDaysUntilDue(b.due_date) < 0).length;

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-md">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Upcoming Bills</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${totalUpcoming.toFixed(2)} due soon
              </p>
            </div>
          </div>
          <Link to="/bills">
            <Button variant="ghost" size="sm" className="hover:bg-white/50">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {overdueCount > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-900 dark:text-red-100">
                {overdueCount} {overdueCount === 1 ? 'bill is' : 'bills are'} overdue!
              </span>
            </div>
          </div>
        )}

        {upcomingBills.length > 0 ? (
          <div className="space-y-3">
            {upcomingBills.map((bill) => {
              const status = getBillStatus(bill);
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={bill.id} 
                  className={`flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.02] ${status.bgColor} border border-transparent hover:border-gray-200 dark:hover:border-gray-700`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-3xl">{bill.icon || '📄'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {bill.name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(bill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      ${bill.amount.toFixed(2)}
                    </p>
                    {bill.frequency && (
                      <p className="text-xs text-gray-500 capitalize">{bill.frequency}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="font-medium text-gray-900 dark:text-white">All caught up!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                No upcoming bills to display
              </p>
              <Link to="/bills">
                <Button className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600" size="sm">
                  Add Your First Bill
                </Button>
              </Link>
            </div>
          </div>
        )}

        {bills.length > 5 && (
          <Link to="/bills">
            <Button 
              variant="ghost" 
              className="w-full mt-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50"
            >
              View All {bills.length} Bills
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

export default BillCalendarWidget;
