"""
Smart Budget Suggestions based on household size and national averages
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta, timezone
from typing import List, Dict
from auth import get_current_user
from database import db, user_settings_collection, transactions_collection

router = APIRouter(prefix="/budgets/suggestions", tags=["budgets"])

# National average spending by household size (monthly, 2024-2025 data)
NATIONAL_AVERAGES = {
    1: {  # Single person
        "Dining Out": 250,
        "Groceries": 400,
        "Transportation": 800,
        "Utilities": 200,
        "Entertainment": 200,
        "Healthcare": 400,
        "Shopping": 150,
        "Personal Care": 80,
        "Bills & Utilities": 200,
        "Home": 1600,
        "Travel": 150,
    },
    2: {  # Couple
        "Dining Out": 400,
        "Groceries": 675,
        "Transportation": 1000,
        "Utilities": 250,
        "Entertainment": 280,
        "Healthcare": 500,
        "Shopping": 220,
        "Personal Care": 120,
        "Bills & Utilities": 250,
        "Home": 2050,
        "Travel": 200,
    },
    3: {  # Family of 3
        "Dining Out": 550,
        "Groceries": 850,
        "Transportation": 1200,
        "Utilities": 300,
        "Entertainment": 320,
        "Healthcare": 550,
        "Shopping": 280,
        "Personal Care": 140,
        "Bills & Utilities": 300,
        "Home": 2400,
        "Travel": 250,
    },
    4: {  # Family of 4
        "Dining Out": 650,
        "Groceries": 1000,
        "Transportation": 1300,
        "Utilities": 325,
        "Entertainment": 340,
        "Healthcare": 600,
        "Shopping": 320,
        "Personal Care": 160,
        "Bills & Utilities": 325,
        "Home": 2600,
        "Travel": 280,
    },
}

# For families 5+, use family of 4 + 15% per additional person
def get_national_average(family_size: int, category: str) -> float:
    """Get national average for a category based on family size"""
    if family_size <= 4:
        base_averages = NATIONAL_AVERAGES.get(family_size, NATIONAL_AVERAGES[4])
    else:
        # Use family of 4 as base, add 15% per additional person
        base_averages = NATIONAL_AVERAGES[4]
        multiplier = 1 + (0.15 * (family_size - 4))
        base_averages = {k: v * multiplier for k, v in base_averages.items()}
    
    return base_averages.get(category, 0)


@router.get("/smart")
async def get_smart_budget_suggestions(user_id: str = Depends(get_current_user)):
    """
    Generate smart budget suggestions based on:
    1. Last month's actual spending by category
    2. National averages for user's household size
    3. Savings opportunities
    """
    try:
        # Get user settings for family size
        settings = await user_settings_collection.find_one({"user_id": user_id}, {"_id": 0})
        family_size = settings.get("family_size", 1) if settings else 1
        
        # Get last month's date range
        now = datetime.now(timezone.utc)
        last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
        last_month_end = now.replace(day=1) - timedelta(days=1)
        
        # Get last month's transactions
        transactions = await transactions_collection.find({
            "user_id": user_id,
            "transaction_type": "expense",
            "date": {
                "$gte": last_month_start.strftime("%Y-%m-%d"),
                "$lte": last_month_end.strftime("%Y-%m-%d")
            }
        }, {"_id": 0}).to_list(10000)
        
        # Calculate spending by category
        category_spending = {}
        for txn in transactions:
            category = txn.get("category", "Other")
            amount = abs(txn.get("amount", 0))
            category_spending[category] = category_spending.get(category, 0) + amount
        
        # Generate suggestions
        suggestions = []
        
        for category, actual_spent in category_spending.items():
            national_avg = get_national_average(family_size, category)
            
            if national_avg > 0:
                difference = actual_spent - national_avg
                percentage_diff = (difference / national_avg * 100) if national_avg > 0 else 0
                
                suggestion = {
                    "category": category,
                    "last_month_spent": round(actual_spent, 2),
                    "national_average": round(national_avg, 2),
                    "difference": round(difference, 2),
                    "percentage_difference": round(percentage_diff, 1),
                    "suggested_budget": round(national_avg, 2),
                    "potential_savings": round(max(0, difference), 2),
                    "status": "over" if difference > 0 else "under" if difference < 0 else "on_track"
                }
                
                # Add recommendation text
                if difference > national_avg * 0.2:  # 20% over
                    suggestion["recommendation"] = f"You're spending {abs(percentage_diff):.0f}% more than average. Consider reducing to ${national_avg:.0f}/mo to save ${max(0, difference):.0f}/mo"
                elif difference > 0:
                    suggestion["recommendation"] = f"Slightly above average. Target ${national_avg:.0f}/mo to save ${difference:.0f}/mo"
                elif difference < -national_avg * 0.2:  # 20% under
                    suggestion["recommendation"] = f"Great job! You're {abs(percentage_diff):.0f}% below average"
                else:
                    suggestion["recommendation"] = f"On track with national average for household of {family_size}"
                
                suggestions.append(suggestion)
        
        # Add categories with zero spending but have national averages
        for category in NATIONAL_AVERAGES[min(family_size, 4)].keys():
            if category not in category_spending:
                national_avg = get_national_average(family_size, category)
                suggestions.append({
                    "category": category,
                    "last_month_spent": 0,
                    "national_average": round(national_avg, 2),
                    "difference": -national_avg,
                    "percentage_difference": -100,
                    "suggested_budget": round(national_avg, 2),
                    "potential_savings": 0,
                    "status": "no_spending",
                    "recommendation": f"Consider budgeting ${national_avg:.0f}/mo for {category}"
                })
        
        # Sort by potential savings (highest first)
        suggestions.sort(key=lambda x: x["potential_savings"], reverse=True)
        
        return {
            "family_size": family_size,
            "suggestions": suggestions,
            "total_potential_savings": round(sum(s["potential_savings"] for s in suggestions), 2),
            "last_month": last_month_start.strftime("%B %Y")
        }
        
    except Exception as e:
        print(f"Error generating smart suggestions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
