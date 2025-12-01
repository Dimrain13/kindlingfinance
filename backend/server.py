from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
import uuid
from typing import List, Optional
import httpx

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import local modules
from database import (
    db, init_db, users_collection, user_settings_collection, accounts_collection, 
    transactions_collection, transaction_splits_collection, budgets_collection, bills_collection, goals_collection,
    plaid_items_collection, insights_collection, sessions_collection, crypto_holdings_collection,
    net_worth_snapshots_collection, investment_snapshots_collection, investment_holdings_collection,
    recurring_transactions_collection, transaction_rules_collection,
    transaction_tags_collection, merchant_rules_collection, account_groups_collection, user_alerts_collection
)
from models import (
    UserCreate, UserLogin, User, Token,
    UserSettings, UserSettingsUpdate,
    AccountCreate, Account,
    TransactionCreate, Transaction,
    TransactionSplitCreate, TransactionSplit,
    BudgetCreate, Budget,
    BillCreate, Bill,
    GoalCreate, GoalUpdate, Goal, GoalType,
    PlaidLinkTokenRequest, PlaidExchangeTokenRequest,
    AIInsight, DashboardStats, SpendingByCategory,
    AccountType, TransactionType,
    ProcessSessionRequest, SessionResponse,
    CryptoSourceType, CryptoChain,
    CryptoSourceCreate, CryptoSource, CryptoHolding,
    CryptoValueHistory, CryptoPriceResponse,
    CryptoHoldingCreate, CryptoHoldingUpdate
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from plaid_service import PlaidService
from ai_service import ai_service
from advanced_features import router as advanced_router
from crypto_service import (
    fetch_wallet_balance_btc,
    fetch_wallet_balance_eth,
    fetch_coinbase_holdings,
    fetch_crypto_prices,
    encrypt_api_key
)
from routes.bills_routes import router as bills_router
# from routes.gamification_routes import router as gamification_router  # Disabled - Sage the Owl removed
from routes.investments_routes import router as investments_router
from routes.analytics_routes import router as analytics_router
from routes.alerts_routes import router as alerts_router
from routes.subscriptions_routes import router as subscriptions_router
from routes.household_routes import router as household_router
from routes.budgets_routes import router as budgets_router
from routes.budget_suggestions_routes import router as budget_suggestions_router
from routes.financial_health_routes import router as financial_health_router
from routes.duplicate_accounts_routes import router as duplicate_accounts_router

# Create FastAPI app
app = FastAPI(title="FinanceHub API", version="1.0.0")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    await init_db()
    
    # Create indexes for better performance and data integrity
    print("📊 Creating database indexes...")
    try:
        # Unique index on plaid_transaction_id to prevent duplicates
        await transactions_collection.create_index(
            [("plaid_transaction_id", 1)],
            unique=True,
            sparse=True,  # Allow null values
            name="plaid_transaction_id_unique"
        )
        
        # Composite index for faster user transaction queries
        await transactions_collection.create_index(
            [("user_id", 1), ("date", -1)],
            name="user_date_index"
        )
        
        # Index for deleted transactions (soft delete)
        await transactions_collection.create_index(
            [("deleted_at", 1)],
            sparse=True,
            name="deleted_at_index"
        )
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"⚠️  Index creation warning (may already exist): {e}")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    await users_collection.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
    user = User(id=user_id, email=user_data.email, name=user_data.name, created_at=user_doc["created_at"])
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    user_doc = await users_collection.find_one({"email": credentials.email})
    
    if not user_doc or not verify_password(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user_doc["id"]})
    
    user = User(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        created_at=user_doc["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(user_id: str = Depends(get_current_user)):
    """Get current user info"""
    user_doc = await users_collection.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        created_at=user_doc["created_at"]
    )

# ==================== GOOGLE OAUTH ENDPOINTS ====================

@api_router.post("/auth/google/process-session", response_model=SessionResponse)
async def process_google_session(request: ProcessSessionRequest, response: Response):
    """
    Process session_id from Emergent Auth and create session_token
    """
    try:
        # Call Emergent Auth API to get user data
        async with httpx.AsyncClient() as client:
            emergent_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id},
                timeout=10.0
            )
            
            if emergent_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            user_data = emergent_response.json()
        
        # Check if user exists by email
        user_doc = await users_collection.find_one({"email": user_data["email"]})
        
        if user_doc:
            # User exists - don't update existing data
            user_id = user_doc["id"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": user_data["email"],
                "name": user_data.get("name", user_data["email"].split("@")[0]),
                "password": None,  # No password for OAuth users
                "created_at": datetime.now(timezone.utc)
            }
            await users_collection.insert_one(new_user)
        
        # Create session with 7-day expiry
        session_token = user_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Store session in database
        await sessions_collection.insert_one(session_doc)
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,  # 7 days in seconds
            path="/"
        )
        
        # Get fresh user doc
        user_doc = await users_collection.find_one({"id": user_id})
        
        user = User(
            id=user_doc["id"],
            email=user_doc["email"],
            name=user_doc["name"],
            created_at=user_doc["created_at"]
        )
        
        return SessionResponse(session_token=session_token, user=user)
    
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to auth service: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process session: {str(e)}")

@api_router.post("/auth/logout")
async def logout(response: Response, user_id: str = Depends(get_current_user)):
    """
    Logout user - clear session and cookie
    """
    try:
        # Delete all sessions for this user
        await sessions_collection.delete_many({"user_id": user_id})
        
        # Clear cookie
        response.delete_cookie(
            key="session_token",
            path="/",
            secure=True,
            samesite="none"
        )
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


# ==================== USER SETTINGS ENDPOINTS ====================

@api_router.get("/user/settings", response_model=UserSettings)
async def get_user_settings(user_id: str = Depends(get_current_user)):
    """Get user settings"""
    settings_doc = await user_settings_collection.find_one({"user_id": user_id}, {"_id": 0})
    
    if not settings_doc:
        # Return default settings if none exist
        default_settings = {
            "user_id": user_id,
            "family_size": 1,
            "has_children": False,
            "primary_goals": [],
            "risk_tolerance": "moderate",
            "monthly_income": None,
            "credit_score": None,
            "updated_at": datetime.utcnow()
        }
        await user_settings_collection.insert_one(default_settings)
        return UserSettings(**default_settings)
    
    return UserSettings(**settings_doc)

