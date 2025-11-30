"""
MX Platform API Routes
Handles account connections, transactions, and balance updates via MX
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mx_service import mx_service
from server import get_current_user, db

router = APIRouter(prefix="/mx", tags=["mx"])


@router.post("/connect-widget")
async def create_connect_widget(
    institution_code: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Create MX Connect Widget URL for user to link accounts
    """
    try:
        result = await mx_service.create_connect_widget_url(user_id, institution_code)
        return {
            "connect_url": result["connect_url"],
            "user_guid": result["user_guid"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create connect widget: {str(e)}")


@router.get("/members")
async def list_members(user_id: str = Depends(get_current_user)):
    """
    List all connected institutions (members) for the user
    """
    try:
        members = await mx_service.list_members(user_id)
        return {"members": members}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch members: {str(e)}")


@router.get("/members/{member_guid}")
async def get_member_status(
    member_guid: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get status of a specific member connection
    """
    try:
        member = await mx_service.get_member_status(user_id, member_guid)
        return {"member": member}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Member not found: {str(e)}")


@router.post("/members/{member_guid}/refresh")
async def refresh_member(
    member_guid: str,
    user_id: str = Depends(get_current_user)
):
    """
    Trigger a refresh for a member connection
    """
    try:
        member = await mx_service.refresh_member(user_id, member_guid)
        return {"member": member, "message": "Refresh triggered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh member: {str(e)}")


@router.delete("/members/{member_guid}")
async def delete_member(
    member_guid: str,
    user_id: str = Depends(get_current_user)
):
    """
    Delete a member connection (disconnect institution)
    """
    try:
        success = await mx_service.delete_member(user_id, member_guid)
        
        # Also remove accounts from our database
        await db.accounts.delete_many({
            "user_id": user_id,
            "mx_member_guid": member_guid
        })
        
        return {"message": "Member deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete member: {str(e)}")


@router.get("/accounts")
async def list_accounts(
    member_guid: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    List all accounts for the user
    Optionally filter by member_guid
    """
    try:
        accounts = await mx_service.list_accounts(user_id, member_guid)
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")


@router.post("/accounts/sync")
async def sync_accounts(user_id: str = Depends(get_current_user)):
    """
    Sync accounts from MX to local database
    """
    try:
        # Get all accounts from MX
        mx_accounts = await mx_service.list_accounts(user_id)
        
        # MX account type mapping
        MX_ACCOUNT_TYPE_MAPPING = {
            "CHECKING": "checking",
            "SAVINGS": "savings",
            "CREDIT_CARD": "credit_card",
            "LOAN": "loan",
            "MORTGAGE": "mortgage",
            "INVESTMENT": "investment",
            "BROKERAGE": "investment",
            "RETIREMENT": "investment",
            "LINE_OF_CREDIT": "credit_card",
            "MONEY_MARKET": "savings",
            "CERTIFICATE_OF_DEPOSIT": "savings",
            "CASH_MANAGEMENT": "checking",
            "PREPAID": "checking",
        }
        
        LIABILITY_TYPES = ["credit_card", "loan", "mortgage"]
        
        synced_count = 0
        for mx_account in mx_accounts:
            # Map MX account type to our format
            mx_type = mx_account.get("type", "").upper()
            account_type = MX_ACCOUNT_TYPE_MAPPING.get(mx_type, "manual")
            
            # Get balance and apply proper sign for liabilities
            raw_balance = float(mx_account.get("balance", 0))
            
            # Liabilities should be negative
            if account_type in LIABILITY_TYPES:
                balance = -abs(raw_balance) if raw_balance != 0 else 0
            else:
                balance = abs(raw_balance) if raw_balance != 0 else 0
            
            # Check if account already exists
            mx_guid = mx_account.get("guid")
            existing_account = await db.accounts.find_one({
                "user_id": user_id,
                "mx_account_guid": mx_guid
            })
            
            account_data = {
                "id": existing_account["id"] if existing_account else mx_guid,
                "user_id": user_id,
                "mx_account_guid": mx_guid,
                "mx_member_guid": mx_account.get("member_guid"),
                "name": mx_account.get("name"),
                "account_type": account_type,
                "balance": balance,
                "institution_name": mx_account.get("institution_name", "Unknown"),
                "currency": mx_account.get("currency_code", "USD"),
                "mask": mx_account.get("account_number", "")[-4:] if mx_account.get("account_number") else None,
                "updated_at": datetime.utcnow()
            }
            
            # Add created_at only for new accounts
            if not existing_account:
                account_data["created_at"] = datetime.utcnow()
            
            # Upsert account
            await db.accounts.update_one(
                {"id": account_data["id"], "user_id": user_id},
                {"$set": account_data},
                upsert=True
            )
            synced_count += 1
        
        return {
            "message": f"Successfully synced {synced_count} accounts",
            "count": synced_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync accounts: {str(e)}")


@router.get("/transactions")
async def get_transactions(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    account_guid: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Get transactions from MX
    """
    try:
        transactions = await mx_service.get_transactions(
            user_id, 
            from_date, 
            to_date, 
            account_guid
        )
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")


@router.post("/transactions/sync")
async def sync_transactions(
    from_date: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Sync transactions from MX to local database
    """
    try:
        # Default to last 90 days
        if not from_date:
            from_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")
        
        # Get transactions from MX
        mx_transactions = await mx_service.get_transactions(user_id, from_date=from_date)
        
        synced_count = 0
        skipped_count = 0
        
        for mx_txn in mx_transactions:
            mx_account_guid = mx_txn.get("account_guid")
            
            # Map MX account guid to local account id
            local_account = await db.accounts.find_one({
                "user_id": user_id,
                "mx_account_guid": mx_account_guid
            })
            
            if not local_account:
                print(f"Skipping transaction - account not found: {mx_account_guid}")
                skipped_count += 1
                continue
            
            # Get amount and determine transaction type
            # MX Convention: negative = expense (debit/money out), positive = income (credit/money in)
            amount = float(mx_txn.get("amount", 0))
            
            # Determine transaction type based on MX's sign convention
            if amount < 0:
                # Negative in MX = expense/debit
                transaction_type = "expense"
                amount = abs(amount)  # Store as positive in our system
            else:
                # Positive in MX = income/credit
                transaction_type = "income"
                # amount already positive, keep as is
            
            # Get category (MX provides top-level category)
            category = mx_txn.get("top_level_category") or mx_txn.get("category") or "Other"
            
            # Check if transaction already exists
            mx_guid = mx_txn.get("guid")
            existing_txn = await db.transactions.find_one({
                "user_id": user_id,
                "mx_transaction_guid": mx_guid
            })
            
            transaction_data = {
                "id": existing_txn["id"] if existing_txn else mx_guid,
                "user_id": user_id,
                "account_id": local_account["id"],
                "mx_transaction_guid": mx_guid,
                "amount": amount,
                "description": mx_txn.get("description", "Unknown"),
                "transaction_type": transaction_type,
                "category": category,
                "date": mx_txn.get("transacted_at", mx_txn.get("posted_at")),
                "merchant_name": mx_txn.get("merchant_name") or mx_txn.get("description"),
                "is_recurring": False,
                "pending": mx_txn.get("is_pending", False),
                "ai_categorized": False,
                "updated_at": datetime.utcnow()
            }
            
            # Add created_at only for new transactions
            if not existing_txn:
                transaction_data["created_at"] = datetime.utcnow()
            
            # Upsert transaction
            await db.transactions.update_one(
                {"id": transaction_data["id"], "user_id": user_id},
                {"$set": transaction_data},
                upsert=True
            )
            synced_count += 1
        
        message = f"Successfully synced {synced_count} transactions"
        if skipped_count > 0:
            message += f" ({skipped_count} skipped - account not found)"
        
        return {
            "message": message,
            "count": synced_count,
            "skipped": skipped_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync transactions: {str(e)}")


@router.get("/institutions/search")
async def search_institutions(query: str):
    """
    Search for institutions by name
    """
    try:
        institutions = await mx_service.search_institutions(query)
        return {"institutions": institutions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search institutions: {str(e)}")
