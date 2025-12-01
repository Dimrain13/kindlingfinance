import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Bell, X, AlertTriangle, Info, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

const AlertsWidget = () => {
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [summary, setSummary] = useState({ total: 0, high: 0, medium: 0, low: 0 });

  useEffect(() => {
    loadAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      // Get alerts from the existing system (advanced_features.py)
      const alertsRes = await api.get('/alerts', { params: { limit: 50 } });
      const alertsList = Array.isArray(alertsRes.data) ? alertsRes.data : [];
      
      // Calculate summary from alerts
      const unreadAlerts = alertsList.filter(a => !a.is_read);
      const summary = {
        total: unreadAlerts.length,
        high: unreadAlerts.filter(a => a.severity === 'high').length,
        medium: unreadAlerts.filter(a => a.severity === 'medium').length,
        low: unreadAlerts.filter(a => a.severity === 'low').length
      };
      
      setAlerts(unreadAlerts);
      setSummary(summary);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const dismissAlert = async (alert) => {
    try {
      // Mark alert as read using existing endpoint
      await api.post(`/alerts/${alert.id}/read`);
      // Remove from local state
      setAlerts(alerts.filter(a => a.id !== alert.id));
      setSummary(prev => ({
        ...prev,
        total: prev.total - 1,
        [alert.severity]: Math.max(0, prev[alert.severity] - 1)
      }));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const clearAllAlerts = async () => {
    try {
      // Use bulk endpoint for efficiency
      await api.post('/alerts/mark-all-read');
      
      // Clear local state
      setAlerts([]);
      setSummary({ total: 0, high: 0, medium: 0, low: 0 });
      setShowAlerts(false);
    } catch (error) {
      console.error('Failed to clear all alerts:', error);
      alert('Failed to clear all alerts. Please try again.');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'bill_due':
        return <Calendar className="h-5 w-5" />;
      case 'budget_overspending':
      case 'budget_threshold':
        return <AlertTriangle className="h-5 w-5" />;
      case 'low_balance':
        return <DollarSign className="h-5 w-5" />;
      case 'goal_milestone':
        return <TrendingUp className="h-5 w-5" />;
      case 'unusual_spending':
      case 'large_transaction':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: 'text-yellow-600'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'text-kindling-fire'
        };
      case 'info':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: 'text-green-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600'
        };
    }
  };

  return (
    <>
      {/* Bell Icon with Badge */}
      <div className="relative">
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Bell className="h-6 w-6 text-gray-600" />
          {summary.total > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {summary.total > 9 ? '9+' : summary.total}
            </span>
          )}
        </button>
      </div>

      {/* Alerts Panel */}
      {showAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-start justify-end p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                  <p className="text-sm text-gray-600">{summary.total} active alert{summary.total !== 1 ? 's' : ''}</p>
                </div>
                <Button
                  onClick={() => setShowAlerts(false)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {summary.total > 0 && (
                <Button
                  onClick={clearAllAlerts}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Alerts List */}
            <CardContent className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No alerts</p>
                  <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                alerts.map((alert, idx) => {
                  const colors = getAlertColor(alert.severity);
                  
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border} relative group`}
                    >
                      <button
                        onClick={() => dismissAlert(alert)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>

                      <div className="flex gap-3">
                        <div className={colors.icon}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${colors.text}`}>
                            {alert.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.message}
                          </p>
                          
                          {/* Additional data display based on type */}
                          {alert.type === 'budget_overspending' && alert.metadata && (
                            <div className="mt-2">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500"
                                  style={{ width: `${Math.min(alert.metadata.percentage || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {alert.type === 'goal_milestone' && alert.metadata && (
                            <div className="mt-2">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{ width: `${alert.metadata.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default AlertsWidget;
