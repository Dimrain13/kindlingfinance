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
user_settings_collection = db['user_settings']
accounts_collection = db['accounts']
transactions_collection = db['transactions']
transaction_splits_collection = db['transaction_splits']
budgets_collection = db['budgets']
bills_collection = db['bills']
goals_collection = db['goals']
plaid_items_collection = db['plaid_items']
insights_collection = db['insights']
sessions_collection = db['sessions']
crypto_holdings_collection = db['crypto_holdings']
net_worth_snapshots_collection = db['net_worth_snapshots']
investment_snapshots_collection = db['investment_snapshots']
investment_holdings_collection = db['investment_holdings']
recurring_transactions_collection = db['recurring_transactions']
transaction_rules_collection = db['transaction_rules']
transaction_tags_collection = db['transaction_tags']
transaction_tag_assignments_collection = db['transaction_tag_assignments']
merchant_rules_collection = db['merchant_rules']
account_groups_collection = db['account_groups']
user_alerts_collection = db['user_alerts']
alert_settings_collection = db['alert_settings']

async def init_db():
    """Initialize database indexes"""
    await users_collection.create_index("email", unique=True)
    await user_settings_collection.create_index("user_id", unique=True)
    await accounts_collection.create_index("user_id")
    await transactions_collection.create_index("user_id")
    await transactions_collection.create_index("date")
    await transaction_splits_collection.create_index("transaction_id")
    await transaction_splits_collection.create_index("user_id")
    await budgets_collection.create_index("user_id")
    await bills_collection.create_index("user_id")
    await goals_collection.create_index("user_id")
    await plaid_items_collection.create_index("user_id")
    await insights_collection.create_index("user_id")
    await sessions_collection.create_index("session_token", unique=True)
    await sessions_collection.create_index("user_id")
    await sessions_collection.create_index("expires_at")
    await crypto_holdings_collection.create_index("user_id")
    await net_worth_snapshots_collection.create_index("user_id")
    await net_worth_snapshots_collection.create_index("snapshot_date")
    await investment_snapshots_collection.create_index("user_id")
    await investment_snapshots_collection.create_index("snapshot_date")
    await investment_holdings_collection.create_index("user_id")
    await investment_holdings_collection.create_index("account_id")
    await recurring_transactions_collection.create_index("user_id")
    await transaction_rules_collection.create_index("user_id")
    await transaction_rules_collection.create_index("priority")
    await transaction_tags_collection.create_index("user_id")
    await transaction_tag_assignments_collection.create_index("transaction_id")
    await transaction_tag_assignments_collection.create_index("tag_id")
    await merchant_rules_collection.create_index("user_id")
    await merchant_rules_collection.create_index("original_name")
    await account_groups_collection.create_index("user_id")
    await user_alerts_collection.create_index("user_id")
    await user_alerts_collection.create_index("created_at")
    await alert_settings_collection.create_index("user_id", unique=True)
