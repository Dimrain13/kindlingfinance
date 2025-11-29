import React, { useState, useEffect } from 'react';
import { Crown, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import api from '../utils/api';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/status');
      setSubscription(response.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      setCancelling(true);
      await api.post('/subscriptions/cancel');
      alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      loadSubscription();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading subscription...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPremium = subscription?.tier && subscription.tier !== 'free';
  const isActive = subscription?.status === 'active';
  const isCancelled = subscription?.status === 'cancelled';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-600" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Plan */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {subscription?.name || 'Free'} Plan
              </h3>
              <p className="text-sm text-gray-600">
                {isPremium ? `$${subscription.price}/${subscription.billing_period}` : 'No charge'}
              </p>
            </div>
            <div>
              {isActive && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  Active
                </span>
              )}
              {isCancelled && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Cancelled
                </span>
              )}
            </div>
          </div>

          {/* Billing Info */}
          {isPremium && subscription.started_at && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium text-gray-900">
                  {new Date(subscription.started_at).toLocaleDateString()}
                </span>
              </div>
              {subscription.expires_at && subscription.billing_period !== 'lifetime' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {isCancelled ? 'Access until:' : 'Renews on:'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {new Date(subscription.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {subscription.billing_period === 'lifetime' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Access:</span>
                  <span className="font-medium text-green-600">Lifetime</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features Summary */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Features:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {subscription?.features?.slice(0, 6).map((feature, index) => (
              <div key={index} className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">
                  {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            ))}
          </div>
          {subscription?.features?.length > 6 && (
            <p className="text-sm text-gray-500 mt-2">
              +{subscription.features.length - 6} more features
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isPremium && (
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Upgrade to Premium
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}

          {isPremium && subscription.tier !== 'lifetime' && isActive && (
            <>
              {subscription.tier !== 'pro' && (
                <Button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Upgrade to Higher Tier
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            </>
          )}

          {isCancelled && (
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Reactivate Subscription
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}

          <Button
            onClick={() => navigate('/pricing')}
            variant="ghost"
            className="w-full text-gray-600 hover:text-amber-600"
          >
            View All Plans
          </Button>
        </div>

        {/* Free Tier Message */}
        {!isPremium && (
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Upgrade to unlock:</strong> AI insights, advanced analytics, crypto tracking, and much more!
            </p>
          </div>
        )}

        {/* Lifetime Message */}
        {subscription?.billing_period === 'lifetime' && (
          <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              🎉 <strong>Lifetime Member!</strong> You have permanent access to all Pro features, including all future updates.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionManagement;
