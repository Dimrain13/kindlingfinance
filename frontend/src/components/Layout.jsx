import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import AlertsWidget from './AlertsWidget';
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  PiggyBank, 
  Calendar, 
  Lightbulb, 
  TrendingUp,
  Settings,
  LogOut,
  DollarSign,
  Briefcase,
  Activity,
  RefreshCw,
  Filter,
  Tag,
  BarChart3,
  Target,
  Bell,
  LineChart,
  CreditCard,
  Menu,
  X
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Wallet, label: 'Accounts' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/budgets', icon: PiggyBank, label: 'Budgets' },
    { path: '/goals', icon: Calendar, label: 'Goals' },
    { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/cashflow', icon: Activity, label: 'Cash Flow' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics & Reports' },
    { path: '/planning', icon: Target, label: 'Planning Tools' },
    { path: '/insights', icon: Lightbulb, label: 'AI Insights' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-kindling-fire via-kindling-blaze to-kindling-spark flex items-center justify-center shadow-lg">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C12 2 10 5 10 7.5C10 9.43 11.34 11 13 11C14.66 11 16 9.43 16 7.5C16 5 14 2 14 2C14 2 13 4 12.5 5.5C12.5 5.5 12 3.5 12 2Z" opacity="0.9"/>
                <path d="M8 10C8 10 6.5 12 6.5 13.5C6.5 14.88 7.62 16 9 16C10.38 16 11.5 14.88 11.5 13.5C11.5 12 10 10 10 10C10 10 9 11.5 8.5 12.5C8.5 12.5 8 11 8 10Z" opacity="0.8"/>
                <path d="M16 10C16 10 14.5 12 14.5 13.5C14.5 14.88 15.62 16 17 16C18.38 16 19.5 14.88 19.5 13.5C19.5 12 18 10 18 10C18 10 17 11.5 16.5 12.5C16.5 12.5 16 11 16 10Z" opacity="0.8"/>
                <rect x="4" y="18" width="16" height="2" rx="1" opacity="0.7"/>
                <rect x="6" y="20" width="12" height="2" rx="1" opacity="0.6"/>
              </svg>
            </div>
            <h1 className="text-base font-bold bg-gradient-to-r from-kindling-fire via-kindling-berry to-kindling-plum bg-clip-text text-transparent">
              Kindling Financial
            </h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <Menu className="h-6 w-6 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Cozy Campfire Theme */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 cozy-sidebar flex flex-col shadow-lg
        transform transition-transform duration-300 ease-in-out
        lg:transform-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-kindling-fire to-kindling-blaze flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                {/* Campfire icon - logs and flames */}
                <path d="M12 2C12 2 10 5 10 7.5C10 9.43 11.34 11 13 11C14.66 11 16 9.43 16 7.5C16 5 14 2 14 2C14 2 13 4 12.5 5.5C12.5 5.5 12 3.5 12 2Z" opacity="0.9"/>
                <path d="M8 10C8 10 6.5 12 6.5 13.5C6.5 14.88 7.62 16 9 16C10.38 16 11.5 14.88 11.5 13.5C11.5 12 10 10 10 10C10 10 9 11.5 8.5 12.5C8.5 12.5 8 11 8 10Z" opacity="0.8"/>
                <path d="M16 10C16 10 14.5 12 14.5 13.5C14.5 14.88 15.62 16 17 16C18.38 16 19.5 14.88 19.5 13.5C19.5 12 18 10 18 10C18 10 17 11.5 16.5 12.5C16.5 12.5 16 11 16 10Z" opacity="0.8"/>
                {/* Logs at bottom */}
                <rect x="4" y="18" width="16" height="2" rx="1" opacity="0.7"/>
                <rect x="6" y="20" width="12" height="2" rx="1" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-kindling-fire to-kindling-blaze bg-clip-text text-transparent">Kindling Financial</h1>
              <p className="text-xs text-gray-500">Spark Your Growth</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 font-medium border-l-4 border-kindling-blaze'
                    : 'text-gray-700 hover:bg-amber-50/50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon 
                    size={20} 
                    className={`transition-colors ${isActive ? 'text-kindling-fire' : 'text-gray-400 group-hover:text-kindling-fire'}`}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* Sign Out Button */}
        <div className="p-3 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            onClick={logout}
          >
            <LogOut size={20} className="mr-3 text-gray-400" />
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 main-content-wrapper pt-14 lg:pt-0">
        {/* Top Header with Alerts - Hidden on mobile to save space */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-3 items-center justify-end shadow-sm">
          <AlertsWidget />
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
