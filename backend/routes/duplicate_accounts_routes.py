from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from auth import get_current_user
from database import db
from pydantic import BaseModel

router = APIRouter()

class MergeAccountsRequest(BaseModel):
    primary_account_id: str
    duplicate_account_ids: List[str]
    merge_transactions: bool = True


@router.get("/accounts/duplicates")
async def find_duplicate_accounts(user_id: str = Depends(get_current_user)):
    """
    Find potential duplicate accounts based on:
    - Same institution name
    - Similar account names
    - Same last 4 digits of account number
    """
    try:
        # Get all accounts for user
        accounts = await db.accounts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        if len(accounts) < 2:
            return {"duplicate_groups": []}
        
        # Group potential duplicates
        duplicate_groups = []
        processed_ids = set()
        
        for i, account1 in enumerate(accounts):
            if account1["id"] in processed_ids:
                continue
                
            potential_duplicates = [account1]
            processed_ids.add(account1["id"])
            
            for account2 in accounts[i+1:]:
                if account2["id"] in processed_ids:
                    continue
                    
                # Check for duplicate criteria
                is_duplicate = False
                reasons = []
                
                # Same institution
                inst1 = account1.get("institution", "").lower()
                inst2 = account2.get("institution", "").lower()
                if inst1 and inst2 and inst1 == inst2:
                    # Same institution, check account numbers
                    acc_num1 = account1.get("account_number", "")
                    acc_num2 = account2.get("account_number", "")
                    
                    if acc_num1 and acc_num2:
                        # Compare last 4 digits
                        last4_1 = acc_num1[-4:] if len(acc_num1) >= 4 else acc_num1
                        last4_2 = acc_num2[-4:] if len(acc_num2) >= 4 else acc_num2
                        
                        if last4_1 == last4_2:
                            is_duplicate = True
                            reasons.append(f"Same account ending in {last4_1}")
                    
                    # Similar names
                    name1 = account1.get("name", "").lower()
                    name2 = account2.get("name", "").lower()
                    
                    if name1 and name2:
                        # Check if names are very similar
                        if name1 == name2:
                            is_duplicate = True
                            reasons.append("Identical account names")
                        elif name1 in name2 or name2 in name1:
                            is_duplicate = True
                            reasons.append("Similar account names")
                    
                    # Similar account types
                    type1 = account1.get("type", "").lower()
                    type2 = account2.get("type", "").lower()
                    
                    if type1 == type2 and is_duplicate:
                        reasons.append(f"Same type: {type1}")
                
                if is_duplicate:
                    potential_duplicates.append(account2)
                    processed_ids.add(account2["id"])
                    account2["duplicate_reasons"] = reasons
            
            # Only add groups with actual duplicates
            if len(potential_duplicates) > 1:
                # Add metadata about which has more recent data
                for acc in potential_duplicates:
                    # Check if account has MX guid (newer) or not (older Plaid)
                    acc["is_mx_account"] = bool(acc.get("mx_account_guid"))
                    acc["is_plaid_account"] = bool(acc.get("plaid_account_id"))
                
                duplicate_groups.append({
                    "accounts": potential_duplicates,
                    "institution": potential_duplicates[0].get("institution", "Unknown"),
                    "group_id": f"group_{len(duplicate_groups)}"
                })
        
        return {
            "duplicate_groups": duplicate_groups,
            "total_groups": len(duplicate_groups),
            "total_duplicates": sum(len(group["accounts"]) - 1 for group in duplicate_groups)
        }
        
    except Exception as e:
        print(f"Error finding duplicates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts/merge")
async def merge_accounts(
    request: MergeAccountsRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Merge duplicate accounts into a primary account.
    Optionally transfer transactions from duplicates to primary.
    """
    try:
        # Verify primary account exists and belongs to user
        primary_account = await db.accounts.find_one({
            "id": request.primary_account_id,
            "user_id": user_id
        }, {"_id": 0})
        
        if not primary_account:
            raise HTTPException(status_code=404, detail="Primary account not found")
        
        # Verify all duplicate accounts exist and belong to user
        duplicate_accounts = []
        for dup_id in request.duplicate_account_ids:
            dup_account = await db.accounts.find_one({
                "id": dup_id,
                "user_id": user_id
            }, {"_id": 0})
            
            if not dup_account:
                raise HTTPException(status_code=404, detail=f"Duplicate account {dup_id} not found")
            
            duplicate_accounts.append(dup_account)
        
        # Transfer transactions if requested
        transactions_moved = 0
        if request.merge_transactions:
            for dup_account in duplicate_accounts:
                # Update all transactions from duplicate to primary
                result = await db.transactions.update_many(
                    {
                        "user_id": user_id,
                        "account_id": dup_account["id"]
                    },
                    {
                        "$set": {"account_id": request.primary_account_id}
                    }
                )
                transactions_moved += result.modified_count
        
        # Delete duplicate accounts
        deleted_count = 0
        for dup_id in request.duplicate_account_ids:
            result = await db.accounts.delete_one({
                "id": dup_id,
                "user_id": user_id
            })
            if result.deleted_count > 0:
                deleted_count += 1
        
        return {
            "success": True,
            "primary_account": primary_account["name"],
            "accounts_deleted": deleted_count,
            "transactions_moved": transactions_moved,
            "message": f"Successfully merged {deleted_count} duplicate account(s) into {primary_account['name']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error merging accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/accounts/{account_id}/with-transactions")
async def delete_account_with_transactions(
    account_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Delete an account and all its associated transactions.
    """
    try:
        # Verify account exists and belongs to user
        account = await db.accounts.find_one({
            "id": account_id,
            "user_id": user_id
        }, {"_id": 0})
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Delete all transactions for this account
        txn_result = await db.transactions.delete_many({
            "user_id": user_id,
            "account_id": account_id
        })
        
        # Delete the account
        acc_result = await db.accounts.delete_one({
            "id": account_id,
            "user_id": user_id
        })
        
        return {
            "success": True,
            "account_name": account["name"],
            "transactions_deleted": txn_result.deleted_count,
            "message": f"Deleted {account['name']} and {txn_result.deleted_count} associated transactions"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting account: {e}")
        raise HTTPException(status_code=500, detail=str(e))
