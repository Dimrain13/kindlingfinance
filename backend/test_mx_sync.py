"""
Test MX Data Sync - Verify data format matches app expectations
"""
import asyncio
import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from motor.motor_asyncio import AsyncIOMotorClient
from mx_service import mx_service


async def test_mx_data_sync():
    """Test that MX data format matches what the app expects"""
    
    # Use test user
    test_user_id = "daniel.r.millner@gmail.com"
    
    print("=" * 60)
    print("MX DATA SYNC TEST")
    print("=" * 60)
    
    try:
        # Test 1: Get accounts from MX
        print("\n1. Testing MX Account Fetch...")
        mx_accounts = await mx_service.list_accounts(test_user_id)
        print(f"   ✓ Found {len(mx_accounts)} accounts from MX")
        
        if mx_accounts:
            sample_account = mx_accounts[0]
            print(f"\n   Sample MX Account Data:")
            print(f"   - guid: {sample_account.get('guid')}")
            print(f"   - name: {sample_account.get('name')}")
            print(f"   - type: {sample_account.get('type')}")
            print(f"   - balance: {sample_account.get('balance')}")
            print(f"   - institution: {sample_account.get('institution_name')}")
        
        # Test 2: Get transactions from MX
        print("\n2. Testing MX Transaction Fetch...")
        mx_transactions = await mx_service.get_transactions(test_user_id)
        print(f"   ✓ Found {len(mx_transactions)} transactions from MX")
        
        if mx_transactions:
            sample_txn = mx_transactions[0]
            print(f"\n   Sample MX Transaction Data:")
            print(f"   - guid: {sample_txn.get('guid')}")
            print(f"   - description: {sample_txn.get('description')}")
            print(f"   - amount: {sample_txn.get('amount')}")
            print(f"   - date: {sample_txn.get('transacted_at')}")
            print(f"   - category: {sample_txn.get('category')}")
            print(f"   - top_level_category: {sample_txn.get('top_level_category')}")
        
        # Test 3: Check database format
        print("\n3. Testing Database Format...")
        mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        db = client['financial_app']
        
        # Check accounts
        db_accounts = await db.accounts.find({"user_id": test_user_id}).to_list(10)
        print(f"   ✓ Found {len(db_accounts)} accounts in database")
        
        if db_accounts:
            sample = db_accounts[0]
            print(f"\n   Sample Database Account:")
            print(f"   - Required fields check:")
            required_fields = ["id", "user_id", "name", "account_type", "balance", "institution_name", "currency"]
            for field in required_fields:
                has_field = field in sample
                field_type = type(sample.get(field)).__name__ if has_field else "missing"
                status = "✓" if has_field else "✗"
                print(f"     {status} {field}: {field_type}")
            
            # Check balance is float, not dict
            if isinstance(sample.get("balance"), dict):
                print(f"     ✗ ERROR: balance is dict, should be float!")
            else:
                print(f"     ✓ balance is correct type: {type(sample.get('balance')).__name__}")
        
        # Check transactions
        db_transactions = await db.transactions.find({"user_id": test_user_id}).to_list(10)
        print(f"\n   ✓ Found {len(db_transactions)} transactions in database")
        
        if db_transactions:
            sample = db_transactions[0]
            print(f"\n   Sample Database Transaction:")
            print(f"   - Required fields check:")
            required_fields = ["id", "user_id", "account_id", "amount", "description", "transaction_type", "category", "date"]
            for field in required_fields:
                has_field = field in sample
                field_type = type(sample.get(field)).__name__ if has_field else "missing"
                status = "✓" if has_field else "✗"
                print(f"     {status} {field}: {field_type}")
            
            # Check transaction_type is present
            if "transaction_type" not in sample:
                print(f"     ✗ ERROR: transaction_type missing!")
            else:
                print(f"     ✓ transaction_type: {sample.get('transaction_type')}")
        
        print("\n" + "=" * 60)
        print("TEST COMPLETE")
        print("=" * 60)
        
        # Summary
        issues = []
        if db_accounts and isinstance(db_accounts[0].get("balance"), dict):
            issues.append("Account balance is dict instead of float")
        if db_transactions and "transaction_type" not in db_transactions[0]:
            issues.append("Transaction missing transaction_type field")
        
        if issues:
            print("\n⚠️  ISSUES FOUND:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("\n✅ All data format checks passed!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_mx_data_sync())
