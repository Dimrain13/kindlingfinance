"""
Analytics and Reports routes - spending analysis, trends, and exports
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from typing import List, Dict
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import csv
import io

from auth import get_current_user
from database import transactions_collection, accounts_collection

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/spending-by-category")
async def get_spending_by_category(
    months: int = 6,
    user_id: str = Depends(get_current_user)
):
    """Get spending breakdown by category over time"""
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)
    
    # Get all transactions
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": cutoff_date},
        "amount": {"$gt": 0},  # Only expenses (positive amounts)
        "deleted": {"$ne": True}
    }, {"_id": 0}).to_list(10000)
    
    # Group by month and category
    monthly_data = defaultdict(lambda: defaultdict(float))
    category_totals = defaultdict(float)
    
    for txn in transactions:
        txn_date = txn["date"]
        month_key = txn_date.strftime("%Y-%m")
        category = txn.get("category") or "Uncategorized"
        amount = txn["amount"]
        
        monthly_data[month_key][category] += amount
        category_totals[category] += amount
    
    # Sort months chronologically
    sorted_months = sorted(monthly_data.keys())
    
    # Get top categories
    top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:8]
    top_category_names = [cat for cat, _ in top_categories]
    
    # Format for charts
    series = []
    for category in top_category_names:
        data_points = [monthly_data[month].get(category, 0) for month in sorted_months]
        series.append({
            "name": category,
            "data": data_points
        })
    
    return {
        "months": sorted_months,
        "series": series,
        "category_totals": dict(top_categories)
    }


@router.get("/income-vs-expenses")
async def get_income_vs_expenses(
    months: int = 12,
    user_id: str = Depends(get_current_user)
):
    """Get income vs expenses comparison over time"""
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)
    
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": cutoff_date},
        "deleted": {"$ne": True}
    }, {"_id": 0}).to_list(10000)
    
    # Group by month
    monthly_income = defaultdict(float)
    monthly_expenses = defaultdict(float)
    
    for txn in transactions:
        month_key = txn["date"].strftime("%Y-%m")
        amount = txn["amount"]
        
        if amount < 0:  # Income (negative in Plaid)
            monthly_income[month_key] += abs(amount)
        else:  # Expense
            monthly_expenses[month_key] += amount
    
    # Get all months in range
    all_months = set()
    current = cutoff_date
    while current <= datetime.now(timezone.utc):
        all_months.add(current.strftime("%Y-%m"))
        current += timedelta(days=30)
    
    sorted_months = sorted(all_months)
    
    # Calculate net (savings)
    income_data = [monthly_income.get(m, 0) for m in sorted_months]
    expenses_data = [monthly_expenses.get(m, 0) for m in sorted_months]
    net_data = [income_data[i] - expenses_data[i] for i in range(len(sorted_months))]
    
    return {
        "months": sorted_months,
        "income": income_data,
        "expenses": expenses_data,
        "net": net_data,
        "total_income": sum(income_data),
        "total_expenses": sum(expenses_data),
        "average_monthly_savings": sum(net_data) / len(net_data) if net_data else 0
    }


@router.get("/top-merchants")
async def get_top_merchants(
    months: int = 3,
    limit: int = 10,
    user_id: str = Depends(get_current_user)
):
    """Get top merchants by spending"""
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)
    
    transactions = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": cutoff_date},
        "amount": {"$gt": 0},
        "deleted": {"$ne": True}
    }, {"_id": 0}).to_list(10000)
    
    # Group by merchant
    merchant_totals = defaultdict(lambda: {"total": 0, "count": 0, "avg": 0})
    
    for txn in transactions:
        merchant = txn.get("merchant_name") or txn.get("description", "Unknown")
        amount = txn["amount"]
        
        merchant_totals[merchant]["total"] += amount
        merchant_totals[merchant]["count"] += 1
    
    # Calculate averages
    for merchant in merchant_totals:
        merchant_totals[merchant]["avg"] = merchant_totals[merchant]["total"] / merchant_totals[merchant]["count"]
    
    # Sort and limit
    sorted_merchants = sorted(
        merchant_totals.items(),
        key=lambda x: x[1]["total"],
        reverse=True
    )[:limit]
    
    return [
        {
            "merchant": merchant,
            "total_spent": data["total"],
            "transaction_count": data["count"],
            "average_transaction": data["avg"]
        }
        for merchant, data in sorted_merchants
    ]


@router.get("/monthly-comparison")
async def get_monthly_comparison(user_id: str = Depends(get_current_user)):
    """Compare this month vs last month"""
    
    now = datetime.now(timezone.utc)
    
    # Current month
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Last month
    if now.month == 1:
        last_month_start = current_month_start.replace(year=now.year - 1, month=12)
    else:
        last_month_start = current_month_start.replace(month=now.month - 1)
    
    # Get transactions for both months
    current_txns = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": current_month_start},
        "deleted": {"$ne": True}
    }, {"_id": 0}).to_list(10000)
    
    last_txns = await transactions_collection.find({
        "user_id": user_id,
        "date": {"$gte": last_month_start, "$lt": current_month_start},
        "deleted": {"$ne": True}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    def calculate_metrics(txns):
        income = sum(abs(t["amount"]) for t in txns if t["amount"] < 0)
        expenses = sum(t["amount"] for t in txns if t["amount"] > 0)
        
        # Category breakdown
        categories = defaultdict(float)
        for t in txns:
            if t["amount"] > 0:  # Only expenses
                cat = t.get("category", "Uncategorized")
                categories[cat] += t["amount"]
        
        return {
            "income": income,
            "expenses": expenses,
            "net": income - expenses,
            "transaction_count": len(txns),
            "top_category": max(categories.items(), key=lambda x: x[1])[0] if categories else None,
            "categories": dict(categories)
        }
    
    current_metrics = calculate_metrics(current_txns)
    last_metrics = calculate_metrics(last_txns)
    
    # Calculate changes
    def calc_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100
    
    return {
        "current_month": {
            **current_metrics,
            "month": current_month_start.strftime("%B %Y")
        },
        "last_month": {
            **last_metrics,
            "month": last_month_start.strftime("%B %Y")
        },
        "changes": {
            "income_change": calc_change(current_metrics["income"], last_metrics["income"]),
            "expenses_change": calc_change(current_metrics["expenses"], last_metrics["expenses"]),
            "net_change": calc_change(current_metrics["net"], last_metrics["net"])
        }
    }


@router.get("/export/transactions")
async def export_transactions_csv(
    start_date: str = None,
    end_date: str = None,
    user_id: str = Depends(get_current_user)
):
    """Export transactions to CSV"""
    
    # Parse dates
    query = {"user_id": user_id, "deleted": {"$ne": True}}
    
    if start_date:
        query["date"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["date"] = {"$lte": datetime.fromisoformat(end_date)}
    
    transactions = await transactions_collection.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Date", "Merchant", "Description", "Amount", "Category", 
        "Account", "Type", "Pending"
    ])
    
    # Data rows
    for txn in transactions:
        writer.writerow([
            txn["date"].strftime("%Y-%m-%d"),
            txn.get("merchant_name", ""),
            txn.get("description", ""),
            f"{txn['amount']:.2f}",
            txn.get("category", ""),
            txn.get("account_name", ""),
            "Income" if txn["amount"] < 0 else "Expense",
            "Yes" if txn.get("pending") else "No"
        ])
    
    # Create response
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/spending-trends")
async def get_spending_trends(
    category: str = None,
    months: int = 6,
    user_id: str = Depends(get_current_user)
):
    """Get spending trends with predictions"""
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)
    
    query = {
        "user_id": user_id,
        "date": {"$gte": cutoff_date},
        "amount": {"$gt": 0},
        "deleted": {"$ne": True}
    }
    
    if category:
        query["category"] = category
    
    transactions = await transactions_collection.find(query, {"_id": 0}).to_list(10000)
    
    # Group by month
    monthly_spending = defaultdict(float)
    
    for txn in transactions:
        month_key = txn["date"].strftime("%Y-%m")
        monthly_spending[month_key] += txn["amount"]
    
    sorted_months = sorted(monthly_spending.keys())
    spending_data = [monthly_spending[m] for m in sorted_months]
    
    # Calculate trend
    if len(spending_data) >= 2:
        # Simple linear trend
        avg_change = (spending_data[-1] - spending_data[0]) / len(spending_data)
        trend = "increasing" if avg_change > 0 else "decreasing"
        
        # Predict next month
        predicted_next = spending_data[-1] + avg_change
    else:
        trend = "stable"
        predicted_next = spending_data[0] if spending_data else 0
    
    return {
        "months": sorted_months,
        "spending": spending_data,
        "average_monthly": sum(spending_data) / len(spending_data) if spending_data else 0,
        "trend": trend,
        "predicted_next_month": max(0, predicted_next),
        "category": category or "All Categories"
    }