@api_router.put("/user/settings")
async def update_user_settings(
    settings: UserSettingsUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update user settings"""
    # Get existing settings or create new
    existing = await user_settings_collection.find_one({"user_id": user_id})
    
    if not existing:
        # Create new settings
        settings_doc = {
            "user_id": user_id,
            "family_size": settings.family_size or 1,
            "has_children": settings.has_children or False,
            "primary_goals": settings.primary_goals or [],
            "risk_tolerance": settings.risk_tolerance or "moderate",
            "monthly_income": settings.monthly_income,
            "credit_score": settings.credit_score,
            "updated_at": datetime.utcnow()
        }
        await user_settings_collection.insert_one(settings_doc)
    else:
        # Update existing settings
        update_data = {"updated_at": datetime.utcnow()}
        if settings.family_size is not None:
            update_data["family_size"] = settings.family_size
        if settings.has_children is not None:
            update_data["has_children"] = settings.has_children
        if settings.primary_goals is not None:
            update_data["primary_goals"] = settings.primary_goals
        if settings.risk_tolerance is not None:
            update_data["risk_tolerance"] = settings.risk_tolerance
        if settings.monthly_income is not None:
            update_data["monthly_income"] = settings.monthly_income
        if settings.credit_score is not None:
            update_data["credit_score"] = settings.credit_score
        
        await user_settings_collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
    
    # Return updated settings
    updated_doc = await user_settings_collection.find_one({"user_id": user_id}, {"_id": 0})
    return {"message": "Settings updated", "settings": UserSettings(**updated_doc)}

# ==================== PLAID ENDPOINTS ====================

@api_router.post("/plaid/create-link-token")
async def create_link_token(user_id: str = Depends(get_current_user)):
    """Create Plaid Link token"""
    try:
        print(f"Creating Plaid link token for user: {user_id}")
        result = await PlaidService.create_link_token(user_id)
        print("Successfully created link token")
        return result
    except Exception as e:
        error_msg = str(e)
        print(f"ERROR creating link token: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

@api_router.post("/plaid/exchange-token")
async def exchange_public_token(
    request: PlaidExchangeTokenRequest,
    user_id: str = Depends(get_current_user)
):
    """Exchange public token for access token and sync accounts"""
    try:
        # Exchange token
        result = await PlaidService.exchange_public_token(request.public_token)
        access_token = result["access_token"]
        item_id = result["item_id"]
        
        # Get institution name
        institution_name = await PlaidService.get_institution_name(access_token)
        
        # Check if this Plaid item already exists
        existing_item = await plaid_items_collection.find_one({
            "user_id": user_id,
            "item_id": item_id
        })
        
        if existing_item:
            # Update the access token if it changed
            await plaid_items_collection.update_one(
                {"id": existing_item["id"]},
                {"$set": {"access_token": access_token}}
            )
            plaid_item_doc = existing_item
            print(f"Updating existing Plaid item: {institution_name}")
        else:
            # Store new Plaid item
            plaid_item_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "item_id": item_id,
                "access_token": access_token,
                "institution_name": institution_name,
                "cursor": None,
                "created_at": datetime.utcnow()
            }
            await plaid_items_collection.insert_one(plaid_item_doc)
            print(f"Created new Plaid item: {institution_name}")
        
        # Get and store accounts
        plaid_accounts = await PlaidService.get_accounts(access_token)
        
        new_accounts = 0
        skipped_accounts = 0
        
        for plaid_account in plaid_accounts:
            # Check if this account already exists for this user
            existing_account = await accounts_collection.find_one({
                "user_id": user_id,
                "plaid_account_id": plaid_account.account_id
            })
            
            if existing_account:
                print(f"Skipping duplicate account: {plaid_account.name} (****{plaid_account.mask})")
                skipped_accounts += 1
                
                # Ensure proper sign for balance update
                liability_types = ["credit_card", "mortgage", "loan"]
                raw_balance = float(plaid_account.balances.current or 0)
                account_type = existing_account.get("account_type")
                
                if account_type in liability_types:
                    balance = -abs(raw_balance) if raw_balance != 0 else 0
                else:
                    balance = abs(raw_balance) if raw_balance != 0 else 0
                
                # Update the balance of existing account
                await accounts_collection.update_one(
                    {"id": existing_account["id"]},
                    {"$set": {
                        "balance": balance,
                        "updated_at": datetime.utcnow()
                    }}
                )
                continue
            
            # Convert Plaid enum types to strings and map to our enum values
            raw_type = str(plaid_account.subtype.value) if plaid_account.subtype else str(plaid_account.type.value)
            
            # Map Plaid types to our AccountType enum
            type_mapping = {
                'checking': 'checking',
                'savings': 'savings',
                'credit card': 'credit_card',
                'credit': 'credit_card',
                'loan': 'loan',
                'auto': 'loan',
                'commercial': 'loan',
                'construction': 'loan',
                'consumer': 'loan',
                'home equity': 'loan',
                'line of credit': 'loan',
                'mortgage': 'mortgage',
                'overdraft': 'loan',
                'student': 'loan',
                'brokerage': 'investment',
                'ira': 'investment',
                'retirement': 'investment',
                '401k': 'investment',
                'crypto exchange': 'crypto',
            }
            
            account_type = type_mapping.get(raw_type.lower(), 'manual')
            
            # Ensure proper sign for balance based on account type
            liability_types = ["credit_card", "mortgage", "loan"]
            raw_balance = float(plaid_account.balances.current or 0)
            
            if account_type in liability_types:
                # Liabilities should be stored as negative
                balance = -abs(raw_balance) if raw_balance != 0 else 0
            else:
                # Assets should be stored as positive
                balance = abs(raw_balance) if raw_balance != 0 else 0
            
            account_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": plaid_account.name,
                "account_type": account_type,
                "balance": balance,
                "institution_name": institution_name,
                "plaid_account_id": plaid_account.account_id,
                "plaid_item_id": item_id,
                "currency": plaid_account.balances.iso_currency_code or "USD",
                "mask": plaid_account.mask,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await accounts_collection.insert_one(account_doc)
            new_accounts += 1
            print(f"Added new account: {plaid_account.name} (****{plaid_account.mask})")
        
        # Sync transactions in background (will auto-categorize with AI)
        print(f"Starting transaction sync for {institution_name}")
        await sync_plaid_transactions(plaid_item_doc["id"], user_id)
        print("Transaction sync complete")
        
        # Build response message
        message_parts = []
        if new_accounts > 0:
            message_parts.append(f"Added {new_accounts} new account(s)")
        if skipped_accounts > 0:
            message_parts.append(f"Skipped {skipped_accounts} duplicate account(s)")
        
        message = " and ".join(message_parts) if message_parts else "No new accounts added"
        
        return {
            "message": message, 
            "institution": institution_name,
            "new_accounts": new_accounts,
            "skipped_accounts": skipped_accounts,
            "info": "Account balances updated" if skipped_accounts > 0 else "Transactions synced"
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def sync_plaid_transactions(plaid_item_db_id: str, user_id: str):
    """Sync transactions for a Plaid item"""
    # Get plaid item
    plaid_item = await plaid_items_collection.find_one({"id": plaid_item_db_id})
    if not plaid_item:
        print(f"Plaid item not found: {plaid_item_db_id}")
        return
    
    access_token = plaid_item["access_token"]
    cursor = plaid_item.get("cursor")
    
    print(f"Syncing transactions for user {user_id}, cursor: {cursor}")
    
    # Sync transactions
    result = await PlaidService.sync_transactions(access_token, cursor)
    
    print(f"Sync result: {len(result['added'])} added, {len(result['modified'])} modified, {len(result['removed'])} removed")
    
    # Process added transactions
    for txn in result["added"]:
        from category_mapping import get_transaction_type_from_category
        
        # Use Plaid's category for now (can be batch categorized with AI later)
        # Plaid provides categories like ['Food and Drink', 'Restaurants']
        plaid_category = txn.personal_finance_category.primary if hasattr(txn, 'personal_finance_category') and txn.personal_finance_category else 'Other'
        category = plaid_category
        ai_categorized = False
        
        # Determine transaction type from amount (negative = expense, positive = income)
        txn_type = 'expense' if txn.amount > 0 else 'income'  # Plaid uses positive for debits
        
        # Convert date to string format for MongoDB
        if hasattr(txn.date, 'strftime'):
            txn_date = txn.date.strftime('%Y-%m-%d')
        else:
            txn_date = str(txn.date)
        
        # Map Plaid account ID to local account ID
        plaid_account_id = txn.account_id
        local_account = await accounts_collection.find_one({
            "user_id": user_id,
            "plaid_account_id": plaid_account_id
        })
        local_account_id = local_account['id'] if local_account else plaid_account_id
        
        txn_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "account_id": local_account_id,
            "plaid_transaction_id": txn.transaction_id,
            "amount": float(txn.amount),
            "description": txn.name,
            "transaction_type": txn_type,
            "category": category,
            "date": txn_date,
            "merchant_name": txn.merchant_name or txn.name,
            "is_recurring": False,
            "pending": txn.pending,
            "ai_categorized": ai_categorized,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Check if transaction already exists (idempotency)
        existing = await transactions_collection.find_one({"plaid_transaction_id": txn.transaction_id})
        if not existing:
            await transactions_collection.insert_one(txn_doc)
            print(f"✅ Inserted transaction: {txn.name} - ${txn.amount}")
        else:
            print(f"⏭️  Transaction already exists: {txn.transaction_id}")
    
    # Process modified transactions
    for txn in result["modified"]:
        # Update existing transaction with new data
        plaid_category = txn.personal_finance_category.primary if hasattr(txn, 'personal_finance_category') and txn.personal_finance_category else 'Other'
        txn_type = 'expense' if txn.amount > 0 else 'income'
        
        if hasattr(txn.date, 'strftime'):
            txn_date = txn.date.strftime('%Y-%m-%d')
        else:
            txn_date = str(txn.date)
        
        update_data = {
            "amount": float(txn.amount),
            "description": txn.name,
            "transaction_type": txn_type,
            "category": plaid_category,
            "date": txn_date,
            "merchant_name": txn.merchant_name or txn.name,
            "pending": txn.pending,
            "updated_at": datetime.utcnow()
        }
        
        result_update = await transactions_collection.update_one(
            {"plaid_transaction_id": txn.transaction_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result_update.modified_count > 0:
            print(f"🔄 Updated transaction: {txn.name} - ${txn.amount}")
    
    # Process removed transactions (mark as deleted, don't actually delete)
    for txn_id in result["removed"]:
        result_delete = await transactions_collection.update_one(
            {"plaid_transaction_id": txn_id, "user_id": user_id},
            {"$set": {"deleted_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        
        if result_delete.modified_count > 0:
            print(f"🗑️  Marked transaction as deleted: {txn_id}")
    
    # Update cursor
    await plaid_items_collection.update_one(
        {"id": plaid_item_db_id},
        {"$set": {"cursor": result["cursor"]}}
    )
    
    print(f"Transaction sync complete. Updated cursor to: {result['cursor']}")

@api_router.post("/plaid/sync")
async def sync_transactions(user_id: str = Depends(get_current_user)):
    """Manually sync all Plaid transactions"""
    plaid_items = await plaid_items_collection.find({"user_id": user_id}).to_list(100)
    
    for item in plaid_items:
        await sync_plaid_transactions(item["id"], user_id)
    
    return {"message": "Transactions synced successfully"}


@api_router.post("/plaid/sync-historical")
async def sync_historical_transactions(user_id: str = Depends(get_current_user)):
    """
    Sync up to 2 years of historical transactions from Plaid
    Note: Plaid typically provides 2 years of history for most institutions
    """
    from datetime import timedelta
    
    plaid_items = await plaid_items_collection.find({"user_id": user_id}).to_list(100)
    
    if not plaid_items:
        raise HTTPException(status_code=404, detail="No Plaid accounts connected")
    
    total_synced = 0
    
    for item in plaid_items:
        access_token = item["access_token"]
        
        # Request transactions for the last 2 years
        start_date = (datetime.now(timezone.utc) - timedelta(days=730)).strftime('%Y-%m-%d')
        end_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        try:
            # Use Plaid's /transactions/get endpoint for historical data
            result = await PlaidService.get_transactions(access_token, start_date, end_date)
            
            # Get account mapping for this item
            account_mapping = {}
            accounts = await accounts_collection.find({
                "user_id": user_id,
                "plaid_item_id": item["plaid_item_id"]
            }).to_list(100)
            
            for acc in accounts:
                if acc.get('plaid_account_id'):
                    account_mapping[acc['plaid_account_id']] = acc['id']
            
            # Process transactions
            for txn in result.get('transactions', []):
                from category_mapping import get_transaction_type_from_category
                
                # Map Plaid account ID to local account ID
                plaid_acc_id = txn.account_id if hasattr(txn, 'account_id') else None
                local_acc_id = account_mapping.get(plaid_acc_id, plaid_acc_id)
                
                # Determine transaction type
                txn_type = 'expense' if txn.amount > 0 else 'income'
                
                # Get category
                plaid_category = txn.personal_finance_category.primary if hasattr(txn, 'personal_finance_category') and txn.personal_finance_category else 'Other'
                
                # Format date
                if hasattr(txn.date, 'strftime'):
                    txn_date = txn.date.strftime('%Y-%m-%d')
                else:
                    txn_date = str(txn.date)
                
                txn_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "account_id": local_acc_id,
                    "plaid_transaction_id": txn.transaction_id,
                    "amount": float(txn.amount),
                    "description": txn.name,
                    "transaction_type": txn_type,
                    "category": plaid_category,
                    "date": txn_date,
                    "merchant_name": txn.merchant_name or txn.name,
                    "is_recurring": False,
                    "pending": txn.pending,
                    "ai_categorized": False,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                # Check if already exists
                existing = await transactions_collection.find_one({"plaid_transaction_id": txn.transaction_id})
                if not existing:
                    await transactions_collection.insert_one(txn_doc)
                    total_synced += 1
        
        except Exception as e:
            print(f"Error syncing historical data: {e}")
            continue
    
    return {
        "message": f"Historical sync complete: {total_synced} new transactions added",
        "transactions_synced": total_synced
    }


# ==================== ACCOUNT ENDPOINTS ====================

@api_router.post("/accounts", response_model=Account)
async def create_account(account_data: AccountCreate, user_id: str = Depends(get_current_user)):
    """Create a manual account"""
    # Ensure proper sign for liabilities
    liability_types = ["credit_card", "mortgage", "loan"]
    balance = account_data.balance
    
    if account_data.account_type in liability_types:
        # Liabilities should be stored as negative or zero
        balance = -abs(balance) if balance != 0 else 0
    else:
        # Assets should be stored as positive or zero
        balance = abs(balance) if balance != 0 else 0
    
    account_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": account_data.name,
        "account_type": account_data.account_type,
        "balance": balance,
        "institution_name": account_data.institution_name,
        "plaid_account_id": None,
        "plaid_item_id": None,
        "currency": account_data.currency,
        "mask": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await accounts_collection.insert_one(account_doc)
    return Account(**account_doc)

@api_router.get("/accounts", response_model=List[Account])
async def get_accounts(user_id: str = Depends(get_current_user)):
    """Get all accounts for user"""
    accounts = await accounts_collection.find({"user_id": user_id}).to_list(100)
    return [Account(**acc) for acc in accounts]

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user_id: str = Depends(get_current_user)):
    """Delete an account"""
    result = await accounts_collection.delete_one({"id": account_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted"}

# ==================== TRANSACTION ENDPOINTS ====================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(txn_data: TransactionCreate, user_id: str = Depends(get_current_user)):
    """Create a manual transaction"""
    from category_mapping import get_transaction_type_from_category
    
    # Verify account belongs to user
    account = await accounts_collection.find_one({"id": txn_data.account_id, "user_id": user_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Use AI to categorize if no category
    category = txn_data.category
    ai_categorized = False
    if not category:
        category = await ai_service.categorize_transaction(
            txn_data.description,
            txn_data.amount,
            txn_data.merchant_name
        )
        ai_categorized = True
    
    # Get transaction type from category
    txn_type = txn_data.transaction_type if txn_data.transaction_type else get_transaction_type_from_category(category)
    
    txn_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "account_id": txn_data.account_id,
        "plaid_transaction_id": None,
        "amount": txn_data.amount,
        "description": txn_data.description,
        "transaction_type": txn_type,
        "category": category,
        "date": txn_data.date,
        "merchant_name": txn_data.merchant_name,
        "is_recurring": txn_data.is_recurring,
        "pending": False,
        "ai_categorized": ai_categorized,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await transactions_collection.insert_one(txn_doc)
    
    # Update account balance
    if txn_type == "expense":
        new_balance = account["balance"] - txn_data.amount
    else:
        new_balance = account["balance"] + txn_data.amount
    
    await accounts_collection.update_one(
        {"id": txn_data.account_id},
        {"$set": {"balance": new_balance, "updated_at": datetime.utcnow()}}
    )
    
    return Transaction(**txn_doc)

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    limit: int = 50,
    skip: int = 0,
    reviewed: Optional[bool] = None,
    user_id: str = Depends(get_current_user)
):
    """Get transactions for user with optional review filter"""
    query = {
        "user_id": user_id,
        "deleted_at": {"$exists": False}  # Exclude soft-deleted transactions
    }
    
    # Add review filter if specified
    if reviewed is not None:
        query["reviewed"] = reviewed
    
    transactions = await transactions_collection.find(
        query,
        {"_id": 0}  # Exclude MongoDB _id field
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    return [Transaction(**txn) for txn in transactions]

@api_router.patch("/transactions/bulk-category")
async def update_bulk_category(
    bulk_update: dict,
    user_id: str = Depends(get_current_user)
):
    """Update category for all transactions from a specific merchant"""
    merchant_name = bulk_update.get('merchant_name')
    new_category = bulk_update.get('category')
    
    if not merchant_name or not new_category:
        raise HTTPException(status_code=400, detail="merchant_name and category are required")
    
    result = await transactions_collection.update_many(
        {"merchant_name": merchant_name, "user_id": user_id},
        {"$set": {
            "category": new_category,
            "ai_categorized": False,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": f"Updated {result.modified_count} transactions",
        "count": result.modified_count,
        "merchant": merchant_name,
        "category": new_category
    }


@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user_id: str = Depends(get_current_user)):
    """Delete a transaction"""
    result = await transactions_collection.delete_one({"id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}


@api_router.patch("/transactions/{transaction_id}")
async def update_transaction_category(
    transaction_id: str,
    category_update: dict,
    user_id: str = Depends(get_current_user)
):
    """Update transaction category"""
    new_category = category_update.get('category')
    if not new_category:
        raise HTTPException(status_code=400, detail="Category is required")
    
    result = await transactions_collection.update_one(
        {"id": transaction_id, "user_id": user_id},
        {"$set": {
            "category": new_category,
            "ai_categorized": False,  # Mark as manually categorized
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Category updated successfully", "category": new_category}


@api_router.patch("/transactions/{transaction_id}/review")
async def toggle_transaction_review(
    transaction_id: str,
    user_id: str = Depends(get_current_user)
):
    """Toggle transaction review status"""
    transaction = await transactions_collection.find_one(
        {"id": transaction_id, "user_id": user_id},
        {"_id": 0, "reviewed": 1}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    new_status = not transaction.get("reviewed", False)
    
    await transactions_collection.update_one(
        {"id": transaction_id, "user_id": user_id},
        {"$set": {
            "reviewed": new_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Review status updated", "reviewed": new_status}


@api_router.post("/transactions/mark-all-reviewed")
async def mark_all_reviewed(user_id: str = Depends(get_current_user)):
    """Mark all transactions as reviewed for current user"""
    result = await transactions_collection.update_many(
        {"user_id": user_id, "reviewed": False},
        {"$set": {
            "reviewed": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": f"Marked {result.modified_count} transactions as reviewed",
        "count": result.modified_count
    }


@api_router.get("/transactions/unreviewed-count")
async def get_unreviewed_count(user_id: str = Depends(get_current_user)):
    """Get count of unreviewed transactions"""
    count = await transactions_collection.count_documents({
        "user_id": user_id,
        "reviewed": False
    })
    
    return {"count": count}



@api_router.post("/transactions/bulk-update-type")
async def bulk_update_transaction_type(
    updates: dict,
    user_id: str = Depends(get_current_user)
):
    """Bulk update transaction types (for fixing miscategorized income/expenses)
    
    Expected format:
    {
        "updates": [
            {"id": "tx-id-1", "transaction_type": "transfer"},
            {"id": "tx-id-2", "transaction_type": "expense"}
        ]
    }
    """
    transaction_updates = updates.get("updates", [])
    
    if not transaction_updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updated_count = 0
    for update in transaction_updates:
        tx_id = update.get("id")
        new_type = update.get("transaction_type")
        
        if not tx_id or not new_type:
            continue
        
        # Validate transaction type
        if new_type not in ["income", "expense", "transfer"]:
            continue
        
        result = await transactions_collection.update_one(
            {"id": tx_id, "user_id": user_id},
            {"$set": {
                "transaction_type": new_type,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count > 0:
            updated_count += 1


@api_router.post("/transactions/deduplicate")
async def deduplicate_transactions(user_id: str = Depends(get_current_user)):
    """Remove duplicate transactions based on plaid_transaction_id, or date + amount + description"""
    from collections import defaultdict
    
    # Get all user transactions
    transactions = await transactions_collection.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(10000)
    
    # First pass: Remove exact Plaid ID duplicates
    plaid_id_groups = defaultdict(list)
    for tx in transactions:
        plaid_id = tx.get('plaid_transaction_id')
        if plaid_id:
            plaid_id_groups[plaid_id].append(tx)
    
    to_delete_ids = []
    for plaid_id, txns in plaid_id_groups.items():
        if len(txns) > 1:
            # Keep the oldest one (earliest created_at), delete rest
            txns_sorted = sorted(txns, key=lambda x: x.get('created_at', datetime.min))
            for tx in txns_sorted[1:]:
                to_delete_ids.append(tx['id'])
    
    # Second pass: Remove similar transactions (same date, amount, description)
    # Only for transactions without plaid_transaction_id (manual entries)
    similarity_groups = defaultdict(list)
    for tx in transactions:
        if tx['id'] not in to_delete_ids and not tx.get('plaid_transaction_id'):
            key = (tx['date'][:10], abs(tx['amount']), tx.get('description', '')[:50])
            similarity_groups[key].append(tx)
    
    for key, txns in similarity_groups.items():
        if len(txns) > 1:
            # Keep first, delete rest
            txns_sorted = sorted(txns, key=lambda x: x.get('created_at', datetime.min))
            for tx in txns_sorted[1:]:
                to_delete_ids.append(tx['id'])
    
    # Delete all duplicates
    if to_delete_ids:
        result = await transactions_collection.delete_many({
            "id": {"$in": to_delete_ids},
            "user_id": user_id
        })
        deleted_count = result.deleted_count
    else:
        deleted_count = 0
    
    return {
        "message": f"Removed {deleted_count} duplicate transactions",
        "duplicates_removed": deleted_count,
        "unique_transactions_remaining": len(transactions) - deleted_count
    }

    
    return {
        "message": f"Updated {updated_count} transactions",
        "updated_count": updated_count
    }


# ==================== BUDGET ENDPOINTS ====================

@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget_data: BudgetCreate, user_id: str = Depends(get_current_user)):
    """Create a budget"""
    budget_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "category": budget_data.category,
        "amount": budget_data.amount,
        "period": budget_data.period,
        "start_date": budget_data.start_date.isoformat() if budget_data.start_date else None,
        "rollover": budget_data.rollover,
        "rollover_amount": 0.0,
        "icon": budget_data.icon or "💰",
        "color": budget_data.color or "#3B82F6",
        "created_at": datetime.utcnow()
    }
    
    await budgets_collection.insert_one(budget_doc)
    return Budget(**budget_doc)

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(user_id: str = Depends(get_current_user)):
    """Get all budgets for user"""
    budgets = await budgets_collection.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return [Budget(**budget) for budget in budgets]

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user_id: str = Depends(get_current_user)):
    """Delete a budget"""
    result = await budgets_collection.delete_one({"id": budget_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}

# ==================== BILL ENDPOINTS ====================
# Moved to routes/bills_routes.py


# ==================== GOALS ENDPOINTS ====================

@api_router.post("/goals", response_model=Goal)
async def create_goal(goal_data: GoalCreate, user_id: str = Depends(get_current_user)):
    """Create a new financial goal"""
    goal_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Calculate progress percentage
    progress = 0.0
    if goal_data.target_amount > 0:
        progress = min((goal_data.current_amount / goal_data.target_amount) * 100, 100)
    
    goal_doc = {
        "id": goal_id,
        "user_id": user_id,
        "name": goal_data.name,
        "type": goal_data.type,
        "target_amount": goal_data.target_amount,
        "current_amount": goal_data.current_amount,
        "target_date": goal_data.target_date.isoformat() if goal_data.target_date else None,
        "linked_account_id": goal_data.linked_account_id,
        "icon": goal_data.icon or "🎯",
        "color": goal_data.color or "#3B82F6",
        "description": goal_data.description,
        "progress_percentage": progress,
        "created_at": now,
        "updated_at": now
    }
    
    await goals_collection.insert_one(goal_doc)
    
    return Goal(**goal_doc)

@api_router.get("/goals", response_model=List[Goal])
async def get_goals(user_id: str = Depends(get_current_user)):
    """Get all goals for the current user"""
    goals = await goals_collection.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return [Goal(**goal) for goal in goals]

@api_router.get("/goals/{goal_id}", response_model=Goal)
async def get_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific goal"""
    goal = await goals_collection.find_one({"id": goal_id, "user_id": user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return Goal(**goal)

@api_router.patch("/goals/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, goal_data: GoalUpdate, user_id: str = Depends(get_current_user)):
    """Update a goal"""
    goal = await goals_collection.find_one({"id": goal_id, "user_id": user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Update fields
    update_data = goal_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Recalculate progress if amounts changed
    target = update_data.get("target_amount", goal["target_amount"])
    current = update_data.get("current_amount", goal["current_amount"])
    
    if target > 0:
        update_data["progress_percentage"] = min((current / target) * 100, 100)
    
    # Convert date to string if present
    if "target_date" in update_data and update_data["target_date"]:
        update_data["target_date"] = update_data["target_date"].isoformat()
    
    await goals_collection.update_one(
        {"id": goal_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    updated_goal = await goals_collection.find_one({"id": goal_id}, {"_id": 0})
    return Goal(**updated_goal)

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    """Delete a goal"""
    result = await goals_collection.delete_one({"id": goal_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"message": "Goal deleted"}

@api_router.post("/goals/{goal_id}/deposit")
async def add_to_goal(goal_id: str, amount: float, user_id: str = Depends(get_current_user)):
    """Add money to a goal"""
    goal = await goals_collection.find_one({"id": goal_id, "user_id": user_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_current = goal["current_amount"] + amount
    progress = 0.0
    if goal["target_amount"] > 0:
        progress = min((new_current / goal["target_amount"]) * 100, 100)
    
    await goals_collection.update_one(
        {"id": goal_id},
        {
            "$set": {
                "current_amount": new_current,
                "progress_percentage": progress,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated_goal = await goals_collection.find_one({"id": goal_id}, {"_id": 0})
    return Goal(**updated_goal)


# Removed - do not create fake data
# @api_router.post("/test/seed-demo-data")
async def seed_demo_data_DISABLED(user_id: str = Depends(get_current_user)):
    """Create realistic demo transactions for calendar demonstration.
    This creates 2 years of recurring bills that will show on the calendar."""
    from datetime import timedelta
    
    # Monthly recurring bills
    monthly_bills = [
        {"description": "Wells Fargo Mortgage", "amount": -2147.00, "category": "Housing", "merchant": "Wells Fargo", "day_of_month": 5},
        {"description": "T-Mobile Wireless", "amount": -85.00, "category": "Utilities", "merchant": "T-Mobile", "day_of_month": 7},
        {"description": "Comcast Internet", "amount": -79.99, "category": "Utilities", "merchant": "Comcast", "day_of_month": 10},
        {"description": "DTE Energy", "amount": -142.50, "category": "Utilities", "merchant": "DTE Energy", "day_of_month": 12},
        {"description": "Netflix", "amount": -15.99, "category": "Entertainment", "merchant": "Netflix", "day_of_month": 15},
        {"description": "Spotify Premium", "amount": -10.99, "category": "Entertainment", "merchant": "Spotify", "day_of_month": 18},
        {"description": "Planet Fitness", "amount": -22.99, "category": "Health & Fitness", "merchant": "Planet Fitness", "day_of_month": 20},
        {"description": "Chase Auto Loan", "amount": -487.00, "category": "Transportation", "merchant": "Chase Auto Finance", "day_of_month": 22},
        {"description": "State Farm Insurance", "amount": -156.00, "category": "Insurance", "merchant": "State Farm", "day_of_month": 25},
        {"description": "Disney+", "amount": -13.99, "category": "Entertainment", "merchant": "Disney+", "day_of_month": 28},
    ]
    
    # Create transactions for last 24 months
    transactions_created = 0
    now = datetime.utcnow()
    
    for months_ago in range(24):
        for bill in monthly_bills:
            # Calculate the date
            target_date = now - timedelta(days=months_ago * 30)
            # Set to specific day of month
            try:
                transaction_date = target_date.replace(day=bill["day_of_month"])
            except ValueError:
                # Handle months with fewer days (e.g., Feb 30)
                transaction_date = target_date.replace(day=min(bill["day_of_month"], 28))
            
            # Format date as string for MongoDB
            date_str = transaction_date.strftime('%Y-%m-%d') if isinstance(transaction_date, datetime) else str(transaction_date)
            
            txn_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "account_id": "demo_account",  # Demo account ID
                "amount": bill["amount"],
                "description": bill["description"],
                "transaction_type": "expense",
                "category": bill["category"],
                "date": date_str,
                "merchant_name": bill["merchant"],
                "is_recurring": False,
                "pending": False,
                "ai_categorized": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await transactions_collection.insert_one(txn_doc)
            transactions_created += 1
    
    return {
        "message": "Demo data created successfully",
        "transactions_created": transactions_created,
        "note": "Refresh your dashboard to see recurring bills on the calendar"
    }
    
    # Create account for test transactions
    test_account = await accounts_collection.find_one({"user_id": user_id})
    if not test_account:
        account_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "Test Checking Account",
            "account_type": "checking",
            "balance": 2500.00,
            "institution_name": "Test Bank",
            "currency": "USD",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await accounts_collection.insert_one(account_doc)
        test_account = account_doc
    
    # Insert test transactions
    now = datetime.utcnow()
    for txn_data in test_transactions:
        txn_date = now - timedelta(days=txn_data["days_ago"])
        
        txn_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "account_id": test_account["id"],
            "description": txn_data["description"],
            "merchant_name": txn_data.get("merchant"),
            "amount": txn_data["amount"],
            "category": txn_data["category"],
            "transaction_type": "income" if txn_data["amount"] > 0 else "expense",
            "date": txn_date.date().isoformat(),
            "created_at": txn_date,
            "updated_at": txn_date,
            "ai_categorized": True
        }
        await transactions_collection.insert_one(txn_doc)
    
    return {
        "message": "Test transactions created",
        "count": len(test_transactions),
        "note": "You can now click 'Generate Insights' to see AI analysis"
    }

# ==================== AI & INSIGHTS ENDPOINTS ====================

@api_router.post("/ai/categorize-all")
async def categorize_all_transactions(user_id: str = Depends(get_current_user)):
    """AI categorize all uncategorized transactions"""
    from category_mapping import get_transaction_type_from_category
    
    # Get uncategorized transactions
    uncategorized = await transactions_collection.find({
        "user_id": user_id,
        "$or": [
            {"category": "Other"},
            {"ai_categorized": False}
        ]
    }).limit(200).to_list(200)
    
    print(f"Found {len(uncategorized)} transactions to categorize")
    
    categorized_count = 0
    batch_size = 50
    
    for i in range(0, len(uncategorized), batch_size):
        batch = uncategorized[i:i+batch_size]
        categories = await ai_service.batch_categorize_transactions(batch)
        
        # Update transactions
        for idx, category in categories.items():
            try:
                idx_int = int(idx)
                if idx_int < len(batch):
                    txn = batch[idx_int]
                    
                    # Determine transaction type from category
                    txn_type = get_transaction_type_from_category(category)
                    
                    await transactions_collection.update_one(
                        {"id": txn["id"]},
                        {"$set": {
                            "category": category,
                            "transaction_type": txn_type,
                            "ai_categorized": True,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                    categorized_count += 1
            except Exception as e:
                print(f"Error updating transaction: {e}")
    
    return {"message": f"Categorized {categorized_count} transactions", "total": len(uncategorized)}

@api_router.post("/ai/generate-insights")
async def generate_insights(user_id: str = Depends(get_current_user)):
    """Generate AI insights for user"""
    # Clear old insights first
    await insights_collection.delete_many({"user_id": user_id})
    
    # Get recent transactions
    transactions = await transactions_collection.find({"user_id": user_id}).sort("date", -1).limit(100).to_list(100)
    
    # Calculate totals
    # Plaid stores income with negative amounts, so we need abs()
    total_income = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "expense")
    
    # Calculate monthly bills (recurring expenses only)
    monthly_bills = sum(
        abs(t["amount"]) 
        for t in transactions 
        if t["transaction_type"] == "expense" and t.get("is_recurring", False)
    )
    
    # Get user settings for personalized insights
    user_settings_doc = await user_settings_collection.find_one({"user_id": user_id}, {"_id": 0})
    user_settings = user_settings_doc if user_settings_doc else {
        "family_size": 1,
        "has_children": False,
        "primary_goals": [],
        "risk_tolerance": "moderate",
        "monthly_income": None
    }
    
    # Generate insights with user context
    insights = await ai_service.generate_insights(transactions, total_income, total_expenses, user_settings)
    
    # Store insights
    for insight in insights:
        insight_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "insight_type": insight.get("type", "recommendation"),
            "title": insight.get("title", "Insight"),
            "description": insight.get("description", ""),
            "priority": insight.get("priority", 3),
            "monthly_savings": insight.get("monthly_savings", 0.0),
            "affiliate_link": insight.get("affiliate_link"),
            "affiliate_text": insight.get("affiliate_text"),
            "created_at": datetime.utcnow()
        }
        await insights_collection.insert_one(insight_doc)
    
    return {"message": "Insights generated", "count": len(insights)}

@api_router.get("/ai/insights", response_model=List[AIInsight])
async def get_insights(user_id: str = Depends(get_current_user)):
    """Get AI insights for user"""
    insights = await insights_collection.find({"user_id": user_id}).sort("created_at", -1).limit(10).to_list(10)
    return [AIInsight(**insight) for insight in insights]

@api_router.get("/ai/savings-suggestions")
async def get_savings_suggestions(user_id: str = Depends(get_current_user)):
    """Get AI-powered savings suggestions"""
    transactions = await transactions_collection.find({"user_id": user_id}).sort("date", -1).limit(50).to_list(50)
    budgets = await budgets_collection.find({"user_id": user_id}).to_list(100)
    
    suggestions = await ai_service.suggest_savings(transactions, budgets)
    
    return {"suggestions": suggestions}

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    user_id: str = Depends(get_current_user),
    period: str = "monthly"
):
    """Get dashboard statistics with time period filter
    
    period: monthly, quarterly, 6months, 12months, ytd
    """
    # Get all accounts
    accounts = await accounts_collection.find({"user_id": user_id}).to_list(100)
    
    # Define liability account types
    liability_types = ["credit_card", "mortgage", "loan"]
    
    # Calculate assets and liabilities separately
    total_assets = sum(
        acc.get("balance", 0) 
        for acc in accounts 
        if acc.get("account_type") not in liability_types
    )
    
    total_liabilities = sum(
        abs(acc.get("balance", 0))
        for acc in accounts 
        if acc.get("account_type") in liability_types
    )
    
    # Net worth = assets - liabilities
    net_worth = total_assets - total_liabilities
    
    # Total balance shown is net worth (not summing liabilities as assets)
    total_balance = net_worth
    
    # Calculate date range based on period
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Initialize start and end dates
    start_date = current_month_start
    end_date = None  # None means include up to now
    
    if period == "monthly":
        # Current month only (from start of month to now)
        start_date = current_month_start
        end_date = None
    elif period == "quarterly":
        # Last 3 COMPLETE months (excluding current partial month)
        # If today is Nov 24, show Aug 1 - Oct 31
        month = current_month_start.month
        year = current_month_start.year
        
        # Go back 3 months for start
        for _ in range(3):
            month -= 1
            if month < 1:
                month = 12
                year -= 1
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        
        # End date is the last day of the month before current month
        end_date = current_month_start - timedelta(days=1)
    elif period == "6months":
        # Last 6 COMPLETE months (excluding current partial month)
        month = current_month_start.month
        year = current_month_start.year
        
        for _ in range(6):
            month -= 1
            if month < 1:
                month = 12
                year -= 1
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        end_date = current_month_start - timedelta(days=1)
    elif period == "12months":
        # Last 12 COMPLETE months (excluding current partial month)
        month = current_month_start.month
        year = current_month_start.year
        
        for _ in range(12):
            month -= 1
            if month < 1:
                month = 12
                year -= 1
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        end_date = current_month_start - timedelta(days=1)
    elif period == "ytd":
        # Year to date - from Jan 1 to now (including current month)
        start_date = datetime(now.year, 1, 1, tzinfo=timezone.utc)
        end_date = None
    else:
        # Default to current month
        start_date = current_month_start
        end_date = None
    
    # Build query
    start_date_str = start_date.strftime('%Y-%m-%d')
    date_filter = {"$gte": start_date_str}
    
    if end_date:
        end_date_str = end_date.strftime('%Y-%m-%d')
        date_filter["$lte"] = end_date_str
    
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": date_filter
    }).to_list(10000)
    
    # Calculate totals
    # Plaid stores income with negative amounts, so we need abs()
    total_income = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "expense")
    
    # Calculate monthly bills (recurring expenses only)
    monthly_bills = sum(
        abs(t["amount"]) 
        for t in transactions 
        if t["transaction_type"] == "expense" and t.get("is_recurring", False)
    )
    
    # Spending by category
    category_spending = {}
    for txn in transactions:
        if txn["transaction_type"] == "expense":
            category = txn.get("category", "Other")
            category_spending[category] = category_spending.get(category, 0) + abs(txn["amount"])
    
    total_spending = sum(category_spending.values())
    spending_by_category = [
        SpendingByCategory(
            category=cat,
            amount=amount,
            percentage=(amount / total_spending * 100) if total_spending > 0 else 0
        )
        for cat, amount in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # Recent transactions
    recent_txns = await transactions_collection.find({"user_id": user_id}).sort("date", -1).limit(5).to_list(5)
    recent_transactions = [Transaction(**txn) for txn in recent_txns]
    
    return DashboardStats(
        total_balance=total_balance,
        total_income=total_income,
        total_expenses=total_expenses,
        monthly_bills=monthly_bills,
        net_worth=net_worth,
        spending_by_category=spending_by_category,
        recent_transactions=recent_transactions
    )

@api_router.get("/analytics/spending-trends")
async def get_spending_trends(months: int = 6, user_id: str = Depends(get_current_user)):
    """Get spending trends over time"""
    start_date = datetime.utcnow() - timedelta(days=months * 30)
    
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": start_date},
        "transaction_type": "expense"
    }).to_list(10000)
    
    # Group by month
    monthly_data = {}
    for txn in transactions:
        month_key = txn["date"].strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {"total": 0, "categories": {}}
        
        monthly_data[month_key]["total"] += abs(txn["amount"])
        category = txn.get("category", "Other")
        monthly_data[month_key]["categories"][category] = monthly_data[month_key]["categories"].get(category, 0) + abs(txn["amount"])
    
    return {"trends": monthly_data}

@api_router.get("/analytics/cashflow/candlestick")
async def get_cashflow_candlestick(
    range: str = "30days",
    user_id: str = Depends(get_current_user)
):
    """Get candlestick chart data for cash flow visualization
    
    range: 30days, 3months, 6months, 12months, ytd
    Returns OHLC (Open, High, Low, Close) data for each day
    """
    now = datetime.now(timezone.utc)
    start_date = now
    
    # Determine date range
    if range == "30days":
        start_date = now - timedelta(days=30)
        days_count = 30
    elif range == "3months":
        start_date = now - timedelta(days=90)
        days_count = 90
    elif range == "6months":
        start_date = now - timedelta(days=180)
        days_count = 180
    elif range == "12months":
        start_date = now - timedelta(days=365)
        days_count = 365
    elif range == "ytd":
        start_date = datetime(now.year, 1, 1, tzinfo=timezone.utc)
        days_count = (now - start_date).days + 1
    else:
        start_date = now - timedelta(days=30)
        days_count = 30
    
    # Fetch all transactions in range
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": start_date.strftime('%Y-%m-%d')}
    }).to_list(10000)
    
    # Calculate total income and expenses for the period to get average daily income
    total_income = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "expense")
    
    # Average daily income (baseline for the chart)
    avg_daily_income = total_income / max(days_count, 1)
    
    # Group transactions by day
    daily_data = {}
    
    # Initialize all days in range (even if no transactions)
    current_date = start_date
    while current_date <= now:
        date_key = current_date.strftime('%Y-%m-%d')
        daily_data[date_key] = {
            "date": date_key,
            "income": 0,
            "expenses": 0,
            "transactions": []
        }
        current_date += timedelta(days=1)
    
    # Fill in transaction data
    for txn in transactions:
        date_key = txn["date"][:10]  # Get YYYY-MM-DD part
        if date_key in daily_data:
            if txn["transaction_type"] == "income":
                daily_data[date_key]["income"] += abs(txn["amount"])
            elif txn["transaction_type"] == "expense":
                daily_data[date_key]["expenses"] += abs(txn["amount"])
    
    # Convert to candlestick format
    candlestick_data = []
    
    for date_key in sorted(daily_data.keys()):
        day = daily_data[date_key]
        
        # Calculate net cash flow for the day (income - expenses)
        daily_income = day["income"]
        daily_expenses = day["expenses"]
        net_flow = daily_income - daily_expenses
        
        # For candlestick:
        # - Baseline (average daily income) is the reference point
        # - Green candle: expenses < avg daily income (saved money)
        # - Red candle: expenses > avg daily income (overspent)
        
        baseline = avg_daily_income
        
        # Open, High, Low, Close based on expenses vs baseline
        if daily_expenses <= baseline:
            # Green candle (under budget)
            open_val = daily_expenses
            close_val = baseline
            low_val = daily_expenses
            high_val = baseline
        else:
            # Red candle (over budget)
            open_val = baseline
            close_val = daily_expenses
            low_val = baseline
            high_val = daily_expenses
        
        # Format for lightweight-charts (expects time in YYYY-MM-DD format)
        candlestick_data.append({
            "time": date_key,
            "open": round(open_val, 2),
            "high": round(high_val, 2),
            "low": round(low_val, 2),
            "close": round(close_val, 2),
            # Additional metadata for tooltips
            "income": round(daily_income, 2),
            "expenses": round(daily_expenses, 2),
            "netFlow": round(net_flow, 2),
            "avgDailyIncome": round(avg_daily_income, 2)
        })
    
    return {
        "data": candlestick_data,
        "avgDailyIncome": round(avg_daily_income, 2),
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "daysCount": days_count
    }

# ==================== WEBHOOK ENDPOINTS ====================

@api_router.post("/webhook/plaid")
async def plaid_webhook(data: dict):
    """Handle Plaid webhooks"""
    webhook_type = data.get('webhook_type')
    webhook_code = data.get('webhook_code')
    item_id = data.get('item_id')
    
    print(f"Received Plaid webhook: {webhook_type} - {webhook_code} for item {item_id}")
    
    # Handle transaction updates
    if webhook_type == "TRANSACTIONS":
        if webhook_code in ["INITIAL_UPDATE", "HISTORICAL_UPDATE", "DEFAULT_UPDATE"]:
            # Find the plaid item
            plaid_item = await plaid_items_collection.find_one({"item_id": item_id})
            if plaid_item:
                print(f"🔄 Webhook triggered: Auto-syncing transactions for item {item_id}")
                try:
                    await sync_plaid_transactions(plaid_item["id"], plaid_item["user_id"])
                    print("✅ Successfully synced and auto-categorized new transactions")
                except Exception as e:
                    print(f"❌ Error syncing transactions: {e}")
    
    return {"status": "received"}



# ==================== TRANSACTION SPLITS ENDPOINTS ====================

@api_router.post("/transactions/{transaction_id}/splits")
async def create_transaction_splits(
    transaction_id: str,
    splits: List[TransactionSplitCreate],
    current_user: str = Depends(get_current_user)
):
    """Create or update splits for a transaction"""
    # Verify transaction exists and belongs to user
    transaction = await transactions_collection.find_one({
        "id": transaction_id,
        "user_id": current_user
    }, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Validate splits sum to transaction amount
    total_split_amount = sum(split.amount for split in splits)
    if abs(total_split_amount - abs(transaction["amount"])) > 0.01:  # Allow 1 cent tolerance
        raise HTTPException(
            status_code=400, 
            detail=f"Split amounts (${total_split_amount:.2f}) must equal transaction amount (${abs(transaction['amount']):.2f})"
        )
    
    # Delete existing splits
    await transaction_splits_collection.delete_many({
        "transaction_id": transaction_id,
        "user_id": current_user
    })
    
    # Create new splits
    split_docs = []
    for split in splits:
        split_id = str(uuid.uuid4())
        percentage = (split.amount / abs(transaction["amount"])) * 100
        
        split_doc = {
            "id": split_id,
            "transaction_id": transaction_id,
            "user_id": current_user,
            "category": split.category,
            "amount": split.amount,
            "percentage": percentage,
            "notes": split.notes,
            "created_at": datetime.now(timezone.utc)
        }
        split_docs.append(split_doc)
    
    if split_docs:
        await transaction_splits_collection.insert_many(split_docs)
        # Remove _id from response (added by MongoDB)
        for doc in split_docs:
            doc.pop('_id', None)
    
    return {"message": "Transaction splits created successfully", "splits": split_docs}


@api_router.get("/transactions/{transaction_id}/splits", response_model=List[TransactionSplit])
async def get_transaction_splits(
    transaction_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get splits for a transaction"""
    # Verify transaction exists and belongs to user
    transaction = await transactions_collection.find_one({
        "id": transaction_id,
        "user_id": current_user
    }, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    splits = await transaction_splits_collection.find({
        "transaction_id": transaction_id,
        "user_id": current_user
    }, {"_id": 0}).to_list(100)
    
    return splits


@api_router.delete("/transactions/{transaction_id}/splits")
async def delete_transaction_splits(
    transaction_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete all splits for a transaction"""
    result = await transaction_splits_collection.delete_many({
        "transaction_id": transaction_id,
        "user_id": current_user
    })
    
    return {"message": f"Deleted {result.deleted_count} splits"}


# ==================== CRYPTO TRACKING ENDPOINTS ====================

# ==================== CRYPTO SOURCE MANAGEMENT ====================

@api_router.post("/crypto/sources")
async def add_crypto_source(
    source: CryptoSourceCreate,
    user_id: str = Depends(get_current_user)
):
    """Add a new crypto source (exchange or wallet)"""
    
    # Check for duplicates
    if source.source_type == "wallet":
        if not source.chain or not source.wallet_address:
            raise HTTPException(status_code=400, detail="Chain and wallet address required for wallet source")
        
        # Check if this wallet already exists
        existing = await db.crypto_sources.find_one({
            "user_id": user_id,
            "source_type": "wallet",
            "chain": source.chain,
            "wallet_address": source.wallet_address.strip()
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="This wallet address is already connected")
    
    elif source.source_type == "exchange":
        if not source.exchange or not source.api_key:
            raise HTTPException(status_code=400, detail="Exchange and API key required for exchange source")
        
        # Check if this exchange is already connected
        existing = await db.crypto_sources.find_one({
            "user_id": user_id,
            "source_type": "exchange",
            "exchange": source.exchange
        })
        
        if existing:
            raise HTTPException(status_code=400, detail=f"{source.exchange} is already connected")
    
    source_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    source_doc = {
        "id": source_id,
        "user_id": user_id,
        "source_type": source.source_type,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    if source.source_type == "exchange":
        # Encrypt API credentials
        source_doc["exchange"] = source.exchange
        source_doc["api_key_encrypted"] = encrypt_api_key(source.api_key, user_id)
        
    elif source.source_type == "wallet":
        source_doc["chain"] = source.chain
        source_doc["wallet_address"] = source.wallet_address.strip()
        source_doc["wallet_label"] = source.wallet_label or f"{source.chain.title()} Wallet"
    
    await db.crypto_sources.insert_one(source_doc)
    
    # Immediately sync holdings
    await sync_crypto_source(source_id, user_id)
    
    return {"id": source_id, "message": "Crypto source added successfully"}


@api_router.get("/crypto/sources")
async def get_crypto_sources(user_id: str = Depends(get_current_user)):
    """Get all crypto sources for user"""
    sources = await db.crypto_sources.find(
        {"user_id": user_id},
        {"_id": 0, "api_key_encrypted": 0}  # Don't return encrypted keys
    ).to_list(1000)
    
    return sources


@api_router.delete("/crypto/sources/{source_id}")
async def delete_crypto_source(
    source_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a crypto source and its holdings"""
    # Delete source
    result = await db.crypto_sources.delete_one({"id": source_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crypto source not found")
    
    # Delete associated holdings
    await db.crypto_holdings.delete_many({"source_id": source_id, "user_id": user_id})
    
    return {"message": "Crypto source deleted successfully"}


@api_router.post("/crypto/sources/{source_id}/sync")
async def sync_crypto_source_endpoint(
    source_id: str,
    user_id: str = Depends(get_current_user)
):
    """Manually sync a crypto source"""
    await sync_crypto_source(source_id, user_id)
    return {"message": "Sync completed"}


async def sync_crypto_source(source_id: str, user_id: str):
    """Sync holdings from a crypto source"""
    # Get source
    source = await db.crypto_sources.find_one(
        {"id": source_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not source:
        raise HTTPException(status_code=404, detail="Crypto source not found")
    
    holdings_data = []
    
    try:
        if source["source_type"] == "wallet":
            chain = source["chain"]
            address = source["wallet_address"]
            
            if chain == "bitcoin":
                balance_data = await fetch_wallet_balance_btc(address)
                holdings_data.append(balance_data)
            elif chain == "ethereum":
                holdings_data = await fetch_wallet_balance_eth(address)
            # Add more chains as needed
            
        elif source["source_type"] == "exchange":
            # Fetch from exchange API
            if source["exchange"] == "coinbase":
                raise HTTPException(status_code=501, detail="Exchange integration coming soon")
        
        # Delete old holdings for this source
        await db.crypto_holdings.delete_many({"source_id": source_id, "user_id": user_id})
        
        # Fetch current prices
        if holdings_data:
            symbols = [h["symbol"] for h in holdings_data]
            prices = await fetch_crypto_prices(symbols)
            
            # Insert new holdings
            now = datetime.now(timezone.utc)
            for holding_data in holdings_data:
                symbol = holding_data["symbol"]
                amount = holding_data["amount"]
                current_price = prices.get(symbol, 0)
                
                holding_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "source_id": source_id,
                    "symbol": symbol,
                    "name": holding_data["name"],
                    "amount": amount,
                    "current_price_usd": current_price,
                    "current_value_usd": amount * current_price,
                    "last_updated": now
                }
                
                await db.crypto_holdings.insert_one(holding_doc)
                
                # Save to value history for tracking
                history_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "holding_id": holding_doc["id"],
                    "timestamp": now,
                    "amount": amount,
                    "price_usd": current_price,
                    "value_usd": amount * current_price
                }
                await db.crypto_value_history.insert_one(history_doc)
        
        # Update last_synced
        await db.crypto_sources.update_one(
            {"id": source_id},
            {"$set": {"last_synced": datetime.now(timezone.utc)}}
        )
        
    except Exception as e:
        print(f"Error syncing crypto source: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


# ==================== CRYPTO HOLDINGS & ANALYTICS ====================

@api_router.get("/crypto/holdings")
async def get_all_crypto_holdings(user_id: str = Depends(get_current_user)):
    """Get all crypto holdings across all sources"""
    # Get all holdings (both from wallet/exchange sources and old manual entries)
    holdings = await db.crypto_holdings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    if not holdings:
        return []
    
    # Refresh prices
    symbols = list(set([h["symbol"] for h in holdings]))
    prices = await fetch_crypto_prices(symbols)
    
    # Update with latest prices
    for holding in holdings:
        symbol = holding["symbol"]
        if symbol in prices:
            holding["current_price_usd"] = prices[symbol]
            holding["current_value_usd"] = holding["amount"] * prices[symbol]
    
    return holdings


@api_router.post("/crypto/holdings", response_model=CryptoHolding)
async def create_crypto_holding(
    holding: CryptoHoldingCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new crypto holding"""
    holding_id = str(uuid.uuid4())
    
    # Get current price
    symbol_to_id = {
        "btc": "bitcoin", "eth": "ethereum", "bnb": "binancecoin",
        "xrp": "ripple", "ada": "cardano", "sol": "solana",
        "doge": "dogecoin", "dot": "polkadot", "matic": "matic-network",
        "ltc": "litecoin", "avax": "avalanche-2", "link": "chainlink",
        "xlm": "stellar", "atom": "cosmos", "algo": "algorand",
        "vet": "vechain", "icp": "internet-computer", "fil": "filecoin",
        "hbar": "hedera-hashgraph", "apt": "aptos"
    }
    
    coin_id = symbol_to_id.get(holding.symbol.lower(), holding.symbol.lower())
    current_price = None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": coin_id, "vs_currencies": "usd"},
                timeout=10.0
            )
            prices_data = response.json()
            current_price = prices_data.get(coin_id, {}).get("usd")
    except Exception as e:
        print(f"Error fetching current price: {e}")
    
    holding_doc = {
        "id": holding_id,
        "user_id": user_id,
        "symbol": holding.symbol.upper(),
        "name": holding.name,
        "amount": holding.amount,
        "purchase_price_usd": holding.purchase_price_usd,
        "current_price_usd": current_price,
        "notes": holding.notes,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Calculate current value and profit/loss
    if current_price:
        holding_doc["current_value_usd"] = current_price * holding.amount
        if holding.purchase_price_usd:
            cost_basis = holding.purchase_price_usd * holding.amount
            holding_doc["profit_loss_usd"] = holding_doc["current_value_usd"] - cost_basis
            holding_doc["profit_loss_percentage"] = ((holding_doc["current_value_usd"] - cost_basis) / cost_basis) * 100
    
    await crypto_holdings_collection.insert_one(holding_doc)
    
    return holding_doc


@api_router.put("/crypto/holdings/{holding_id}", response_model=CryptoHolding)
async def update_crypto_holding(
    holding_id: str,
    updates: CryptoHoldingUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a crypto holding"""
    holding = await crypto_holdings_collection.find_one({
        "id": holding_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not holding:
        raise HTTPException(status_code=404, detail="Crypto holding not found")
    
    update_data = updates.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await crypto_holdings_collection.update_one(
        {"id": holding_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    updated_holding = await crypto_holdings_collection.find_one({
        "id": holding_id
    }, {"_id": 0})
    
    return updated_holding


@api_router.delete("/crypto/holdings/{holding_id}")
async def delete_crypto_holding(
    holding_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a crypto holding"""
    result = await crypto_holdings_collection.delete_one({
        "id": holding_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crypto holding not found")
    
    return {"message": "Crypto holding deleted successfully"}


@api_router.get("/crypto/summary")
async def get_crypto_summary(user_id: str = Depends(get_current_user)):
    """Get crypto portfolio summary"""
    # Get all holdings (both from sources and manual entries)
    holdings = await db.crypto_holdings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    if not holdings:
        return {
            "total_value_usd": 0,
            "holdings_count": 0,
            "sources_count": 0,
            "top_holdings": []
        }
    
    # Refresh prices
    symbols = list(set([h["symbol"] for h in holdings]))
    prices = await fetch_crypto_prices(symbols)
    
    total_value = 0
    holdings_with_value = []
    
    for holding in holdings:
        symbol = holding["symbol"]
        if symbol in prices:
            current_price = prices[symbol]
            current_value = holding["amount"] * current_price
            total_value += current_value
            
            holdings_with_value.append({
                "symbol": symbol,
                "name": holding["name"],
                "amount": holding["amount"],
                "current_value_usd": current_value,
                "percentage": 0  # Will calculate after we have total
            })
    
    # Calculate percentages
    for h in holdings_with_value:
        h["percentage"] = (h["current_value_usd"] / total_value * 100) if total_value > 0 else 0
    
    # Sort by value
    holdings_with_value.sort(key=lambda x: x["current_value_usd"], reverse=True)
    
    # Count sources
    sources_count = await db.crypto_sources.count_documents({"user_id": user_id})
    
    return {
        "total_value_usd": total_value,
        "holdings_count": len(holdings),
        "sources_count": sources_count,
        "top_holdings": holdings_with_value[:5]
    }


# ==================== NET WORTH TRACKING ====================

@api_router.get("/networth/history")
async def get_networth_history(days: int = 365, user_id: str = Depends(get_current_user)):
    """Get net worth history snapshots"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    snapshots = await db.networth_snapshots.find({
        "user_id": user_id,
        "snapshot_date": {"$gte": cutoff_date}
    }, {"_id": 0}).sort("snapshot_date", 1).to_list(1000)
    
    return snapshots

@api_router.post("/networth/snapshot")
async def create_networth_snapshot(user_id: str = Depends(get_current_user)):
    """Create a snapshot of current net worth"""
    # Get all accounts
    accounts = await accounts_collection.find({
        "user_id": user_id
    }, {"_id": 0}).to_list(1000)
    
    # Calculate assets (positive balances)
    asset_accounts = [acc for acc in accounts if acc['account_type'] in ['checking', 'savings', 'investment', 'crypto']]
    total_assets = sum(acc['balance'] for acc in asset_accounts)
    
    # Calculate liabilities (debt accounts)
    debt_accounts = [acc for acc in accounts if acc['account_type'] in ['credit_card', 'loan', 'mortgage']]
    total_liabilities = sum(abs(acc['balance']) for acc in debt_accounts)
    
    # Net worth = assets - liabilities
    net_worth = total_assets - total_liabilities
    
    snapshot = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "snapshot_date": datetime.now(timezone.utc),
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": net_worth,
        "accounts_snapshot": {
            "asset_accounts": len(asset_accounts),
            "debt_accounts": len(debt_accounts),
            "total_accounts": len(accounts)
        }
    }
    
    result = await db.networth_snapshots.insert_one(snapshot)
    
    # Remove MongoDB's _id for the response
    snapshot_response = {k: v for k, v in snapshot.items() if k != '_id'}
    
    return snapshot_response


# ==================== INVESTMENT PERFORMANCE ====================

@api_router.get("/investments/performance")
async def get_investment_performance(user_id: str = Depends(get_current_user)):
    """Get investment performance analysis"""
    # Get all investment accounts
    investment_accounts = await accounts_collection.find({
        "user_id": user_id,
        "account_type": "investment"
    }, {"_id": 0}).to_list(1000)
    
    if not investment_accounts:
        return {
            "total_value": 0,
            "total_cost_basis": 0,
            "total_gain_loss": 0,
            "total_return_percentage": 0,
            "accounts": [],
            "asset_allocation": []
        }
    
    # Calculate totals
    total_value = sum(acc['balance'] for acc in investment_accounts)
    
    # Estimate cost basis (assuming 80% of current value as rough estimate)
    # In a real app, this would be tracked separately
    estimated_cost_basis = total_value * 0.80
    total_gain_loss = total_value - estimated_cost_basis
    total_return_percentage = (total_gain_loss / estimated_cost_basis * 100) if estimated_cost_basis > 0 else 0
    
    # Account breakdown
    accounts_breakdown = []
    for acc in investment_accounts:
        accounts_breakdown.append({
            "account_name": acc['name'],
            "institution": acc.get('institution_name', 'Unknown'),
            "current_value": acc['balance'],
            "percentage": (acc['balance'] / total_value * 100) if total_value > 0 else 0
        })
    
    # Asset allocation by type (simplified - categorize by account name)
    allocation = {}
    for acc in investment_accounts:
        account_type = "General Investment"
        name_lower = acc['name'].lower()
        
        if '401k' in name_lower or 'retirement' in name_lower or 'ira' in name_lower:
            account_type = "Retirement"
        elif 'roth' in name_lower:
            account_type = "Roth IRA"
        elif 'brokerage' in name_lower:
            account_type = "Brokerage"
        
        if account_type not in allocation:
            allocation[account_type] = 0
        allocation[account_type] += acc['balance']
    
    asset_allocation = [
        {
            "type": atype,
            "value": value,
            "percentage": (value / total_value * 100) if total_value > 0 else 0
        }
        for atype, value in allocation.items()
    ]
    
    return {
        "total_value": total_value,
        "total_cost_basis": estimated_cost_basis,
        "total_gain_loss": total_gain_loss,
        "total_return_percentage": total_return_percentage,
        "accounts": accounts_breakdown,
        "asset_allocation": asset_allocation
    }


# Include routers
app.include_router(api_router)
app.include_router(advanced_router, prefix="/api", tags=["advanced"])
app.include_router(bills_router, prefix="/api")
# app.include_router(gamification_router, prefix="/api")  # Disabled - Sage the Owl removed
app.include_router(investments_router, prefix="/api/investments")
app.include_router(analytics_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(subscriptions_router, prefix="/api/subscriptions")
app.include_router(household_router, prefix="/api")
app.include_router(budgets_router, prefix="/api")
app.include_router(budget_suggestions_router, prefix="/api")
app.include_router(financial_health_router, prefix="/api")
app.include_router(duplicate_accounts_router, prefix="/api")

# Import and include MX routes
try:
    from routes.mx_routes import router as mx_router
    app.include_router(mx_router, prefix="/api")
    
    from routes.mx_debug_routes import router as mx_debug_router
    app.include_router(mx_debug_router, prefix="/api")
    
    from routes.networth_routes import router as networth_calc_router
    app.include_router(networth_calc_router, prefix="/api")
except ImportError as e:
    print(f"Warning: Could not import routes: {e}")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
