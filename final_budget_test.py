#!/usr/bin/env python3
"""
Final Budget Category Test - Verify the fix is working
"""

import requests
import json
from datetime import datetime, timedelta

# Get backend URL from environment
BACKEND_URL = "https://cozy-budget.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "daniel.r.millner@gmail.com"
TEST_PASSWORD = "password"

def test_budget_fix():
    """Test that the budget category mapping fix is working"""
    
    # Login
    session = requests.Session()
    login_response = session.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    data = login_response.json()
    auth_token = data.get("access_token")
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    
    print("✅ Login successful")
    
    # Test the budget spending endpoint
    print("\n🧪 Testing GET /api/budgets/spending...")
    
    # Test current month
    now = datetime.now()
    start_date = now.replace(day=1).strftime('%Y-%m-%d')
    end_date = now.strftime('%Y-%m-%d')
    
    response = session.get(f"{BACKEND_URL}/budgets/spending?start_date={start_date}&end_date={end_date}")
    
    if response.status_code == 200:
        spending_data = response.json()
        print(f"✅ Budget spending endpoint working!")
        print(f"📊 Total spent: ${spending_data.get('total_spent', 0):,.2f}")
        
        categories = spending_data.get('spending_by_category', {})
        print(f"📋 Categories found: {len(categories)}")
        
        # Check specifically for Dining Out
        dining_out_spending = categories.get('Dining Out', 0)
        if dining_out_spending > 0:
            print(f"🍽️  ✅ DINING OUT BUDGET WORKING: ${dining_out_spending:,.2f}")
        else:
            print(f"🍽️  ❌ Dining Out still shows $0.00")
        
        # Show all categories
        print(f"\n📈 All category spending:")
        for category, amount in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            print(f"  {category}: ${amount:,.2f}")
            
    else:
        print(f"❌ Budget spending endpoint failed: {response.status_code}")
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_budget_fix()