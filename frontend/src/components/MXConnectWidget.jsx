import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LinkIcon, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const MXConnectWidget = ({ onSuccess, onClose, onLoad }) => {
  const [connectUrl, setConnectUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('MXConnectWidget mounted');

  const createConnectWidget = async () => {
    console.log('Creating MX connect widget...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/mx/connect-widget');
      console.log('MX connect widget response:', response.data);
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
      // Check if message is from MX widget
      if (!event.data) return;
      
      // Log all messages to help debug
      console.log('📨 Received postMessage:', event.data);
      
      const messageType = event.data.type || event.data.event;
      if (!messageType) {
        // Check if it's an MX metadata update
        if (event.data.metadata || event.data.mx) {
          console.log('📊 MX metadata:', event.data);
        }
        return;
      }
      
      console.log('🎯 MX Widget Event:', messageType, event.data);
      
      // Handle different MX Connect events
      switch (messageType) {
        case 'mx/connect/loaded':
          console.log('✅ MX Widget loaded successfully');
          if (onLoad) onLoad();
          break;
          
        case 'mx/connect/memberConnected':
          console.log('✅ Member connected successfully:', event.data);
          // MX needs time to aggregate - wait 5 seconds to ensure data is ready
          console.log('⏳ Waiting for MX aggregation to complete...');
          setTimeout(() => {
            console.log('🔄 Attempting to sync accounts...');
            syncAccounts();
          }, 5000);
          break;
          
        case 'mx/connect/connectedPrimaryAction':
          // User completed primary action (connection flow)
          console.log('✅ Primary action completed');
          setTimeout(() => {
            syncAccounts();
          }, 5000);
          break;
          
        case 'mx/connect/memberDeleted':
          console.log('🗑️ Member deleted:', event.data);
          if (onSuccess) {
            onSuccess();
          }
          break;
          
        case 'mx/connect/connectedMemberStatusChanged':
          console.log('🔄 Member status changed:', event.data);
          // Status might change during MFA/verification
          break;
          
        case 'mx/connect/connectedMemberMFARequired':
          console.log('🔐 MFA Required - waiting for user input');
          // Widget will handle MFA UI, we just need to wait
          break;
          
        case 'mx/connect/connectedMemberMFASuccess':
          console.log('✅ MFA completed successfully');
          // Connection should complete after successful MFA
          break;
          
        case 'mx/connect/error':
        case 'mx/connect/connectedMemberError':
          console.error('❌ MX Widget error:', event.data);
          setError('Connection failed. Please try again.');
          break;
          
        default:
          // Log other events for debugging
          console.log('MX Event:', messageType);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const syncAccounts = async () => {
    try {
      console.log('🔄 Starting account sync...');
      
      // Sync accounts from MX
      const accountsResult = await api.post('/mx/accounts/sync');
      console.log('Account sync result:', accountsResult.data);
      
      if (accountsResult.data.count === 0) {
        console.warn('⚠️ No accounts synced. Member might still be aggregating.');
        // Show a message to user
        alert('Connection initiated! Your accounts are being synced. This may take up to 60 seconds. Please refresh the page in a moment.');
      } else {
        // Sync transactions
        const txnResult = await api.post('/mx/transactions/sync');
        console.log('Transaction sync result:', txnResult.data);
        
        alert(`✅ Successfully synced ${accountsResult.data.count} account(s)!`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('❌ Failed to sync accounts:', err);
      setError('Failed to sync accounts. Please try refreshing the page.');
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-kindling-fire" />
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
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
        <CardContent className="p-0 relative">
          {/* Loading overlay while iframe initializes */}
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10 transition-opacity duration-300">
            <RefreshCw className="h-12 w-12 animate-spin text-kindling-fire mb-4" />
            <p className="text-gray-700 font-medium text-lg">Loading bank connections...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
            {/* Fake progress bar for better UX */}
            <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 animate-pulse" style={{width: '70%'}}></div>
            </div>
          </div>
          
          {connectUrl && (
            <iframe
              src={connectUrl}
              width="100%"
              height="600"
              frameBorder="0"
              title="MX Connect Widget"
              style={{ minHeight: '600px' }}
              onLoad={() => {
                // Hide loading overlay when iframe loads
                const overlay = document.querySelector('.absolute.inset-0.bg-white');
                if (overlay) {
                  overlay.style.opacity = '0';
                  setTimeout(() => overlay.style.display = 'none', 300);
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MXConnectWidget;
