import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, Shield, Zap, PieChart, Target, Bell, 
  BarChart3, Wallet, Smartphone, Lock, Award, ArrowRight,
  CheckCircle, LineChart, Activity
} from 'lucide-react';
import CampfireLogo from '../components/CampfireLogo';

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Debug log
  console.log('✅ LandingPage component rendered at:', location.pathname);
  
  // Prevent any automatic redirects
  useEffect(() => {
    console.log('LandingPage mounted, current path:', location.pathname);
  }, [location]);

  const features = [
    {
      icon: <Wallet className="h-8 w-8" />,
      title: "All Accounts in One Place",
      description: "Connect bank accounts, investments, and crypto wallets. See your complete financial picture."
    },
    {
      icon: <LineChart className="h-8 w-8" />,
      title: "Investment Tracking",
      description: "Track performance, compare to S&P 500, and get diversification insights with real-time updates."
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Smart Goals & Budgets",
      description: "Set financial goals, create budgets, and track progress with AI-powered recommendations."
    },
    {
      icon: <Bell className="h-8 w-8" />,
      title: "Smart Alerts",
      description: "Get notified about low balances, unusual spending, and budget thresholds automatically."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Powerful Analytics",
      description: "Daily cash flow charts, spending trends, and comprehensive reports to understand your finances."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Bank-Level Security",
      description: "256-bit encryption, secure authentication, and industry-standard data protection."
    }
  ];

  const benefits = [
    { icon: <CheckCircle className="h-5 w-5 text-green-600" />, text: "No hidden fees or surprises" },
    { icon: <CheckCircle className="h-5 w-5 text-green-600" />, text: "Connect unlimited accounts" },
    { icon: <CheckCircle className="h-5 w-5 text-green-600" />, text: "AI-powered insights" },
    { icon: <CheckCircle className="h-5 w-5 text-green-600" />, text: "Beautiful, intuitive interface" },
    { icon: <CheckCircle className="h-5 w-5 text-green-600" />, text: "Real-time updates" },
    { icon: <CheckCircle className="h-5 w-5 text-green-600" />, text: "Expert-grade analytics" }
  ];

  const stats = [
    { value: "98%", label: "Feature Complete" },
    { value: "60+", label: "Powerful Features" },
    { value: "100%", label: "Secure & Private" },
    { value: "24/7", label: "Account Monitoring" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                <CampfireLogo size="sm" className="text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                Ember
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/pricing')}
                className="text-gray-700 hover:text-amber-600"
              >
                Pricing
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-amber-600"
              >
                Log In
              </Button>
              <Button 
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8 animate-fadeIn">
              <div className="inline-block">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-900 text-sm font-medium border border-orange-200">
                  <Award className="h-4 w-4" />
                  Spark Your Financial Growth
                </span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Gather Around Your{' '}
                <span className="bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                  Financial Story
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Like kindling sparks a fire, Kindling ignites your financial journey. 
                Gather all your accounts, nurture your goals, and watch your wealth grow warm and bright.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-lg px-8 py-6 shadow-lg"
                >
                  Spark Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="text-lg px-8 py-6 border-2 border-orange-700 text-orange-900 hover:bg-orange-50"
                >
                  Return to the Fire
                </Button>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {benefit.icon}
                    <span className="text-sm text-gray-700">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-300 to-red-300 rounded-3xl blur-3xl opacity-15"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-stone-200">
                <div className="space-y-4">
                  {/* Mock Dashboard Cards */}
                  <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-6 text-white shadow-md">
                    <p className="text-sm opacity-90 mb-2">Your Financial Warmth</p>
                    <p className="text-4xl font-bold">$127,543.21</p>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Glowing +12.3% this month</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <p className="text-sm text-emerald-700 mb-1">Fuel In</p>
                      <p className="text-2xl font-bold text-emerald-600">$8,500</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                      <p className="text-sm text-rose-700 mb-1">Burn Rate</p>
                      <p className="text-2xl font-bold text-rose-600">$4,230</p>
                    </div>
                  </div>

                  {/* Mock Chart */}
                  <div className="bg-stone-50 rounded-lg p-4 h-40 flex items-end gap-2">
                    {[40, 60, 45, 70, 55, 80, 65].map((height, idx) => (
                      <div 
                        key={idx} 
                        className="flex-1 bg-gradient-to-t from-orange-500 to-red-500 rounded-t opacity-90"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-amber-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-amber-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-orange-50 to-stone-50 border-y border-stone-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything to Keep Your{' '}
              <span className="bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
                Fire Burning Bright
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cozy tools that bring warmth to your financial life
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="group bg-white rounded-2xl p-8 border border-stone-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-105 transition-transform shadow-md">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-700 via-red-700 to-orange-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Kindle Your Financial Future?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join the circle. Watch your wealth grow warm and steady, like embers building to a flame.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-orange-900 hover:bg-orange-50 text-lg px-8 py-6 shadow-xl"
            >
              Light the First Spark
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6"
            >
              Return to Your Fire
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <CampfireLogo size="sm" className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">Kindling</span>
            </div>
            <div className="text-sm">
              © 2025 Kindling. Built with ❤️ for better financial futures.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
