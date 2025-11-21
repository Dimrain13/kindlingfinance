import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { DollarSign, TrendingUp, Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
        
        <div className="relative z-10 flex flex-col justify-center max-w-md">
          <div className="mb-8">
            <DollarSign className="h-16 w-16 mb-4" />
            <h1 className="text-5xl font-bold mb-4">FinanceHub</h1>
            <p className="text-xl text-blue-100">Your complete financial management solution</p>
          </div>
          
          <div className="space-y-6 mt-12">
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Track Everything</h3>
                <p className="text-blue-100">Connect all your accounts and see your complete financial picture</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI-Powered Insights</h3>
                <p className="text-blue-100">Get personalized recommendations to save money and optimize spending</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Bank-Level Security</h3>
                <p className="text-blue-100">Your data is encrypted and protected with industry-standard security</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-8">
            <div className="flex justify-center mb-4 lg:hidden">
              <DollarSign className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-base">
              Sign in to access your financial dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-center space-x-2">
                  <span className="font-medium">{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
