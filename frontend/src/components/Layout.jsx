import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  PiggyBank, 
  Calendar, 
  Lightbulb, 
  TrendingUp,
  LogOut,
  DollarSign
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Wallet, label: 'Accounts' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/budgets', icon: PiggyBank, label: 'Budgets' },
    { path: '/bills', icon: Calendar, label: 'Bills' },
    { path: '/insights', icon: Lightbulb, label: 'AI Insights' },
    { path: '/reports', icon: TrendingUp, label: 'Reports' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-600 to-indigo-700 text-white shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white border-opacity-20">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8" />
            <h1 className="text-2xl font-bold">FinanceHub</h1>
          </div>
          <p className="text-sm text-blue-100 mt-2">{user?.name}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white border-opacity-20">
          <Button
            variant="ghost"
            className="w-full justify-start text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white"
            onClick={logout}
          >
            <LogOut size={20} className="mr-3" />
            <span className="font-semibold">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;
