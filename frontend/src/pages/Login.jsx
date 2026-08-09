import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Lock, Mail, ArrowLeft, Zap } from 'lucide-react';
import CampfireLogo from '../components/CampfireLogo';

const GOOGLE_CLIENT_ID = '9671176760-ddv79e4fbsl8tht1i2m15ga1pdobna5t.apps.googleusercontent.com';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const { login, googleLogin, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  // Initialize Google OAuth client
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !window.google.accounts) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });
        window.google.accounts.id.prompt(); // show One Tap if available
        setGoogleReady(true);
      } catch (e) {
        console.error('Google init error:', e);
      }
    };

    if (!document.querySelector('script[src*="gsi/client"]')) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = initGoogle;
      document.head.appendChild(s);
    } else {
      initGoogle();
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setGoogleLoading(true);
    setError('');
    const result = await googleLogin(response.credential);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!window.google) {
      setError('Google Sign-In not loaded. Please refresh.');
      return;
    }
    // Force One Tap prompt to show as a sign-in dialog
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError('Google sign-in was cancelled or not available. Try email login.');
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center text-gray-700 hover:text-kindling-fire transition-colors">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Back to Home</span>
            </button>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/pricing')} className="text-gray-700 hover:text-kindling-fire">Pricing</Button>
              <Button onClick={() => navigate('/register')} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">Sign Up</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-700 via-red-700 to-orange-900 p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative z-10 flex flex-col justify-center max-w-md">
            <div className="mb-8">
              <CampfireLogo size="xl" className="mb-4" />
              <h1 className="text-5xl font-bold mb-4">Kindling Financial</h1>
              <p className="text-xl text-orange-100">Keep your finances glowing</p>
            </div>
            <div className="space-y-6 mt-12">
              <div className="flex items-start space-x-4"><div className="bg-white bg-opacity-20 p-3 rounded-lg"><TrendingUp className="h-6 w-6" /></div><div><h3 className="font-semibold text-lg">Track Everything</h3><p className="text-amber-100">Connect your accounts and see your complete financial picture</p></div></div>
              <div className="flex items-start space-x-4"><div className="bg-white bg-opacity-20 p-3 rounded-lg"><Zap className="h-6 w-6" /></div><div><h3 className="font-semibold text-lg">AI-Powered Insights</h3><p className="text-amber-100">Get personalized recommendations to save money and optimize spending</p></div></div>
              <div className="flex items-start space-x-4"><div className="bg-white bg-opacity-20 p-3 rounded-lg"><Lock className="h-6 w-6" /></div><div><h3 className="font-semibold text-lg">Bank-Level Security</h3><p className="text-amber-100">Your data is encrypted and protected</p></div></div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="space-y-1 pb-8">
              <div className="flex justify-center mb-4 lg:hidden"><CampfireLogo size="lg" className="text-kindling-fire" /></div>
              <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">Welcome Back</CardTitle>
              <CardDescription className="text-center text-base">Sign in to your financial dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">{error}</div>}
                <div className="space-y-2"><label className="text-sm font-semibold text-gray-700">Email Address</label><div className="relative"><Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" /><Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12" required /></div></div>
                <div className="space-y-2"><label className="text-sm font-semibold text-gray-700">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" /><Input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-12" required /></div></div>
                <Button type="submit" className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg" disabled={loading || googleLoading}>
                  {loading ? <span className="flex items-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Signing in...</span> : 'Sign In'}
                </Button>
              </form>
              {googleLoading && <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-lg text-sm text-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-kindling-fire mx-auto mb-2"></div>Completing Google Sign-In...</div>}
              <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span></div></div>
              <Button type="button" onClick={handleGoogleSignIn} disabled={loading || googleLoading || !googleReady} className="w-full h-12 bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 shadow-md disabled:opacity-50">
                {!googleReady ? <span className="flex items-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-2"></div>Loading...</span> : <><svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Sign in with Google</>}
              </Button>
              <div className="mt-6 text-center"><p className="text-sm text-gray-600">Don't have an account? <Link to="/register" className="font-semibold text-kindling-fire hover:text-blue-700">Sign up for free</Link></p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
