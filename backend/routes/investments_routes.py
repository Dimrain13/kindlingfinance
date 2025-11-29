"""
Investment tracking routes - enhanced performance analytics
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta, timezone, date
from typing import List, Optional
import uuid
import httpx

from database import (
    accounts_collection, investment_snapshots_collection,
    investment_holdings_collection
)
from models import (
    InvestmentSnapshot, InvestmentSnapshotCreate,
    InvestmentHolding, InvestmentHoldingCreate, InvestmentHoldingUpdate
)
from auth import get_current_user

router = APIRouter()

# ==================== SNAPSHOT ENDPOINTS ====================

@router.post("/snapshots/create")
async def create_investment_snapshot(user_id: str = Depends(get_current_user)):
    """Create a snapshot of current investment portfolio value"""
    try:
        # Get all investment, savings, and crypto accounts
        accounts = await accounts_collection.find({
            "user_id": user_id,
            "account_type": {"$in": ["investment", "savings", "crypto"]}
        }, {"_id": 0}).to_list(1000)
        
        # Calculate totals
        total_investment = sum(acc['balance'] for acc in accounts if acc['account_type'] == 'investment')
        total_savings = sum(acc['balance'] for acc in accounts if acc['account_type'] == 'savings')
        total_crypto = sum(acc['balance'] for acc in accounts if acc['account_type'] == 'crypto')
        total_value = total_investment + total_savings + total_crypto
        
        # Create snapshot
        today = date.today()
        snapshot_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "snapshot_date": today.isoformat(),
            "total_value": total_value,
            "total_investment_value": total_investment,
            "total_savings_value": total_savings,
            "total_crypto_value": total_crypto,
            "accounts_count": len(accounts),
            "created_at": datetime.now(timezone.utc)
        }
        
        # Check if snapshot already exists for today
        existing = await investment_snapshots_collection.find_one({
            "user_id": user_id,
            "snapshot_date": today.isoformat()
        })
        
        if existing:
            # Update existing snapshot
            await investment_snapshots_collection.update_one(
                {"id": existing["id"]},
                {"$set": snapshot_doc}
            )
            return {"message": "Snapshot updated", "snapshot": snapshot_doc}
        else:
            # Create new snapshot
            await investment_snapshots_collection.insert_one(snapshot_doc)
            return {"message": "Snapshot created", "snapshot": snapshot_doc}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create snapshot: {str(e)}")


@router.get("/snapshots/history")
async def get_investment_history(
    days: int = 365,
    user_id: str = Depends(get_current_user)
):
    """Get historical investment snapshots"""
    try:
        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Get snapshots
        snapshots = await investment_snapshots_collection.find({
            "user_id": user_id,
            "snapshot_date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }, {"_id": 0}).sort("snapshot_date", 1).to_list(1000)
        
        return {
            "snapshots": snapshots,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "count": len(snapshots)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@router.get("/performance/enhanced")
async def get_enhanced_performance(user_id: str = Depends(get_current_user)):
    """Get enhanced investment performance with historical data"""
    try:
        # Get all investment accounts
        investment_accounts = await accounts_collection.find({
            "user_id": user_id,
            "account_type": "investment"
        }, {"_id": 0}).to_list(1000)
        
        if not investment_accounts:
            return {
                "current_value": 0,
                "total_cost_basis": 0,
                "total_gain_loss": 0,
                "total_return_percentage": 0,
                "has_real_cost_basis": False,
                "accounts": [],
                "historical_performance": []
            }
        
        # Calculate current totals
        total_value = sum(acc['balance'] for acc in investment_accounts)
        
        # Check for real cost basis data
        accounts_with_cost_basis = [acc for acc in investment_accounts if acc.get('cost_basis')]
        has_real_cost_basis = len(accounts_with_cost_basis) > 0
        
        if has_real_cost_basis:
            # Use real cost basis
            total_cost_basis = sum(acc.get('cost_basis', 0) for acc in investment_accounts)
        else:
            # Fall back to 80% estimate
            total_cost_basis = total_value * 0.80
        
        total_gain_loss = total_value - total_cost_basis
        total_return_percentage = (total_gain_loss / total_cost_basis * 100) if total_cost_basis > 0 else 0
        
        # Get historical snapshots (last 365 days)
        end_date = date.today()
        start_date = end_date - timedelta(days=365)
        
        snapshots = await investment_snapshots_collection.find({
            "user_id": user_id,
            "snapshot_date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }, {"_id": 0}).sort("snapshot_date", 1).to_list(1000)
        
        # Format historical data for charts
        historical_performance = [
            {
                "date": snap["snapshot_date"],
                "value": snap["total_investment_value"],
                "total_portfolio": snap["total_value"]
            }
            for snap in snapshots
        ]
        
        # Account breakdown
        accounts_breakdown = []
        for acc in investment_accounts:
            acc_cost_basis = acc.get('cost_basis', acc['balance'] * 0.80)
            acc_gain_loss = acc['balance'] - acc_cost_basis
            acc_return_pct = (acc_gain_loss / acc_cost_basis * 100) if acc_cost_basis > 0 else 0
            
            accounts_breakdown.append({
                "account_name": acc['name'],
                "institution": acc.get('institution_name', 'Unknown'),
                "current_value": acc['balance'],
                "cost_basis": acc_cost_basis,
                "gain_loss": acc_gain_loss,
                "return_percentage": acc_return_pct,
                "percentage_of_portfolio": (acc['balance'] / total_value * 100) if total_value > 0 else 0,
                "has_real_cost_basis": acc.get('cost_basis') is not None
            })
        
        return {
            "current_value": total_value,
            "total_cost_basis": total_cost_basis,
            "total_gain_loss": total_gain_loss,
            "total_return_percentage": total_return_percentage,
            "has_real_cost_basis": has_real_cost_basis,
            "accounts": accounts_breakdown,
            "historical_performance": historical_performance,
            "snapshot_count": len(snapshots)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance: {str(e)}")


@router.patch("/accounts/{account_id}/cost-basis")
async def update_account_cost_basis(
    account_id: str,
    cost_basis: float,
    user_id: str = Depends(get_current_user)
):
    """Update the cost basis for an investment account"""
    try:
        # Verify account exists and belongs to user
        account = await accounts_collection.find_one({
            "id": account_id,
            "user_id": user_id
        })
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Update cost basis
        await accounts_collection.update_one(
            {"id": account_id},
            {"$set": {
                "cost_basis": cost_basis,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "message": "Cost basis updated",
            "account_id": account_id,
            "cost_basis": cost_basis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update cost basis: {str(e)}")


# ==================== BENCHMARK COMPARISON ====================

@router.get("/benchmark/sp500")
async def get_sp500_benchmark(days: int = 365):
    """Get S&P 500 benchmark data for comparison"""
    try:
        # Use Yahoo Finance API (free, no key needed)
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Format dates for Yahoo Finance
        period1 = int(start_date.timestamp())
        period2 = int(end_date.timestamp())
        
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC"
        params = {
            "period1": period1,
            "period2": period2,
            "interval": "1d"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                # Return dummy data if API fails
                return {
                    "benchmark": "S&P 500",
                    "data": [],
                    "error": "Failed to fetch benchmark data",
                    "using_dummy_data": True
                }
            
            data = response.json()
            
            # Extract timestamps and closing prices
            timestamps = data['chart']['result'][0]['timestamp']
            closes = data['chart']['result'][0]['indicators']['quote'][0]['close']
            
            # Format for frontend
            benchmark_data = []
            for i, timestamp in enumerate(timestamps):
                if closes[i] is not None:
                    dt = datetime.fromtimestamp(timestamp)
                    benchmark_data.append({
                        "date": dt.date().isoformat(),
                        "value": closes[i]
                    })
            
            # Calculate return percentage
            if len(benchmark_data) >= 2:
                start_value = benchmark_data[0]['value']
                end_value = benchmark_data[-1]['value']
                return_pct = ((end_value - start_value) / start_value) * 100
            else:
                return_pct = 0
            
            return {
                "benchmark": "S&P 500",
                "data": benchmark_data,
                "return_percentage": return_pct,
                "start_date": start_date.date().isoformat(),
                "end_date": end_date.date().isoformat()
            }
            
    except Exception as e:
        # Return dummy data on error
        return {
            "benchmark": "S&P 500",
            "data": [],
            "error": str(e),
            "using_dummy_data": True
        }


# ==================== HOLDINGS MANAGEMENT ====================

@router.get("/holdings")
async def get_holdings(user_id: str = Depends(get_current_user)):
    """Get all investment holdings for user"""
    holdings = await investment_holdings_collection.find({
        "user_id": user_id
    }, {"_id": 0}).to_list(1000)
    
    return {"holdings": holdings}


@router.post("/holdings")
async def create_holding(
    holding_data: InvestmentHoldingCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new investment holding"""
    # Verify account exists
    account = await accounts_collection.find_one({
        "id": holding_data.account_id,
        "user_id": user_id
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Calculate total cost basis
    total_cost_basis = holding_data.shares * holding_data.cost_basis_per_share
    
    # Create holding
    holding_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "account_id": holding_data.account_id,
        "ticker": holding_data.ticker.upper(),
        "name": holding_data.name,
        "shares": holding_data.shares,
        "cost_basis_per_share": holding_data.cost_basis_per_share,
        "total_cost_basis": total_cost_basis,
        "asset_class": holding_data.asset_class,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await investment_holdings_collection.insert_one(holding_doc)
    
    return {"message": "Holding created", "holding": holding_doc}


@router.delete("/holdings/{holding_id}")
async def delete_holding(
    holding_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete an investment holding"""
    result = await investment_holdings_collection.delete_one({
        "id": holding_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    return {"message": "Holding deleted"}



# ==================== DIVERSIFICATION ANALYSIS ====================

@router.get("/diversification")
async def get_diversification_score(user_id: str = Depends(get_current_user)):
    """Calculate portfolio diversification score and provide recommendations"""
    try:
        # Get all accounts
        accounts = await accounts_collection.find({
            "user_id": user_id
        }, {"_id": 0}).to_list(1000)
        
        # Filter to investment-related accounts
        investment_accounts = [acc for acc in accounts if acc['account_type'] in ['investment', 'savings', 'crypto']]
        
        if not investment_accounts:
            return {
                "score": 0,
                "grade": "F",
                "message": "No investment accounts found",
                "breakdown": [],
                "recommendations": ["Connect your investment accounts to calculate diversification"],
                "concentration_risk": 0
            }
        
        # Calculate total portfolio value
        total_value = sum(acc['balance'] for acc in investment_accounts)
        
        if total_value <= 0:
            return {
                "score": 0,
                "grade": "F",
                "message": "Portfolio has no value",
                "breakdown": [],
                "recommendations": ["Start investing to build a diversified portfolio"],
                "concentration_risk": 0
            }
        
        # Categorize by asset class
        asset_breakdown = {
            "stocks": 0,  # investment accounts
            "cash": 0,     # savings accounts
            "crypto": 0,   # crypto accounts
        }
        
        for acc in investment_accounts:
            value = acc['balance']
            if acc['account_type'] == 'investment':
                asset_breakdown['stocks'] += value
            elif acc['account_type'] == 'savings':
                asset_breakdown['cash'] += value
            elif acc['account_type'] == 'crypto':
                asset_breakdown['crypto'] += value
        
        # Calculate percentages
        breakdown = []
        for asset_class, value in asset_breakdown.items():
            if value > 0:
                percentage = (value / total_value) * 100
                breakdown.append({
                    "asset_class": asset_class.title(),
                    "value": value,
                    "percentage": percentage
                })
        
        # Calculate diversification score (0-100)
        # Uses Herfindahl-Hirschman Index (HHI) modified for diversification
        # Lower HHI = more diversified, we invert to make higher score better
        
        percentages = [item['percentage'] for item in breakdown]
        hhi = sum(p**2 for p in percentages)
        
        # Perfect diversification across 3 asset classes = HHI of 3333 (33.33^2 * 3)
        # Complete concentration = HHI of 10000 (100^2)
        # Normalize to 0-100 scale
        diversification_score = max(0, min(100, 100 - (hhi - 3333) / 66.67))
        
        # Count number of asset classes
        num_assets = len(breakdown)
        
        # Count number of accounts
        num_accounts = len(investment_accounts)
        
        # Adjust score based on number of asset classes
        if num_assets == 1:
            diversification_score = min(diversification_score, 40)  # Cap at 40 if only one asset class
        elif num_assets == 2:
            diversification_score = min(diversification_score, 70)  # Cap at 70 if only two asset classes
        
        # Bonus for having multiple accounts
        if num_accounts >= 3:
            diversification_score = min(100, diversification_score + 5)
        
        # Calculate concentration risk (highest percentage)
        max_concentration = max(percentages) if percentages else 0
        
        # Assign grade
        if diversification_score >= 90:
            grade = "A+"
        elif diversification_score >= 80:
            grade = "A"
        elif diversification_score >= 70:
            grade = "B"
        elif diversification_score >= 60:
            grade = "C"
        elif diversification_score >= 50:
            grade = "D"
        else:
            grade = "F"
        
        # Generate recommendations
        recommendations = []
        
        if num_assets == 1:
            recommendations.append("⚠️ You're only invested in one asset class. Consider diversifying across stocks, bonds, and other assets.")
        
        if max_concentration > 80:
            recommendations.append(f"⚠️ {max_concentration:.0f}% of your portfolio is in one asset class. This is high concentration risk.")
        elif max_concentration > 60:
            recommendations.append(f"Consider rebalancing - {max_concentration:.0f}% in one asset is above ideal concentration.")
        
        # Check for missing asset classes
        missing = []
        if asset_breakdown['stocks'] == 0:
            missing.append("stocks/equities")
        if asset_breakdown['cash'] == 0:
            missing.append("cash/bonds (emergency fund)")
        
        if missing:
            recommendations.append(f"Consider adding {', '.join(missing)} to your portfolio for better diversification.")
        
        if num_accounts == 1:
            recommendations.append("Consider using multiple accounts (e.g., taxable brokerage, IRA, 401k) for tax diversification.")
        
        # Good diversification praise
        if diversification_score >= 80:
            recommendations.append("✅ Great diversification! Your portfolio is well-balanced across asset classes.")
        
        if not recommendations:
            recommendations.append("Your portfolio diversification is reasonable. Continue monitoring as you add funds.")
        
        return {
            "score": round(diversification_score, 1),
            "grade": grade,
            "message": f"Your portfolio diversification score is {diversification_score:.0f}/100",
            "breakdown": sorted(breakdown, key=lambda x: x['percentage'], reverse=True),
            "recommendations": recommendations,
            "concentration_risk": round(max_concentration, 1),
            "num_asset_classes": num_assets,
            "num_accounts": num_accounts,
            "total_value": total_value
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate diversification: {str(e)}")
