import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Bitcoin, Wallet, Building2, RefreshCw, Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatNumber';

const CryptoHoldings = () => {
  const [holdings, setHoldings] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'wallet' or 'exchange'
  const [submitting, setSubmitting] = useState(false);
  
  const [walletForm, setWalletForm] = useState({
    chain: 'bitcoin',
    wallet_address: '',
    wallet_label: ''
  });
  
  const [exchangeForm, setExchangeForm] = useState({
    exchange: '',
    api_key: '',
    api_secret: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [holdingsRes, sourcesRes] = await Promise.all([
        api.get('/crypto/holdings'),
        api.get('/crypto/sources')
      ]);
      setHoldings(holdingsRes.data);
      setSources(sourcesRes.data);
    } catch (error) {
      console.error('Failed to load crypto data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWallet = async () => {
    if (submitting) return; // Prevent double submission
    
    try {
      setSubmitting(true);
      await api.post('/crypto/sources', {
        source_type: 'wallet',
        ...walletForm
      });
      setShowAddModal(false);
      setWalletForm({ chain: 'bitcoin', wallet_address: '', wallet_label: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to add wallet:', error);
      alert(error.response?.data?.detail || 'Failed to add wallet. Please check the address.');
    } finally {
      setSubmitting(false);
    }
  };

  const addExchange = async () => {
    if (submitting) return; // Prevent double submission
    
    try {
      setSubmitting(true);
      await api.post('/crypto/sources', {
        source_type: 'exchange',
        ...exchangeForm
      });
      setShowAddModal(false);
      setExchangeForm({ exchange: '', api_key: '', api_secret: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to add exchange:', error);
      alert(error.response?.data?.detail || 'Failed to connect exchange.');
    } finally {
      setSubmitting(false);
    }
  };

  const syncSource = async (sourceId) => {
    try {
      await api.post(`/crypto/sources/${sourceId}/sync`);
      loadData();
    } catch (error) {
      console.error('Failed to sync source:', error);
      alert('Failed to sync. Please try again.');
    }
  };

  const deleteSource = async (sourceId) => {
    if (!window.confirm('Delete this crypto source? All holdings will be removed.')) return;
    try {
      await api.delete(`/crypto/sources/${sourceId}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + (h.current_value_usd || 0), 0);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Bitcoin className="h-5 w-5 mr-2 text-kindling-blaze" />
              Crypto Portfolio
            </CardTitle>
            <div className="flex items-center space-x-4 mt-2">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddMode('wallet');
                setShowAddModal(true);
              }}
            >
              <Wallet className="h-4 w-4 mr-1" />
              Add Wallet
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddMode('exchange');
                setShowAddModal(true);
              }}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Connect Exchange
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Sources List */}
            {sources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Connected Sources</h3>
                <div className="space-y-2">
                  {sources.map(source => (
                    <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {source.source_type === 'wallet' ? (
                          <Wallet className="h-5 w-5 text-kindling-fire" />
                        ) : (
                          <Building2 className="h-5 w-5 text-green-600" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {source.source_type === 'wallet' 
                              ? (source.wallet_label || `${source.chain} Wallet`)
                              : `${source.exchange} Exchange`
                            }
                          </p>
                          {source.source_type === 'wallet' && (
                            <p className="text-xs text-gray-500">
                              {source.wallet_address.slice(0, 8)}...{source.wallet_address.slice(-6)}
                            </p>
                          )}
                          {source.last_synced && (
                            <p className="text-xs text-gray-400">
                              Last synced: {new Date(source.last_synced).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => syncSource(source.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSource(source.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Holdings List */}
            {holdings.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Holdings</h3>
                {holdings.map(holding => (
                  <div key={holding.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-kindling-fire">{holding.symbol}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{holding.name}</p>
                        <p className="text-sm text-gray-500">{holding.amount.toFixed(8)} {holding.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {holding.current_value_usd ? formatCurrency(holding.current_value_usd) : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${holding.current_price_usd?.toFixed(2) || 'N/A'} per coin
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bitcoin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-semibold mb-2">No crypto holdings yet</p>
                <p className="text-gray-400 text-sm mb-6">
                  Add a wallet address or connect an exchange to start tracking
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setAddMode('wallet');
                      setShowAddModal(true);
                    }}
                    variant="outline"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Add Wallet
                  </Button>
                  <Button
                    onClick={() => {
                      setAddMode('exchange');
                      setShowAddModal(true);
                    }}
                    variant="outline"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Connect Exchange
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Add Source Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addMode === 'wallet' ? 'Add Wallet Address' : 'Connect Exchange'}
            </DialogTitle>
          </DialogHeader>
          
          {addMode === 'wallet' ? (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Blockchain</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md"
                  value={walletForm.chain}
                  onChange={(e) => setWalletForm({ ...walletForm, chain: e.target.value })}
                >
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="ethereum">Ethereum (ETH)</option>
                  <option value="solana">Solana (SOL)</option>
                  <option value="polygon">Polygon (MATIC)</option>
                  <option value="bsc">Binance Smart Chain (BNB)</option>
                </select>
              </div>
              
              <div>
                <Label>Wallet Address *</Label>
                <Input
                  type="text"
                  placeholder="Enter your wallet address"
                  value={walletForm.wallet_address}
                  onChange={(e) => setWalletForm({ ...walletForm, wallet_address: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your wallet address will be monitored for balance changes
                </p>
              </div>
              
              <div>
                <Label>Wallet Label (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g., My Hardware Wallet"
                  value={walletForm.wallet_label}
                  onChange={(e) => setWalletForm({ ...walletForm, wallet_label: e.target.value })}
                />
              </div>
              
              <Button 
                onClick={addWallet} 
                className="w-full" 
                disabled={!walletForm.wallet_address || submitting}
              >
                {submitting ? 'Adding...' : 'Add Wallet'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">
                  <strong>⚠️ Important:</strong> Only use read-only API keys with view permissions. Never share API keys with withdrawal or trading permissions.
                </p>
              </div>
              
              <div>
                <Label>Exchange Name *</Label>
                <Input
                  type="text"
                  placeholder="e.g., Coinbase, Binance, Kraken, Gemini"
                  value={exchangeForm.exchange}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, exchange: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the name of any crypto exchange
                </p>
              </div>
              
              <div>
                <Label>API Key (Read-Only) *</Label>
                <Input
                  type="text"
                  placeholder="Your read-only API key"
                  value={exchangeForm.api_key}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, api_key: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate a read-only API key from your exchange settings
                </p>
              </div>
              
              <div>
                <Label>API Secret *</Label>
                <Input
                  type="password"
                  placeholder="Your API secret"
                  value={exchangeForm.api_secret}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, api_secret: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Popular Exchanges:</strong> Coinbase, Binance, Kraken, Gemini, Crypto.com, KuCoin, Bybit
                </p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-900">
                  <strong>Note:</strong> Exchange API integration requires custom implementation for each exchange. The connection will be saved, but automatic syncing may not work immediately. We're adding support for major exchanges.
                </p>
              </div>
              
              <Button 
                onClick={addExchange} 
                className="w-full"
                disabled={!exchangeForm.exchange || !exchangeForm.api_key || !exchangeForm.api_secret || submitting}
              >
                {submitting ? 'Connecting...' : 'Connect Exchange'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CryptoHoldings;
