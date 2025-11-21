from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Collections
users_collection = db['users']
accounts_collection = db['accounts']
transactions_collection = db['transactions']
budgets_collection = db['budgets']
bills_collection = db['bills']
plaid_items_collection = db['plaid_items']
insights_collection = db['insights']

async def init_db():
    """Initialize database indexes"""
    await users_collection.create_index("email", unique=True)
    await accounts_collection.create_index("user_id")
    await transactions_collection.create_index("user_id")
    await transactions_collection.create_index("date")
    await budgets_collection.create_index("user_id")
    await bills_collection.create_index("user_id")
    await plaid_items_collection.create_index("user_id")
    await insights_collection.create_index("user_id")
