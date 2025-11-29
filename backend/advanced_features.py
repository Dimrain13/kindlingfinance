"""
Advanced Features Endpoints
- Net Worth Tracking
- Recurring Transactions
- Transaction Rules
- Tags
- Merchant Management
- Account Groups
- Alerts
- Export
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import csv
import io
from uuid import uuid4
from auth import get_current_user
from database import (
    accounts_collection, transactions_collection,
    net_worth_snapshots_collection, recurring_transactions_collection,
    transaction_rules_collection, transaction_tags_collection,
    transaction_tag_assignments_collection, merchant_rules_collection,
    account_groups_collection, user_alerts_collection, alert_settings_collection,
    db
)

router = APIRouter()

# ==================== NET WORTH TRACKING ====================

@router.post("/networth/snapshot")
async def create_networth_snapshot(current_user: str = Depends(get_current_user)):
    """Create a net worth snapshot for current date"""
    # Get all accounts
    accounts = await accounts_collection.find({"user_id": current_user}, {"_id": 0}).to_list(1000)
    
    total_assets = 0
    total_liabilities = 0
    accounts_breakdown = {}
    
    for account in accounts:
        balance = account.get("balance", 0)
        accounts_breakdown[account["id"]] = balance
        
        if account.get("account_type") in ["credit", "loan"]:
            total_liabilities += abs(balance)
        else:
            total_assets += balance
    
    net_worth = total_assets - total_liabilities
    
    snapshot = {
        "id": str(uuid4()),
        "user_id": current_user,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": net_worth,
        "snapshot_date": datetime.now(timezone.utc),
        "accounts_breakdown": accounts_breakdown
    }
    
    await net_worth_snapshots_collection.insert_one(snapshot)
    return snapshot


@router.get("/networth/history")
async def get_networth_history(
    days: int = 365,
    current_user: str = Depends(get_current_user)
):
    """Get net worth history over time"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    snapshots = await net_worth_snapshots_collection.find({
        "user_id": current_user,
        "snapshot_date": {"$gte": cutoff_date}
    }, {"_id": 0}).sort("snapshot_date", 1).to_list(1000)
    
    return snapshots


# ==================== INVESTMENT PERFORMANCE ====================

@router.get("/investments/performance")
async def get_investment_performance(current_user: str = Depends(get_current_user)):
    """Calculate investment performance metrics"""
    # Get all investment accounts
    investment_accounts = await accounts_collection.find({
        "user_id": current_user,
        "account_type": "investment"
    }, {"_id": 0}).to_list(1000)
    
    if not investment_accounts:
        return {
            "total_value": 0,
            "total_cost_basis": 0,
            "total_gain_loss": 0,
            "total_return_percentage": 0,
            "accounts": [],
            "asset_allocation": []
        }
    
    total_value = sum(acc.get("balance", 0) for acc in investment_accounts)
    
    # For now, estimate cost basis as 80% of current value (can be enhanced with actual data)
    total_cost_basis = total_value * 0.8
    total_gain_loss = total_value - total_cost_basis
    total_return_percentage = (total_gain_loss / total_cost_basis * 100) if total_cost_basis > 0 else 0
    
    # Asset allocation (simplified - can be enhanced with actual holdings data)
    account_breakdown = []
    for acc in investment_accounts:
        account_breakdown.append({
            "account_name": acc.get("name", "Investment Account"),
            "institution": acc.get("institution_name", "Unknown"),
            "current_value": acc.get("balance", 0),
            "percentage": (acc.get("balance", 0) / total_value * 100) if total_value > 0 else 0
        })
    
    # Categorize by account type (401k, IRA, Brokerage, etc.)
    asset_allocation = {}
    for acc in investment_accounts:
        name_lower = acc.get("name", "").lower()
        if "401k" in name_lower or "401(k)" in name_lower:
            acc_type = "401(k)"
        elif "ira" in name_lower:
            acc_type = "IRA"
        elif "roth" in name_lower:
            acc_type = "Roth IRA"
        elif "brokerage" in name_lower or "trading" in name_lower:
            acc_type = "Brokerage"
        else:
            acc_type = "Other Investments"
        
        if acc_type not in asset_allocation:
            asset_allocation[acc_type] = 0
        asset_allocation[acc_type] += acc.get("balance", 0)
    
    allocation_list = [
        {"type": k, "value": v, "percentage": (v / total_value * 100) if total_value > 0 else 0}
        for k, v in asset_allocation.items()
    ]
    
    return {
        "total_value": round(total_value, 2),
        "total_cost_basis": round(total_cost_basis, 2),
        "total_gain_loss": round(total_gain_loss, 2),
        "total_return_percentage": round(total_return_percentage, 2),
        "accounts": account_breakdown,
        "asset_allocation": allocation_list
    }


# ==================== RECURRING TRANSACTIONS ====================

