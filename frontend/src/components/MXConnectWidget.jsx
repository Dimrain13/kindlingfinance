import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LinkIcon, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const MXConnectWidget = ({ onSuccess, onClose }) => {
  const [connectUrl, setConnectUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createConnectWidget = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/mx/connect-widget');
      setConnectUrl(response.data.connect_url);
    } catch (err) {
      console.error('Failed to create MX connect widget:', err);
      setError('Failed to initialize bank connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    createConnectWidget();

    // Listen for messages from MX Connect Widget
    const handleMessage = (event) => {
      // Verify the message is from MX
      if (event.data && event.data.type === 'mx/connect/memberConnected') {
        console.log('Member connected:', event.data);
        
        // Sync accounts after connection
        syncAccounts();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const syncAccounts = async () => {
    try {
      // Sync accounts from MX
      await api.post('/mx/accounts/sync');
      
      // Sync transactions
      await api.post('/mx/transactions/sync');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to sync accounts:', err);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600">Initializing secure connection...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={createConnectWidget} className="bg-gradient-to-r from-orange-600 to-red-600">
              Try Again
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Connect Your Bank Account
            </CardTitle>
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
                ✕
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {connectUrl && (
            <iframe
              src={connectUrl}
              width="100%"
              height="600"
              frameBorder="0"
              title="MX Connect Widget"
              style={{ minHeight: '600px' }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MXConnectWidget;
