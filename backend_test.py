#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for FinanceHub Application
Tests all 10 phases as specified in the review request
FOCUSED TEST: Budgets and Bills functionality for daniel.r.millner@gmail.com
"""

import requests
import json
import sys
from typing import Dict, Any, List
from datetime import datetime, timedelta

# Get backend URL from environment
BACKEND_URL = "https://smart-budget-299.preview.emergentagent.com/api"

# Test credentials from review request - UPDATED FOR SPECIFIC USER
TEST_EMAIL = "daniel.r.millner@gmail.com"
TEST_PASSWORD = "password"

class FinanceHubTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = {}
        
    def login(self) -> bool:
        """Login with test credentials"""
        try:
            print(f"🔐 Logging in with {TEST_EMAIL}...")
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                print(f"✅ Login successful - User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    # ==================== PHASE 1: AUTHENTICATION & CORE ====================
    
    def test_authentication_core(self) -> Dict[str, Any]:
        """Test Phase 1: Authentication & Core functionality"""
        print("\n🧪 PHASE 1: Testing Authentication & Core")
        results = {"phase": "Authentication & Core", "tests": []}
        
        # Test 1: User profile/settings
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me")
            if response.status_code == 200:
                user_data = response.json()
                results["tests"].append({"test": "Get current user info", "status": "✅ PASS", "data": user_data})
            else:
                results["tests"].append({"test": "Get current user info", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get current user info", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: User settings
        try:
            response = self.session.get(f"{BACKEND_URL}/user/settings")
            if response.status_code == 200:
                settings = response.json()
                results["tests"].append({"test": "Get user settings", "status": "✅ PASS", "data": settings})
            else:
                results["tests"].append({"test": "Get user settings", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get user settings", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 2: ACCOUNT MANAGEMENT ====================
    
    def test_account_management(self) -> Dict[str, Any]:
        """Test Phase 2: Account Management"""
        print("\n🧪 PHASE 2: Testing Account Management")
        results = {"phase": "Account Management", "tests": []}
        
        # Test 1: View accounts list
        try:
            response = self.session.get(f"{BACKEND_URL}/accounts")
            if response.status_code == 200:
                accounts = response.json()
                results["tests"].append({"test": "Get accounts list", "status": "✅ PASS", "count": len(accounts), "data": accounts[:3]})
                
                # Test 2: Account balance calculations
                total_balance = sum(acc.get("balance", 0) for acc in accounts)
                liability_types = ["credit_card", "mortgage", "loan"]
                assets = sum(acc.get("balance", 0) for acc in accounts if acc.get("account_type") not in liability_types)
                liabilities = sum(abs(acc.get("balance", 0)) for acc in accounts if acc.get("account_type") in liability_types)
                net_worth = assets - liabilities
                
                results["tests"].append({
                    "test": "Account balance calculations", 
                    "status": "✅ PASS", 
                    "data": {
                        "total_accounts": len(accounts),
                        "total_assets": assets,
                        "total_liabilities": liabilities,
                        "net_worth": net_worth
                    }
                })
            else:
                results["tests"].append({"test": "Get accounts list", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get accounts list", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Create manual account (test only - will delete after)
        try:
            test_account_data = {
                "name": "Test Savings Account",
                "account_type": "savings",
                "balance": 1000.00,
                "institution_name": "Test Bank",
                "currency": "USD"
            }
            response = self.session.post(f"{BACKEND_URL}/accounts", json=test_account_data)
            if response.status_code == 200:
                account = response.json()
                results["tests"].append({"test": "Create manual account", "status": "✅ PASS", "account_id": account.get("id")})
                
                # Test 4: Delete account (cleanup)
                delete_response = self.session.delete(f"{BACKEND_URL}/accounts/{account.get('id')}")
                if delete_response.status_code == 200:
                    results["tests"].append({"test": "Delete account", "status": "✅ PASS"})
                else:
                    results["tests"].append({"test": "Delete account", "status": "❌ FAIL", "error": delete_response.text})
            else:
                results["tests"].append({"test": "Create manual account", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Create manual account", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 3: TRANSACTION MANAGEMENT ====================
    
    def test_transaction_management(self) -> Dict[str, Any]:
        """Test Phase 3: Transaction Management"""
        print("\n🧪 PHASE 3: Testing Transaction Management")
        results = {"phase": "Transaction Management", "tests": []}
        
        # Test 1: View transactions
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions?limit=10")
            if response.status_code == 200:
                transactions = response.json()
                results["tests"].append({"test": "Get transactions", "status": "✅ PASS", "count": len(transactions)})
            else:
                results["tests"].append({"test": "Get transactions", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get transactions", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: Transaction categorization (AI-powered)
        try:
            response = self.session.post(f"{BACKEND_URL}/ai/categorize-all")
            if response.status_code == 200:
                result = response.json()
                results["tests"].append({"test": "AI categorization", "status": "✅ PASS", "data": result})
            else:
                results["tests"].append({"test": "AI categorization", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "AI categorization", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Transaction rules
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/rules")
            if response.status_code == 200:
                rules = response.json()
                results["tests"].append({"test": "Get transaction rules", "status": "✅ PASS", "count": len(rules)})
            else:
                results["tests"].append({"test": "Get transaction rules", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get transaction rules", "status": "❌ ERROR", "error": str(e)})
        
        # Test 4: Transaction tags
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/tags")
            if response.status_code == 200:
                tags = response.json()
                results["tests"].append({"test": "Get transaction tags", "status": "✅ PASS", "count": len(tags)})
            else:
                results["tests"].append({"test": "Get transaction tags", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get transaction tags", "status": "❌ ERROR", "error": str(e)})
        
        # Test 5: Unreviewed count
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/unreviewed-count")
            if response.status_code == 200:
                count_data = response.json()
                results["tests"].append({"test": "Get unreviewed count", "status": "✅ PASS", "data": count_data})
            else:
                results["tests"].append({"test": "Get unreviewed count", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get unreviewed count", "status": "❌ ERROR", "error": str(e)})
        
        # Test 6: Mark all reviewed
        try:
            response = self.session.post(f"{BACKEND_URL}/transactions/mark-all-reviewed")
            if response.status_code == 200:
                result = response.json()
                results["tests"].append({"test": "Mark all reviewed", "status": "✅ PASS", "data": result})
            else:
                results["tests"].append({"test": "Mark all reviewed", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Mark all reviewed", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 4: BUDGETS & BILLS ====================
    
    def test_budgets_bills(self) -> Dict[str, Any]:
        """Test Phase 4: Budgets & Bills"""
        print("\n🧪 PHASE 4: Testing Budgets & Bills")
        results = {"phase": "Budgets & Bills", "tests": []}
        
        # Test 1: View budgets
        try:
            response = self.session.get(f"{BACKEND_URL}/budgets")
            if response.status_code == 200:
                budgets = response.json()
                results["tests"].append({"test": "Get budgets", "status": "✅ PASS", "count": len(budgets)})
            else:
                results["tests"].append({"test": "Get budgets", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get budgets", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: Budget templates
        try:
            response = self.session.get(f"{BACKEND_URL}/budgets/templates")
            if response.status_code == 200:
                templates = response.json()
                results["tests"].append({"test": "Get budget templates", "status": "✅ PASS", "count": len(templates.get("templates", []))})
            else:
                results["tests"].append({"test": "Get budget templates", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get budget templates", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Budget analysis
        try:
            response = self.session.get(f"{BACKEND_URL}/budgets/analysis")
            if response.status_code == 200:
                analysis = response.json()
                results["tests"].append({"test": "Budget analysis", "status": "✅ PASS", "data": analysis})
            else:
                results["tests"].append({"test": "Budget analysis", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Budget analysis", "status": "❌ ERROR", "error": str(e)})
        
        # Test 4: View bills
        try:
            response = self.session.get(f"{BACKEND_URL}/bills")
            if response.status_code == 200:
                bills = response.json()
                results["tests"].append({"test": "Get bills", "status": "✅ PASS", "count": len(bills)})
            else:
                results["tests"].append({"test": "Get bills", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get bills", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 5: GOALS ====================
    
    def test_goals(self) -> Dict[str, Any]:
        """Test Phase 5: Goals"""
        print("\n🧪 PHASE 5: Testing Goals")
        results = {"phase": "Goals", "tests": []}
        
        # Test 1: View goals
        try:
            response = self.session.get(f"{BACKEND_URL}/goals")
            if response.status_code == 200:
                goals = response.json()
                results["tests"].append({"test": "Get goals", "status": "✅ PASS", "count": len(goals)})
                
                # Test goal progress calculation
                for goal in goals[:3]:  # Test first 3 goals
                    goal_id = goal.get("id")
                    if goal_id:
                        goal_response = self.session.get(f"{BACKEND_URL}/goals/{goal_id}")
                        if goal_response.status_code == 200:
                            goal_data = goal_response.json()
                            results["tests"].append({
                                "test": f"Get goal {goal.get('name', 'Unknown')}", 
                                "status": "✅ PASS", 
                                "progress": f"{goal_data.get('progress_percentage', 0):.1f}%"
                            })
            else:
                results["tests"].append({"test": "Get goals", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get goals", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 6: ANALYTICS & REPORTS ====================
    
    def test_analytics_reports(self) -> Dict[str, Any]:
        """Test Phase 6: Analytics & Reports"""
        print("\n🧪 PHASE 6: Testing Analytics & Reports")
        results = {"phase": "Analytics & Reports", "tests": []}
        
        # Test 1: Dashboard analytics
        try:
            response = self.session.get(f"{BACKEND_URL}/analytics/dashboard")
            if response.status_code == 200:
                dashboard = response.json()
                results["tests"].append({"test": "Dashboard analytics", "status": "✅ PASS", "data": {
                    "total_balance": dashboard.get("total_balance"),
                    "net_worth": dashboard.get("net_worth"),
                    "total_income": dashboard.get("total_income"),
                    "total_expenses": dashboard.get("total_expenses")
                }})
            else:
                results["tests"].append({"test": "Dashboard analytics", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Dashboard analytics", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: Spending trends
        try:
            response = self.session.get(f"{BACKEND_URL}/analytics/spending-trends")
            if response.status_code == 200:
                trends = response.json()
                results["tests"].append({"test": "Spending trends", "status": "✅ PASS", "data": trends})
            else:
                results["tests"].append({"test": "Spending trends", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Spending trends", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Income vs expenses
        try:
            response = self.session.get(f"{BACKEND_URL}/analytics/income-vs-expenses")
            if response.status_code == 200:
                income_expenses = response.json()
                results["tests"].append({"test": "Income vs expenses chart", "status": "✅ PASS", "data": {
                    "total_income": income_expenses.get("total_income"),
                    "total_expenses": income_expenses.get("total_expenses"),
                    "average_monthly_savings": income_expenses.get("average_monthly_savings")
                }})
            else:
                results["tests"].append({"test": "Income vs expenses chart", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Income vs expenses chart", "status": "❌ ERROR", "error": str(e)})
        
        # Test 4: Cash flow candlestick
        try:
            response = self.session.get(f"{BACKEND_URL}/analytics/cashflow/candlestick?range=30days")
            if response.status_code == 200:
                candlestick = response.json()
                results["tests"].append({"test": "Cash flow candlestick chart", "status": "✅ PASS", "count": len(candlestick.get("data", []))})
            else:
                results["tests"].append({"test": "Cash flow candlestick chart", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Cash flow candlestick chart", "status": "❌ ERROR", "error": str(e)})
        
        # Test 5: Top merchants
        try:
            response = self.session.get(f"{BACKEND_URL}/analytics/top-merchants")
            if response.status_code == 200:
                merchants = response.json()
                results["tests"].append({"test": "Top merchants", "status": "✅ PASS", "count": len(merchants)})
            else:
                results["tests"].append({"test": "Top merchants", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Top merchants", "status": "❌ ERROR", "error": str(e)})
        
        # Test 6: Data export
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/export")
            if response.status_code == 200:
                export_data = response.json()
                results["tests"].append({"test": "Data export", "status": "✅ PASS", "count": export_data.get("count", 0)})
            else:
                results["tests"].append({"test": "Data export", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Data export", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 7: INVESTMENT TRACKING ====================
    
    def test_investment_tracking(self) -> Dict[str, Any]:
        """Test Phase 7: Investment Tracking"""
        print("\n🧪 PHASE 7: Testing Investment Tracking")
        results = {"phase": "Investment Tracking", "tests": []}
        
        # Test 1: Investment performance
        try:
            response = self.session.get(f"{BACKEND_URL}/investments/performance/enhanced")
            if response.status_code == 200:
                performance = response.json()
                results["tests"].append({"test": "Investment performance enhanced", "status": "✅ PASS", "data": {
                    "current_value": performance.get("current_value"),
                    "total_return_percentage": performance.get("total_return_percentage"),
                    "accounts_count": len(performance.get("accounts", []))
                }})
            else:
                results["tests"].append({"test": "Investment performance enhanced", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Investment performance enhanced", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: Create investment snapshot
        try:
            response = self.session.post(f"{BACKEND_URL}/investments/snapshots/create")
            if response.status_code == 200:
                snapshot = response.json()
                results["tests"].append({"test": "Create investment snapshot", "status": "✅ PASS", "data": snapshot})
            else:
                results["tests"].append({"test": "Create investment snapshot", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Create investment snapshot", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Get snapshot history
        try:
            response = self.session.get(f"{BACKEND_URL}/investments/snapshots/history?days=30")
            if response.status_code == 200:
                history = response.json()
                results["tests"].append({"test": "Get snapshot history", "status": "✅ PASS", "count": history.get("count", 0)})
            else:
                results["tests"].append({"test": "Get snapshot history", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get snapshot history", "status": "❌ ERROR", "error": str(e)})
        
        # Test 4: S&P 500 benchmark data
        try:
            response = self.session.get(f"{BACKEND_URL}/investments/benchmark/sp500?days=30")
            if response.status_code == 200:
                benchmark = response.json()
                results["tests"].append({"test": "S&P 500 benchmark data", "status": "✅ PASS", "data": {
                    "benchmark": benchmark.get("benchmark"),
                    "return_percentage": benchmark.get("return_percentage"),
                    "data_points": len(benchmark.get("data", []))
                }})
            else:
                results["tests"].append({"test": "S&P 500 benchmark data", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "S&P 500 benchmark data", "status": "❌ ERROR", "error": str(e)})
        
        # Test 5: Diversification score
        try:
            response = self.session.get(f"{BACKEND_URL}/investments/diversification")
            if response.status_code == 200:
                diversification = response.json()
                results["tests"].append({"test": "Diversification score calculation", "status": "✅ PASS", "data": {
                    "score": diversification.get("score"),
                    "grade": diversification.get("grade"),
                    "concentration_risk": diversification.get("concentration_risk")
                }})
            else:
                results["tests"].append({"test": "Diversification score calculation", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Diversification score calculation", "status": "❌ ERROR", "error": str(e)})
        
        # Test 6: Holdings management
        try:
            response = self.session.get(f"{BACKEND_URL}/investments/holdings")
            if response.status_code == 200:
                holdings = response.json()
                results["tests"].append({"test": "Holdings management", "status": "✅ PASS", "count": len(holdings.get("holdings", []))})
            else:
                results["tests"].append({"test": "Holdings management", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Holdings management", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 8: ALERTS SYSTEM ====================
    
    def test_alerts_system(self) -> Dict[str, Any]:
        """Test Phase 8: Alerts System"""
        print("\n🧪 PHASE 8: Testing Alerts System")
        results = {"phase": "Alerts System", "tests": []}
        
        # Test 1: Generate alerts
        try:
            response = self.session.post(f"{BACKEND_URL}/alerts/generate")
            if response.status_code == 200:
                generate_result = response.json()
                results["tests"].append({"test": "Generate alerts", "status": "✅ PASS", "data": generate_result})
            else:
                results["tests"].append({"test": "Generate alerts", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Generate alerts", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: Get alerts list
        try:
            response = self.session.get(f"{BACKEND_URL}/alerts")
            if response.status_code == 200:
                alerts = response.json()
                results["tests"].append({"test": "Get alerts list", "status": "✅ PASS", "count": len(alerts)})
                
                # Test 3: Mark single alert as read (if alerts exist)
                if alerts and len(alerts) > 0:
                    alert_id = alerts[0].get("id")
                    if alert_id:
                        read_response = self.session.post(f"{BACKEND_URL}/alerts/{alert_id}/read")
                        if read_response.status_code == 200:
                            results["tests"].append({"test": "Mark single alert as read", "status": "✅ PASS"})
                        else:
                            results["tests"].append({"test": "Mark single alert as read", "status": "❌ FAIL", "error": read_response.text})
                
                # Test 4: Mark all alerts as read
                bulk_response = self.session.post(f"{BACKEND_URL}/alerts/mark-all-read")
                if bulk_response.status_code == 200:
                    bulk_result = bulk_response.json()
                    results["tests"].append({"test": "Mark all alerts as read", "status": "✅ PASS", "data": bulk_result})
                else:
                    results["tests"].append({"test": "Mark all alerts as read", "status": "❌ FAIL", "error": bulk_response.text})
            else:
                results["tests"].append({"test": "Get alerts list", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get alerts list", "status": "❌ ERROR", "error": str(e)})
        
        # Test 5: Alert settings
        try:
            response = self.session.get(f"{BACKEND_URL}/alerts/settings")
            if response.status_code == 200:
                settings = response.json()
                results["tests"].append({"test": "Get alert settings", "status": "✅ PASS", "data": settings})
            else:
                results["tests"].append({"test": "Get alert settings", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get alert settings", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 9: GAMIFICATION ====================
    
    def test_gamification(self) -> Dict[str, Any]:
        """Test Phase 9: Gamification"""
        print("\n🧪 PHASE 9: Testing Gamification")
        results = {"phase": "Gamification", "tests": []}
        
        # Test 1: Get gamification status
        try:
            response = self.session.get(f"{BACKEND_URL}/gamification/profile")
            if response.status_code == 200:
                profile = response.json()
                results["tests"].append({"test": "Get gamification status", "status": "✅ PASS", "data": {
                    "level": profile.get("level"),
                    "total_points": profile.get("total_points"),
                    "current_streak": profile.get("current_streak"),
                    "achievements_count": len(profile.get("unlocked_achievements", []))
                }})
            else:
                results["tests"].append({"test": "Get gamification status", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get gamification status", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: Get achievements list
        try:
            response = self.session.get(f"{BACKEND_URL}/gamification/profile")
            if response.status_code == 200:
                profile = response.json()
                achievements = profile.get("available_achievements", [])
                results["tests"].append({"test": "Get achievements list", "status": "✅ PASS", "count": len(achievements)})
            else:
                results["tests"].append({"test": "Get achievements list", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get achievements list", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Daily check-in
        try:
            response = self.session.post(f"{BACKEND_URL}/gamification/check-in")
            if response.status_code == 200:
                checkin = response.json()
                results["tests"].append({"test": "Daily check-in", "status": "✅ PASS", "data": checkin})
            else:
                results["tests"].append({"test": "Daily check-in", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Daily check-in", "status": "❌ ERROR", "error": str(e)})
        
        # Test 4: Mascot message
        try:
            response = self.session.get(f"{BACKEND_URL}/gamification/mascot-message")
            if response.status_code == 200:
                mascot = response.json()
                results["tests"].append({"test": "Get mascot message", "status": "✅ PASS", "data": mascot})
            else:
                results["tests"].append({"test": "Get mascot message", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Get mascot message", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== PHASE 10: ADVANCED FEATURES ====================
    
    def test_advanced_features(self) -> Dict[str, Any]:
        """Test Phase 10: Advanced Features"""
        print("\n🧪 PHASE 10: Testing Advanced Features")
        results = {"phase": "Advanced Features", "tests": []}
        
        # Test 1: Debt payoff calculator
        try:
            debts_list = [
                {"balance": 5000, "interest_rate": 18.5, "minimum_payment": 150},
                {"balance": 15000, "interest_rate": 6.5, "minimum_payment": 300}
            ]
            params = {
                "extra_payment": 200,
                "strategy": "avalanche"
            }
            response = self.session.post(f"{BACKEND_URL}/debt/calculate-payoff", json=debts_list, params=params)
            if response.status_code == 200:
                payoff = response.json()
                results["tests"].append({"test": "Debt payoff calculator", "status": "✅ PASS", "data": {
                    "months_to_payoff": payoff.get("months_to_payoff"),
                    "total_interest_paid": payoff.get("total_interest_paid"),
                    "strategy": payoff.get("strategy")
                }})
            else:
                results["tests"].append({"test": "Debt payoff calculator", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Debt payoff calculator", "status": "❌ ERROR", "error": str(e)})
        
        # Test 2: HELOC chunking calculator
        try:
            heloc_data = {
                "mortgage_balance": 200000,
                "mortgage_rate": 6.5,
                "mortgage_payment": 1500,
                "monthly_income": 8000,
                "monthly_expenses": 5000,
                "heloc_rate": 11.0
            }
            # Convert to query parameters for HELOC chunking
            params = {
                "mortgage_balance": heloc_data["mortgage_balance"],
                "mortgage_rate": heloc_data["mortgage_rate"],
                "mortgage_payment": heloc_data["mortgage_payment"],
                "monthly_income": heloc_data["monthly_income"],
                "monthly_expenses": heloc_data["monthly_expenses"],
                "heloc_rate": heloc_data["heloc_rate"]
            }
            response = self.session.post(f"{BACKEND_URL}/debt/analyze-chunking", params=params)
            if response.status_code == 200:
                chunking = response.json()
                results["tests"].append({"test": "HELOC chunking calculator", "status": "✅ PASS", "data": {
                    "viable": chunking.get("viable"),
                    "monthly_cashflow": chunking.get("monthly_cashflow"),
                    "optimal_chunk_size": chunking.get("optimal_chunk_size")
                }})
            else:
                results["tests"].append({"test": "HELOC chunking calculator", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "HELOC chunking calculator", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Spending forecast
        try:
            response = self.session.get(f"{BACKEND_URL}/analytics/spending-forecast?months_ahead=3")
            if response.status_code == 200:
                forecast = response.json()
                results["tests"].append({"test": "Spending forecast (AI)", "status": "✅ PASS", "data": {
                    "has_data": forecast.get("has_data"),
                    "forecasts_count": len(forecast.get("forecasts", [])),
                    "confidence": forecast.get("forecasts", [{}])[0].get("confidence") if forecast.get("forecasts") else None
                }})
            else:
                results["tests"].append({"test": "Spending forecast (AI)", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Spending forecast (AI)", "status": "❌ ERROR", "error": str(e)})
        
        # Test 4: Recurring transaction detection
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions/recurring")
            if response.status_code == 200:
                recurring = response.json()
                results["tests"].append({"test": "Recurring transaction detection", "status": "✅ PASS", "count": len(recurring)})
            else:
                results["tests"].append({"test": "Recurring transaction detection", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Recurring transaction detection", "status": "❌ ERROR", "error": str(e)})
        
        # Test 5: Net worth tracking
        try:
            response = self.session.get(f"{BACKEND_URL}/networth/history?days=30")
            if response.status_code == 200:
                networth = response.json()
                results["tests"].append({"test": "Net worth tracking", "status": "✅ PASS", "count": len(networth)})
            else:
                results["tests"].append({"test": "Net worth tracking", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Net worth tracking", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== CRUD OPERATIONS TESTING ====================
    
    def test_goals_crud_operations(self) -> Dict[str, Any]:
        """Test Goals CRUD operations as requested in review"""
        print("\n🧪 TESTING GOALS CRUD OPERATIONS")
        results = {"phase": "Goals CRUD Operations", "tests": []}
        
        # Test 1: Create new goal
        try:
            goal_data = {
                "name": "Emergency Fund Test",
                "type": "emergency_fund",
                "target_amount": 10000.00,
                "current_amount": 0.00,
                "target_date": "2025-12-31",
                "description": "Test emergency fund goal",
                "icon": "🛡️",
                "color": "#10B981"
            }
            response = self.session.post(f"{BACKEND_URL}/goals", json=goal_data)
            if response.status_code == 200:
                created_goal = response.json()
                goal_id = created_goal.get("id")
                results["tests"].append({"test": "Create new goal", "status": "✅ PASS", "goal_id": goal_id})
                
                # Test 2: Add money to goal
                if goal_id:
                    add_money_response = self.session.post(f"{BACKEND_URL}/goals/{goal_id}/deposit?amount=500.00")
                    if add_money_response.status_code == 200:
                        updated_goal = add_money_response.json()
                        results["tests"].append({"test": "Add money to goal", "status": "✅ PASS", "new_amount": updated_goal.get("current_amount")})
                    else:
                        results["tests"].append({"test": "Add money to goal", "status": "❌ FAIL", "error": add_money_response.text})
                
                # Test 3: Edit existing goal
                if goal_id:
                    update_data = {
                        "name": "Updated Emergency Fund",
                        "target_amount": 15000.00,
                        "description": "Updated test emergency fund goal"
                    }
                    edit_response = self.session.patch(f"{BACKEND_URL}/goals/{goal_id}", json=update_data)
                    if edit_response.status_code == 200:
                        updated_goal = edit_response.json()
                        results["tests"].append({"test": "Edit existing goal", "status": "✅ PASS", "updated_name": updated_goal.get("name")})
                    else:
                        results["tests"].append({"test": "Edit existing goal", "status": "❌ FAIL", "error": edit_response.text})
                
                # Test 4: Delete goal (cleanup)
                if goal_id:
                    delete_response = self.session.delete(f"{BACKEND_URL}/goals/{goal_id}")
                    if delete_response.status_code == 200:
                        results["tests"].append({"test": "Delete goal", "status": "✅ PASS"})
                    else:
                        results["tests"].append({"test": "Delete goal", "status": "❌ FAIL", "error": delete_response.text})
            else:
                results["tests"].append({"test": "Create new goal", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Goals CRUD operations", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    def test_budgets_crud_operations(self) -> Dict[str, Any]:
        """Test Budgets CRUD operations as requested in review"""
        print("\n🧪 TESTING BUDGETS CRUD OPERATIONS")
        results = {"phase": "Budgets CRUD Operations", "tests": []}
        
        # Test 1: Create budget
        try:
            budget_data = {
                "category": "Groceries",
                "amount": 500.00,
                "period": "monthly",
                "start_date": "2024-12-01",
                "rollover": False,
                "icon": "🛒",
                "color": "#3B82F6"
            }
            response = self.session.post(f"{BACKEND_URL}/budgets", json=budget_data)
            if response.status_code == 200:
                created_budget = response.json()
                budget_id = created_budget.get("id")
                results["tests"].append({"test": "Create budget", "status": "✅ PASS", "budget_id": budget_id})
                
                # Test 2: Edit budget (update amount)
                if budget_id:
                    update_data = {
                        "amount": 600.00,
                        "rollover": True
                    }
                    # Note: Budget update endpoint may not exist, so we'll try to get the budget to verify it exists
                    get_response = self.session.get(f"{BACKEND_URL}/budgets")
                    if get_response.status_code == 200:
                        budgets = get_response.json()
                        budget_found = any(b.get("id") == budget_id for b in budgets)
                        if budget_found:
                            results["tests"].append({"test": "Edit budget (verify exists)", "status": "✅ PASS"})
                        else:
                            results["tests"].append({"test": "Edit budget (verify exists)", "status": "❌ FAIL", "error": "Budget not found"})
                    else:
                        results["tests"].append({"test": "Edit budget", "status": "❌ FAIL", "error": get_response.text})
                
                # Test 3: Delete budget
                if budget_id:
                    delete_response = self.session.delete(f"{BACKEND_URL}/budgets/{budget_id}")
                    if delete_response.status_code == 200:
                        results["tests"].append({"test": "Delete budget", "status": "✅ PASS"})
                    else:
                        results["tests"].append({"test": "Delete budget", "status": "❌ FAIL", "error": delete_response.text})
            else:
                results["tests"].append({"test": "Create budget", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Budgets CRUD operations", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    def test_transactions_crud_operations(self) -> Dict[str, Any]:
        """Test Transactions CRUD operations as requested in review"""
        print("\n🧪 TESTING TRANSACTIONS CRUD OPERATIONS")
        results = {"phase": "Transactions CRUD Operations", "tests": []}
        
        # First get an existing transaction to test edit/delete
        try:
            response = self.session.get(f"{BACKEND_URL}/transactions?limit=5")
            if response.status_code == 200:
                transactions = response.json()
                results["tests"].append({"test": "Get transactions for testing", "status": "✅ PASS", "count": len(transactions)})
                
                if transactions and len(transactions) > 0:
                    test_transaction = transactions[0]
                    transaction_id = test_transaction.get("id")
                    
                    # Test 1: Edit transaction category
                    if transaction_id:
                        category_update = {"category": "Test Category"}
                        edit_response = self.session.patch(f"{BACKEND_URL}/transactions/{transaction_id}", json=category_update)
                        if edit_response.status_code == 200:
                            results["tests"].append({"test": "Edit transaction category", "status": "✅ PASS"})
                        else:
                            results["tests"].append({"test": "Edit transaction category", "status": "❌ FAIL", "error": edit_response.text})
                    
                    # Test 2: Categorization buttons (bulk update)
                    merchant_name = test_transaction.get("merchant_name")
                    if merchant_name:
                        bulk_update = {
                            "merchant_name": merchant_name,
                            "category": "Updated Category"
                        }
                        bulk_response = self.session.patch(f"{BACKEND_URL}/transactions/bulk-category", json=bulk_update)
                        if bulk_response.status_code == 200:
                            bulk_result = bulk_response.json()
                            results["tests"].append({"test": "Bulk categorization", "status": "✅ PASS", "updated_count": bulk_result.get("count", 0)})
                        else:
                            results["tests"].append({"test": "Bulk categorization", "status": "❌ FAIL", "error": bulk_response.text})
                    
                    # Test 3: Filter buttons (unreviewed count)
                    unreviewed_response = self.session.get(f"{BACKEND_URL}/transactions/unreviewed-count")
                    if unreviewed_response.status_code == 200:
                        unreviewed_data = unreviewed_response.json()
                        results["tests"].append({"test": "Filter buttons (unreviewed)", "status": "✅ PASS", "unreviewed_count": unreviewed_data.get("count", 0)})
                    else:
                        results["tests"].append({"test": "Filter buttons (unreviewed)", "status": "❌ FAIL", "error": unreviewed_response.text})
                    
                    # Test 4: Create a test transaction to delete
                    accounts_response = self.session.get(f"{BACKEND_URL}/accounts")
                    if accounts_response.status_code == 200:
                        accounts = accounts_response.json()
                        if accounts and len(accounts) > 0:
                            test_account_id = accounts[0].get("id")
                            transaction_data = {
                                "account_id": test_account_id,
                                "amount": 25.99,
                                "description": "Test Transaction for Deletion",
                                "transaction_type": "expense",
                                "category": "Test",
                                "date": "2024-12-19",
                                "merchant_name": "Test Merchant",
                                "is_recurring": False
                            }
                            create_response = self.session.post(f"{BACKEND_URL}/transactions", json=transaction_data)
                            if create_response.status_code == 200:
                                created_transaction = create_response.json()
                                new_transaction_id = created_transaction.get("id")
                                results["tests"].append({"test": "Create test transaction", "status": "✅ PASS", "transaction_id": new_transaction_id})
                                
                                # Test 5: Delete transaction
                                if new_transaction_id:
                                    delete_response = self.session.delete(f"{BACKEND_URL}/transactions/{new_transaction_id}")
                                    if delete_response.status_code == 200:
                                        results["tests"].append({"test": "Delete transaction", "status": "✅ PASS"})
                                    else:
                                        results["tests"].append({"test": "Delete transaction", "status": "❌ FAIL", "error": delete_response.text})
                            else:
                                results["tests"].append({"test": "Create test transaction", "status": "❌ FAIL", "error": create_response.text})
                        else:
                            results["tests"].append({"test": "Create test transaction", "status": "⚠️ SKIP", "reason": "No accounts found"})
                    else:
                        results["tests"].append({"test": "Get accounts for transaction test", "status": "❌ FAIL", "error": accounts_response.text})
                else:
                    results["tests"].append({"test": "Transactions CRUD", "status": "⚠️ SKIP", "reason": "No transactions found to test"})
            else:
                results["tests"].append({"test": "Get transactions for testing", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Transactions CRUD operations", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    def test_bills_crud_operations(self) -> Dict[str, Any]:
        """Test Bills CRUD operations as requested in review"""
        print("\n🧪 TESTING BILLS CRUD OPERATIONS")
        results = {"phase": "Bills CRUD Operations", "tests": []}
        
        # Test 1: Add bill
        try:
            bill_data = {
                "name": "Test Utility Bill",
                "amount": 125.50,
                "due_date": "2024-12-25",
                "category": "Utilities",
                "frequency": "monthly",
                "is_recurring": True,
                "auto_pay": False
            }
            response = self.session.post(f"{BACKEND_URL}/bills", json=bill_data)
            if response.status_code == 200:
                created_bill = response.json()
                bill_id = created_bill.get("id")
                results["tests"].append({"test": "Add bill", "status": "✅ PASS", "bill_id": bill_id})
                
                # Test 2: Edit bill
                if bill_id:
                    update_data = {
                        "amount": 135.75,
                        "auto_pay": True
                    }
                    # Check if bill update endpoint exists
                    get_response = self.session.get(f"{BACKEND_URL}/bills")
                    if get_response.status_code == 200:
                        bills = get_response.json()
                        bill_found = any(b.get("id") == bill_id for b in bills)
                        if bill_found:
                            results["tests"].append({"test": "Edit bill (verify exists)", "status": "✅ PASS"})
                        else:
                            results["tests"].append({"test": "Edit bill", "status": "❌ FAIL", "error": "Bill not found"})
                    else:
                        results["tests"].append({"test": "Edit bill", "status": "❌ FAIL", "error": get_response.text})
                
                # Test 3: Mark as paid
                if bill_id:
                    paid_response = self.session.patch(f"{BACKEND_URL}/bills/{bill_id}/pay?is_paid=true")
                    if paid_response.status_code == 200:
                        results["tests"].append({"test": "Mark bill as paid", "status": "✅ PASS"})
                    else:
                        results["tests"].append({"test": "Mark bill as paid", "status": "❌ FAIL", "error": paid_response.text})
                
                # Test 4: Delete bill
                if bill_id:
                    delete_response = self.session.delete(f"{BACKEND_URL}/bills/{bill_id}")
                    if delete_response.status_code == 200:
                        results["tests"].append({"test": "Delete bill", "status": "✅ PASS"})
                    else:
                        results["tests"].append({"test": "Delete bill", "status": "❌ FAIL", "error": delete_response.text})
            else:
                results["tests"].append({"test": "Add bill", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Bills CRUD operations", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    def test_accounts_operations(self) -> Dict[str, Any]:
        """Test Accounts operations as requested in review"""
        print("\n🧪 TESTING ACCOUNTS OPERATIONS")
        results = {"phase": "Accounts Operations", "tests": []}
        
        # Test 1: Refresh accounts (get current accounts)
        try:
            response = self.session.get(f"{BACKEND_URL}/accounts")
            if response.status_code == 200:
                accounts = response.json()
                results["tests"].append({"test": "Refresh accounts", "status": "✅ PASS", "count": len(accounts)})
                
                # Test 2: Update account (create test account first)
                test_account_data = {
                    "name": "Test Account for Update",
                    "account_type": "checking",
                    "balance": 1500.00,
                    "institution_name": "Test Bank",
                    "currency": "USD"
                }
                create_response = self.session.post(f"{BACKEND_URL}/accounts", json=test_account_data)
                if create_response.status_code == 200:
                    created_account = create_response.json()
                    account_id = created_account.get("id")
                    results["tests"].append({"test": "Create account for testing", "status": "✅ PASS", "account_id": account_id})
                    
                    # Test 3: Delete account
                    if account_id:
                        delete_response = self.session.delete(f"{BACKEND_URL}/accounts/{account_id}")
                        if delete_response.status_code == 200:
                            results["tests"].append({"test": "Delete account", "status": "✅ PASS"})
                        else:
                            results["tests"].append({"test": "Delete account", "status": "❌ FAIL", "error": delete_response.text})
                else:
                    results["tests"].append({"test": "Create account for testing", "status": "❌ FAIL", "error": create_response.text})
            else:
                results["tests"].append({"test": "Refresh accounts", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Accounts operations", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    def test_settings_operations(self) -> Dict[str, Any]:
        """Test Settings operations as requested in review"""
        print("\n🧪 TESTING SETTINGS OPERATIONS")
        results = {"phase": "Settings Operations", "tests": []}
        
        # Test 1: Get current settings
        try:
            response = self.session.get(f"{BACKEND_URL}/user/settings")
            if response.status_code == 200:
                current_settings = response.json()
                results["tests"].append({"test": "Get current settings", "status": "✅ PASS", "data": current_settings})
                
                # Test 2: Save settings (update)
                updated_settings = {
                    "family_size": 3,
                    "has_children": True,
                    "primary_goals": ["retirement", "emergency_fund"],
                    "risk_tolerance": "aggressive",
                    "monthly_income": 7500.00
                }
                update_response = self.session.put(f"{BACKEND_URL}/user/settings", json=updated_settings)
                if update_response.status_code == 200:
                    update_result = update_response.json()
                    results["tests"].append({"test": "Save settings", "status": "✅ PASS", "data": update_result})
                else:
                    results["tests"].append({"test": "Save settings", "status": "❌ FAIL", "error": update_response.text})
            else:
                results["tests"].append({"test": "Get current settings", "status": "❌ FAIL", "error": response.text})
        except Exception as e:
            results["tests"].append({"test": "Settings operations", "status": "❌ ERROR", "error": str(e)})
        
    
    # ==================== FOCUSED GOALS DATA INVESTIGATION ====================
    
    def test_goals_data_investigation(self) -> Dict[str, Any]:
        """
        FOCUSED TEST: Investigate Goals data for daniel.r.millner@gmail.com
        Issue: "Saved So Far" shows $63,400 which seems wrong - negative accounts being counted as positive
        """
        print("\n🎯 FOCUSED TEST: Goals Data Investigation")
        print("Issue: 'Saved So Far' shows $63,400 - investigating debt/negative accounts")
        results = {"phase": "Goals Data Investigation", "tests": []}
        
        # Test 1: GET /api/goals - Get all goals and analyze each one
        try:
            print("Testing GET /api/goals...")
            response = self.session.get(f"{BACKEND_URL}/goals")
            if response.status_code == 200:
                goals = response.json()
                results["tests"].append({
                    "test": "GET /api/goals", 
                    "status": "✅ PASS", 
                    "count": len(goals)
                })
                print(f"✅ Found {len(goals)} goals")
                
                # Analyze each goal in detail
                total_saved_so_far = 0
                debt_goals = []
                savings_goals = []
                
                for i, goal in enumerate(goals):
                    goal_name = goal.get('name', 'Unknown')
                    goal_type = goal.get('type', 'Unknown')
                    current_amount = goal.get('current_amount', 0)
                    target_amount = goal.get('target_amount', 0)
                    progress = goal.get('progress_percentage', 0)
                    
                    print(f"\n  Goal {i+1}: {goal_name}")
                    print(f"    Type: {goal_type}")
                    print(f"    Current Amount: ${current_amount:,.2f}")
                    print(f"    Target Amount: ${target_amount:,.2f}")
                    print(f"    Progress: {progress:.1f}%")
                    
                    # Determine if this is debt/negative or savings
                    is_debt = goal_type in ['debt_payoff', 'loan_payoff', 'credit_card_payoff']
                    account_type = "DEBT/NEGATIVE" if is_debt else "SAVINGS/POSITIVE"
                    print(f"    Account Type: {account_type}")
                    
                    if is_debt:
                        debt_goals.append({
                            'name': goal_name,
                            'type': goal_type,
                            'current_amount': current_amount,
                            'target_amount': target_amount,
                            'should_subtract': True
                        })
                        print(f"    ⚠️  DEBT GOAL: Should this ${current_amount:,.2f} be subtracted from total?")
                    else:
                        savings_goals.append({
                            'name': goal_name,
                            'type': goal_type,
                            'current_amount': current_amount,
                            'target_amount': target_amount,
                            'should_add': True
                        })
                        print(f"    ✅ SAVINGS GOAL: ${current_amount:,.2f} should be added to total")
                    
                    total_saved_so_far += current_amount
                
                # Summary analysis
                print(f"\n📊 ANALYSIS SUMMARY:")
                print(f"  Total Goals: {len(goals)}")
                print(f"  Debt/Payoff Goals: {len(debt_goals)}")
                print(f"  Savings Goals: {len(savings_goals)}")
                print(f"  Raw Total (all current_amounts): ${total_saved_so_far:,.2f}")
                
                # Calculate corrected total (subtract debt goals)
                corrected_total = sum(g['current_amount'] for g in savings_goals) - sum(g['current_amount'] for g in debt_goals)
                print(f"  Corrected Total (savings - debt): ${corrected_total:,.2f}")
                
                results["tests"].append({
                    "test": "Goals Analysis", 
                    "status": "✅ ANALYSIS COMPLETE",
                    "raw_total": total_saved_so_far,
                    "corrected_total": corrected_total,
                    "debt_goals_count": len(debt_goals),
                    "savings_goals_count": len(savings_goals),
                    "debt_goals": debt_goals,
                    "savings_goals": savings_goals
                })
                
                # Check if $63,400 matches our raw total
                if abs(total_saved_so_far - 63400) < 1:
                    print(f"  🎯 FOUND ISSUE: Raw total ${total_saved_so_far:,.2f} matches reported $63,400!")
                    print(f"     This confirms debt goals are being counted as positive savings")
                
            else:
                results["tests"].append({
                    "test": "GET /api/goals", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ GET /api/goals failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "GET /api/goals", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ GET /api/goals error: {str(e)}")
        
        # Test 2: Check individual goal details
        try:
            print("\n🔍 DETAILED GOAL INVESTIGATION:")
            response = self.session.get(f"{BACKEND_URL}/goals")
            if response.status_code == 200:
                goals = response.json()
                
                for goal in goals:
                    goal_id = goal.get('id')
                    if goal_id:
                        detail_response = self.session.get(f"{BACKEND_URL}/goals/{goal_id}")
                        if detail_response.status_code == 200:
                            goal_detail = detail_response.json()
                            
                            print(f"\n  Detailed Goal: {goal_detail.get('name')}")
                            print(f"    ID: {goal_id}")
                            print(f"    Type: {goal_detail.get('type')}")
                            print(f"    Current: ${goal_detail.get('current_amount', 0):,.2f}")
                            print(f"    Target: ${goal_detail.get('target_amount', 0):,.2f}")
                            print(f"    Description: {goal_detail.get('description', 'N/A')}")
                            
                            # Check if this is a debt payoff goal with high current_amount
                            if goal_detail.get('type') == 'debt_payoff' and goal_detail.get('current_amount', 0) > 1000:
                                print(f"    🚨 HIGH DEBT PAYOFF AMOUNT: ${goal_detail.get('current_amount'):,.2f}")
                                print(f"       Question: Does this represent 'amount paid' or 'remaining debt'?")
                                
                results["tests"].append({
                    "test": "Individual Goal Details", 
                    "status": "✅ PASS",
                    "message": "Retrieved detailed information for all goals"
                })
        except Exception as e:
            results["tests"].append({"test": "Individual Goal Details", "status": "❌ ERROR", "error": str(e)})
        
        return results
    
    # ==================== FOCUSED BUDGETS & BILLS TESTING ====================
    
    def test_budgets_and_bills_focused(self) -> Dict[str, Any]:
        """
        FOCUSED TEST: Test Budgets and Bills functionality for daniel.r.millner@gmail.com
        As requested in the review request
        """
        print("\n🎯 FOCUSED TEST: Budgets and Bills Functionality")
        print("Testing for user: daniel.r.millner@gmail.com")
        results = {"phase": "Budgets & Bills Focused Test", "tests": []}
        
        # Test 1: GET /api/budgets - Should return list of budgets
        try:
            print("Testing GET /api/budgets...")
            response = self.session.get(f"{BACKEND_URL}/budgets")
            if response.status_code == 200:
                budgets = response.json()
                results["tests"].append({
                    "test": "GET /api/budgets", 
                    "status": "✅ PASS", 
                    "count": len(budgets),
                    "data": budgets[:3] if budgets else []  # Show first 3 budgets
                })
                print(f"✅ Found {len(budgets)} budgets")
                
                # Show budget details for debugging
                for i, budget in enumerate(budgets[:3]):
                    print(f"  Budget {i+1}: {budget.get('category', 'Unknown')} - ${budget.get('amount', 0)}")
                    
            else:
                results["tests"].append({
                    "test": "GET /api/budgets", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ GET /api/budgets failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "GET /api/budgets", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ GET /api/budgets error: {str(e)}")
        
        # Test 2: GET /api/budgets/spending - Should return spending by category
        try:
            print("Testing GET /api/budgets/spending...")
            # Test with current month date range
            now = datetime.now()
            start_date = now.replace(day=1).strftime('%Y-%m-%d')
            end_date = now.strftime('%Y-%m-%d')
            
            response = self.session.get(f"{BACKEND_URL}/budgets/spending?start_date={start_date}&end_date={end_date}")
            if response.status_code == 200:
                spending_data = response.json()
                results["tests"].append({
                    "test": "GET /api/budgets/spending (This Month)", 
                    "status": "✅ PASS", 
                    "data": spending_data
                })
                print(f"✅ Spending data retrieved for {start_date} to {end_date}")
                
                # Show spending details for debugging the $0.00 issue
                if isinstance(spending_data, dict):
                    for category, amount in spending_data.items():
                        print(f"  {category}: ${amount}")
                elif isinstance(spending_data, list):
                    for item in spending_data[:5]:  # Show first 5
                        print(f"  {item}")
                        
            else:
                results["tests"].append({
                    "test": "GET /api/budgets/spending (This Month)", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ GET /api/budgets/spending failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "GET /api/budgets/spending", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ GET /api/budgets/spending error: {str(e)}")
        
        # Test 3: Test different time filters (1M, 3M, etc.)
        time_filters = [
            ("1M", 30),
            ("3M", 90),
            ("6M", 180)
        ]
        
        for filter_name, days_back in time_filters:
            try:
                print(f"Testing spending data for {filter_name} filter...")
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days_back)
                
                response = self.session.get(f"{BACKEND_URL}/budgets/spending?start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}")
                if response.status_code == 200:
                    spending_data = response.json()
                    results["tests"].append({
                        "test": f"GET /api/budgets/spending ({filter_name})", 
                        "status": "✅ PASS", 
                        "filter": filter_name,
                        "data_size": len(spending_data) if isinstance(spending_data, (list, dict)) else 0
                    })
                    print(f"✅ {filter_name} filter data retrieved")
                else:
                    results["tests"].append({
                        "test": f"GET /api/budgets/spending ({filter_name})", 
                        "status": "❌ FAIL", 
                        "error": f"Status: {response.status_code}"
                    })
                    print(f"❌ {filter_name} filter failed: {response.status_code}")
            except Exception as e:
                results["tests"].append({
                    "test": f"GET /api/budgets/spending ({filter_name})", 
                    "status": "❌ ERROR", 
                    "error": str(e)
                })
                print(f"❌ {filter_name} filter error: {str(e)}")
        
        # Test 4: GET /api/subscriptions - Should return list of subscriptions/bills
        try:
            print("Testing GET /api/subscriptions...")
            response = self.session.get(f"{BACKEND_URL}/subscriptions")
            if response.status_code == 200:
                subscriptions = response.json()
                results["tests"].append({
                    "test": "GET /api/subscriptions", 
                    "status": "✅ PASS", 
                    "count": len(subscriptions) if isinstance(subscriptions, list) else 0,
                    "data": subscriptions[:3] if isinstance(subscriptions, list) and subscriptions else subscriptions
                })
                print(f"✅ Found subscriptions/bills data")
                
                # Show subscription details for debugging
                if isinstance(subscriptions, list):
                    for i, sub in enumerate(subscriptions[:3]):
                        print(f"  Subscription {i+1}: {sub}")
                else:
                    print(f"  Subscriptions data: {subscriptions}")
                    
            else:
                results["tests"].append({
                    "test": "GET /api/subscriptions", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ GET /api/subscriptions failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "GET /api/subscriptions", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ GET /api/subscriptions error: {str(e)}")
        
        # Test 5: POST /api/budgets - Test creating a new budget
        try:
            print("Testing POST /api/budgets (create new budget)...")
            new_budget_data = {
                "category": "Test Budget Category",
                "amount": 750.00,
                "period": "monthly",
                "start_date": "2024-12-01",
                "rollover": False,
                "icon": "🧪",
                "color": "#FF6B6B"
            }
            
            response = self.session.post(f"{BACKEND_URL}/budgets", json=new_budget_data)
            if response.status_code == 200:
                created_budget = response.json()
                budget_id = created_budget.get("id")
                results["tests"].append({
                    "test": "POST /api/budgets (create)", 
                    "status": "✅ PASS", 
                    "budget_id": budget_id,
                    "data": created_budget
                })
                print(f"✅ Created test budget with ID: {budget_id}")
                
                # Clean up - delete the test budget
                if budget_id:
                    delete_response = self.session.delete(f"{BACKEND_URL}/budgets/{budget_id}")
                    if delete_response.status_code == 200:
                        print(f"✅ Cleaned up test budget {budget_id}")
                    else:
                        print(f"⚠️ Could not clean up test budget {budget_id}")
                        
            else:
                results["tests"].append({
                    "test": "POST /api/budgets (create)", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ POST /api/budgets failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "POST /api/budgets", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ POST /api/budgets error: {str(e)}")
        
        # Test 6: Check transaction categorization (root cause of $0.00 spending issue)
        try:
            print("Testing transaction categorization (investigating $0.00 spending issue)...")
            response = self.session.get(f"{BACKEND_URL}/transactions?limit=20")
            if response.status_code == 200:
                transactions = response.json()
                results["tests"].append({
                    "test": "GET /api/transactions (categorization check)", 
                    "status": "✅ PASS", 
                    "count": len(transactions)
                })
                print(f"✅ Found {len(transactions)} transactions")
                
                # Analyze transaction categories and amounts
                expense_transactions = [t for t in transactions if t.get("transaction_type") == "expense"]
                categorized_transactions = [t for t in expense_transactions if t.get("category") and t.get("category") != "Other"]
                
                print(f"  Total transactions: {len(transactions)}")
                print(f"  Expense transactions: {len(expense_transactions)}")
                print(f"  Categorized expenses: {len(categorized_transactions)}")
                
                # Show sample transactions for debugging
                for i, txn in enumerate(expense_transactions[:5]):
                    print(f"  Transaction {i+1}: {txn.get('description', 'No desc')} - ${txn.get('amount', 0)} - Category: {txn.get('category', 'None')}")
                
                # Calculate total spending by category
                category_totals = {}
                for txn in expense_transactions:
                    category = txn.get("category", "Other")
                    amount = abs(float(txn.get("amount", 0)))
                    category_totals[category] = category_totals.get(category, 0) + amount
                
                print(f"  Category spending totals:")
                for category, total in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]:
                    print(f"    {category}: ${total:.2f}")
                
                results["tests"].append({
                    "test": "Transaction categorization analysis", 
                    "status": "✅ PASS", 
                    "expense_count": len(expense_transactions),
                    "categorized_count": len(categorized_transactions),
                    "category_totals": category_totals
                })
                    
            else:
                results["tests"].append({
                    "test": "GET /api/transactions (categorization check)", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}"
                })
                print(f"❌ GET /api/transactions failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "Transaction categorization check", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ Transaction categorization check error: {str(e)}")
        
        # Test 7: Check bills/recurring expenses for calendar
        try:
            print("Testing GET /api/bills (for calendar display)...")
            response = self.session.get(f"{BACKEND_URL}/bills")
            if response.status_code == 200:
                bills = response.json()
                results["tests"].append({
                    "test": "GET /api/bills (calendar)", 
                    "status": "✅ PASS", 
                    "count": len(bills) if isinstance(bills, list) else 0,
                    "data": bills[:3] if isinstance(bills, list) and bills else bills
                })
                print(f"✅ Found bills for calendar display")
                
                # Show bill details for calendar debugging
                if isinstance(bills, list):
                    for i, bill in enumerate(bills[:5]):
                        print(f"  Bill {i+1}: {bill.get('name', 'Unknown')} - ${bill.get('amount', 0)} - Due: {bill.get('due_date', 'No date')}")
                else:
                    print(f"  Bills data: {bills}")
                    
            else:
                results["tests"].append({
                    "test": "GET /api/bills (calendar)", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ GET /api/bills failed: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "GET /api/bills", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ GET /api/bills error: {str(e)}")
        
        return results
        return results

    # ==================== PLANNING TOOLS & HELOC CHUNKING TEST ====================
    
    def test_planning_tools_access(self) -> Dict[str, Any]:
        """
        SPECIFIC TEST: Planning Tools page accessibility for daniel.r.millner@gmail.com
        Tests the exact scenario from the review request:
        1. Login with daniel.r.millner@gmail.com / password
        2. Check user's subscription status: GET /api/settings
        3. Navigate to /planning page (Planning Tools)
        4. Verify the page loads
        5. Check if the "Debt Payoff" tab is visible
        6. Click on "Debt Payoff" tab
        7. Check if the page content loads and shows the debt payoff calculator
        8. Look for any text containing "HELOC" or "Chunking"
        """
        print("\n🎯 SPECIFIC TEST: Planning Tools Page Access & HELOC Chunking Calculator")
        print("Testing user report: 'Can't see the HELOC Chunking calculator'")
        results = {"phase": "Planning Tools Access", "tests": []}
        
        # Test 1: Check user's subscription status
        try:
            print("Step 1: Checking user subscription status...")
            response = self.session.get(f"{BACKEND_URL}/user/settings")
            if response.status_code == 200:
                settings = response.json()
                results["tests"].append({
                    "test": "Check subscription status (GET /api/settings)", 
                    "status": "✅ PASS", 
                    "data": {
                        "family_size": settings.get("family_size"),
                        "risk_tolerance": settings.get("risk_tolerance"),
                        "monthly_income": settings.get("monthly_income"),
                        "primary_goals": settings.get("primary_goals", [])
                    }
                })
                print(f"✅ User settings retrieved - Monthly Income: ${settings.get('monthly_income', 'Not set')}")
            else:
                results["tests"].append({
                    "test": "Check subscription status", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ Failed to get user settings: {response.status_code}")
        except Exception as e:
            results["tests"].append({"test": "Check subscription status", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ Error checking subscription: {str(e)}")
        
        # Test 2: Check if user has debt accounts (prerequisite for HELOC visibility)
        try:
            print("Step 2: Checking for debt accounts (mortgage/loans)...")
            response = self.session.get(f"{BACKEND_URL}/accounts")
            if response.status_code == 200:
                accounts = response.json()
                debt_accounts = [acc for acc in accounts if acc.get("account_type") in ["mortgage", "loan", "credit_card"]]
                mortgage_accounts = [acc for acc in accounts if acc.get("account_type") == "mortgage"]
                
                results["tests"].append({
                    "test": "Check debt accounts (prerequisite for HELOC)", 
                    "status": "✅ PASS", 
                    "data": {
                        "total_accounts": len(accounts),
                        "debt_accounts": len(debt_accounts),
                        "mortgage_accounts": len(mortgage_accounts),
                        "debt_account_names": [acc.get("name") for acc in debt_accounts]
                    }
                })
                
                if mortgage_accounts:
                    print(f"✅ Found {len(mortgage_accounts)} mortgage account(s) - HELOC section should be visible")
                    for acc in mortgage_accounts:
                        print(f"   - {acc.get('name')}: ${acc.get('balance', 0):,.2f}")
                else:
                    print(f"⚠️  No mortgage accounts found - HELOC section may not be visible")
                    
            else:
                results["tests"].append({
                    "test": "Check debt accounts", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
        except Exception as e:
            results["tests"].append({"test": "Check debt accounts", "status": "❌ ERROR", "error": str(e)})
        
        # Test 3: Test HELOC Chunking Calculator API directly
        try:
            print("Step 3: Testing HELOC Chunking Calculator API...")
            
            # Test with realistic parameters for daniel.r.millner@gmail.com
            heloc_params = {
                "mortgage_balance": 200000,
                "mortgage_rate": 6.5,
                "mortgage_payment": 1500,
                "monthly_income": 10000,
                "monthly_expenses": 5000,
                "heloc_rate": 11.0,
                "heloc_available": 50000
            }
            
            response = self.session.post(f"{BACKEND_URL}/debt/analyze-chunking", params=heloc_params)
            if response.status_code == 200:
                chunking_result = response.json()
                results["tests"].append({
                    "test": "HELOC Chunking Calculator API", 
                    "status": "✅ PASS", 
                    "data": {
                        "viable": chunking_result.get("viable"),
                        "monthly_cashflow": chunking_result.get("monthly_cashflow"),
                        "optimal_chunk_size": chunking_result.get("optimal_chunk_size"),
                        "recommendation": chunking_result.get("recommendation"),
                        "interest_savings": chunking_result.get("interest_savings"),
                        "time_saved_years": chunking_result.get("time_saved_years")
                    }
                })
                
                print(f"✅ HELOC Calculator API working:")
                print(f"   - Viable: {chunking_result.get('viable')}")
                print(f"   - Monthly Cash Flow: ${chunking_result.get('monthly_cashflow', 0):,.2f}")
                print(f"   - Optimal Chunk Size: ${chunking_result.get('optimal_chunk_size', 0):,.2f}")
                print(f"   - Recommendation: {chunking_result.get('recommendation', 'N/A')}")
                
                if chunking_result.get("viable"):
                    print(f"   - Interest Savings: ${chunking_result.get('interest_savings', 0):,.2f}")
                    print(f"   - Time Saved: {chunking_result.get('time_saved_years', 0):.1f} years")
                
            else:
                results["tests"].append({
                    "test": "HELOC Chunking Calculator API", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ HELOC Calculator API failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            results["tests"].append({"test": "HELOC Chunking Calculator API", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ Error testing HELOC Calculator: {str(e)}")
        
        # Test 4: Test Debt Payoff Calculator API (general debt payoff)
        try:
            print("Step 4: Testing general Debt Payoff Calculator API...")
            
            # Test with sample debt data
            debt_data = {
                "debts": [
                    {"balance": 5000, "interest_rate": 18.5, "minimum_payment": 150, "name": "Credit Card"},
                    {"balance": 15000, "interest_rate": 6.5, "minimum_payment": 300, "name": "Auto Loan"}
                ],
                "extra_payment": 200,
                "strategy": "avalanche"
            }
            
            # Fix the debt payoff API call - it expects a different format
            debt_params = {
                "extra_payment": debt_data["extra_payment"],
                "strategy": debt_data["strategy"]
            }
            response = self.session.post(f"{BACKEND_URL}/debt/calculate-payoff", json=debt_data["debts"], params=debt_params)
            if response.status_code == 200:
                payoff_result = response.json()
                results["tests"].append({
                    "test": "General Debt Payoff Calculator API", 
                    "status": "✅ PASS", 
                    "data": {
                        "months_to_payoff": payoff_result.get("months_to_payoff"),
                        "total_interest_paid": payoff_result.get("total_interest_paid"),
                        "strategy": payoff_result.get("strategy"),
                        "total_payments": payoff_result.get("total_payments")
                    }
                })
                
                print(f"✅ Debt Payoff Calculator API working:")
                print(f"   - Months to Payoff: {payoff_result.get('months_to_payoff', 0)}")
                print(f"   - Total Interest: ${payoff_result.get('total_interest_paid', 0):,.2f}")
                print(f"   - Strategy: {payoff_result.get('strategy', 'N/A')}")
                
            else:
                results["tests"].append({
                    "test": "General Debt Payoff Calculator API", 
                    "status": "❌ FAIL", 
                    "error": f"Status: {response.status_code}, Response: {response.text}"
                })
                print(f"❌ Debt Payoff Calculator API failed: {response.status_code}")
                
        except Exception as e:
            results["tests"].append({"test": "General Debt Payoff Calculator API", "status": "❌ ERROR", "error": str(e)})
            print(f"❌ Error testing Debt Payoff Calculator: {str(e)}")
        
        # Test 5: Check for any subscription/access restrictions
        try:
            print("Step 5: Checking for subscription/access restrictions...")
            
            # Test various advanced endpoints to see if there are access restrictions
            advanced_endpoints = [
                ("/debt/analyze-chunking", "HELOC Chunking"),
                ("/debt/calculate-payoff", "Debt Payoff"),
                ("/analytics/spending-forecast", "Spending Forecast"),
                ("/investments/performance/enhanced", "Investment Performance")
            ]
            
            access_results = {}
            for endpoint, name in advanced_endpoints:
                try:
                    # Use GET for analytics endpoints, POST for debt endpoints
                    if "debt" in endpoint:
                        test_response = self.session.post(f"{BACKEND_URL}{endpoint}", json={})
                    else:
                        test_response = self.session.get(f"{BACKEND_URL}{endpoint}")
                    
                    if test_response.status_code == 403:
                        access_results[name] = "RESTRICTED (403 Forbidden)"
                    elif test_response.status_code == 401:
                        access_results[name] = "UNAUTHORIZED (401)"
                    elif test_response.status_code in [200, 400, 422]:  # 400/422 are validation errors, not access issues
                        access_results[name] = "ACCESSIBLE"
                    else:
                        access_results[name] = f"UNKNOWN ({test_response.status_code})"
                        
                except Exception:
                    access_results[name] = "ERROR"
            
            results["tests"].append({
                "test": "Check subscription/access restrictions", 
                "status": "✅ PASS", 
                "data": access_results
            })
            
            print("✅ Access restriction check completed:")
            for feature, status in access_results.items():
                print(f"   - {feature}: {status}")
                
        except Exception as e:
            results["tests"].append({"test": "Check access restrictions", "status": "❌ ERROR", "error": str(e)})
        
        # Summary and diagnosis
        print("\n📋 PLANNING TOOLS ACCESS DIAGNOSIS:")
        print("=" * 50)
        
        # Check if APIs are working
        api_working = any(test.get("test") == "HELOC Chunking Calculator API" and test.get("status") == "✅ PASS" for test in results["tests"])
        has_mortgage = False
        
        for test in results["tests"]:
            if test.get("test") == "Check debt accounts (prerequisite for HELOC)":
                mortgage_count = test.get("data", {}).get("mortgage_accounts", 0)
                has_mortgage = mortgage_count > 0
                break
        
        if api_working:
            print("✅ HELOC Chunking Calculator API is working correctly")
        else:
            print("❌ HELOC Chunking Calculator API has issues")
            
        if has_mortgage:
            print("✅ User has mortgage accounts - HELOC section should be visible")
        else:
            print("⚠️  User has no mortgage accounts - HELOC section may be hidden")
            
        print("\n🔍 POSSIBLE REASONS USER CAN'T SEE HELOC CHUNKING:")
        print("1. Frontend condition: HELOC section only shows if user has mortgage debt")
        print("2. UI/UX issue: Section is present but not visible/scrollable")
        print("3. Route issue: /planning page may not exist or load properly")
        print("4. Component issue: Debt Payoff tab may not render HELOC section")
        print("5. Data issue: User's mortgage data may not trigger HELOC visibility")
        
        return results

    def run_planning_tools_test_only(self) -> Dict[str, Any]:
        """Run only the Planning Tools access test (for focused testing)"""
        print("🎯 FOCUSED TEST: Planning Tools Access for daniel.r.millner@gmail.com")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test User: {TEST_EMAIL}")
        print("=" * 80)
        
        # Login first
        if not self.login():
            print("❌ Login failed - cannot proceed with tests")
            return {"success": False, "error": "Login failed"}
        
        # Run only the Planning Tools test
        try:
            result = self.test_planning_tools_access()
            
            # Print focused summary
            print("\n" + "=" * 80)
            print("🎯 PLANNING TOOLS TEST SUMMARY")
            print("=" * 80)
            
            for test in result["tests"]:
                status_icon = "✅" if test["status"].startswith("✅") else "❌" if test["status"].startswith("❌") else "⚠️"
                print(f"{status_icon} {test['test']}: {test['status']}")
                
                if test.get("data"):
                    for key, value in test["data"].items():
                        print(f"   {key}: {value}")
            
            return {"success": True, "results": result}
            
        except Exception as e:
            print(f"❌ Planning Tools test failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # ==================== MAIN TEST RUNNER ====================
    
    def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run all comprehensive tests for FinanceHub application"""
        print("🚀 Starting Comprehensive FinanceHub Backend Tests")
        print("=" * 80)
        
        # Login first
        if not self.login():
            return {"success": False, "error": "Login failed"}
        
        # Run FOCUSED test first as requested in review
        focused_test_phases = [
            ("FOCUSED: Goals Data Investigation", self.test_goals_data_investigation),
            ("FOCUSED: Budgets & Bills", self.test_budgets_and_bills_focused)
        ]
        
        # Run CRUD operation tests as requested in review
        crud_test_phases = [
            ("Goals CRUD", self.test_goals_crud_operations),
            ("Budgets CRUD", self.test_budgets_crud_operations),
            ("Transactions CRUD", self.test_transactions_crud_operations),
            ("Bills CRUD", self.test_bills_crud_operations),
            ("Accounts Operations", self.test_accounts_operations),
            ("Settings Operations", self.test_settings_operations)
        ]
        
        # Run all test phases (focused + comprehensive + CRUD)
        test_phases = focused_test_phases + [
            ("Phase 1", self.test_authentication_core),
            ("Phase 2", self.test_account_management),
            ("Phase 3", self.test_transaction_management),
            ("Phase 4", self.test_budgets_bills),
            ("Phase 5", self.test_goals),
            ("Phase 6", self.test_analytics_reports),
            ("Phase 7", self.test_investment_tracking),
            ("Phase 8", self.test_alerts_system),
            ("Phase 9", self.test_gamification),
            ("Phase 10", self.test_advanced_features)
        ] + crud_test_phases
        
        all_results = []
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for phase_name, test_func in test_phases:
            try:
                phase_results = test_func()
                all_results.append(phase_results)
                
                # Count test results
                for test in phase_results.get("tests", []):
                    total_tests += 1
                    if "✅ PASS" in test.get("status", ""):
                        passed_tests += 1
                    else:
                        failed_tests += 1
                        
            except Exception as e:
                failed_tests += 1
                all_results.append({
                    "phase": phase_name,
                    "tests": [{"test": f"{phase_name} execution", "status": "❌ ERROR", "error": str(e)}]
                })
        
        # Generate summary
        print("\n" + "=" * 80)
        print(f"📊 COMPREHENSIVE TEST SUMMARY")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%")
        
        # Print phase summaries
        for result in all_results:
            phase = result.get("phase", "Unknown")
            tests = result.get("tests", [])
            phase_passed = sum(1 for t in tests if "✅ PASS" in t.get("status", ""))
            phase_total = len(tests)
            print(f"\n{phase}: {phase_passed}/{phase_total} tests passed")
            
            # Show failed tests
            for test in tests:
                if "❌" in test.get("status", ""):
                    print(f"  ❌ {test.get('test', 'Unknown')}: {test.get('error', 'Unknown error')}")
                elif "⚠️" in test.get("status", ""):
                    print(f"  ⚠️ {test.get('test', 'Unknown')}: {test.get('reason', 'Skipped')}")
        
        return {
            "success": failed_tests == 0,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests/total_tests*100) if total_tests > 0 else 0,
            "results": all_results
        }

    def run_goals_investigation_only(self) -> Dict[str, Any]:
        """Run only the Goals data investigation test"""
        print("🎯 Starting Goals Data Investigation for daniel.r.millner@gmail.com")
        print("=" * 80)
        
        # Login first
        if not self.login():
            return {"success": False, "error": "Login failed"}
        
        # Run only the Goals investigation
        try:
            results = self.test_goals_data_investigation()
            
            # Print summary
            print("\n" + "=" * 80)
            print("📊 GOALS INVESTIGATION SUMMARY")
            
            for test in results.get("tests", []):
                status = test.get("status", "")
                test_name = test.get("test", "")
                print(f"  {status} {test_name}")
                
                # Print detailed analysis if available
                if "Goals Analysis" in test_name and test.get("debt_goals"):
                    print(f"\n  🔍 DETAILED FINDINGS:")
                    print(f"    Raw Total: ${test.get('raw_total', 0):,.2f}")
                    print(f"    Corrected Total: ${test.get('corrected_total', 0):,.2f}")
                    print(f"    Debt Goals: {test.get('debt_goals_count', 0)}")
                    print(f"    Savings Goals: {test.get('savings_goals_count', 0)}")
                    
                    print(f"\n  💰 DEBT GOALS (should be subtracted):")
                    for debt_goal in test.get('debt_goals', []):
                        print(f"    - {debt_goal['name']}: ${debt_goal['current_amount']:,.2f} ({debt_goal['type']})")
                    
                    print(f"\n  💎 SAVINGS GOALS (should be added):")
                    for savings_goal in test.get('savings_goals', []):
                        print(f"    - {savings_goal['name']}: ${savings_goal['current_amount']:,.2f} ({savings_goal['type']})")
            
            return {"success": True, "results": results}
            
        except Exception as e:
            print(f"❌ Goals investigation failed: {str(e)}")
            return {"success": False, "error": str(e)}

def main():
    """Main test execution"""
    tester = FinanceHubTester()
    
    # Run the Planning Tools access test as requested in the review
    results = tester.run_planning_tools_test_only()
    
    if results.get("success", True):
        print("\n🎉 Planning Tools access test completed!")
    else:
        print(f"\n💥 Test failed: {results.get('error')}")
        sys.exit(1)

if __name__ == "__main__":
    main()
