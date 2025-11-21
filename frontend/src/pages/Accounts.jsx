import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Wallet, Plus, Trash2 } from 'lucide-react';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      loadAccounts();
    } catch (error) {
      alert('Failed to delete account');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Accounts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} • Total: ${totalBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAccount(account.id)}
                  className="hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Institution</span>
                  <span className="text-sm font-semibold">{account.institution_name || 'Manual'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</span>
                  <span className="text-sm font-semibold capitalize">{account.account_type.replace('_', ' ')}</span>
                </div>
                {account.mask && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account</span>
                    <span className="text-sm font-mono">****{account.mask}</span>
                  </div>
                )}
                <div className="border-t pt-3 mt-3">
                  <p className="text-3xl font-bold text-blue-600">
                    ${account.balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{account.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        {accounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-600 mb-2">No accounts yet</p>
              <p className="text-gray-500">Link a bank account from the Dashboard to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Accounts;
