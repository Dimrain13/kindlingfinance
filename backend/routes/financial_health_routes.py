from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime, timedelta
from auth import get_current_user
from database import db
import statistics

router = APIRouter()

@router.get("/financial-health")
async def get_financial_health_score(user_id: str = Depends(get_current_user)):
    """Calculate comprehensive financial health score"""
    try:
        # Get user settings for credit score
        user_settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
        credit_score_input = user_settings.get("credit_score") if user_settings else None
        
        # Get last 3 months of data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        # Get transactions
        transactions = await db.transactions.find({
            "user_id": user_id,
            "date": {"$gte": start_date.isoformat()}
        }, {"_id": 0}).to_list(10000)
        
        # Get accounts
        accounts = await db.accounts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        # Get budgets
        budgets = await db.budgets.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        # Get goals
        goals = await db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        
        # Calculate each factor
        factors = {}
        
        # 1. Savings Rate (18 points)
        factors["savings_rate"] = calculate_savings_rate(transactions)
        
        # 2. Emergency Fund (15 points)
        factors["emergency_fund"] = calculate_emergency_fund(accounts, transactions)
        
        # 3. Budget Adherence (13 points)
        factors["budget_adherence"] = await calculate_budget_adherence(user_id, budgets, transactions)
        
        # 4. Debt Management (13 points)
        factors["debt_management"] = calculate_debt_management(accounts, transactions)
        
        # 5. Credit Score (13 points)
        factors["credit_score"] = calculate_credit_score_factor(credit_score_input)
        
        # 6. Net Worth Trend (10 points)
        factors["net_worth_trend"] = await calculate_net_worth_trend(user_id)
        
        # 7. Investment Diversification (8 points)
        factors["investment_diversification"] = calculate_investment_diversification(accounts)
        
        # 8. Financial Goal Progress (5 points)
        factors["goal_progress"] = calculate_goal_progress(goals)
        
        # 9. Cash Flow Stability (5 points)
        factors["cash_flow_stability"] = calculate_cash_flow_stability(transactions)
        
        # Calculate total score
        total_score = sum(f["score"] for f in factors.values())
        
        # Determine grade
        if total_score >= 80:
            grade = "Excellent"
            color = "green"
        elif total_score >= 60:
            grade = "Good"
            color = "yellow"
        elif total_score >= 40:
            grade = "Fair"
            color = "orange"
        else:
            grade = "Needs Improvement"
            color = "red"
        
        # Generate improvement tips
        improvement_tips = generate_improvement_tips(factors)
        
        # Store historical score
        score_record = {
            "user_id": user_id,
            "score": total_score,
            "grade": grade,
            "factors": factors,
            "calculated_at": datetime.utcnow().isoformat()
        }
        await db.financial_health_history.insert_one(score_record)
        
        return {
            "score": round(total_score, 1),
            "grade": grade,
            "color": color,
            "factors": factors,
            "improvement_tips": improvement_tips,
            "calculated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Error calculating financial health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def calculate_savings_rate(transactions: List[Dict]) -> Dict:
    """Calculate savings rate score (18 points)"""
    # Get last 30 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    recent_txns = [t for t in transactions if t.get("date", "") >= start_date.isoformat()]
    
    income = sum(abs(t.get("amount", 0)) for t in recent_txns if t.get("transaction_type") == "income")
    expenses = sum(abs(t.get("amount", 0)) for t in recent_txns if t.get("transaction_type") == "expense")
    
    if income == 0:
        return {
            "name": "Savings Rate",
            "score": 0,
            "max_score": 18,
            "percentage": 0,
            "status": "No income data",
            "description": "Unable to calculate - no income transactions found"
        }
    
    savings_rate = ((income - expenses) / income) * 100
    
    # Score calculation
    if savings_rate >= 20:
        score = 18
        status = "Excellent"
    elif savings_rate >= 10:
        score = 13
        status = "Good"
    elif savings_rate >= 5:
        score = 8
        status = "Fair"
    else:
        score = 3
        status = "Needs Work"
    
    return {
        "name": "Savings Rate",
        "score": score,
        "max_score": 18,
        "percentage": max(0, round(savings_rate, 1)),
        "status": status,
        "description": f"You're saving {max(0, round(savings_rate, 1))}% of your income"
    }


def calculate_emergency_fund(accounts: List[Dict], transactions: List[Dict]) -> Dict:
    """Calculate emergency fund score (15 points)"""
    # Calculate liquid assets (checking, savings)
    liquid_balance = sum(
        acc.get("balance", 0) 
        for acc in accounts 
        if acc.get("type", "").lower() in ["depository", "checking", "savings"]
    )
    
    # Calculate monthly expenses
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    recent_txns = [t for t in transactions if t.get("date", "") >= start_date.isoformat()]
    monthly_expenses = sum(abs(t.get("amount", 0)) for t in recent_txns if t.get("transaction_type") == "expense")
    
    if monthly_expenses == 0:
        months_covered = 0
    else:
        months_covered = liquid_balance / monthly_expenses
    
    # Score calculation
    if months_covered >= 6:
        score = 15
        status = "Excellent"
    elif months_covered >= 3:
        score = 11
        status = "Good"
    elif months_covered >= 1:
        score = 6
        status = "Fair"
    else:
        score = 2
        status = "Critical"
    
    return {
        "name": "Emergency Fund",
        "score": score,
        "max_score": 15,
        "months_covered": round(months_covered, 1),
        "status": status,
        "description": f"You have {round(months_covered, 1)} months of expenses covered"
    }


async def calculate_budget_adherence(user_id: str, budgets: List[Dict], transactions: List[Dict]) -> Dict:
    """Calculate budget adherence score (13 points)"""
    if not budgets:
        return {
            "name": "Budget Adherence",
            "score": 0,
            "max_score": 13,
            "percentage": 0,
            "status": "No budgets set",
            "description": "Create budgets to track this metric"
        }
    
    # Get current month spending
    end_date = datetime.now()
    start_date = datetime(end_date.year, end_date.month, 1)
    current_month_txns = [t for t in transactions if t.get("date", "") >= start_date.isoformat()]
    
    # Calculate adherence for each budget
    adherence_scores = []
    for budget in budgets:
        category = budget.get("category")
        budget_amount = budget.get("amount", 0)
        
        # Get spending in this category
        category_spending = sum(
            abs(t.get("amount", 0)) 
            for t in current_month_txns 
            if t.get("category") == category and t.get("transaction_type") == "expense"
        )
        
        if budget_amount > 0:
            adherence_pct = (budget_amount - category_spending) / budget_amount * 100
            adherence_scores.append(max(0, min(100, adherence_pct)))
    
    if not adherence_scores:
        avg_adherence = 0
    else:
        avg_adherence = statistics.mean(adherence_scores)
    
    # Score calculation
    if avg_adherence >= 90:
        score = 13
        status = "Excellent"
    elif avg_adherence >= 70:
        score = 10
        status = "Good"
    elif avg_adherence >= 50:
        score = 6
        status = "Fair"
    else:
        score = 2
        status = "Needs Work"
    
    return {
        "name": "Budget Adherence",
        "score": score,
        "max_score": 13,
        "percentage": round(avg_adherence, 1),
        "status": status,
        "description": f"You're staying within {round(avg_adherence, 1)}% of your budgets"
    }


def calculate_debt_management(accounts: List[Dict], transactions: List[Dict]) -> Dict:
    """Calculate debt management score (13 points)"""
    # Calculate total debt from liability accounts
    total_debt = sum(
        abs(acc.get("balance", 0)) 
        for acc in accounts 
        if acc.get("type", "").lower() in ["credit", "loan", "liability"]
    )
    
    # Calculate monthly income
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    recent_txns = [t for t in transactions if t.get("date", "") >= start_date.isoformat()]
    monthly_income = sum(abs(t.get("amount", 0)) for t in recent_txns if t.get("transaction_type") == "income")
    
    if monthly_income == 0:
        return {
            "name": "Debt Management",
            "score": 0,
            "max_score": 13,
            "percentage": 0,
            "status": "No income data",
            "description": "Unable to calculate debt-to-income ratio"
        }
    
    debt_to_income = (total_debt / (monthly_income * 12)) * 100
    
    # Score calculation
    if debt_to_income < 20:
        score = 13
        status = "Excellent"
    elif debt_to_income < 35:
        score = 10
        status = "Good"
    elif debt_to_income < 50:
        score = 6
        status = "Fair"
    else:
        score = 2
        status = "High Risk"
    
    return {
        "name": "Debt Management",
        "score": score,
        "max_score": 13,
        "debt_to_income_ratio": round(debt_to_income, 1),
        "status": status,
        "description": f"Your debt is {round(debt_to_income, 1)}% of annual income"
    }


def calculate_credit_score_factor(credit_score: int = None) -> Dict:
    """Calculate credit score factor (13 points)"""
    if credit_score is None:
        return {
            "name": "Credit Score",
            "score": 0,
            "max_score": 13,
            "credit_score": None,
            "status": "Not provided",
            "description": "Add your credit score in Settings to track this metric"
        }
    
    # Score calculation based on credit score ranges
    if credit_score >= 750:
        score = 13
        status = "Excellent"
    elif credit_score >= 670:
        score = 9
        status = "Good"
    elif credit_score >= 580:
        score = 5
        status = "Fair"
    else:
        score = 2
        status = "Needs Work"
    
    return {
        "name": "Credit Score",
        "score": score,
        "max_score": 13,
        "credit_score": credit_score,
        "status": status,
        "description": f"Your credit score is {credit_score}"
    }


async def calculate_net_worth_trend(user_id: str) -> Dict:
    """Calculate net worth trend score (10 points)"""
    try:
        # Get net worth from 3 months ago
        three_months_ago = datetime.now() - timedelta(days=90)
        old_snapshot = await db.networth_snapshots.find_one({
            "user_id": user_id,
            "date": {"$lte": three_months_ago.isoformat()}
        }, {"_id": 0}, sort=[("date", -1)])
        
        # Get current net worth
        accounts = await db.accounts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        current_networth = sum(acc.get("balance", 0) for acc in accounts)
        
        if old_snapshot and old_snapshot.get("net_worth"):
            old_networth = old_snapshot["net_worth"]
            if old_networth != 0:
                growth_pct = ((current_networth - old_networth) / abs(old_networth)) * 100
            else:
                growth_pct = 0
        else:
            growth_pct = 0
        
        # Score calculation
        if growth_pct >= 10:
            score = 10
            status = "Excellent"
        elif growth_pct >= 0:
            score = 7
            status = "Good"
        elif growth_pct >= -5:
            score = 4
            status = "Fair"
        else:
            score = 1
            status = "Declining"
        
        return {
            "name": "Net Worth Trend",
            "score": score,
            "max_score": 10,
            "growth_percentage": round(growth_pct, 1),
            "status": status,
            "description": f"Net worth {'+' if growth_pct >= 0 else ''}{round(growth_pct, 1)}% over 3 months"
        }
    except Exception as e:
        print(f"Error calculating net worth trend: {e}")
        return {
            "name": "Net Worth Trend",
            "score": 5,
            "max_score": 10,
            "growth_percentage": 0,
            "status": "Unknown",
            "description": "Insufficient historical data"
        }


def calculate_investment_diversification(accounts: List[Dict]) -> Dict:
    """Calculate investment diversification score (8 points)"""
    investment_accounts = [acc for acc in accounts if acc.get("type", "").lower() in ["investment", "brokerage", "retirement"]]
    
    if not investment_accounts:
        return {
            "name": "Investment Diversification",
            "score": 0,
            "max_score": 8,
            "account_count": 0,
            "status": "No investments",
            "description": "No investment accounts found"
        }
    
    # Simple diversification: more accounts = better diversification (proxy)
    account_count = len(investment_accounts)
    
    if account_count >= 3:
        score = 8
        status = "Well Diversified"
    elif account_count == 2:
        score = 5
        status = "Moderately Diversified"
    else:
        score = 2
        status = "Limited Diversification"
    
    return {
        "name": "Investment Diversification",
        "score": score,
        "max_score": 8,
        "account_count": account_count,
        "status": status,
        "description": f"You have {account_count} investment account(s)"
    }


def calculate_goal_progress(goals: List[Dict]) -> Dict:
    """Calculate financial goal progress score (5 points)"""
    if not goals:
        return {
            "name": "Goal Progress",
            "score": 0,
            "max_score": 5,
            "percentage": 0,
            "status": "No goals set",
            "description": "Create financial goals to track this metric"
        }
    
    # Calculate average progress across all goals
    progress_scores = []
    for goal in goals:
        current = goal.get("current_amount", 0)
        target = goal.get("target_amount", 1)
        progress = (current / target) * 100
        progress_scores.append(min(100, progress))
    
    avg_progress = statistics.mean(progress_scores)
    
    # Score calculation
    if avg_progress >= 80:
        score = 5
        status = "On Track"
    elif avg_progress >= 50:
        score = 3
        status = "Making Progress"
    else:
        score = 1
        status = "Behind"
    
    return {
        "name": "Goal Progress",
        "score": score,
        "max_score": 5,
        "percentage": round(avg_progress, 1),
        "status": status,
        "description": f"You're {round(avg_progress, 1)}% towards your goals on average"
    }


def calculate_cash_flow_stability(transactions: List[Dict]) -> Dict:
    """Calculate cash flow stability score (5 points)"""
    # Get last 3 months of income by month
    monthly_income = {}
    
    for txn in transactions:
        if txn.get("transaction_type") != "income":
            continue
        
        date_str = txn.get("date", "")
        if not date_str:
            continue
        
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            month_key = f"{date.year}-{date.month:02d}"
            amount = abs(txn.get("amount", 0))
            monthly_income[month_key] = monthly_income.get(month_key, 0) + amount
        except:
            continue
    
    if len(monthly_income) < 2:
        return {
            "name": "Cash Flow Stability",
            "score": 0,
            "max_score": 5,
            "stability": "Unknown",
            "status": "Insufficient data",
            "description": "Need at least 2 months of income data"
        }
    
    income_values = list(monthly_income.values())
    avg_income = statistics.mean(income_values)
    
    if avg_income == 0:
        coefficient_of_variation = 0
    else:
        std_dev = statistics.stdev(income_values) if len(income_values) > 1 else 0
        coefficient_of_variation = (std_dev / avg_income) * 100
    
    # Score calculation (lower CV = more stable)
    if coefficient_of_variation < 10:
        score = 5
        status = "Very Stable"
    elif coefficient_of_variation < 25:
        score = 3
        status = "Stable"
    else:
        score = 1
        status = "Variable"
    
    return {
        "name": "Cash Flow Stability",
        "score": score,
        "max_score": 5,
        "variability": round(coefficient_of_variation, 1),
        "status": status,
        "description": f"Your income variability is {round(coefficient_of_variation, 1)}%"
    }


def generate_improvement_tips(factors: Dict) -> List[str]:
    """Generate personalized improvement tips based on factors"""
    tips = []
    
    # Sort factors by score gap (max - current)
    sorted_factors = sorted(
        factors.items(),
        key=lambda x: x[1]["max_score"] - x[1]["score"],
        reverse=True
    )
    
    # Generate tips for top 3 weakest areas
    for factor_name, factor_data in sorted_factors[:3]:
        if factor_name == "savings_rate" and factor_data["score"] < 10:
            tips.append("💰 Boost your savings rate by cutting one recurring expense or increasing income")
        elif factor_name == "emergency_fund" and factor_data["score"] < 8:
            tips.append("🆘 Build your emergency fund to 3-6 months of expenses for financial security")
        elif factor_name == "budget_adherence" and factor_data["score"] < 8:
            tips.append("📊 Review your budgets weekly to stay on track and avoid overspending")
        elif factor_name == "debt_management" and factor_data["score"] < 8:
            tips.append("💳 Focus on paying down high-interest debt to improve your debt-to-income ratio")
        elif factor_name == "credit_score" and factor_data.get("credit_score") is None:
            tips.append("🏦 Add your credit score in Settings to track this important metric")
        elif factor_name == "credit_score" and factor_data["score"] < 8:
            tips.append("📈 Improve credit score by paying bills on time and keeping credit utilization below 30%")
        elif factor_name == "investment_diversification" and factor_data["score"] < 5:
            tips.append("📊 Consider diversifying your investments across different asset types")
        elif factor_name == "goal_progress" and factor_data["score"] < 3:
            tips.append("🎯 Set realistic financial goals and automate monthly contributions")
    
    # Always add at least one generic tip
    if not tips:
        tips.append("🌟 Great job! Keep monitoring your financial health regularly")
    
    return tips[:3]  # Return top 3 tips


@router.get("/financial-health/history")
async def get_financial_health_history(user_id: str = Depends(get_current_user)):
    """Get historical financial health scores"""
    try:
        history = await db.financial_health_history.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("calculated_at", -1).limit(12).to_list(12)
        
        return {"history": history}
    except Exception as e:
        print(f"Error fetching health history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
