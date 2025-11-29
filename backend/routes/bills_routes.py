"""
Bills management routes - CRUD operations and transaction linking
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timedelta
import uuid

from auth import get_current_user
from database import bills_collection, transactions_collection
from models import Bill, BillCreate

router = APIRouter(prefix="/bills", tags=["bills"])


@router.post("", response_model=Bill)
async def create_bill(bill_data: BillCreate, user_id: str = Depends(get_current_user)):
    """Create a bill"""
    bill_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": bill_data.name,
        "amount": bill_data.amount,
        "due_date": bill_data.due_date.isoformat(),  # Convert date to string for MongoDB
        "frequency": bill_data.frequency,
        "category": bill_data.category,
        "icon": bill_data.icon or "📄",
        "auto_pay": bill_data.auto_pay,
        "is_paid": False,
        "linked_transaction_ids": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await bills_collection.insert_one(bill_doc)
    return Bill(**bill_doc)


@router.get("", response_model=List[Bill])
async def get_bills(user_id: str = Depends(get_current_user)):
    """Get all bills for user"""
    bills = await bills_collection.find({"user_id": user_id}).to_list(100)
    return [Bill(**bill) for bill in bills]


@router.patch("/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, bill_data: BillCreate, user_id: str = Depends(get_current_user)):
    """Update a bill"""
    update_doc = {
        "name": bill_data.name,
        "amount": bill_data.amount,
        "due_date": bill_data.due_date.isoformat(),  # Convert date to string for MongoDB
        "frequency": bill_data.frequency,
        "category": bill_data.category,
        "icon": bill_data.icon or "📄",
        "auto_pay": bill_data.auto_pay,
        "updated_at": datetime.utcnow()
    }
    
    result = await bills_collection.update_one(
        {"id": bill_id, "user_id": user_id},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Fetch and return updated bill
    updated_bill = await bills_collection.find_one({"id": bill_id, "user_id": user_id})
    return Bill(**updated_bill)


@router.patch("/{bill_id}/pay")
async def mark_bill_paid(bill_id: str, is_paid: bool, user_id: str = Depends(get_current_user)):
    """Mark bill as paid/unpaid"""
    result = await bills_collection.update_one(
        {"id": bill_id, "user_id": user_id},
        {"$set": {"is_paid": is_paid, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill updated"}


@router.delete("/{bill_id}")
async def delete_bill(bill_id: str, user_id: str = Depends(get_current_user)):
    """Delete a bill"""
    result = await bills_collection.delete_one({"id": bill_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill deleted"}


# ==================== TRANSACTION LINKING ====================

@router.post("/{bill_id}/link-transaction")
async def link_transaction_to_bill(
    bill_id: str,
    transaction_id: str,
    user_id: str = Depends(get_current_user)
):
    """Link a transaction to a bill"""
    # Verify bill exists and belongs to user
    bill = await bills_collection.find_one({"id": bill_id, "user_id": user_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Verify transaction exists and belongs to user
    transaction = await transactions_collection.find_one({"id": transaction_id, "user_id": user_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Add transaction ID to bill's linked_transaction_ids
    linked_ids = bill.get("linked_transaction_ids", [])
    if transaction_id not in linked_ids:
        linked_ids.append(transaction_id)
        
        await bills_collection.update_one(
            {"id": bill_id, "user_id": user_id},
            {
                "$set": {
                    "linked_transaction_ids": linked_ids,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    return {"message": "Transaction linked successfully", "linked_transaction_ids": linked_ids}


@router.delete("/{bill_id}/unlink-transaction/{transaction_id}")
async def unlink_transaction_from_bill(
    bill_id: str,
    transaction_id: str,
    user_id: str = Depends(get_current_user)
):
    """Unlink a transaction from a bill"""
    # Verify bill exists and belongs to user
    bill = await bills_collection.find_one({"id": bill_id, "user_id": user_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Remove transaction ID from bill's linked_transaction_ids
    linked_ids = bill.get("linked_transaction_ids", [])
    if transaction_id in linked_ids:
        linked_ids.remove(transaction_id)
        
        await bills_collection.update_one(
            {"id": bill_id, "user_id": user_id},
            {
                "$set": {
                    "linked_transaction_ids": linked_ids,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    return {"message": "Transaction unlinked successfully", "linked_transaction_ids": linked_ids}


@router.get("/{bill_id}/suggested-transactions")
async def get_suggested_transactions_for_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get suggested transactions that might match this bill"""
    # Get the bill
    bill = await bills_collection.find_one({"id": bill_id, "user_id": user_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Parse due date
    due_date = bill["due_date"]
    if isinstance(due_date, str):
        due_date = datetime.fromisoformat(due_date).date()
    
    # Search for transactions within ±5 days of due date with similar amount
    start_date = datetime.combine(due_date - timedelta(days=5), datetime.min.time())
    end_date = datetime.combine(due_date + timedelta(days=5), datetime.max.time())
    
    # Amount range: ±20% of bill amount
    min_amount = bill["amount"] * 0.8
    max_amount = bill["amount"] * 1.2
    
    # Get transactions in date and amount range
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date},
        "amount": {"$gte": min_amount, "$lte": max_amount},
        "deleted": {"$ne": True}
    }, {"_id": 0}).sort("date", -1).to_list(10)
    
    # Also search by bill name in merchant/description
    if bill.get("name"):
        name_matches = await transactions_collection.find({
            "user_id": user_id,
            "$or": [
                {"merchant_name": {"$regex": bill["name"], "$options": "i"}},
                {"description": {"$regex": bill["name"], "$options": "i"}}
            ],
            "deleted": {"$ne": True}
        }, {"_id": 0}).sort("date", -1).limit(5).to_list(5)
        
        # Merge and deduplicate
        transaction_ids = {t["id"] for t in transactions}
        for t in name_matches:
            if t["id"] not in transaction_ids:
                transactions.append(t)
                transaction_ids.add(t["id"])
    
    return transactions
