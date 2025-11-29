"""
Script to fix account_id mapping in transactions
Maps Plaid account IDs to local database account IDs
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

async def fix_account_ids():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["finance_db"]
    
    accounts_collection = db['accounts']
    transactions_collection = db['transactions']
    
    print("🔧 FIXING ACCOUNT ID MAPPINGS\n")
    
    # Get all accounts with their Plaid IDs
    accounts = await accounts_collection.find({}).to_list(1000)
    
    # Create mapping: plaid_account_id -> local account id
    plaid_to_local = {}
    for acc in accounts:
        plaid_id = acc.get('plaid_account_id')
        if plaid_id:
            plaid_to_local[plaid_id] = acc['id']
            print(f"Mapping: {acc.get('name', 'Unknown')[:30]:30} | Plaid: {plaid_id[:15]}... -> Local: {acc['id'][:15]}...")
    
    print(f"\n📊 Found {len(plaid_to_local)} account mappings")
    
    # Get all transactions
    transactions = await transactions_collection.find({}).to_list(10000)
    
    print(f"📊 Processing {len(transactions)} transactions...\n")
    
    updated_count = 0
    for txn in transactions:
        current_account_id = txn.get('account_id')
        
        # Check if account_id is a Plaid ID that needs mapping
        if current_account_id in plaid_to_local:
            local_account_id = plaid_to_local[current_account_id]
            
            # Update the transaction
            await transactions_collection.update_one(
                {"id": txn['id']},
                {"$set": {"account_id": local_account_id}}
            )
            updated_count += 1
            
            if updated_count % 50 == 0:
                print(f"Updated {updated_count} transactions...")
    
    print(f"\n✅ COMPLETE: Updated {updated_count} transactions with correct account IDs")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_account_ids())
