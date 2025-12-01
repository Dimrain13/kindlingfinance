import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Portfolio from './pages/Portfolio';
import CashFlow from './pages/CashFlow';
import Insights from './pages/Insights';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Subscriptions from './pages/Subscriptions';
import TransactionRules from './pages/TransactionRules';
import TagsManager from './pages/TagsManager';
import RetirementPlanner from './pages/RetirementPlanner';
import Alerts from './pages/Alerts';
import BudgetTemplates from './pages/BudgetTemplates';
import SpendingForecast from './pages/SpendingForecast';
import DebtPayoff from './pages/DebtPayoff';
import Analytics from './pages/Analytics';
import AnalyticsEnhanced from './pages/AnalyticsEnhanced';
import PlanningTools from './pages/PlanningTools';
import Pricing from './pages/Pricing';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import FinancialHealth from './pages/FinancialHealth';
import './App.css';
import './styles/modern.css';
import './styles/pages.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route index element={<LandingPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><Layout><Accounts /></Layout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
          <Route path="/budgets" element={<ProtectedRoute><Layout><Budgets /></Layout></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><Layout><Goals /></Layout></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Layout><Portfolio /></Layout></ProtectedRoute>} />
          <Route path="/cashflow" element={<ProtectedRoute><Layout><CashFlow /></Layout></ProtectedRoute>} />
          <Route path="/subscriptions" element={<ProtectedRoute><Layout><Subscriptions /></Layout></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Layout><Insights /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="/transaction-rules" element={<ProtectedRoute><Layout><TransactionRules /></Layout></ProtectedRoute>} />
          <Route path="/tags" element={<ProtectedRoute><Layout><TagsManager /></Layout></ProtectedRoute>} />
          <Route path="/budget-templates" element={<ProtectedRoute><Layout><BudgetTemplates /></Layout></ProtectedRoute>} />
          <Route path="/debt-payoff" element={<ProtectedRoute><Layout><DebtPayoff /></Layout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Layout><AnalyticsEnhanced /></Layout></ProtectedRoute>} />
          <Route path="/planning" element={<ProtectedRoute><Layout><PlanningTools /></Layout></ProtectedRoute>} />
          
          {/* Redirects for old routes */}
          <Route path="/reports" element={<Navigate to="/analytics?tab=trends" replace />} />
          <Route path="/retirement" element={<Navigate to="/planning?tab=retirement" replace />} />
          <Route path="/forecast" element={<Navigate to="/planning?tab=forecast" replace />} />
          <Route path="/alerts" element={<Navigate to="/settings" replace />} />
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
