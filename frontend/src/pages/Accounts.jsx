import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/formatNumber';
import { calculateNetWorth, calculateTotalBalance, LIABILITY_TYPES } from '../utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Wallet, Plus, Trash2, RefreshCw } from 'lucide-react';
import MXConnectWidget from '../components/MXConnectWidget';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [deleteOption, setDeleteOption] = useState('single'); // 'single' or 'all'
  const [showMXConnect, setShowMXConnect] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const handleMXSuccess = () => {
    setShowMXConnect(false);
    loadAccounts();
    alert('✅ Bank account connected successfully!\n\n💡 Your transactions are being synced!');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/mx/accounts/sync');
      await api.post('/mx/transactions/sync');
      alert('Accounts and transactions synced successfully!');
      loadAccounts();
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('Failed to sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const initiateDelete = (account) => {
    setAccountToDelete(account);
    
    // Check if there are multiple accounts from the same institution
    const sameInstitution = accounts.filter(
      acc => acc.institution_name === account.institution_name
    );
    
    if (sameInstitution.length > 1) {
      // Show modal to ask if they want to delete one or all
      setDeleteModalOpen(true);
      setDeleteOption('single');
    } else {
      // Just confirm and delete this one account
      if (window.confirm(`Are you sure you want to delete ${account.name}?`)) {
        deleteAccounts([account.id]);
      }
    }
  };

  const deleteAccounts = async (accountIds) => {
    try {
      // Delete each account
      for (const id of accountIds) {
        await api.delete(`/accounts/${id}`);
      }
      
      // Close modal and reload
      setDeleteModalOpen(false);
      setAccountToDelete(null);
      await loadAccounts();
      
      alert(`Successfully deleted ${accountIds.length} account(s)`);
    } catch (error) {
      console.error('Failed to delete account(s):', error);
      alert('Failed to delete account(s). Please try again.');
    }
  };

  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    
    if (deleteOption === 'single') {
      // Delete only the selected account
      deleteAccounts([accountToDelete.id]);
    } else {
      // Delete all accounts from the same institution
      const accountsToDelete = accounts
        .filter(acc => acc.institution_name === accountToDelete.institution_name)
        .map(acc => acc.id);
      deleteAccounts(accountsToDelete);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  // Calculate totals using utility functions
  const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth(accounts);
  const totalBalance = calculateTotalBalance(accounts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Accounts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </p>
            <div className="mt-3 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Total Balance</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              {totalLiabilities > 0 && (
                <div>
                  <span className="text-gray-500 text-xs">Net Worth</span>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(netWorth)}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSync}
              disabled={syncing}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              <RefreshCw size={18} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Accounts'}
            </Button>
            <Button 
              onClick={() => setShowMXConnect(true)}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              <Plus size={18} className="mr-2" />
              Link Account
            </Button>
          </div>
        </div>

        {/* All Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const isLiability = LIABILITY_TYPES.includes(account.account_type);
            return (
              <Card key={account.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-600 p-2 rounded-lg">
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => initiateDelete(account)}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete account"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
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
                      <span className="text-sm font-semibold capitalize bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {account.account_type.replace('_', ' ')}
                      </span>
                    </div>
                    {account.mask && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account</span>
                        <span className="text-sm font-mono">****{account.mask}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <p className={`text-3xl font-bold ${isLiability ? 'text-red-600' : 'text-amber-600'}`}>
                            {formatCurrency(account.balance)}
                          </p>
                          {isLiability && (
                            <span className="text-xs text-red-500 mt-1">Liability (Debt)</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{account.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-600 mb-2">No accounts yet</p>
              <p className="text-gray-500">Link a bank account from the Dashboard to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && accountToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-md my-8 shadow-2xl animate-fadeIn">
            <CardHeader className="border-b">
              <CardTitle className="text-xl font-bold">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 max-h-[70vh] overflow-y-auto">
              <p className="text-gray-600 dark:text-gray-400">
                You're about to delete <strong>{accountToDelete.name}</strong> from{' '}
                <strong>{accountToDelete.institution_name}</strong>.
              </p>
              
              {accounts.filter(acc => acc.institution_name === accountToDelete.institution_name).length > 1 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    You have {accounts.filter(acc => acc.institution_name === accountToDelete.institution_name).length} accounts from {accountToDelete.institution_name}
                  </p>
                  
                  <div className="space-y-2">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteOption"
                        value="single"
                        checked={deleteOption === 'single'}
                        onChange={(e) => setDeleteOption(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Delete only this account</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Remove {accountToDelete.name} (****{accountToDelete.mask})
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteOption"
                        value="all"
                        checked={deleteOption === 'all'}
                        onChange={(e) => setDeleteOption(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Delete all {accountToDelete.institution_name} accounts</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Remove all {accounts.filter(acc => acc.institution_name === accountToDelete.institution_name).length} accounts from this institution
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setAccountToDelete(null);
                  }}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Delete {deleteOption === 'all' ? 'All' : 'Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MX Connect Widget Modal */}
      {showMXConnect && (
        <MXConnectWidget 
          onSuccess={handleMXSuccess}
          onClose={() => setShowMXConnect(false)}
        />
      )}
    </div>
  );
};

export default Accounts;
