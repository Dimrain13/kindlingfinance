from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from typing import Dict, Optional
import sys

sys.path.append('/app/backend')
from auth import get_current_user
from database import db

router = APIRouter(prefix="/budgets", tags=["budgets"])

# Category mapping: Maps budget categories to transaction categories
CATEGORY_MAPPING = {
    "Groceries": ["FOOD_AND_DRINK_GROCERIES", "groceries", "Groceries", "GROCERIES"],
    "Dining Out": ["FOOD_AND_DRINK_RESTAURANTS", "restaurants", "Dining Out", "RESTAURANTS", "Food and Drink", "Food & Dining", "FOOD_AND_DRINK"],
    "Transportation": ["TRANSPORTATION", "Gas", "GAS_STATIONS", "TRANSPORTATION_PUBLIC_TRANSIT", "TRANSPORTATION_TAXIS", "Transportation"],
    "Shopping": ["GENERAL_MERCHANDISE", "shopping", "Shopping", "SHOPS"],
    "Entertainment": ["ENTERTAINMENT", "entertainment", "Entertainment"],
    "Bills & Utilities": ["UTILITIES", "utilities", "Bills", "HOME_UTILITIES", "Bills & Utilities"],
    "Healthcare": ["HEALTHCARE", "healthcare", "Medical", "Healthcare", "MEDICAL"],
    "Personal Care": ["PERSONAL_CARE", "personal care", "Personal Care"],
    "Travel": ["TRAVEL", "travel", "Travel"],
    "Education": ["EDUCATION", "education", "Education"],
    "Subscriptions": ["SUBSCRIPTION", "subscriptions", "Subscriptions"],
}

def get_budget_category_for_transaction(txn_category: str) -> str:
    """Map a transaction category to a budget category."""
    for budget_cat, txn_cats in CATEGORY_MAPPING.items():
        if txn_category in txn_cats:
            return budget_cat
    return txn_category  # Return original if no mapping found


def calculate_monthly_budget_status(budget: dict, transactions: list, current_month_start: datetime, current_month_end: datetime) -> dict:
    """
    Calculate budget status for current month with rollover logic.
    Returns: {
        'current_month_spent': float,
        'budget_cap': float,  # Monthly cap
        'rollover_from_prior': float,  # Surplus from last month (if rollover enabled)
        'available_this_month': float,  # Cap + rollover (if enabled)
        'status': 'under'|'over'|'on_track',
        'surplus_or_deficit': float,  # Positive = surplus, Negative = over budget
        'prior_month_savings': float  # Savings from prior month (if rollover disabled)
    }
    """
    monthly_cap = budget.get('amount', 0)
    period = budget.get('period', 'monthly')
    rollover_enabled = budget.get('rollover', False)
    category = budget.get('category', '')
    
    # Calculate current month spending
    current_month_spent = 0
    for txn in transactions:
        txn_date_str = txn.get('date', '')
        if isinstance(txn_date_str, str):
            txn_date = datetime.fromisoformat(txn_date_str.replace('Z', '+00:00'))
        else:
            txn_date = txn_date_str
            
        if current_month_start <= txn_date <= current_month_end:
            txn_category = txn.get('category', '')
            if get_budget_category_for_transaction(txn_category) == category:
                current_month_spent += abs(txn.get('amount', 0))
    
    # Calculate prior month spending for rollover
    prior_month_start = current_month_start - timedelta(days=current_month_start.day)
    prior_month_end = current_month_start - timedelta(days=1)
    
    prior_month_spent = 0
    for txn in transactions:
        txn_date_str = txn.get('date', '')
        if isinstance(txn_date_str, str):
            txn_date = datetime.fromisoformat(txn_date_str.replace('Z', '+00:00'))
        else:
            txn_date = txn_date_str
            
        if prior_month_start <= txn_date <= prior_month_end:
            txn_category = txn.get('category', '')
            if get_budget_category_for_transaction(txn_category) == category:
                prior_month_spent += abs(txn.get('amount', 0))
    
    # Calculate prior month surplus (can be negative if over budget)
    prior_month_surplus = monthly_cap - prior_month_spent
    
    # Apply rollover logic
    if rollover_enabled and prior_month_surplus > 0:
        # Add surplus to current month's available budget
        rollover_amount = prior_month_surplus
        available_this_month = monthly_cap + rollover_amount
        prior_month_savings = 0  # Not showing as savings, it's rolled over
    else:
        # No rollover, show as separate savings
        rollover_amount = 0
        available_this_month = monthly_cap
        prior_month_savings = max(0, prior_month_surplus)  # Only show if positive
    
    # Calculate status
    surplus_or_deficit = available_this_month - current_month_spent
    
    if current_month_spent > available_this_month:
        status = 'over'
    elif current_month_spent >= available_this_month * 0.9:
        status = 'on_track'
    else:
        status = 'under'
    
    return {
        'current_month_spent': current_month_spent,
        'budget_cap': monthly_cap,
        'rollover_from_prior': rollover_amount,
        'available_this_month': available_this_month,
        'status': status,
        'surplus_or_deficit': surplus_or_deficit,
        'prior_month_savings': prior_month_savings,
        'percentage': (current_month_spent / available_this_month * 100) if available_this_month > 0 else 0
    }


