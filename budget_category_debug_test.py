#!/usr/bin/env python3
"""
Budget Category Mapping Debug Test
Debug why budget categories still show $0.00 after adding category mapping

Test these specific items:
1. Login as daniel.r.millner@gmail.com (password: password) and get auth token
2. Check what actual categories exist in transactions (GET /api/transactions)
3. Test the budgets spending endpoint (GET /api/budgets/spending)
4. Check what budgets exist (GET /api/budgets)

Goal: Figure out why transactions with "restaurants" category aren't being counted under "Dining Out" budget
"""

import requests
import json
import sys
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import Counter

# Get backend URL from environment
BACKEND_URL = "https://cozy-budget.preview.emergentagent.com/api"

# Test credentials from review request
TEST_EMAIL = "daniel.r.millner@gmail.com"
TEST_PASSWORD = "password"

class BudgetCategoryDebugger:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        
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
    
    def get_all_transactions(self) -> List[Dict]:
        """Get all transactions to analyze categories"""
        try:
            print("\n📊 Getting all transactions to analyze categories...")
            
            # Get transactions with a high limit to see all data
            response = self.session.get(f"{BACKEND_URL}/transactions?limit=1000")
            
            if response.status_code == 200:
                transactions = response.json()
                print(f"✅ Retrieved {len(transactions)} transactions")
                return transactions
            else:
                print(f"❌ Failed to get transactions: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting transactions: {str(e)}")
            return []
    
    def analyze_transaction_categories(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Analyze what categories exist in transactions"""
        print("\n🔍 ANALYZING TRANSACTION CATEGORIES:")
        
        # Count categories
        category_counts = Counter()
        category_amounts = {}
        sample_transactions = {}
        
        for txn in transactions:
            category = txn.get("category", "Unknown")
            amount = abs(float(txn.get("amount", 0)))
            
            category_counts[category] += 1
            
            if category not in category_amounts:
                category_amounts[category] = 0
            category_amounts[category] += amount
            
            # Store sample transaction for each category
            if category not in sample_transactions:
                sample_transactions[category] = {
                    "description": txn.get("description", ""),
                    "merchant_name": txn.get("merchant_name", ""),
                    "amount": txn.get("amount", 0),
                    "date": txn.get("date", ""),
                    "transaction_type": txn.get("transaction_type", "")
                }
        
        # Sort by count (most common first)
        sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        
        print(f"📈 Found {len(sorted_categories)} unique categories:")
        print("=" * 80)
        
        for category, count in sorted_categories:
            total_amount = category_amounts.get(category, 0)
            sample = sample_transactions.get(category, {})
            
            print(f"Category: {category}")
            print(f"  Count: {count} transactions")
            print(f"  Total Amount: ${total_amount:,.2f}")
            print(f"  Sample Transaction:")
            print(f"    Description: {sample.get('description', 'N/A')}")
            print(f"    Merchant: {sample.get('merchant_name', 'N/A')}")
            print(f"    Amount: ${sample.get('amount', 0)}")
            print(f"    Date: {sample.get('date', 'N/A')}")
            print(f"    Type: {sample.get('transaction_type', 'N/A')}")
            print("-" * 40)
        
        # Look specifically for restaurant/dining related categories
        dining_related = []
        for category, count in sorted_categories:
            category_lower = category.lower()
            if any(keyword in category_lower for keyword in ['restaurant', 'dining', 'food', 'eat', 'meal']):
                dining_related.append((category, count, category_amounts.get(category, 0)))
        
        if dining_related:
            print("\n🍽️  DINING/RESTAURANT RELATED CATEGORIES FOUND:")
            for category, count, amount in dining_related:
                print(f"  {category}: {count} transactions, ${amount:,.2f}")
        else:
            print("\n⚠️  NO OBVIOUS DINING/RESTAURANT CATEGORIES FOUND")
        
        return {
            "total_categories": len(sorted_categories),
            "category_counts": dict(sorted_categories),
            "category_amounts": category_amounts,
            "dining_related": dining_related,
            "sample_transactions": sample_transactions
        }
    
    def get_budgets(self) -> List[Dict]:
        """Get all budgets"""
        try:
            print("\n💰 Getting all budgets...")
            
            response = self.session.get(f"{BACKEND_URL}/budgets")
            
            if response.status_code == 200:
                budgets = response.json()
                print(f"✅ Retrieved {len(budgets)} budgets")
                
                print("\n📋 BUDGET CATEGORIES:")
                print("=" * 50)
                for i, budget in enumerate(budgets, 1):
                    print(f"{i}. Category: {budget.get('category', 'Unknown')}")
                    print(f"   Amount: ${budget.get('amount', 0):,.2f}")
                    print(f"   Period: {budget.get('period', 'Unknown')}")
                    print(f"   ID: {budget.get('id', 'Unknown')}")
                    print("-" * 30)
                
                return budgets
            else:
                print(f"❌ Failed to get budgets: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error getting budgets: {str(e)}")
            return []
    
    def test_budget_spending_endpoint(self) -> Dict[str, Any]:
        """Test the budgets spending endpoint with different time ranges"""
        print("\n💸 TESTING BUDGET SPENDING ENDPOINT:")
        
        results = {}
        
        # Test different time ranges
        time_ranges = [
            ("Current Month", 30, "current_month"),
            ("Last 3 Months", 90, "3_months"),
            ("Last 6 Months", 180, "6_months"),
            ("All Time", 365, "all_time")
        ]
        
        for range_name, days_back, key in time_ranges:
            try:
                print(f"\n🔍 Testing {range_name} ({days_back} days)...")
                
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days_back)
                
                # Test the spending endpoint
                response = self.session.get(
                    f"{BACKEND_URL}/budgets/spending?start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}"
                )
                
                if response.status_code == 200:
                    spending_data = response.json()
                    print(f"✅ {range_name} - Status: SUCCESS")
                    
                    # Analyze the response
                    if isinstance(spending_data, dict):
                        if "spending_by_category" in spending_data:
                            categories = spending_data["spending_by_category"]
                            total_spent = spending_data.get("total_spent", 0)
                            
                            print(f"   Total Spent: ${total_spent:,.2f}")
                            print(f"   Categories Found: {len(categories)}")
                            
                            if categories:
                                print("   Category Breakdown:")
                                for category, amount in categories.items():
                                    print(f"     {category}: ${amount:,.2f}")
                            else:
                                print("   ⚠️  NO CATEGORIES IN SPENDING BREAKDOWN")
                        else:
                            print(f"   Raw Response: {spending_data}")
                    else:
                        print(f"   Raw Response: {spending_data}")
                    
                    results[key] = {
                        "status": "success",
                        "data": spending_data
                    }
                else:
                    print(f"❌ {range_name} - Status: FAILED ({response.status_code})")
                    print(f"   Error: {response.text}")
                    results[key] = {
                        "status": "failed",
                        "error": response.text,
                        "status_code": response.status_code
                    }
                    
            except Exception as e:
                print(f"❌ {range_name} - Status: ERROR")
                print(f"   Error: {str(e)}")
                results[key] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return results
    
    def check_category_mapping_issue(self, transactions: List[Dict], budgets: List[Dict], spending_results: Dict[str, Any]):
        """Analyze the category mapping issue"""
        print("\n🔧 ANALYZING CATEGORY MAPPING ISSUE:")
        print("=" * 60)
        
        # Find budget categories
        budget_categories = [b.get("category", "") for b in budgets]
        print(f"📋 Budget Categories: {budget_categories}")
        
        # Find transaction categories
        transaction_categories = list(set(txn.get("category", "") for txn in transactions))
        print(f"📊 Transaction Categories ({len(transaction_categories)}): {transaction_categories[:10]}...")  # Show first 10
        
        # Look for "Dining Out" budget specifically
        dining_out_budget = None
        for budget in budgets:
            if budget.get("category", "").lower() == "dining out":
                dining_out_budget = budget
                break
        
        if dining_out_budget:
            print(f"\n🍽️  FOUND 'Dining Out' BUDGET:")
            print(f"   Amount: ${dining_out_budget.get('amount', 0):,.2f}")
            print(f"   ID: {dining_out_budget.get('id', 'Unknown')}")
        else:
            print(f"\n⚠️  NO 'Dining Out' BUDGET FOUND")
        
        # Look for restaurant-related transactions
        restaurant_transactions = []
        for txn in transactions:
            category = txn.get("category", "").lower()
            description = txn.get("description", "").lower()
            merchant = txn.get("merchant_name", "").lower()
            
            if any(keyword in category for keyword in ['restaurant', 'dining', 'food']) or \
               any(keyword in description for keyword in ['restaurant', 'dining']) or \
               any(keyword in merchant for keyword in ['restaurant', 'dining']):
                restaurant_transactions.append(txn)
        
        print(f"\n🍽️  RESTAURANT-RELATED TRANSACTIONS FOUND: {len(restaurant_transactions)}")
        
        if restaurant_transactions:
            print("   Sample Restaurant Transactions:")
            for i, txn in enumerate(restaurant_transactions[:5]):  # Show first 5
                print(f"   {i+1}. {txn.get('description', 'N/A')} - {txn.get('category', 'N/A')} - ${txn.get('amount', 0)}")
        
        # Check if spending endpoint shows any dining/restaurant spending
        print(f"\n💸 SPENDING ENDPOINT ANALYSIS:")
        for time_range, result in spending_results.items():
            if result.get("status") == "success":
                data = result.get("data", {})
                if isinstance(data, dict) and "spending_by_category" in data:
                    categories = data["spending_by_category"]
                    
                    # Look for dining-related categories in spending
                    dining_spending = {}
                    for cat, amount in categories.items():
                        if any(keyword in cat.lower() for keyword in ['dining', 'restaurant', 'food']):
                            dining_spending[cat] = amount
                    
                    if dining_spending:
                        print(f"   {time_range}: Found dining spending - {dining_spending}")
                    else:
                        print(f"   {time_range}: NO dining spending found in {len(categories)} categories")
        
        # DIAGNOSIS
        print(f"\n🔍 DIAGNOSIS:")
        print("=" * 40)
        
        if not dining_out_budget:
            print("❌ ISSUE: No 'Dining Out' budget exists")
        
        if not restaurant_transactions:
            print("❌ ISSUE: No restaurant transactions found")
        else:
            print(f"✅ Found {len(restaurant_transactions)} restaurant transactions")
        
        # Check for category mismatch
        if dining_out_budget and restaurant_transactions:
            budget_category = dining_out_budget.get("category", "")
            transaction_categories_set = set(txn.get("category", "") for txn in restaurant_transactions)
            
            print(f"\n🔄 CATEGORY MAPPING CHECK:")
            print(f"   Budget Category: '{budget_category}'")
            print(f"   Transaction Categories: {list(transaction_categories_set)}")
            
            if budget_category not in transaction_categories_set:
                print(f"❌ MISMATCH: Budget category '{budget_category}' not found in transaction categories")
                print(f"   This explains why spending shows $0.00!")
                print(f"   Need to either:")
                print(f"   1. Update transactions to use '{budget_category}' category, OR")
                print(f"   2. Create category mapping from transaction categories to budget category")
            else:
                print(f"✅ Categories match - issue might be elsewhere")
    
    def run_debug_analysis(self):
        """Run the complete debug analysis"""
        print("🚀 STARTING BUDGET CATEGORY MAPPING DEBUG")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("❌ Cannot proceed without login")
            return
        
        # Step 2: Get all transactions
        transactions = self.get_all_transactions()
        if not transactions:
            print("❌ No transactions found - cannot analyze")
            return
        
        # Step 3: Analyze transaction categories
        category_analysis = self.analyze_transaction_categories(transactions)
        
        # Step 4: Get budgets
        budgets = self.get_budgets()
        
        # Step 5: Test budget spending endpoint
        spending_results = self.test_budget_spending_endpoint()
        
        # Step 6: Analyze the mapping issue
        self.check_category_mapping_issue(transactions, budgets, spending_results)
        
        print(f"\n🏁 DEBUG ANALYSIS COMPLETE")
        print("=" * 60)

if __name__ == "__main__":
    debugger = BudgetCategoryDebugger()
    debugger.run_debug_analysis()