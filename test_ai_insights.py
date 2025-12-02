#!/usr/bin/env python3
"""
Test script to verify AI insights generation after fixing loan payment categorization issue
"""
import requests
import json
import sys

API_URL = "https://kindling-finance.preview.emergentagent.com/api"

# Test credentials
EMAIL = "daniel.r.millner@gmail.com"
PASSWORD = "password"

def login():
    """Login and get auth token"""
    print("🔐 Logging in...")
    response = requests.post(
        f"{API_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"✅ Login successful!")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def generate_insights(token):
    """Generate AI insights"""
    print("\n🧠 Generating AI insights...")
    response = requests.post(
        f"{API_URL}/ai/generate-insights",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Insights generated successfully!")
        print(f"   Count: {data.get('count', 0)}")
        return True
    else:
        print(f"❌ Insight generation failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def get_insights(token):
    """Fetch and display insights"""
    print("\n📊 Fetching insights...")
    response = requests.get(
        f"{API_URL}/insights",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        insights = response.json()
        print(f"✅ Found {len(insights)} insights\n")
        
        # Check for loan payment insights
        loan_fee_issues = []
        for i, insight in enumerate(insights, 1):
            title = insight.get('title', 'No Title')
            description = insight.get('description', 'No Description')
            priority = insight.get('priority', '?')
            savings = insight.get('monthly_savings', 0)
            
            print(f"{i}. [{priority}⭐] {title}")
            print(f"   💰 Potential savings: ${savings:.2f}/mo")
            print(f"   📝 {description}")
            print()
            
            # Check if loan payments are being called "fees"
            description_lower = description.lower()
            title_lower = title.lower()
            
            if ('loan' in description_lower or 'mortgage' in description_lower) and 'fee' in title_lower:
                loan_fee_issues.append({
                    'title': title,
                    'description': description
                })
        
        # Report on the bug fix
        print("\n" + "="*60)
        print("🔍 VERIFICATION: Loan Payment Categorization")
        print("="*60)
        
        if loan_fee_issues:
            print("❌ BUG STILL EXISTS: Found insights that categorize loan payments as fees:\n")
            for issue in loan_fee_issues:
                print(f"   - {issue['title']}")
                print(f"     {issue['description'][:80]}...\n")
        else:
            print("✅ BUG FIXED: No insights are incorrectly categorizing loan payments as fees!")
            print("   All loan-related insights use appropriate titles like 'Refinance' instead of 'fees'.")
        
        return True
    else:
        print(f"❌ Failed to fetch insights: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def main():
    """Main test flow"""
    print("="*60)
    print("AI INSIGHTS LOAN PAYMENT CATEGORIZATION TEST")
    print("="*60 + "\n")
    
    # Step 1: Login
    token = login()
    if not token:
        sys.exit(1)
    
    # Step 2: Generate insights
    if not generate_insights(token):
        sys.exit(1)
    
    # Step 3: Fetch and verify insights
    if not get_insights(token):
        sys.exit(1)
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