@router.get("/spending")
async def get_budget_spending(
    user_id: str = Depends(get_current_user),
    period: str = "monthly",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get spending by category for budget tracking.
    Includes: regular transactions + recurring subscriptions
    Supports either period (monthly/weekly/yearly) or custom date range
    """
    
    # Calculate date range
    now = datetime.utcnow()
    
    if start_date and end_date:
        # Use custom date range if provided
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
    else:
        # Use period-based date range
        if period == "monthly":
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == "weekly":
            start_dt = now - timedelta(days=7)
        else:  # yearly
            start_dt = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_dt = now
    
    # Get all transactions in this period
    # Convert datetime objects to string format for comparison (transactions store dates as strings)
    start_date_str = start_dt.strftime('%Y-%m-%d')
    end_date_str = end_dt.strftime('%Y-%m-%d')
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "transaction_type": "expense",
        "date": {"$gte": start_date_str, "$lte": end_date_str}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate spending by category
    spending_by_category: Dict[str, float] = {}
    
    for txn in transactions:
        txn_category = txn.get("category", "Other")
        # Map transaction category to budget category
        budget_category = get_budget_category_for_transaction(txn_category)
        amount = abs(txn.get("amount", 0))
        
        if budget_category not in spending_by_category:
            spending_by_category[budget_category] = 0
        
        spending_by_category[budget_category] += amount
    
    # Get recurring subscriptions that should count this month
    recurring_subs = await db.transactions.find({
        "user_id": user_id,
        "transaction_type": "expense",
        "is_recurring": True
    }, {"_id": 0}).to_list(1000)
    
    # Add recurring subscriptions to category spending
    # (They might not have transactions yet this month)
    for sub in recurring_subs:
        category = sub.get("category", "Subscriptions")
        amount = abs(sub.get("amount", 0))
        
        # Check if this recurring sub is already counted in transactions
        # If not, add it as estimated spending
        matching_txns = [t for t in transactions 
                        if t.get("category") == category 
                        and abs(t.get("amount", 0)) == amount
                        and t.get("name") == sub.get("name")]
        
        if not matching_txns:
            # This subscription hasn't been paid yet this month
            # Add it as expected spending
            if category not in spending_by_category:
                spending_by_category[category] = 0
            spending_by_category[category] += amount
    
    return {
        "period": period,
        "start_date": start_dt.isoformat(),
        "end_date": end_dt.isoformat(),
        "spending_by_category": spending_by_category,
        "total_spent": sum(spending_by_category.values())
    }


@router.get("/status")
async def get_budget_status(
    user_id: str = Depends(get_current_user)
):
    """
    Get comprehensive budget status for current month with rollover calculations.
    Returns budget status for each budget including:
    - Current month spending
    - Budget cap
    - Rollover from prior month (if enabled)
    - Available budget this month
    - Status (over/under/on_track)
    - Prior month savings (if rollover disabled)
    """
    # Get all budgets for user
    budgets = await db.budgets.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Get all transactions for the last 2 months (to calculate rollover)
    now = datetime.utcnow()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_end = now
    
    # Get transactions from 2 months ago to now
    two_months_ago = (current_month_start - timedelta(days=60)).isoformat()
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": two_months_ago}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate status for each budget
    budget_statuses = []
    for budget in budgets:
        status = calculate_monthly_budget_status(
            budget,
            transactions,
            current_month_start,
            current_month_end
        )
        budget_statuses.append({
            "budget_id": budget.get("id"),
            "category": budget.get("category"),
            "period": budget.get("period", "monthly"),
            "rollover_enabled": budget.get("rollover", False),
            **status
        })
    
    return {
        "current_month": current_month_start.strftime("%B %Y"),
        "budgets": budget_statuses
    }



@router.put("/{budget_id}")
async def update_budget(
    budget_id: str,
    budget: dict,
    user_id: str = Depends(get_current_user)
):
    """Update an existing budget."""
    # Remove id and user_id from update data if present
    update_data = {k: v for k, v in budget.items() if k not in ['id', 'user_id']}
    
    result = await db.budgets.update_one(
        {"id": budget_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Return updated budget
    updated_budget = await db.budgets.find_one(
        {"id": budget_id, "user_id": user_id},
        {"_id": 0}
    )
    return updated_budget


@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a budget."""
    result = await db.budgets.delete_one({
        "id": budget_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}
