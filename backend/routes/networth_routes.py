"""
Net Worth History Routes
Calculate net worth over time based on transaction history
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from server import get_current_user, db

router = APIRouter(prefix="/networth", tags=["networth"])


@router.get("/calculated-history")
async def get_calculated_networth_history(days: int = 30, user_id: str = Depends(get_current_user)):
    """
    Calculate net worth history by working backwards from current balances
    using transaction data to reconstruct balances at different points in time
    """
    try:
        # Get current accounts
        accounts = await db.accounts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        # Calculate current net worth
        liability_types = ["credit_card", "mortgage", "loan"]
        current_assets = sum(
            acc.get("balance", 0) 
            for acc in accounts 
            if acc.get("account_type") not in liability_types
        )
        current_liabilities = sum(
            abs(acc.get("balance", 0))
            for acc in accounts 
            if acc.get("account_type") in liability_types
        )
        current_net_worth = current_assets - current_liabilities
        
        # Get transactions for the time period
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        transactions = await db.transactions.find({
            "user_id": user_id,
            "date": {"$gte": cutoff_date}
        }, {"_id": 0}).to_list(10000)
        
        # Group transactions by date and calculate daily changes
        daily_changes = defaultdict(lambda: {"income": 0, "expense": 0})
        
        for txn in transactions:
            date = txn.get("date")
            amount = txn.get("amount", 0)
            txn_type = txn.get("transaction_type", "expense")
            
            if txn_type == "income":
                daily_changes[date]["income"] += amount
            else:
                daily_changes[date]["expense"] += amount
        
        # Calculate net worth for each day working backwards from today
        result = []
        running_net_worth = current_net_worth
        
        # Start from today and work backwards
        current_date = datetime.now(timezone.utc).date()
        start_date = (current_date - timedelta(days=days))
        
        # Build list from oldest to newest
        date_range = []
        temp_date = start_date
        while temp_date <= current_date:
            date_range.append(temp_date)
            temp_date += timedelta(days=1)
        
        # Reverse to work backwards from today
        date_range.reverse()
        
        temp_net_worth = current_net_worth
        historical_data = []
        
        for date in date_range:
            date_str = date.strftime("%Y-%m-%d")
            
            # For today, use current value
            if date == current_date:
                historical_data.append({
                    "snapshot_date": date.isoformat(),
                    "net_worth": current_net_worth,
                    "total_assets": current_assets,
                    "total_liabilities": current_liabilities
                })
            else:
                # For past dates, subtract future transactions
                # (working backwards from today)
                next_date = date + timedelta(days=1)
                next_date_str = next_date.strftime("%Y-%m-%d")
                
                if next_date_str in daily_changes:
                    # Subtract income (it increased net worth in the future)
                    temp_net_worth -= daily_changes[next_date_str]["income"]
                    # Add expenses (they decreased net worth in the future)
                    temp_net_worth += daily_changes[next_date_str]["expense"]
                
                historical_data.append({
                    "snapshot_date": date.isoformat(),
                    "net_worth": round(temp_net_worth, 2),
                    "total_assets": round(temp_net_worth + current_liabilities, 2),  # Approximate
                    "total_liabilities": current_liabilities  # Assume stable for simplicity
                })
        
        # Reverse to get chronological order
        historical_data.reverse()
        
        return historical_data
        
    except Exception as e:
        print(f"Error calculating net worth history: {e}")
        import traceback
        traceback.print_exc()
        # Return at least today's value
        return [{
            "snapshot_date": datetime.now(timezone.utc).isoformat(),
            "net_worth": current_net_worth,
            "total_assets": current_assets,
            "total_liabilities": current_liabilities
        }]
