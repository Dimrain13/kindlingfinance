"""
Test script to capture and display MX API responses
Run this after connecting an account via the widget
"""
import asyncio
import json
from mx_service import mx_service

async def inspect_mx_data():
    user_id = "5929a516-13c9-41d3-af18-fa5a89476112"
    
    print("=" * 80)
    print("MX API RESPONSE INSPECTOR")
    print("=" * 80)
    
    try:
        # Get MX user GUID
        user_guid = await mx_service.get_or_create_user(user_id)
        print(f"\n✅ MX User GUID: {user_guid}\n")
        
        # 1. Check Members (Institutions)
        print("=" * 80)
        print("1. MEMBERS (Connected Institutions)")
        print("=" * 80)
        members = await mx_service.list_members(user_id)
        print(f"\nFound {len(members)} member(s)\n")
        
        for i, member in enumerate(members, 1):
            print(f"Member #{i}:")
            print(json.dumps(member, indent=2, default=str))
            print()
        
        # 2. Check Accounts
        print("=" * 80)
        print("2. ACCOUNTS")
        print("=" * 80)
        accounts = await mx_service.list_accounts(user_id)
        print(f"\nFound {len(accounts)} account(s)\n")
        
        for i, account in enumerate(accounts, 1):
            print(f"Account #{i}:")
            print(json.dumps(account, indent=2, default=str))
            print()
            
            # Show which fields we're using in our mapping
            print("  📋 Fields used in our mapping:")
            print(f"    - guid: {account.get('guid')}")
            print(f"    - name: {account.get('name')}")
            print(f"    - type: {account.get('type')}")
            print(f"    - balance: {account.get('balance')}")
            print(f"    - available_balance: {account.get('available_balance')}")
            print(f"    - institution_name: {account.get('institution_name')}")
            print(f"    - account_number: {account.get('account_number')}")
            print(f"    - member_guid: {account.get('member_guid')}")
            print(f"    - currency_code: {account.get('currency_code')}")
            print()
        
        # 3. Check Transactions
        print("=" * 80)
        print("3. TRANSACTIONS (Last 10)")
        print("=" * 80)
        transactions = await mx_service.get_transactions(user_id)
        print(f"\nFound {len(transactions)} total transaction(s)\n")
        
        for i, txn in enumerate(transactions[:10], 1):
            print(f"Transaction #{i}:")
            print(json.dumps(txn, indent=2, default=str))
            print()
            
            # Show which fields we're using in our mapping
            print("  📋 Fields used in our mapping:")
            print(f"    - guid: {txn.get('guid')}")
            print(f"    - description: {txn.get('description')}")
            print(f"    - amount: {txn.get('amount')}")
            print(f"    - date (transacted_at): {txn.get('transacted_at')}")
            print(f"    - date (posted_at): {txn.get('posted_at')}")
            print(f"    - category: {txn.get('category')}")
            print(f"    - top_level_category: {txn.get('top_level_category')}")
            print(f"    - merchant_name: {txn.get('merchant_name')}")
            print(f"    - account_guid: {txn.get('account_guid')}")
            print(f"    - is_pending: {txn.get('is_pending')}")
            print()
        
        print("=" * 80)
        print("✅ INSPECTION COMPLETE")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(inspect_mx_data())
