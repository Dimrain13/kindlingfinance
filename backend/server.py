from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path
from datetime import datetime, timedelta
import uuid
from typing import List, Optional

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import local modules
from database import (
    db, init_db, users_collection, accounts_collection, 
    transactions_collection, budgets_collection, bills_collection,
    plaid_items_collection, insights_collection
)
from models import (
    UserCreate, UserLogin, User, Token,
    AccountCreate, Account,
    TransactionCreate, Transaction,
    BudgetCreate, Budget,
    BillCreate, Bill,
    PlaidLinkTokenRequest, PlaidExchangeTokenRequest,
    AIInsight, DashboardStats, SpendingByCategory,
    AccountType, TransactionType
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from plaid_service import PlaidService
from ai_service import ai_service

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

# ==================== PLAID ENDPOINTS ====================

@api_router.post("/plaid/create-link-token")
async def create_link_token(user_id: str = Depends(get_current_user)):
    """Create Plaid Link token"""
    try:
        print(f"Creating Plaid link token for user: {user_id}")
        result = await PlaidService.create_link_token(user_id)
        print(f"Successfully created link token")
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
        
        # Store Plaid item
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
        
        # Get and store accounts
        plaid_accounts = await PlaidService.get_accounts(access_token)
        
        for plaid_account in plaid_accounts:
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
            
            account_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": plaid_account.name,
                "account_type": account_type,
                "balance": float(plaid_account.balances.current or 0),
                "institution_name": institution_name,
                "plaid_account_id": plaid_account.account_id,
                "plaid_item_id": item_id,
                "currency": plaid_account.balances.iso_currency_code or "USD",
                "mask": plaid_account.mask,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await accounts_collection.insert_one(account_doc)
        
        # Sync transactions
        await sync_plaid_transactions(plaid_item_doc["id"], user_id)
        
        return {"message": "Successfully linked account", "institution": institution_name}
    
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
        
        # Use AI to categorize if no category
        category = txn.category[0] if txn.category else None
        ai_categorized = False
        
        if not category:
            category = await ai_service.categorize_transaction(
                txn.name,
                txn.amount,
                txn.merchant_name
            )
            ai_categorized = True
        
        # Determine transaction type from category
        txn_type = get_transaction_type_from_category(category)
        
        # Convert date to datetime if it's a date object
        txn_date = datetime.combine(txn.date, datetime.min.time()) if hasattr(txn.date, 'year') and not isinstance(txn.date, datetime) else txn.date
        
        txn_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "account_id": txn.account_id,
            "plaid_transaction_id": txn.transaction_id,
            "amount": float(txn.amount),
            "description": txn.name,
            "transaction_type": txn_type,
            "category": category,
            "date": txn_date,
            "merchant_name": txn.merchant_name,
            "is_recurring": False,
            "pending": txn.pending,
            "ai_categorized": ai_categorized,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Check if transaction already exists
        existing = await transactions_collection.find_one({"plaid_transaction_id": txn.transaction_id})
        if not existing:
            await transactions_collection.insert_one(txn_doc)
            print(f"Inserted transaction: {txn.name} - ${txn.amount}")
        else:
            print(f"Transaction already exists: {txn.transaction_id}")
    
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

# ==================== ACCOUNT ENDPOINTS ====================

@api_router.post("/accounts", response_model=Account)
async def create_account(account_data: AccountCreate, user_id: str = Depends(get_current_user)):
    """Create a manual account"""
    account_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": account_data.name,
        "account_type": account_data.account_type,
        "balance": account_data.balance,
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
    user_id: str = Depends(get_current_user)
):
    """Get transactions for user"""
    transactions = await transactions_collection.find(
        {"user_id": user_id}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    return [Transaction(**txn) for txn in transactions]

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user_id: str = Depends(get_current_user)):
    """Delete a transaction"""
    result = await transactions_collection.delete_one({"id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

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
        "start_date": budget_data.start_date,
        "created_at": datetime.utcnow()
    }
    
    await budgets_collection.insert_one(budget_doc)
    return Budget(**budget_doc)

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(user_id: str = Depends(get_current_user)):
    """Get all budgets for user"""
    budgets = await budgets_collection.find({"user_id": user_id}).to_list(100)
    return [Budget(**budget) for budget in budgets]

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user_id: str = Depends(get_current_user)):
    """Delete a budget"""
    result = await budgets_collection.delete_one({"id": budget_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}

# ==================== BILL ENDPOINTS ====================

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill_data: BillCreate, user_id: str = Depends(get_current_user)):
    """Create a bill"""
    bill_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": bill_data.name,
        "amount": bill_data.amount,
        "due_date": bill_data.due_date,
        "frequency": bill_data.frequency,
        "category": bill_data.category,
        "icon": bill_data.icon or "📄",
        "auto_pay": bill_data.auto_pay,
        "is_paid": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await bills_collection.insert_one(bill_doc)
    return Bill(**bill_doc)

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(user_id: str = Depends(get_current_user)):
    """Get all bills for user"""
    bills = await bills_collection.find({"user_id": user_id}).to_list(100)
    return [Bill(**bill) for bill in bills]

@api_router.patch("/bills/{bill_id}/pay")
async def mark_bill_paid(bill_id: str, is_paid: bool, user_id: str = Depends(get_current_user)):
    """Mark bill as paid/unpaid"""
    result = await bills_collection.update_one(
        {"id": bill_id, "user_id": user_id},
        {"$set": {"is_paid": is_paid, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill updated"}

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, user_id: str = Depends(get_current_user)):
    """Delete a bill"""
    result = await bills_collection.delete_one({"id": bill_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill deleted"}

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
    # Get recent transactions
    transactions = await transactions_collection.find({"user_id": user_id}).sort("date", -1).limit(100).to_list(100)
    
    # Calculate totals
    total_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "expense")
    
    # Generate insights
    insights = await ai_service.generate_insights(transactions, total_income, total_expenses)
    
    # Store insights
    for insight in insights:
        insight_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "insight_type": insight.get("type", "recommendation"),
            "title": insight.get("title", "Insight"),
            "description": insight.get("description", ""),
            "priority": insight.get("priority", 3),
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
async def get_dashboard_stats(user_id: str = Depends(get_current_user)):
    """Get dashboard statistics"""
    # Get all accounts
    accounts = await accounts_collection.find({"user_id": user_id}).to_list(100)
    total_balance = sum(acc.get("balance", 0) for acc in accounts)
    
    # Get transactions for current month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": start_of_month}
    }).to_list(1000)
    
    # Calculate totals
    total_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["transaction_type"] == "expense")
    
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
        net_worth=total_balance,
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
                print(f"Auto-syncing transactions for item {item_id}")
                try:
                    await sync_plaid_transactions(plaid_item["id"], plaid_item["user_id"])
                    print(f"Successfully synced transactions")
                except Exception as e:
                    print(f"Error syncing transactions: {e}")
    
    return {"status": "received"}

# Include router
app.include_router(api_router)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
