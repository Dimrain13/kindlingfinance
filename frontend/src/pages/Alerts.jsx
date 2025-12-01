import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  RefreshCw,
  Settings,
  TrendingDown,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/alerts/generate');
      await loadAlerts();
      alert(`Generated ${response.data.alerts.length} new alerts`);
    } catch (error) {
      console.error('Failed to generate alerts:', error);
      alert('Failed to generate alerts');
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/read`);
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, is_read: true } : a
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getAlertIcon = (type, severity) => {
    const iconClass = "h-6 w-6";
    
    switch (type) {
      case 'low_balance':
        return <TrendingDown className={`${iconClass} text-red-600`} />;
      case 'unusual_spending':
        return <AlertTriangle className={`${iconClass} text-kindling-fire`} />;
      case 'large_transaction':
        return <DollarSign className={`${iconClass} text-kindling-fire`} />;
      case 'budget_warning':
        return <AlertCircle className={`${iconClass} text-yellow-600`} />;
      case 'budget_exceeded':
        return <AlertTriangle className={`${iconClass} text-red-600`} />;
      default:
        return <Info className={`${iconClass} text-gray-600`} />;
    }
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      info: 'bg-amber-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={`${variants[severity] || variants.info} border-0`}>
        {severity || 'info'}
      </Badge>
    );
  };

  const unreadAlerts = alerts.filter(a => !a.is_read);
  const readAlerts = alerts.filter(a => a.is_read);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            Financial Alerts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Stay informed about your financial activity
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={generateAlerts}
            disabled={generating}
            className="bg-gradient-to-r from-kindling-fire to-kindling-blaze text-white"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for Alerts
              </>
            )}
          </Button>
          
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Unread Alerts</p>
                <p className="text-3xl font-bold text-red-600">{unreadAlerts.length}</p>
              </div>
              <Bell className="h-12 w-12 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">High Priority</p>
                <p className="text-3xl font-bold text-kindling-fire">
                  {alerts.filter(a => a.severity === 'high').length}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Alerts</p>
                <p className="text-3xl font-bold text-kindling-fire">{alerts.length}</p>
              </div>
              <Info className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-600">{readAlerts.length}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unread Alerts */}
      {unreadAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Unread Alerts ({unreadAlerts.length})
          </h2>
          {unreadAlerts.map(alert => (
            <Card key={alert.id} className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {getAlertIcon(alert.type, alert.severity)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {alert.title}
                        </h3>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      
                      <p className="text-gray-600 mb-3">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {new Date(alert.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{alert.type.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => markAsRead(alert.id)}
                    variant="outline"
                    size="sm"
                  >
                    Mark as Read
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Read Alerts */}
      {readAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Read Alerts ({readAlerts.length})
          </h2>
          {readAlerts.map(alert => (
            <Card key={alert.id} className="opacity-60 hover:opacity-100 transition-opacity">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {getAlertIcon(alert.type, alert.severity)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {alert.title}
                      </h3>
                      {getSeverityBadge(alert.severity)}
                      <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {new Date(alert.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="py-16">
            <div className="text-center">
              <Bell className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No alerts yet
              </h3>
              <p className="text-gray-600 mb-6">
                Click "Check for Alerts" to scan your financial activity
              </p>
              <Button
                onClick={generateAlerts}
                disabled={generating}
                className="bg-gradient-to-r from-kindling-fire to-kindling-blaze text-white"
              >
                {generating ? 'Checking...' : 'Check for Alerts'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alerts;