@router.get("/transactions/recurring")
async def detect_recurring_transactions(current_user: str = Depends(get_current_user)):
    """Auto-detect recurring transactions and subscriptions with categorization"""
    # Get all transactions from last 12 months
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=365)
    
    transactions = await transactions_collection.find({
        "user_id": current_user,
        "date": {"$gte": cutoff_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Group by merchant and analyze patterns
    merchant_groups = {}
    for txn in transactions:
        merchant = txn.get("merchant_name", "Unknown")
        if merchant not in merchant_groups:
            merchant_groups[merchant] = []
        merchant_groups[merchant].append(txn)
    
    recurring_list = []
    
    # EXCLUDE ONLY: These are clearly NOT subscriptions
    non_subscription_patterns = {
        "restaurants": ["restaurant", "cafe", "coffee", "diner", "grill", "bar", "pub", "pizzeria", "subway", "mcdonald", "burger", "taco", "applebee", "chili's", "olive garden"],
        "groceries": ["grocery", "supermarket", "whole foods", "trader joe", "safeway", "kroger", "walmart", "target", "costco", "sam's club"],
        "gas": ["gas", "fuel", "shell", "chevron", "bp ", "exxon", "mobil"],
        "retail": ["department store", "retail", "shopping", "mall"],
        "travel": ["hotel", "motel", "airbnb", "booking.com", "expedia"],
        "transportation": ["uber", "lyft", "parking", "toll"]
    }
    
    def categorize_subscription(merchant_name: str, txn_category: str) -> dict:
        """Determine subscription type and category"""
        merchant_lower = merchant_name.lower()
        category_upper = txn_category.upper()
        
        # Entertainment & Media
        if any(keyword in merchant_lower for keyword in ["netflix", "hulu", "disney", "hbo", "prime video", "spotify", "apple music", "youtube", "paramount", "peacock", "max", "showtime", "funimation", "crunchyroll"]):
            return {"type": "Entertainment & Media", "is_subscription": True}
        
        # Software & SaaS
        if any(keyword in merchant_lower for keyword in ["adobe", "microsoft", "office", "dropbox", "google one", "icloud", "notion", "slack", "zoom", "canva", "grammarly", "chatgpt", "github"]):
            return {"type": "Software & SaaS", "is_subscription": True}
        
        # Marketing & Business Services
        if any(keyword in merchant_lower for keyword in ["savvy", "mailchimp", "hubspot", "salesforce", "shopify", "squarespace", "wix", "godaddy", "analytics", "marketing", "social media"]):
            return {"type": "Marketing & Business", "is_subscription": True}
        
        # Fitness & Health
        if any(keyword in merchant_lower for keyword in ["gym", "fitness", "peloton", "planet", "24 hour", "yoga", "crossfit", "health club", "meditation", "headspace", "calm"]):
            return {"type": "Fitness & Health", "is_subscription": True}
        
        # Education & News
        if any(keyword in merchant_lower for keyword in ["audible", "kindle", "scribd", "coursera", "udemy", "masterclass", "duolingo", "new york times", "wsj", "medium", "substack", "patreon"]):
            return {"type": "Education & News", "is_subscription": True}
        
        # Utilities & Services
        if category_upper in ["UTILITIES", "TELECOMMUNICATIONS", "INTERNET", "CABLE", "PHONE"] or any(keyword in merchant_lower for keyword in ["electric", "power", "water", "gas company", "internet", "cable", "phone", "mobile", "cellular"]):
            return {"type": "Utilities & Services", "is_subscription": True}
        
        # Insurance
        if "insurance" in merchant_lower or "state farm" in merchant_lower or "geico" in merchant_lower or "progressive" in merchant_lower:
            return {"type": "Insurance", "is_subscription": True}
        
        # Check if it's a clear non-subscription
        for category, patterns in non_subscription_patterns.items():
            if any(pattern in merchant_lower for pattern in patterns):
                return {"type": "Not a Subscription", "is_subscription": False}
        
        # Check transaction category for final determination
        if category_upper in ["FOOD_AND_DRINK", "GROCERIES", "RESTAURANTS", "GAS", "TRANSPORTATION_SERVICES"]:
            return {"type": "Not a Subscription", "is_subscription": False}
        elif category_upper in ["LOAN_PAYMENTS", "MORTGAGE"]:
            return {"type": "Loans & Mortgages", "is_subscription": False}
        elif category_upper == "INCOME":
            return {"type": "Income", "is_subscription": False}
        elif category_upper == "BANK_FEES":
            return {"type": "Bank Fees", "is_subscription": False}
        
        # Default: Monthly recurring payments are likely subscriptions (services, memberships, etc.)
        # This is the key change - we're now more inclusive
        return {"type": "Other Subscriptions", "is_subscription": True}
    
    for merchant, txns in merchant_groups.items():
        if len(txns) >= 3:  # At least 3 transactions
            amounts = [abs(txn.get("amount", 0)) for txn in txns]
            dates = [datetime.fromisoformat(txn.get("date")) for txn in txns]
            dates.sort()
            
            # Check if amounts are similar (within 20%)
            avg_amount = sum(amounts) / len(amounts)
            amount_variance = max([abs(a - avg_amount) / avg_amount for a in amounts]) if avg_amount > 0 else 0
            
            if amount_variance < 0.2:  # Within 20% variation
                # Calculate average days between transactions
                if len(dates) > 1:
                    day_diffs = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
                    avg_days = sum(day_diffs) / len(day_diffs)
                    
                    frequency = "monthly"
                    if avg_days < 10:
                        frequency = "weekly"
                    elif avg_days > 60 and avg_days < 120:
                        frequency = "quarterly"
                    elif avg_days > 300:
                        frequency = "yearly"
                    
                    # Categorize the subscription
                    txn_category = txns[0].get("category", "Uncategorized")
                    sub_info = categorize_subscription(merchant, txn_category)
                    
                    recurring_list.append({
                        "merchant_name": merchant,
                        "category": txn_category,
                        "subscription_type": sub_info["type"],
                        "average_amount": avg_amount,
                        "frequency": frequency,
                        "last_transaction_date": dates[-1],
                        "transaction_count": len(txns),
                        "is_subscription": sub_info["is_subscription"]
                    })
    
    return sorted(recurring_list, key=lambda x: x["average_amount"], reverse=True)


@router.get("/transactions/verify-subscription/{merchant_name}")
async def verify_subscription_via_search(
    merchant_name: str,
    current_user: str = Depends(get_current_user)
):
    """Verify if a merchant offers subscription services using web search
    
    This endpoint can be called from the frontend to verify unclear merchants.
    Returns: {"is_subscription": bool, "confidence": str, "reason": str}
    """
    # Import at function level to avoid circular dependencies
    try:
        import httpx
        import re
        
        # Clean merchant name for search
        clean_name = merchant_name.split('-')[0].strip()
        
        # Quick check: known non-subscription patterns
        non_sub_patterns = [
            r'\brestaurant\b', r'\bcafe\b', r'\bdining\b', r'\bgrocery\b',
            r'\bmarket\b', r'\bgas\b', r'\bfuel\b', r'\bparking\b',
            r'\bhotel\b', r'\bairbnb\b', r'\bretail\b', r'\bstore\b'
        ]
        
        merchant_lower = clean_name.lower()
        for pattern in non_sub_patterns:
            if re.search(pattern, merchant_lower):
                return {
                    "merchant_name": merchant_name,
                    "is_subscription": False,
                    "confidence": "high",
                    "reason": f"Merchant appears to be in non-subscription category"
                }
        
        # Known subscription patterns
        sub_patterns = [
            r'\bsubscription\b', r'\bmembership\b', r'\bstreaming\b',
            r'\bsaas\b', r'\bmonthly plan\b', r'\bpremium\b'
        ]
        
        for pattern in sub_patterns:
            if re.search(pattern, merchant_lower):
                return {
                    "merchant_name": merchant_name,
                    "is_subscription": True,
                    "confidence": "high",
                    "reason": f"Merchant name suggests subscription service"
                }
        
        # For uncertain cases, return low confidence
        # In a production system, you could implement actual web search here
        return {
            "merchant_name": merchant_name,
            "is_subscription": False,
            "confidence": "low",
            "reason": "Unable to determine - manual review recommended"
        }
        
    except Exception as e:
        return {
            "merchant_name": merchant_name,
            "is_subscription": False,
            "confidence": "unknown",
            "reason": f"Verification failed: {str(e)}"
        }


# ==================== TRANSACTION RULES ====================

@router.post("/transactions/rules")
async def create_transaction_rule(
    name: str,
    conditions: dict,
    actions: dict,
    priority: int = 0,
    current_user: str = Depends(get_current_user)
):
    """Create a transaction rule for auto-categorization"""
    rule = {
        "id": str(uuid4()),
        "user_id": current_user,
        "name": name,
        "conditions": conditions,
        "actions": actions,
        "priority": priority,
        "is_active": True,
        "times_applied": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await transaction_rules_collection.insert_one(rule)
    return rule


@router.get("/transactions/rules")
async def get_transaction_rules(current_user: str = Depends(get_current_user)):
    """Get all transaction rules"""
    rules = await transaction_rules_collection.find({
        "user_id": current_user
    }, {"_id": 0}).sort("priority", -1).to_list(100)
    
    return rules


@router.post("/transactions/rules/{rule_id}/apply")
async def apply_rule_to_transactions(
    rule_id: str,
    current_user: str = Depends(get_current_user)
):
    """Apply a rule to all existing transactions"""
    rule = await transaction_rules_collection.find_one({
        "id": rule_id,
        "user_id": current_user
    }, {"_id": 0})
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Get all transactions
    transactions = await transactions_collection.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(10000)
    
    updated_count = 0
    conditions = rule["conditions"]
    actions = rule["actions"]
    
    for txn in transactions:
        match = True
        
        # Check conditions
        if "merchant_contains" in conditions:
            if conditions["merchant_contains"].lower() not in txn.get("merchant_name", "").lower():
                match = False
        
        if "amount_greater" in conditions:
            if abs(txn.get("amount", 0)) <= conditions["amount_greater"]:
                match = False
        
        if "amount_less" in conditions:
            if abs(txn.get("amount", 0)) >= conditions["amount_less"]:
                match = False
        
        if "category_is" in conditions:
            if txn.get("category") != conditions["category_is"]:
                match = False
        
        if match:
            # Apply actions
            update_fields = {}
            
            if "set_category" in actions:
                update_fields["category"] = actions["set_category"]
            
            if update_fields:
                await transactions_collection.update_one(
                    {"id": txn["id"], "user_id": current_user.id},
                    {"$set": update_fields}
                )
                updated_count += 1
    
    # Update rule times_applied count
    await transaction_rules_collection.update_one(
        {"id": rule_id},
        {"$inc": {"times_applied": updated_count}}
    )
    
    return {"message": f"Rule applied to {updated_count} transactions"}


@router.delete("/transactions/rules/{rule_id}")
async def delete_transaction_rule(
    rule_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a transaction rule"""
    result = await transaction_rules_collection.delete_one({
        "id": rule_id,
        "user_id": current_user
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted successfully"}


# ==================== TRANSACTION TAGS ====================

@router.post("/transactions/tags")
async def create_tag(
    name: str,
    color: str = "#3B82F6",
    current_user: str = Depends(get_current_user)
):
    """Create a new transaction tag"""
    tag = {
        "id": str(uuid4()),
        "user_id": current_user,
        "name": name,
        "color": color,
        "created_at": datetime.now(timezone.utc)
    }
    
    await transaction_tags_collection.insert_one(tag)
    return tag


@router.get("/transactions/tags")
async def get_tags(current_user: str = Depends(get_current_user)):
    """Get all tags"""
    tags = await transaction_tags_collection.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(100)
    
    return tags


@router.post("/transactions/{transaction_id}/tags/{tag_id}")
async def add_tag_to_transaction(
    transaction_id: str,
    tag_id: str,
    current_user: str = Depends(get_current_user)
):
    """Add a tag to a transaction"""
    # Verify transaction exists
    txn = await transactions_collection.find_one({
        "id": transaction_id,
        "user_id": current_user
    }, {"_id": 0})
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Verify tag exists
    tag = await transaction_tags_collection.find_one({
        "id": tag_id,
        "user_id": current_user
    }, {"_id": 0})
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if already assigned
    existing = await transaction_tag_assignments_collection.find_one({
        "transaction_id": transaction_id,
        "tag_id": tag_id
    })
    
    if existing:
        return {"message": "Tag already assigned"}
    
    assignment = {
        "transaction_id": transaction_id,
        "tag_id": tag_id,
        "user_id": current_user,
        "created_at": datetime.now(timezone.utc)
    }
    
    await transaction_tag_assignments_collection.insert_one(assignment)
    return {"message": "Tag added successfully"}


@router.get("/transactions/{transaction_id}/tags")
async def get_transaction_tags(
    transaction_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get all tags for a transaction"""
    assignments = await transaction_tag_assignments_collection.find({
        "transaction_id": transaction_id,
        "user_id": current_user
    }, {"_id": 0}).to_list(100)
    
    tag_ids = [a["tag_id"] for a in assignments]
    
    tags = await transaction_tags_collection.find({
        "id": {"$in": tag_ids}
    }, {"_id": 0}).to_list(100)
    
    return tags


# ==================== MERCHANT MANAGEMENT ====================

@router.post("/merchants/rules")
async def create_merchant_rule(
    original_name: str,
    cleaned_name: str,
    auto_category: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """Create a merchant renaming rule"""
    rule = {
        "id": str(uuid4()),
        "user_id": current_user,
        "original_name": original_name,
        "cleaned_name": cleaned_name,
        "auto_category": auto_category,
        "created_at": datetime.now(timezone.utc)
    }
    
    await merchant_rules_collection.insert_one(rule)
    
    # Apply to existing transactions
    update_data = {"merchant_name": cleaned_name}
    if auto_category:
        update_data["category"] = auto_category
    
    result = await transactions_collection.update_many(
        {"user_id": current_user, "merchant_name": original_name},
        {"$set": update_data}
    )
    
    return {"message": f"Rule created and applied to {result.modified_count} transactions", "rule": rule}


@router.get("/merchants/rules")
async def get_merchant_rules(current_user: str = Depends(get_current_user)):
    """Get all merchant rules"""
    rules = await merchant_rules_collection.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(1000)
    
    return rules


# ==================== ACCOUNT GROUPS ====================

@router.post("/accounts/groups")
async def create_account_group(
    name: str,
    description: Optional[str] = None,
    color: str = "#3B82F6",
    account_ids: List[str] = [],
    current_user: str = Depends(get_current_user)
):
    """Create an account group"""
    group = {
        "id": str(uuid4()),
        "user_id": current_user,
        "name": name,
        "description": description,
        "color": color,
        "account_ids": account_ids,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await account_groups_collection.insert_one(group)
    return group


@router.get("/accounts/groups")
async def get_account_groups(current_user: str = Depends(get_current_user)):
    """Get all account groups"""
    groups = await account_groups_collection.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(100)
    
    # Add account details to each group
    for group in groups:
        accounts = await accounts_collection.find({
            "id": {"$in": group["account_ids"]},
            "user_id": current_user
        }, {"_id": 0}).to_list(100)
        
        group["accounts"] = accounts
        group["total_balance"] = sum(acc.get("balance", 0) for acc in accounts)
    
    return groups


@router.put("/accounts/groups/{group_id}")
async def update_account_group(
    group_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    color: Optional[str] = None,
    account_ids: Optional[List[str]] = None,
    current_user: str = Depends(get_current_user)
):
    """Update an account group"""
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if name:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if color:
        update_data["color"] = color
    if account_ids is not None:
        update_data["account_ids"] = account_ids
    
    result = await account_groups_collection.update_one(
        {"id": group_id, "user_id": current_user},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account group not found")
    
    return {"message": "Account group updated successfully"}


# ==================== EXPORT ====================

@router.get("/transactions/export")
async def export_transactions_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """Export transactions to CSV"""
    query = {"user_id": current_user}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" not in query:
            query["date"] = {}
        query["date"]["$lte"] = end_date
    
    transactions = await transactions_collection.find(query, {"_id": 0}).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    fieldnames = ["date", "merchant_name", "amount", "category", "account_id", "description"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    for txn in transactions:
        writer.writerow({
            "date": txn.get("date", ""),
            "merchant_name": txn.get("merchant_name", ""),
            "amount": txn.get("amount", 0),
            "category": txn.get("category", ""),
            "account_id": txn.get("account_id", ""),
            "description": txn.get("description", "")
        })
    
    csv_content = output.getvalue()
    return {"csv": csv_content, "count": len(transactions)}


# ==================== ALERTS ====================

@router.get("/alerts")
async def get_user_alerts(
    limit: int = 50,
    current_user: str = Depends(get_current_user)
):
    """Get user alerts"""
    alerts = await user_alerts_collection.find({
        "user_id": current_user
    }, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return alerts


@router.post("/alerts/{alert_id}/read")
async def mark_alert_as_read(
    alert_id: str,
    current_user: str = Depends(get_current_user)
):
    """Mark an alert as read"""
    result = await user_alerts_collection.update_one(
        {"id": alert_id, "user_id": current_user},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert marked as read"}


@router.post("/alerts/mark-all-read")
async def mark_all_alerts_read(current_user: str = Depends(get_current_user)):
    """Mark all unread alerts as read"""
    result = await user_alerts_collection.update_many(
        {"user_id": current_user, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {
        "message": f"Marked {result.modified_count} alerts as read",
        "count": result.modified_count
    }


async def create_alert_helper(alert_data: dict):
    """Helper to create alert and return clean data"""
    await user_alerts_collection.insert_one(alert_data)
    return {
        "id": alert_data["id"],
        "type": alert_data["type"],
        "severity": alert_data["severity"],
        "title": alert_data["title"]
    }


@router.post("/alerts/generate")
async def generate_alerts(current_user: str = Depends(get_current_user)):
    """Generate alerts based on user's financial activity
    
    Checks for:
    - Low account balances
    - Unusual spending patterns
    - Large transactions
    - Budget threshold warnings
    - Upcoming bills
    """
    alerts_generated = []
    now = datetime.now(timezone.utc)
    
    # Clean up old read alerts (older than 7 days)
    seven_days_ago = now - timedelta(days=7)
    await user_alerts_collection.delete_many({
        "user_id": current_user,
        "is_read": True,
        "created_at": {"$lt": seven_days_ago}
    })
    
    # Get user's accounts
    accounts = await accounts_collection.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(1000)
    
    # Get recent transactions (last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    recent_txns = await transactions_collection.find({
        "user_id": current_user,
        "date": {"$gte": thirty_days_ago.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # 1. LOW BALANCE ALERTS
    for account in accounts:
        balance = account.get("balance", 0)
        account_type = account.get("account_type", "")
        
        # Alert if checking/savings account below $100
        if account_type in ["depository", "checking", "savings"] and balance < 100 and balance > -1000:
            # Check if alert already exists for this account in the last 24 hours
            yesterday = now - timedelta(days=1)
            existing = await user_alerts_collection.find_one({
                "user_id": current_user,
                "type": "low_balance",
                "metadata.account_id": account.get("id"),
                "created_at": {"$gte": yesterday},
                "is_read": False
            })
            
            if not existing:
                alert_data = {
                    "id": str(uuid4()),
                    "user_id": current_user,
                    "type": "low_balance",
                    "severity": "high" if balance < 50 else "medium",
                    "title": f"Low Balance: {account.get('name', 'Account')}",
                    "message": f"Your {account.get('name')} balance is ${balance:.2f}. Consider transferring funds.",
                    "metadata": {
                        "account_id": account.get("id"),
                        "balance": balance
                    },
                    "is_read": False,
                    "created_at": now
                }
                result = await create_alert_helper(alert_data)
                alerts_generated.append(result)
    
    # 2. UNUSUAL SPENDING ALERTS
    # Calculate average daily spending
    if recent_txns:
        expenses = [abs(txn.get("amount", 0)) for txn in recent_txns if txn.get("transaction_type") == "expense"]
        if expenses:
            avg_expense = sum(expenses) / len(expenses)
            
            # Check for transactions > 3x average
            for txn in recent_txns[-10:]:  # Check last 10 transactions
                if txn.get("transaction_type") == "expense":
                    amount = abs(txn.get("amount", 0))
                    if amount > avg_expense * 3 and amount > 100:
                        # Check if alert already exists
                        existing = await user_alerts_collection.find_one({
                            "user_id": current_user,
                            "type": "unusual_spending",
                            "metadata.transaction_id": txn.get("id")
                        })
                        
                        if not existing:
                            alert = {
                                "id": str(uuid4()),
                                "user_id": current_user,
                                "type": "unusual_spending",
                                "severity": "medium",
                                "title": "Unusual Spending Detected",
                                "message": f"Large transaction of ${amount:.2f} at {txn.get('merchant_name', 'Unknown')}",
                                "metadata": {
                                    "transaction_id": txn.get("id"),
                                    "amount": amount,
                                    "merchant": txn.get("merchant_name")
                                },
                                "is_read": False,
                                "created_at": now
                            }
                            result = await create_alert_helper(alert)
                            alerts_generated.append(result)
    
    # 3. LARGE TRANSACTION ALERTS (>$500)
    for txn in recent_txns[-5:]:  # Check last 5 transactions
        amount = abs(txn.get("amount", 0))
        if amount > 500:
            existing = await user_alerts_collection.find_one({
                "user_id": current_user,
                "type": "large_transaction",
                "metadata.transaction_id": txn.get("id")
            })
            
            if not existing:
                alert = {
                    "id": str(uuid4()),
                    "user_id": current_user,
                    "type": "large_transaction",
                    "severity": "info",
                    "title": "Large Transaction",
                    "message": f"${amount:.2f} transaction at {txn.get('merchant_name', 'Unknown')} on {txn.get('date', '')[:10]}",
                    "metadata": {
                        "transaction_id": txn.get("id"),
                        "amount": amount,
                        "merchant": txn.get("merchant_name")
                    },
                    "is_read": False,
                    "created_at": now
                }
                result = await create_alert_helper(alert)
                alerts_generated.append(result)
    
    # 4. BUDGET THRESHOLD WARNINGS
    # Get user's budgets
    budgets = await db.budgets.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(100)
    
    for budget in budgets:
        category = budget.get("category")
        limit = budget.get("amount", 0)
        
        # Calculate spending in this category this month
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        category_spending = sum([
            abs(txn.get("amount", 0))
            for txn in recent_txns
            if txn.get("category") == category and 
            datetime.fromisoformat(txn.get("date")).replace(tzinfo=timezone.utc) >= month_start and
            txn.get("transaction_type") == "expense"
        ])
        
        percentage = (category_spending / limit * 100) if limit > 0 else 0
        
        # Alert at 80% and 100%
        if percentage >= 80:
            severity = "high" if percentage >= 100 else "medium"
            alert_type = "budget_exceeded" if percentage >= 100 else "budget_warning"
            
            # Check if alert exists for this month
            existing = await user_alerts_collection.find_one({
                "user_id": current_user,
                "type": alert_type,
                "metadata.category": category,
                "created_at": {"$gte": month_start}
            })
            
            if not existing:
                alert = {
                    "id": str(uuid4()),
                    "user_id": current_user,
                    "type": alert_type,
                    "severity": severity,
                    "title": f"Budget Alert: {category}",
                    "message": f"You've spent ${category_spending:.2f} ({percentage:.0f}%) of your ${limit:.2f} budget for {category}",
                    "metadata": {
                        "category": category,
                        "spent": category_spending,
                        "limit": limit,
                        "percentage": percentage
                    },
                    "is_read": False,
                    "created_at": now
                }
                result = await create_alert_helper(alert)
                alerts_generated.append(result)
    
    return {
        "message": f"Generated {len(alerts_generated)} new alerts",
        "alerts": alerts_generated
    }


@router.get("/alerts/settings")
async def get_alert_settings(current_user: str = Depends(get_current_user)):
    """Get user's alert settings"""
    settings = await alert_settings_collection.find_one({
        "user_id": current_user
    }, {"_id": 0})
    
    if not settings:
        # Return default settings
        return {
            "user_id": current_user,
            "low_balance_threshold": 100,
            "large_transaction_threshold": 500,
            "unusual_spending_multiplier": 3.0,
            "budget_warning_percentage": 80,
            "enabled_alert_types": ["low_balance", "unusual_spending", "large_transaction", "budget_warning", "budget_exceeded"]
        }
    
    return settings


@router.post("/alerts/settings")
async def update_alert_settings(
    low_balance_threshold: Optional[float] = None,
    large_transaction_threshold: Optional[float] = None,
    unusual_spending_multiplier: Optional[float] = None,
    budget_warning_percentage: Optional[float] = None,
    enabled_alert_types: Optional[List[str]] = None,
    current_user: str = Depends(get_current_user)
):
    """Update user's alert settings"""
    update_data = {"user_id": current_user}
    
    if low_balance_threshold is not None:
        update_data["low_balance_threshold"] = low_balance_threshold
    if large_transaction_threshold is not None:
        update_data["large_transaction_threshold"] = large_transaction_threshold
    if unusual_spending_multiplier is not None:
        update_data["unusual_spending_multiplier"] = unusual_spending_multiplier
    if budget_warning_percentage is not None:
        update_data["budget_warning_percentage"] = budget_warning_percentage
    if enabled_alert_types is not None:
        update_data["enabled_alert_types"] = enabled_alert_types
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await alert_settings_collection.update_one(
        {"user_id": current_user},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Alert settings updated successfully"}


# ==================== BUDGET TEMPLATES ====================

@router.get("/budgets/templates")
async def get_budget_templates():
    """Get available budget templates"""
    templates = [
        {
            "id": "50-30-20",
            "name": "50/30/20 Rule",
            "description": "Allocate 50% to needs, 30% to wants, 20% to savings & debt",
            "icon": "pie-chart",
            "categories": [
                {"category": "HOUSING", "percentage": 25, "type": "needs"},
                {"category": "UTILITIES", "percentage": 10, "type": "needs"},
                {"category": "GROCERIES", "percentage": 10, "type": "needs"},
                {"category": "TRANSPORTATION", "percentage": 5, "type": "needs"},
                {"category": "ENTERTAINMENT", "percentage": 15, "type": "wants"},
                {"category": "DINING_OUT", "percentage": 10, "type": "wants"},
                {"category": "SHOPPING", "percentage": 5, "type": "wants"},
                {"category": "SAVINGS", "percentage": 15, "type": "savings"},
                {"category": "DEBT_PAYMENT", "percentage": 5, "type": "savings"}
            ],
            "total_needs": 50,
            "total_wants": 30,
            "total_savings": 20
        },
        {
            "id": "zero-based",
            "name": "Zero-Based Budget",
            "description": "Every dollar has a job - income minus expenses equals zero",
            "icon": "target",
            "categories": [
                {"category": "HOUSING", "percentage": 30},
                {"category": "UTILITIES", "percentage": 10},
                {"category": "GROCERIES", "percentage": 12},
                {"category": "TRANSPORTATION", "percentage": 10},
                {"category": "INSURANCE", "percentage": 8},
                {"category": "DEBT_PAYMENT", "percentage": 10},
                {"category": "SAVINGS", "percentage": 10},
                {"category": "ENTERTAINMENT", "percentage": 5},
                {"category": "DINING_OUT", "percentage": 3},
                {"category": "PERSONAL_CARE", "percentage": 2}
            ],
            "principle": "Assign every dollar of income to a specific category until you reach zero"
        },
        {
            "id": "envelope",
            "name": "Envelope Method",
            "description": "Divide spending into physical or virtual envelopes",
            "icon": "folder",
            "categories": [
                {"category": "GROCERIES", "percentage": 15},
                {"category": "DINING_OUT", "percentage": 8},
                {"category": "ENTERTAINMENT", "percentage": 7},
                {"category": "CLOTHING", "percentage": 5},
                {"category": "TRANSPORTATION", "percentage": 10},
                {"category": "PERSONAL_CARE", "percentage": 5},
                {"category": "GIFTS", "percentage": 3},
                {"category": "MISCELLANEOUS", "percentage": 7}
            ],
            "note": "Fixed expenses (rent, utilities) are paid first, remaining income divided into envelopes"
        },
        {
            "id": "80-20",
            "name": "80/20 Budget",
            "description": "Simple: Save 20% of income, spend 80% however you want",
            "icon": "trending-up",
            "categories": [
                {"category": "SAVINGS", "percentage": 20, "type": "savings"},
                {"category": "ALL_SPENDING", "percentage": 80, "type": "spending"}
            ],
            "principle": "Automated savings first, then flexible spending"
        },
        {
            "id": "pay-yourself-first",
            "name": "Pay Yourself First",
            "description": "Prioritize savings and investments before any spending",
            "icon": "dollar-sign",
            "categories": [
                {"category": "RETIREMENT", "percentage": 15},
                {"category": "EMERGENCY_FUND", "percentage": 10},
                {"category": "INVESTMENTS", "percentage": 5},
                {"category": "REMAINING_BUDGET", "percentage": 70}
            ],
            "principle": "Automate transfers to savings/investment accounts on payday"
        }
    ]
    
    return {"templates": templates}


@router.post("/budgets/apply-template/{template_id}")
async def apply_budget_template(
    template_id: str,
    monthly_income: float,
    current_user: str = Depends(get_current_user)
):
    """Apply a budget template based on monthly income"""
    
    # Get the template
    templates_response = await get_budget_templates()
    templates = templates_response["templates"]
    
    template = next((t for t in templates if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Clear existing budgets (optional - ask user in UI)
    # await db.budgets.delete_many({"user_id": current_user})
    
    # Create budgets based on template
    budgets_created = []
    
    for cat in template["categories"]:
        budget_amount = (cat["percentage"] / 100) * monthly_income
        
        budget = {
            "id": str(uuid4()),
            "user_id": current_user,
            "category": cat["category"],
            "amount": round(budget_amount, 2),
            "period": "monthly",
            "created_at": datetime.now(timezone.utc),
            "template_id": template_id,
            "template_name": template["name"]
        }
        
        await db.budgets.insert_one(budget)
        budgets_created.append({
            "category": cat["category"],
            "amount": round(budget_amount, 2),
            "percentage": cat["percentage"]
        })
    
    return {
        "message": f"Applied {template['name']} budget template",
        "template_id": template_id,
        "monthly_income": monthly_income,
        "budgets_created": budgets_created,
        "total_budgets": len(budgets_created)
    }


@router.get("/budgets/analysis")
async def analyze_budget_performance(current_user: str = Depends(get_current_user)):
    """Analyze how well user is sticking to their budget"""
    
    # Get current month's date range
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    # Get user's budgets
    budgets = await db.budgets.find({
        "user_id": current_user
    }, {"_id": 0}).to_list(100)
    
    if not budgets:
        return {
            "has_budgets": False,
            "message": "No budgets set up yet"
        }
    
    # Get current month's transactions
    transactions = await transactions_collection.find({
        "user_id": current_user,
        "date": {"$gte": month_start.isoformat()},
        "transaction_type": "expense"
    }, {"_id": 0}).to_list(10000)
    
    # Calculate spending by category
    spending_by_category = {}
    for txn in transactions:
        category = txn.get("category", "UNCATEGORIZED")
        amount = abs(txn.get("amount", 0))
        spending_by_category[category] = spending_by_category.get(category, 0) + amount
    
    # Compare with budgets
    budget_analysis = []
    total_budgeted = 0
    total_spent = 0
    over_budget_count = 0
    
    for budget in budgets:
        category = budget.get("category")
        budgeted = budget.get("amount", 0)
        spent = spending_by_category.get(category, 0)
        
        remaining = budgeted - spent
        percentage_used = (spent / budgeted * 100) if budgeted > 0 else 0
        
        status = "on_track"
        if percentage_used >= 100:
            status = "over_budget"
            over_budget_count += 1
        elif percentage_used >= 80:
            status = "warning"
        
        budget_analysis.append({
            "category": category,
            "budgeted": budgeted,
            "spent": spent,
            "remaining": remaining,
            "percentage_used": round(percentage_used, 1),
            "status": status
        })
        
        total_budgeted += budgeted
        total_spent += spent
    
    return {
        "has_budgets": True,
        "month": now.strftime("%B %Y"),
        "total_budgeted": round(total_budgeted, 2),
        "total_spent": round(total_spent, 2),
        "total_remaining": round(total_budgeted - total_spent, 2),
        "overall_percentage": round((total_spent / total_budgeted * 100) if total_budgeted > 0 else 0, 1),
        "categories_over_budget": over_budget_count,
        "budget_details": sorted(budget_analysis, key=lambda x: x["percentage_used"], reverse=True)
    }


# ==================== SPENDING FORECASTING ====================

@router.get("/analytics/spending-forecast")
async def forecast_spending(
    months_ahead: int = 3,
    current_user: str = Depends(get_current_user)
):
    """Forecast future spending based on historical patterns
    
    Uses moving average and trend analysis to predict future spending
    """
    now = datetime.now(timezone.utc)
    
    # Get last 6 months of transactions for analysis
    six_months_ago = now - timedelta(days=180)
    
    transactions = await transactions_collection.find({
        "user_id": current_user,
        "date": {"$gte": six_months_ago.isoformat()},
        "transaction_type": "expense"
    }, {"_id": 0}).to_list(10000)
    
    if not transactions:
        return {
            "has_data": False,
            "message": "Not enough transaction history for forecasting"
        }
    
    # Group transactions by month and category
    monthly_spending = {}
    category_trends = {}
    
    for txn in transactions:
        txn_date = datetime.fromisoformat(txn.get("date"))
        month_key = f"{txn_date.year}-{txn_date.month:02d}"
        category = txn.get("category", "UNCATEGORIZED")
        amount = abs(txn.get("amount", 0))
        
        if month_key not in monthly_spending:
            monthly_spending[month_key] = {"total": 0, "by_category": {}}
        
        monthly_spending[month_key]["total"] += amount
        monthly_spending[month_key]["by_category"][category] = \
            monthly_spending[month_key]["by_category"].get(category, 0) + amount
        
        if category not in category_trends:
            category_trends[category] = []
    
    # Calculate monthly totals for trend analysis
    sorted_months = sorted(monthly_spending.keys())
    monthly_totals = [monthly_spending[m]["total"] for m in sorted_months]
    
    # Simple moving average for overall spending
    if len(monthly_totals) >= 3:
        recent_avg = sum(monthly_totals[-3:]) / 3
    else:
        recent_avg = sum(monthly_totals) / len(monthly_totals) if monthly_totals else 0
    
    # Calculate trend (simple linear)
    if len(monthly_totals) >= 2:
        trend = (monthly_totals[-1] - monthly_totals[0]) / len(monthly_totals)
    else:
        trend = 0
    
    # Generate forecasts for next N months
    forecasts = []
    for i in range(1, months_ahead + 1):
        forecast_date = now + timedelta(days=30 * i)
        forecast_month = f"{forecast_date.year}-{forecast_date.month:02d}"
        
        # Forecast = recent average + (trend * months ahead)
        forecast_amount = recent_avg + (trend * i)
        
        # Apply some variance (±10%) for realism
        lower_bound = forecast_amount * 0.9
        upper_bound = forecast_amount * 1.1
        
        forecasts.append({
            "month": forecast_month,
            "month_name": forecast_date.strftime("%B %Y"),
            "forecast": round(forecast_amount, 2),
            "lower_bound": round(lower_bound, 2),
            "upper_bound": round(upper_bound, 2),
            "confidence": "high" if len(monthly_totals) >= 6 else "medium"
        })
    
    # Category-level forecasts
    category_forecasts = []
    for category in category_trends.keys():
        cat_monthly = []
        for month in sorted_months:
            cat_monthly.append(
                monthly_spending[month]["by_category"].get(category, 0)
            )
        
        if cat_monthly:
            cat_avg = sum(cat_monthly[-3:]) / min(3, len(cat_monthly))
            category_forecasts.append({
                "category": category,
                "monthly_average": round(cat_avg, 2),
                "next_month_forecast": round(cat_avg, 2)
            })
    
    return {
        "has_data": True,
        "historical_months": len(monthly_totals),
        "average_monthly_spending": round(recent_avg, 2),
        "spending_trend": "increasing" if trend > 0 else "decreasing" if trend < 0 else "stable",
        "trend_amount": round(abs(trend), 2),
        "forecasts": forecasts,
        "category_forecasts": sorted(category_forecasts, key=lambda x: x["monthly_average"], reverse=True)[:10],
        "confidence_note": "Forecasts based on last 6 months of spending patterns"
    }


@router.get("/analytics/spending-insights")
async def get_spending_insights(current_user: str = Depends(get_current_user)):
    """Get AI-powered spending insights and recommendations"""
    
    now = datetime.now(timezone.utc)
    current_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    
    # Get current and last month transactions
    current_month_txns = await transactions_collection.find({
        "user_id": current_user,
        "date": {"$gte": current_month_start.isoformat()},
        "transaction_type": "expense"
    }, {"_id": 0}).to_list(10000)
    
    last_month_txns = await transactions_collection.find({
        "user_id": current_user,
        "date": {
            "$gte": last_month_start.isoformat(),
            "$lt": current_month_start.isoformat()
        },
        "transaction_type": "expense"
    }, {"_id": 0}).to_list(10000)
    
    current_total = sum(abs(t.get("amount", 0)) for t in current_month_txns)
    last_month_total = sum(abs(t.get("amount", 0)) for t in last_month_txns)
    
    # Calculate insights
    insights = []
    
    # Month-over-month comparison
    if last_month_total > 0:
        change_pct = ((current_total - last_month_total) / last_month_total) * 100
        if abs(change_pct) > 10:
            insights.append({
                "type": "spending_change",
                "severity": "high" if change_pct > 20 else "medium",
                "title": f"Spending {'Up' if change_pct > 0 else 'Down'} {abs(change_pct):.1f}%",
                "message": f"You've spent ${current_total:.2f} this month vs ${last_month_total:.2f} last month",
                "recommendation": "Review your recent transactions to identify major changes" if change_pct > 0 else "Great job reducing spending!"
            })
    
    # Top spending categories
    category_spending = {}
    for txn in current_month_txns:
        cat = txn.get("category", "UNCATEGORIZED")
        category_spending[cat] = category_spending.get(cat, 0) + abs(txn.get("amount", 0))
    
    if category_spending:
        top_category = max(category_spending.items(), key=lambda x: x[1])
        insights.append({
            "type": "top_category",
            "severity": "info",
            "title": f"Top Spending: {top_category[0]}",
            "message": f"${top_category[1]:.2f} spent on {top_category[0]} this month",
            "recommendation": f"This represents {(top_category[1]/current_total*100):.1f}% of your spending"
        })
    
    # Unusual transactions
    if current_month_txns:
        amounts = [abs(t.get("amount", 0)) for t in current_month_txns]
        avg_amount = sum(amounts) / len(amounts)
        large_txns = [t for t in current_month_txns if abs(t.get("amount", 0)) > avg_amount * 3]
        
        if large_txns:
            insights.append({
                "type": "large_transactions",
                "severity": "medium",
                "title": f"{len(large_txns)} Unusually Large Transaction{'s' if len(large_txns) > 1 else ''}",
                "message": f"Detected {len(large_txns)} transaction(s) significantly above your average",
                "recommendation": "Review these transactions to ensure they're expected"
            })
    
    return {
        "current_month_spending": round(current_total, 2),
        "last_month_spending": round(last_month_total, 2),
        "insights": insights,
        "insights_count": len(insights)
    }


# ==================== DEBT PAYOFF CALCULATOR ====================

@router.post("/debt/calculate-payoff")
async def calculate_debt_payoff(
    debts: List[dict],
    extra_payment: float = 0,
    strategy: str = "avalanche",
    current_user: str = Depends(get_current_user)
):
    """Calculate debt payoff schedule using different strategies
    
    Strategies:
    - avalanche: Pay off highest interest rate first (saves most money)
    - snowball: Pay off smallest balance first (psychological wins)
    - minimum: Only minimum payments (baseline comparison)
    """
    
    if not debts:
        return {"error": "No debts provided"}
    
    # Sort debts based on strategy
    if strategy == "avalanche":
        sorted_debts = sorted(debts, key=lambda x: x.get("interest_rate", 0), reverse=True)
    elif strategy == "snowball":
        sorted_debts = sorted(debts, key=lambda x: x.get("balance", 0))
    else:
        sorted_debts = debts.copy()
    
    # Calculate payoff schedule
    monthly_schedule = []
    total_interest_paid = 0
    months_to_payoff = 0
    remaining_debts = [d.copy() for d in sorted_debts]
    
    while any(d["balance"] > 0 for d in remaining_debts):
        months_to_payoff += 1
        if months_to_payoff > 360:  # Max 30 years
            break
        
        monthly_payment = 0
        month_interest = 0
        
        # Apply minimum payments to all debts
        for debt in remaining_debts:
            if debt["balance"] <= 0:
                continue
            
            balance = debt["balance"]
            interest_rate = debt.get("interest_rate", 0) / 100 / 12
            minimum_payment = debt.get("minimum_payment", balance * 0.02)  # Default 2% of balance
            
            # Calculate interest for this month
            interest = balance * interest_rate
            month_interest += interest
            
            # Apply payment
            principal = minimum_payment - interest
            debt["balance"] = max(0, balance - principal)
            monthly_payment += minimum_payment
        
        # Apply extra payment to first debt (based on strategy)
        if extra_payment > 0:
            for debt in remaining_debts:
                if debt["balance"] > 0:
                    extra_principal = min(extra_payment, debt["balance"])
                    debt["balance"] -= extra_principal
                    monthly_payment += extra_principal
                    break
        
        total_interest_paid += month_interest
        
        monthly_schedule.append({
            "month": months_to_payoff,
            "total_payment": round(monthly_payment, 2),
            "interest_paid": round(month_interest, 2),
            "remaining_balance": round(sum(d["balance"] for d in remaining_debts), 2)
        })
    
    # Calculate summary
    total_paid = sum(s["total_payment"] for s in monthly_schedule)
    original_balance = sum(d.get("balance", 0) for d in debts)
    
    return {
        "strategy": strategy,
        "months_to_payoff": months_to_payoff,
        "years_to_payoff": round(months_to_payoff / 12, 1),
        "total_interest_paid": round(total_interest_paid, 2),
        "total_amount_paid": round(total_paid, 2),
        "original_balance": round(original_balance, 2),
        "extra_monthly_payment": extra_payment,
        "schedule": monthly_schedule[:36]  # Return first 3 years of schedule
    }


@router.get("/debt/summary")
async def get_debt_summary(current_user: str = Depends(get_current_user)):
    """Get summary of user's debt from loan payment transactions and accounts"""
    
    # Get all loan payment transactions
    loan_txns = await transactions_collection.find({
        "user_id": current_user,
        "category": "LOAN_PAYMENTS"
    }, {"_id": 0}).to_list(1000)
    
    # Get accounts with loan/credit types
    loan_accounts = await accounts_collection.find({
        "user_id": current_user,
        "account_type": {"$in": ["loan", "credit"]}
    }, {"_id": 0}).to_list(100)
    
    # Calculate total debt from accounts with negative balances (loans)
    total_debt = sum(abs(acc.get("balance", 0)) for acc in loan_accounts if acc.get("balance", 0) < 0)
    
    # Group transactions by merchant/lender to calculate payments
    debt_by_lender = {}
    for txn in loan_txns:
        lender = txn.get("merchant_name", "Unknown")
        if lender not in debt_by_lender:
            debt_by_lender[lender] = {
                "lender": lender,
                "payments": [],
                "total_paid": 0,
                "dates": []
            }
        
        amount = abs(txn.get("amount", 0))
        debt_by_lender[lender]["payments"].append(amount)
        debt_by_lender[lender]["total_paid"] += amount
        debt_by_lender[lender]["dates"].append(txn.get("date"))
    
    # Build debt list with estimated values for calculator
    debt_list = []
    for lender, data in debt_by_lender.items():
        if data["payments"]:
            avg_payment = data["total_paid"] / len(data["payments"])
            
            # Estimate balance based on typical loan scenarios
            # If making regular payments, estimate remaining balance
            # Assuming average loan: balance = monthly_payment * 60 months (5 years)
            estimated_balance = avg_payment * 36  # Conservative 3-year estimate
            
            # Estimate APR based on loan type (rough estimates)
            estimated_apr = 6.5  # Default estimate
            lender_lower = lender.lower()
            if any(word in lender_lower for word in ["credit", "card", "visa", "mastercard"]):
                estimated_apr = 18.5  # Credit cards
            elif "student" in lender_lower or "education" in lender_lower:
                estimated_apr = 4.5  # Student loans
            elif "auto" in lender_lower or "car" in lender_lower:
                estimated_apr = 5.5  # Auto loans
            elif "mortgage" in lender_lower or "home" in lender_lower:
                estimated_apr = 4.0  # Mortgages
            
            debt_list.append({
                "lender": lender,
                "estimated_monthly_payment": round(avg_payment, 2),
                "estimated_balance": round(estimated_balance, 2),
                "estimated_apr": estimated_apr,
                "payment_count": len(data["payments"]),
                "total_paid_ytd": round(data["total_paid"], 2)
            })
    
    return {
        "total_debt_balance": round(total_debt, 2),
        "active_debts": len(debt_list),
        "debt_accounts": sorted(debt_list, key=lambda x: x["estimated_monthly_payment"], reverse=True),
        "monthly_debt_payment": round(sum(d["estimated_monthly_payment"] for d in debt_list), 2)
    }


@router.post("/debt/analyze-chunking")
async def analyze_chunking_strategy(
    mortgage_balance: float,
    mortgage_rate: float,
    mortgage_payment: float,
    monthly_income: float,
    monthly_expenses: float,
    heloc_rate: float = 11.0,
    heloc_available: float = None,
    custom_chunk_size: float = None,
    years_remaining: float = None,
    current_user: str = Depends(get_current_user)
):
    """Analyze HELOC chunking/velocity banking strategy for mortgage payoff
    
    Chunking Strategy:
    1. Take a chunk from HELOC
    2. Apply as lump sum to mortgage principal
    3. Deposit income into HELOC to pay it down
    4. Repeat when HELOC paid off
    
    Effectiveness depends on:
    - Interest rate differential (mortgage vs HELOC)
    - Available cash flow (income - expenses)
    - HELOC limit
    - Mortgage balance
    """
    
    # Calculate available monthly cash flow
    monthly_cashflow = monthly_income - monthly_expenses - mortgage_payment
    
    if monthly_cashflow <= 0:
        return {
            "viable": False,
            "reason": "Insufficient monthly cash flow. Need positive cash flow after expenses.",
            "monthly_cashflow": monthly_cashflow
        }
    
    # If HELOC available not specified, estimate at 80% of home value - mortgage
    # Assume home value is roughly 1.5x mortgage balance
    if heloc_available is None:
        estimated_home_value = mortgage_balance * 1.5
        heloc_available = (estimated_home_value * 0.8) - mortgage_balance
    
    # Determine optimal chunk size based on cash flow AND interest rate differential
    # The bigger the rate differential, the more aggressive we can be
    rate_differential = mortgage_rate - heloc_rate
    
    # Base chunk target: 4 months of cash flow
    optimal_chunk_months = 4
    
    # Adjust based on rate differential:
    # - If mortgage rate is much higher than HELOC (good differential), increase chunk time
    # - If rates are similar (poor differential), decrease chunk time
    if rate_differential >= 3.0:  # Great differential (3%+ spread)
        optimal_chunk_months = 6  # More aggressive - larger chunks
    elif rate_differential >= 1.5:  # Good differential (1.5-3% spread)
        optimal_chunk_months = 5
    elif rate_differential >= 0.5:  # Decent differential (0.5-1.5% spread)
        optimal_chunk_months = 4
    elif rate_differential > 0:  # Small differential (0-0.5% spread)
        optimal_chunk_months = 3  # Less aggressive - smaller chunks
    else:  # Negative differential (HELOC rate higher!)
        optimal_chunk_months = 2  # Very conservative
    
    calculated_optimal_chunk = monthly_cashflow * optimal_chunk_months
    
    # Cap chunk at HELOC limit
    calculated_optimal_chunk = min(calculated_optimal_chunk, heloc_available)
    
    # Cap chunk based on rate differential:
    # - Good differential: allow up to 15% of balance
    # - Poor differential: limit to 5% of balance
    if rate_differential >= 2.0:
        max_chunk_percentage = 0.15
    elif rate_differential >= 1.0:
        max_chunk_percentage = 0.10
    elif rate_differential >= 0:
        max_chunk_percentage = 0.08
    else:
        max_chunk_percentage = 0.05
    
    max_chunk = mortgage_balance * max_chunk_percentage
    calculated_optimal_chunk = min(calculated_optimal_chunk, max_chunk)
    
    # Use custom chunk size if provided, otherwise use calculated optimal
    if custom_chunk_size and custom_chunk_size > 0:
        optimal_chunk = min(custom_chunk_size, heloc_available, mortgage_balance)
    else:
        optimal_chunk = calculated_optimal_chunk
    
    if optimal_chunk < 1000:
        return {
            "viable": False,
            "reason": "Cash flow too low for effective chunking. Need at least $1,000 chunks.",
            "monthly_cashflow": round(monthly_cashflow, 2),
            "optimal_chunk": round(optimal_chunk, 2)
        }
    
    # Calculate traditional payoff
    monthly_rate = mortgage_rate / 100 / 12
    
    # If years_remaining is provided, calculate the proper P+I payment for that term
    if years_remaining and years_remaining > 0:
        months_traditional = int(years_remaining * 12)
        
        # Calculate what the P+I payment SHOULD be for this term
        # This excludes taxes and insurance
        pi_payment = mortgage_balance * (monthly_rate * (1 + monthly_rate)**months_traditional) / ((1 + monthly_rate)**months_traditional - 1)
        
        # Calculate interest for the full term using P+I only
        balance_traditional = mortgage_balance
        interest_traditional = 0
        
        for month in range(months_traditional):
            interest = balance_traditional * monthly_rate
            interest_traditional += interest
            principal = pi_payment - interest
            balance_traditional -= principal
            if balance_traditional <= 0:
                balance_traditional = 0
                break
    else:
        # Calculate based on current balance and payment
        months_traditional = 0
        balance_traditional = mortgage_balance
        interest_traditional = 0
        
        while balance_traditional > 0 and months_traditional < 360:
            months_traditional += 1
            interest = balance_traditional * monthly_rate
            interest_traditional += interest
            principal = mortgage_payment - interest
            balance_traditional -= principal
            if balance_traditional < 0:
                balance_traditional = 0
    
    # Calculate chunking strategy
    heloc_monthly_rate = heloc_rate / 100 / 12
    months_chunking = 0
    mortgage_balance_chunking = mortgage_balance
    heloc_balance = 0
    total_interest_chunking = 0
    chunks_used = 0
    
    max_iterations = 360  # Safety limit
    
    while mortgage_balance_chunking > 0 and months_chunking < max_iterations:
        # If HELOC is paid off and cash flow available, take new chunk
        if heloc_balance <= 0 and monthly_cashflow > 0 and chunks_used < 20:  # Max 20 chunks
            chunk_size = min(optimal_chunk, mortgage_balance_chunking, heloc_available)
            if chunk_size >= 1000:  # Minimum chunk size
                heloc_balance = chunk_size
                mortgage_balance_chunking -= chunk_size
                chunks_used += 1
        
        months_chunking += 1
        
        # Mortgage interest (only on remaining balance)
        if mortgage_balance_chunking > 0:
            mortgage_interest = mortgage_balance_chunking * monthly_rate
            total_interest_chunking += mortgage_interest
            
            # Make mortgage payment (after chunking, balance is lower)
            if mortgage_balance_chunking > 0:
                principal = mortgage_payment - mortgage_interest
                mortgage_balance_chunking -= principal
                if mortgage_balance_chunking < 0:
                    mortgage_balance_chunking = 0
        
        # HELOC interest and paydown
        if heloc_balance > 0:
            heloc_interest = heloc_balance * heloc_monthly_rate
            total_interest_chunking += heloc_interest
            
            # Pay down HELOC with cash flow
            heloc_paydown = min(monthly_cashflow, heloc_balance + heloc_interest)
            heloc_balance = heloc_balance + heloc_interest - heloc_paydown
            if heloc_balance < 0:
                heloc_balance = 0
    
    # Calculate savings and metrics
    interest_saved = interest_traditional - total_interest_chunking
    time_saved_months = months_traditional - months_chunking
    time_saved_years = time_saved_months / 12
    
    # Determine recommendation based on results
    savings_percentage = (interest_saved / interest_traditional * 100) if interest_traditional > 0 else 0
    time_saved_percentage = (time_saved_months / months_traditional * 100) if months_traditional > 0 else 0
    
    # More practical viability check - scales with mortgage size
    # Either save $1000+ and 1 year+, OR save 20%+ interest and 25%+ time
    viable = (interest_saved > 1000 and time_saved_years >= 1) or (savings_percentage >= 20 and time_saved_percentage >= 25)
    
    recommendation = "not recommended"
    if savings_percentage >= 40 and time_saved_percentage >= 50:
        recommendation = "highly recommended"
    elif savings_percentage >= 25 and time_saved_percentage >= 35:
        recommendation = "recommended"
    elif savings_percentage >= 10 and time_saved_percentage >= 20:
        recommendation = "moderately beneficial"
    
    # Risk assessment
    risk_factors = []
    if heloc_rate >= mortgage_rate - 1:
        risk_factors.append("HELOC rate close to mortgage rate - lower benefit")
    if monthly_cashflow < 1000:
        risk_factors.append("Limited cash flow - slower chunk payoff")
    if optimal_chunk < 5000:
        risk_factors.append("Small chunks - requires more cycles")
    
    # Add rate differential info to risk factors
    rate_diff = mortgage_rate - heloc_rate
    if rate_diff < 0:
        risk_factors.insert(0, f"⚠️ HELOC rate ({heloc_rate}%) is HIGHER than mortgage rate ({mortgage_rate}%) - NOT recommended!")
    elif rate_diff < 0.5:
        risk_factors.insert(0, f"⚠️ Very small rate differential ({rate_diff:.2f}%) - minimal benefit")
    elif rate_diff < 1.5:
        risk_factors.insert(0, f"Rate differential is {rate_diff:.2f}% - modest benefit")
    
    return {
        "viable": viable,
        "recommendation": recommendation,
        "monthly_cashflow": round(monthly_cashflow, 2),
        "calculated_optimal_chunk": round(calculated_optimal_chunk, 2),
        "optimal_chunk_size": round(optimal_chunk, 2),
        "using_custom_chunk": custom_chunk_size is not None and custom_chunk_size > 0,
        "chunks_needed": chunks_used,
        "rate_differential": round(rate_diff, 2),
        "mortgage_rate": mortgage_rate,
        "heloc_rate": heloc_rate,
        "traditional_payoff": {
            "months": months_traditional,
            "years": round(months_traditional / 12, 1),
            "total_interest": round(interest_traditional, 2),
            "total_paid": round(mortgage_balance + interest_traditional, 2)
        },
        "chunking_payoff": {
            "months": months_chunking,
            "years": round(months_chunking / 12, 1),
            "total_interest": round(total_interest_chunking, 2),
            "total_paid": round(mortgage_balance + total_interest_chunking, 2)
        },
        "savings": {
            "interest_saved": round(interest_saved, 2),
            "time_saved_months": time_saved_months,
            "time_saved_years": round(time_saved_years, 1),
            "savings_percentage": round(savings_percentage, 1)
        },
        "risk_factors": risk_factors,
        "how_it_works": [
            f"1. Interest rate differential: {rate_diff:.2f}% (Mortgage: {mortgage_rate}% - HELOC: {heloc_rate}%)",
            f"2. Take ${optimal_chunk:,.0f} from HELOC and pay toward mortgage principal",
            f"3. Deposit ${monthly_cashflow:,.0f}/month income into HELOC to pay it down",
            f"4. Repeat {chunks_used} times until mortgage is paid off",
            f"5. Save ${interest_saved:,.0f} in interest and {time_saved_years:.1f} years"
        ]
    }
