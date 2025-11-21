import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const ModernBillCalendar = () => {
  const [bills, setBills] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const response = await api.get('/bills');
      setBills(response.data);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
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

  const getBillsForDate = (day) => {
    return bills.filter(bill => {
      const billDate = new Date(bill.due_date);
      return billDate.getDate() === day && 
             billDate.getMonth() === currentDate.getMonth() &&
             billDate.getFullYear() === currentDate.getFullYear();
    });
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

  // Calculate total for current month
  const currentMonthBills = bills.filter(bill => {
    const billDate = new Date(bill.due_date);
    return billDate.getMonth() === currentDate.getMonth() &&
           billDate.getFullYear() === currentDate.getFullYear() &&
           !bill.is_paid;
  });
  const totalDue = currentMonthBills.reduce((sum, bill) => sum + bill.amount, 0);

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
      <CardHeader className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2.5 rounded-xl shadow-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Bills Calendar</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              ${totalDue.toFixed(2)} due this month
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={previousMonth}
            className="hover:bg-violet-50 dark:hover:bg-violet-900/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{monthName}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextMonth}
            className="hover:bg-violet-50 dark:hover:bg-violet-900/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
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
            const dayBills = getBillsForDate(day);
            const today = isToday(day);
            
            return (
              <div
                key={day}
                className={`aspect-square relative rounded-xl transition-all duration-200 ${
                  today
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg scale-105'
                    : dayBills.length > 0
                    ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30 hover:shadow-md'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                } cursor-pointer border border-transparent hover:border-violet-200 dark:hover:border-violet-700`}
              >
                {/* Day number */}
                <div className={`absolute top-1 left-2 text-sm font-semibold ${
                  today ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {day}
                </div>

                {/* Bill icons */}
                {dayBills.length > 0 && (
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-1 pt-6">
                    {dayBills.slice(0, 4).map((bill, idx) => (
                      <div
                        key={bill.id}
                        className={`text-2xl transform hover:scale-125 transition-transform ${
                          bill.is_paid ? 'opacity-40 grayscale' : ''
                        }`}
                        title={`${bill.name} - $${bill.amount.toFixed(2)}${bill.is_paid ? ' (Paid)' : ''}`}
                      >
                        {bill.icon || '📄'}
                      </div>
                    ))}
                    {dayBills.length > 4 && (
                      <div className="text-xs font-bold text-violet-600 dark:text-violet-400">
                        +{dayBills.length - 4}
                      </div>
                    )}
                  </div>
                )}

                {/* Amount indicator */}
                {dayBills.length > 0 && (
                  <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-0.5 rounded-b-xl ${
                    today 
                      ? 'bg-white/20 text-white'
                      : 'bg-violet-100 dark:bg-violet-900/50 text-violet-900 dark:text-violet-100'
                  }`}>
                    ${dayBills.reduce((sum, b) => sum + b.amount, 0).toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30 border border-violet-200"></div>
              <span className="text-gray-600 dark:text-gray-400">Bills Due</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-lg opacity-40 grayscale">💵</div>
              <span className="text-gray-600 dark:text-gray-400">Paid</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {currentMonthBills.length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-xl">
            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentMonthBills.length} {currentMonthBills.length === 1 ? 'bill' : 'bills'} unpaid
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModernBillCalendar;
