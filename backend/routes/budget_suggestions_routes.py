"""
Budget Suggestions Routes
Provides AI-powered budget recommendations based on income and household size
"""
from fastapi import APIRouter, Depends
from server import get_current_user, db
from datetime import datetime, timedelta, timezone
from typing import Optional

router = APIRouter(prefix="/budgets", tags=["budget-suggestions"])


# Industry average spending percentages by category (based on 2025 data)
# Source: Bureau of Labor Statistics, Nerdwallet, Consumer Expenditure Survey
SPENDING_AVERAGES = {
    "HOUSING": {
        "name": "Housing", 
        "percent": 33.0,  # 33% of income
        "icon": "🏠",
        "description": "Rent/mortgage, utilities, maintenance"
    },
    "TRANSPORTATION": {
        "name": "Transportation",
        "percent": 17.0,  # 17% of income
        "icon": "🚗",
        "description": "Car payments, gas, insurance, maintenance"
    },
    "FOOD": {
        "name": "Food & Dining",
        "percent": 13.0,  # 13% of income
        "icon": "🍽️",
        "description": "Groceries and dining out"
    },
    "HEALTHCARE": {
        "name": "Healthcare",
        "percent": 8.0,  # 8% of income
        "icon": "🏥",
        "description": "Insurance, medical expenses, medications"
    },
    "ENTERTAINMENT": {
        "name": "Entertainment",
        "percent": 5.0,  # 5% of income
        "icon": "🎬",
        "description": "Movies, hobbies, subscriptions"
    },
    "PERSONAL_CARE": {
        "name": "Personal Care",
        "percent": 3.0,  # 3% of income
        "icon": "💄",
        "description": "Haircuts, toiletries, clothing"
    },
    "EDUCATION": {
        "name": "Education",
        "percent": 3.0,  # 3% of income
        "icon": "📚",
        "description": "Tuition, books, courses"
    },
    "SAVINGS": {
        "name": "Savings & Investments",
        "percent": 10.0,  # 10% of income (recommended)
        "icon": "💰",
        "description": "Emergency fund, retirement, investments"
    },
    "MISCELLANEOUS": {
        "name": "Miscellaneous",
        "percent": 8.0,  # 8% of income
        "icon": "📦",
        "description": "Other expenses and flex spending"
    }
}


# Household size multipliers
HOUSEHOLD_MULTIPLIERS = {
    1: 1.0,      # Single
    2: 1.6,      # Couple
    3: 1.9,      # Small family
    4: 2.2,      # Medium family
    5: 2.5,      # Large family
    6: 2.8,      # Extra large family
}


@router.get("/suggestions")
async def get_budget_suggestions(user_id: str = Depends(get_current_user)):
    """
    Generate smart budget suggestions based on user's income and household size
    """
    try:
        # Get user settings for household size
        user_doc = await db.users.find_one({"id": user_id})
        household_size = user_doc.get("household_size", 1) if user_doc else 1
        
        # Get user's monthly income from transactions (last 3 months)
        three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")
        income_transactions = await db.transactions.find({
            "user_id": user_id,
            "transaction_type": "income",
            "date": {"$gte": three_months_ago}
        }).to_list(1000)
        
        # Calculate average monthly income
        if income_transactions:
            total_income = sum(t.get("amount", 0) for t in income_transactions)
            months = 3
            avg_monthly_income = total_income / months
        else:
            # Default to median household income if no data
            avg_monthly_income = 6717  # $80,610 annual / 12 = $6,717 monthly
        
        # Get household multiplier
        multiplier = HOUSEHOLD_MULTIPLIERS.get(household_size, 1.0)
        
        # Generate suggestions
        suggestions = []
        for category_key, category_info in SPENDING_AVERAGES.items():
            base_amount = avg_monthly_income * (category_info["percent"] / 100)
            
            # Adjust for household size (some categories scale more than others)
            if category_key in ["FOOD", "HEALTHCARE", "PERSONAL_CARE", "ENTERTAINMENT"]:
                # These scale directly with household size
                suggested_amount = base_amount * multiplier
            elif category_key in ["HOUSING", "TRANSPORTATION"]:
                # These scale less dramatically
                suggested_amount = base_amount * (1 + (multiplier - 1) * 0.6)
            else:
                # Others scale moderately
                suggested_amount = base_amount * (1 + (multiplier - 1) * 0.8)
            
            suggestions.append({
                "category": category_key,
                "name": category_info["name"],
                "suggested_amount": round(suggested_amount, 2),
                "percent_of_income": category_info["percent"],
                "icon": category_info["icon"],
                "description": category_info["description"],
                "is_essential": category_key in ["HOUSING", "FOOD", "TRANSPORTATION", "HEALTHCARE"]
            })
        
        # Calculate current spending by category
        current_spending = await db.transactions.aggregate([
            {
                "$match": {
                    "user_id": user_id,
                    "transaction_type": "expense",
                    "date": {"$gte": three_months_ago}
                }
            },
            {
                "$group": {
                    "_id": "$category",
                    "total": {"$sum": "$amount"}
                }
            }
        ]).to_list(100)
        
        # Map current spending to suggestions
        spending_map = {item["_id"]: item["total"] / 3 for item in current_spending}  # Average per month
        
        for suggestion in suggestions:
            category_match = suggestion["category"].replace("_", " ").title()
            current = spending_map.get(category_match, 0)
            suggestion["current_spending"] = round(current, 2)
            suggestion["difference"] = round(suggestion["suggested_amount"] - current, 2)
        
        return {
            "monthly_income": round(avg_monthly_income, 2),
            "household_size": household_size,
            "suggestions": suggestions,
            "total_suggested": round(sum(s["suggested_amount"] for s in suggestions), 2),
            "source": "Based on U.S. Consumer Expenditure Survey 2025 data"
        }
        
    except Exception as e:
        print(f"Error generating budget suggestions: {e}")
        import traceback
        traceback.print_exc()
        return {
            "monthly_income": 0,
            "household_size": 1,
            "suggestions": [],
            "total_suggested": 0,
            "error": str(e)
        }
