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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounts</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">{account.name}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteAccount(account.id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{account.institution_name || 'Manual Account'}</p>
                <p className="text-sm text-gray-600">Type: {account.account_type}</p>
                {account.mask && <p className="text-sm text-gray-600">****{account.mask}</p>}
                <p className="text-2xl font-bold mt-3">
                  ${account.balance.toFixed(2)} {account.currency}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No accounts yet. Link a bank account to get started!</p>
        </div>
      )}
    </div>
  );
};

export default Accounts;
