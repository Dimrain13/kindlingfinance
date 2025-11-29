import React, { useState, useEffect } from 'react';
import { Check, X, Sparkles, Crown, Infinity, ChevronDown, ChevronUp, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import CampfireLogo from '../components/CampfireLogo';

const Pricing = () => {
  const [tiers, setTiers] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState(null);
  const [expandedTiers, setExpandedTiers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      
      // Check if user is logged in and load appropriate tiers
      let tiersResponse;
      let isLoggedIn = false;
      
      try {
        // Try to get user-specific tiers (includes lifetime availability logic)
        const statusResponse = await api.get('/subscriptions/status');
        setCurrentSubscription(statusResponse.data);
        isLoggedIn = true;
        
        // Get tiers for authenticated user
        tiersResponse = await api.get('/subscriptions/tiers/me');
      } catch (err) {
        // User not logged in, get public tiers
        console.log('User not logged in, loading public tiers');
        tiersResponse = await api.get('/subscriptions/tiers');
      }
      
      // Extract tiers from response (API now returns {tiers: {...}, lifetime_available: bool})
      const tiersData = tiersResponse.data.tiers || tiersResponse.data;
      setTiers(tiersData);
      
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tierKey) => {
    // Check if user is logged in
    try {
      await api.get('/api/auth/me');
    } catch {
      // Not logged in, redirect to login
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    if (tierKey === 'free') {
      // Free tier doesn't need payment
      navigate('/dashboard');
      return;
    }

    try {
      setProcessingTier(tierKey);
      
      // Get current origin for success/cancel URLs
      const originUrl = window.location.origin;
      
      // Create checkout session
      const response = await api.post('/subscriptions/checkout', {
        tier: tierKey,
        origin_url: originUrl
      });
      
      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
      setProcessingTier(null);
    }
  };

  const getTierIcon = (tierKey) => {
    switch (tierKey) {
      case 'premium':
        return <Sparkles className="h-6 w-6" />;
      case 'pro':
        return <Crown className="h-6 w-6" />;
      case 'lifetime':
        return <Infinity className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getTierColor = (tierKey) => {
    switch (tierKey) {
      case 'premium':
        return 'from-blue-500 to-purple-500';
      case 'pro':
        return 'from-purple-500 to-pink-500';
      case 'lifetime':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const isCurrentTier = (tierKey) => {
    return currentSubscription?.tier === tierKey;
  };

  const toggleFeatures = (tierKey) => {
    setExpandedTiers(prev => ({
      ...prev,
      [tierKey]: !prev[tierKey]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-700 hover:text-amber-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Back to Home</span>
            </button>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-amber-600"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
              >
                Light Your Spark
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Campfire Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl ember-glow">
              <CampfireLogo size="xl" className="text-white" />
            </div>
          </div>
          <p className="text-amber-600 font-semibold mb-2 text-sm uppercase tracking-wide">
            Start Free - No Credit Card Required
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Find Your <span className="bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">Perfect Spot</span> by the Fire
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Whether you're just lighting the spark or building a roaring flame, we have a plan to keep you warm. 
            <span className="block mt-2 text-base text-gray-500">Plans start at less than your morning coffee.</span>
          </p>
        </div>

        {/* Current Subscription Banner */}
        {currentSubscription && currentSubscription.tier !== 'free' && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-4 text-white text-center">
              <p className="font-semibold">
                You're currently on the {currentSubscription.name} plan
              </p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {Object.entries(tiers).map(([tierKey, tier]) => (
            <div
              key={tierKey}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                isCurrentTier(tierKey) ? 'ring-4 ring-amber-500' : ''
              }`}
            >
              {/* Tier Badge */}
              {tierKey === 'premium' && (
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16">
                  <div className="absolute transform rotate-45 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold py-1 px-8 shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}
              {tierKey === 'pro' && (
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16">
                  <div className="absolute transform rotate-45 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold py-1 px-8 shadow-lg">
                    Best Value
                  </div>
                </div>
              )}
              {tierKey === 'lifetime' && (
                <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16">
                  <div className="absolute transform rotate-45 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold py-1 px-8 shadow-lg">
                    Limited Offer
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* Icon & Name */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${getTierColor(tierKey)}`}>
                    {getTierIcon(tierKey) || <Check className="h-6 w-6 text-white" />}
                  </div>
                  {isCurrentTier(tierKey) && (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-gray-600">
                    {tier.billing_period === 'month' ? '/month' : 
                     tier.billing_period === 'lifetime' ? ' one-time' : ''}
                  </span>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(tierKey)}
                  disabled={isCurrentTier(tierKey) || processingTier === tierKey}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    isCurrentTier(tierKey)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : processingTier === tierKey
                      ? 'bg-gray-400 text-white cursor-wait'
                      : `bg-gradient-to-r ${getTierColor(tierKey)} text-white hover:shadow-lg`
                  }`}
                >
                  {isCurrentTier(tierKey)
                    ? 'Current Plan'
                    : processingTier === tierKey
                    ? 'Processing...'
                    : tierKey === 'free'
                    ? 'Get Started'
                    : 'Upgrade Now'}
                </button>

                {/* Features List */}
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Features:</p>
                  {(expandedTiers[tierKey] ? tier.features : tier.features.slice(0, 8)).map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  ))}
                  {tier.features.length > 8 && (
                    <button
                      onClick={() => toggleFeatures(tierKey)}
                      className="flex items-center text-sm text-amber-600 hover:text-blue-700 font-medium ml-7 mt-2"
                    >
                      {expandedTiers[tierKey] ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          +{tier.features.length - 8} more features
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Limits */}
                {tier.limits && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Limits:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {Object.entries(tier.limits).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                          {value === 'unlimited' ? (
                            <span className="text-green-600 font-semibold">Unlimited</span>
                          ) : (
                            value
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Why Pay Section */}
        <div className="max-w-6xl mx-auto mt-20 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose a Premium Finance App?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Free apps have hidden costs. Here's why premium makes sense for your financial future.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Ads, Ever</h3>
              <p className="text-gray-600 text-sm">
                You're the customer, not the product. No distractions, just your financial data presented clearly.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Your Data is Private</h3>
              <p className="text-gray-600 text-sm">
                We never sell your financial data to advertisers. Your information stays secure and confidential.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Best-in-Class Features</h3>
              <p className="text-gray-600 text-sm">
                AI-powered insights, advanced analytics, and tools that free apps simply can't afford to build.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Built to Last</h3>
              <p className="text-gray-600 text-sm">
                Sustainable business model means we're here for the long haul. Your financial data is safe with us.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="max-w-6xl mx-auto my-20">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-8 h-8 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">4.9 / 5.0</span>
            </div>
            <p className="text-gray-600">Join thousands of users taking control of their finances</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <p className="text-gray-700 mb-4 italic">
                "Kindling has completely transformed how I manage my money. The AI insights are spot-on and have helped me save over $500 in the first month!"
              </p>
              <p className="text-sm font-semibold text-gray-900">- Sarah K.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <p className="text-gray-700 mb-4 italic">
                "Finally, a budgeting app that doesn't feel like homework. The interface is beautiful and the features are powerful. Worth every penny!"
              </p>
              <p className="text-sm font-semibold text-gray-900">- Michael R.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <p className="text-gray-700 mb-4 italic">
                "The investment tracking and crypto features are unmatched. I've tried 5 other apps and Kindling is by far the most comprehensive."
              </p>
              <p className="text-sm font-semibold text-gray-900">- Jennifer L.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I upgrade or downgrade at any time?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade to a higher tier anytime. If you downgrade, the change will take effect at the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards through our secure payment processor, Stripe.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is the Lifetime deal really lifetime?
              </h3>
              <p className="text-gray-600">
                Absolutely! Pay once and get access to all Pro features forever, including all future updates.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel my subscription?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel anytime from your account settings. You'll retain access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
