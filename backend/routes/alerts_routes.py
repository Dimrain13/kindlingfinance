"""
Smart Alerts System - bill reminders, budget alerts, unusual spending detection
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import statistics

from auth import get_current_user
from database import (
    transactions_collection, bills_collection, budgets_collection,
    goals_collection, accounts_collection, db
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


async def check_upcoming_bills(user_id: str) -> List[Dict]:
    """Check for bills due in next 7 days"""
    alerts = []
    
    now = datetime.now(timezone.utc)
    seven_days_later = now + timedelta(days=7)
    
    # Get all bills
    bills = await bills_collection.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    for bill in bills:
        due_date_str = bill.get("due_date")
        if not due_date_str:
            continue
        
        # Parse due date
        if isinstance(due_date_str, str):
            due_date = datetime.fromisoformat(due_date_str).date()
        else:
            due_date = due_date_str
        
        # Convert to datetime for comparison
        due_datetime = datetime.combine(due_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        
        days_until_due = (due_datetime - now).days
        
        if 0 <= days_until_due <= 7 and not bill.get("is_paid"):
            severity = "high" if days_until_due <= 2 else "medium"
            
            alerts.append({
                "type": "bill_due",
                "severity": severity,
                "title": f"Bill Due: {bill['name']}",
                "message": f"${bill['amount']:.2f} due in {days_until_due} day{'s' if days_until_due != 1 else ''}",
                "data": {
                    "bill_id": bill["id"],
                    "bill_name": bill["name"],
                    "amount": bill["amount"],
                    "due_date": due_date_str,
                    "days_until_due": days_until_due
                },
                "created_at": now
            })
    
    return alerts


async def check_budget_overspending(user_id: str) -> List[Dict]:
    """Check for budget overspending"""
    alerts = []
    
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get budgets
    budgets = await budgets_collection.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    for budget in budgets:
        category = budget.get("category")
        limit = budget.get("amount", 0)
        
        # Get spending in this category this month
        spent = await transactions_collection.aggregate([
            {
                "$match": {
                    "user_id": user_id,
                    "category": category,
                    "date": {"$gte": current_month_start},
                    "amount": {"$gt": 0},
                    "deleted": {"$ne": True}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]).to_list(1)
        
        spent_amount = spent[0]["total"] if spent else 0
        percentage = (spent_amount / limit * 100) if limit > 0 else 0
        
        if percentage >= 90:
            severity = "high" if percentage >= 100 else "medium"
            
            alerts.append({
                "type": "budget_overspending",
                "severity": severity,
                "title": f"Budget Alert: {category}",
                "message": f"${spent_amount:.2f} spent of ${limit:.2f} ({percentage:.0f}%)",
                "data": {
                    "category": category,
                    "spent": spent_amount,
                    "limit": limit,
                    "percentage": percentage,
                    "remaining": limit - spent_amount
                },
                "created_at": now
            })
    
    return alerts


async def check_low_balance(user_id: str) -> List[Dict]:
    """Check for low account balances"""
    alerts = []
    
    # Get checking/savings accounts
    accounts = await accounts_collection.find({
        "user_id": user_id,
        "account_type": {"$in": ["checking", "savings"]}
    }, {"_id": 0}).to_list(100)
    
    for account in accounts:
        balance = account.get("balance", 0)
        
        # Alert if balance is below $100 (configurable threshold)
        if balance < 100 and balance > 0:
            severity = "high" if balance < 50 else "medium"
            
            alerts.append({
                "type": "low_balance",
                "severity": severity,
                "title": f"Low Balance: {account['name']}",
                "message": f"Balance is ${balance:.2f}",
                "data": {
                    "account_id": account["id"],
                    "account_name": account["name"],
                    "balance": balance,
                    "threshold": 100
                },
                "created_at": datetime.now(timezone.utc)
            })
    
    return alerts


async def check_goal_milestones(user_id: str) -> List[Dict]:
    """Check for goal milestone achievements"""
    alerts = []
    
    goals = await goals_collection.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    for goal in goals:
        progress = goal.get("progress", 0)
        
        # Check for milestone achievements (25%, 50%, 75%, 90%)
        milestones = [25, 50, 75, 90]
        
        for milestone in milestones:
            if progress >= milestone and progress < milestone + 5:  # Within 5% of milestone
                alerts.append({
                    "type": "goal_milestone",
                    "severity": "low",
                    "title": f"Goal Progress: {goal['name']}",
                    "message": f"{milestone}% complete! Keep going!",
                    "data": {
                        "goal_id": goal["id"],
                        "goal_name": goal["name"],
                        "progress": progress,
                        "milestone": milestone,
                        "current_amount": goal.get("current_amount", 0),
                        "target_amount": goal.get("target_amount", 0)
                    },
                    "created_at": datetime.now(timezone.utc)
                })
                break  # Only one milestone per goal
    
    return alerts


async def check_unusual_spending(user_id: str) -> List[Dict]:
    """Detect unusual spending patterns"""
    alerts = []
    
    now = datetime.now(timezone.utc)
    
    # Get last 3 months of transactions
    three_months_ago = now - timedelta(days=90)
    
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": three_months_ago},
        "amount": {"$gt": 0},
        "deleted": {"$ne": True}
    }, {"_id": 0}).to_list(10000)
    
    if len(transactions) < 10:  # Need enough data
        return alerts
    
    # Calculate average and std deviation
    amounts = [t["amount"] for t in transactions]
    avg_amount = statistics.mean(amounts)
    
    try:
        std_dev = statistics.stdev(amounts)
    except:
        std_dev = 0
    
    # Get recent transactions (last 7 days)
    seven_days_ago = now - timedelta(days=7)
    recent_txns = [t for t in transactions if t["date"] >= seven_days_ago]
    
    # Check for unusually large transactions (> 2 standard deviations)
    for txn in recent_txns:
        if std_dev > 0 and txn["amount"] > (avg_amount + 2 * std_dev):
            alerts.append({
                "type": "unusual_spending",
                "severity": "medium",
                "title": "Unusual Purchase Detected",
                "message": f"${txn['amount']:.2f} at {txn.get('merchant_name', 'Unknown')}",
                "data": {
                    "transaction_id": txn["id"],
                    "merchant": txn.get("merchant_name", "Unknown"),
                    "amount": txn["amount"],
                    "average": avg_amount,
                    "date": txn["date"].isoformat()
                },
                "created_at": now
            })
    
    return alerts


@router.get("")
async def get_all_alerts(user_id: str = Depends(get_current_user)):
    """Get all active alerts for user"""
    
    # Run all alert checks
    bill_alerts = await check_upcoming_bills(user_id)
    budget_alerts = await check_budget_overspending(user_id)
    balance_alerts = await check_low_balance(user_id)
    goal_alerts = await check_goal_milestones(user_id)
    spending_alerts = await check_unusual_spending(user_id)
    
    # Combine all alerts
    all_alerts = (
        bill_alerts +
        budget_alerts +
        balance_alerts +
        goal_alerts +
        spending_alerts
    )
    
    # Sort by severity (high -> medium -> low)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_alerts.sort(key=lambda x: severity_order.get(x["severity"], 3))
    
    return {
        "total_count": len(all_alerts),
        "high_priority": len([a for a in all_alerts if a["severity"] == "high"]),
        "medium_priority": len([a for a in all_alerts if a["severity"] == "medium"]),
        "low_priority": len([a for a in all_alerts if a["severity"] == "low"]),
        "alerts": all_alerts
    }


@router.get("/summary")
async def get_alerts_summary(user_id: str = Depends(get_current_user)):
    """Get alert count summary for badge display"""
    
    result = await get_all_alerts(user_id)
    
    return {
        "total": result["total_count"],
        "high": result["high_priority"],
        "medium": result["medium_priority"],
        "low": result["low_priority"]
    }


@router.post("/dismiss/{alert_type}")
async def dismiss_alert(
    alert_type: str,
    alert_data: dict,
    user_id: str = Depends(get_current_user)
):
    """Dismiss/acknowledge an alert"""
    
    # Store dismissed alert
    dismissed_alert = {
        "user_id": user_id,
        "alert_type": alert_type,
        "alert_data": alert_data,
        "dismissed_at": datetime.now(timezone.utc)
    }
    
    await db.dismissed_alerts.insert_one(dismissed_alert)
    
    return {"message": "Alert dismissed"}
