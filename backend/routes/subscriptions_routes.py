from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import logging
import sys
sys.path.append('/app/backend')
from auth import get_current_user
from database import db, users_collection

logger = logging.getLogger(__name__)

router = APIRouter(tags=["subscriptions"])

# Subscription Tiers Configuration
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "price": 0.0,
        "billing_period": "forever",
        "features": [
            "plaid_accounts",
            "basic_budgets",
            "transaction_tracking",
            "basic_reports",
            "goals_tracking"
        ],
        "limits": {
            "plaid_accounts": 2,
            "budgets": 5,
            "goals": 3
        }
    },
    "premium": {
        "name": "Premium",
        "price": 9.99,
        "billing_period": "month",
        "features": [
            "plaid_accounts",
            "basic_budgets",
            "transaction_tracking",
            "basic_reports",
            "goals_tracking",
            "ai_insights",
            "bill_calendar",
            "recurring_expense_tracking",
            "advanced_reports",
            "crypto_tracking",
            "investment_tracking",
            "alerts_notifications"
        ],
        "limits": {
            "plaid_accounts": 10,
            "budgets": "unlimited",
            "goals": "unlimited"
        }
    },
    "pro": {
        "name": "Pro",
        "price": 19.99,
        "billing_period": "month",
        "features": [
            "plaid_accounts",
            "basic_budgets",
            "transaction_tracking",
            "basic_reports",
            "goals_tracking",
            "ai_insights",
            "bill_calendar",
            "recurring_expense_tracking",
            "advanced_reports",
            "crypto_tracking",
            "investment_tracking",
            "alerts_notifications",
            "ai_savings_coach",
            "portfolio_diversification",
            "net_worth_tracking",
            "debt_payoff_strategies",
            "heloc_chunking",
            "spending_forecasting",
            "auto_categorization",
            "custom_tags",
            "priority_support"
        ],
        "limits": {
            "plaid_accounts": "unlimited",
            "budgets": "unlimited",
            "goals": "unlimited"
        }
    },
    "lifetime": {
        "name": "Lifetime",
        "price": 499.99,  # Normal price: $499.99, can discount to $299 for Cyber Monday
        "billing_period": "lifetime",
        "features": [
            "plaid_accounts",
            "basic_budgets",
            "transaction_tracking",
            "basic_reports",
            "goals_tracking",
            "ai_insights",  # Included for first year, then becomes add-on
            "bill_calendar",
            "recurring_expense_tracking",
            "advanced_reports",
            "crypto_tracking",
            "investment_tracking",
            "alerts_notifications",
            "ai_savings_coach",  # Included for first year, then becomes add-on
            "portfolio_diversification",
            "net_worth_tracking",
            "debt_payoff_strategies",
            "heloc_chunking",
            "spending_forecasting",
            "auto_categorization",
            "custom_tags",
            "priority_support",
            "lifetime_updates"
        ],
        "limits": {
            "plaid_accounts": "unlimited",
            "budgets": "unlimited",
            "goals": "unlimited"
        },
        "ai_grace_period_days": 365,  # AI features free for first year
        "note": "AI features included for first year, then $4.99/month"
    }
}

# AI Add-on Configuration
# Covers AI features that cost money per use (LLM API calls)
# After grace period, Lifetime members need this add-on for AI features
AI_ADDON = {
    "name": "AI Power Pack",
    "description": "Unlock AI-powered insights, recommendations, and smart analysis",
    "price": 4.99,  # Set to 2x your average AI cost per user
    "billing_period": "month",
    "features": [
        "ai_insights",
        "ai_savings_coach",
        "ai_transaction_categorization",
        "ai_spending_analysis",
        "ai_financial_advice"
    ],
    "compatible_tiers": ["premium", "pro", "lifetime"],  # Can add to any paid tier
    "note": "Required for Lifetime members after 1 year. Always included in Premium/Pro."
}

# Lifetime Availability Configuration
# This controls when the Lifetime tier is visible to users (Plex-style)
# See /tmp/lifetime_availability_guide.md for full documentation
LIFETIME_AVAILABILITY = {
    "enabled": True,  # Master switch - set to False to hide lifetime completely
    "availability_type": "date_range",  # Options: "always", "date_range", "random", "percentage"
    "random_percentage": 20,  # If random/percentage: show to X% of users
    "date_ranges": [  # If date_range: specify when it's available
        # Example: Cyber Monday 2026 (currently outside this range for testing)
        {"start": "2026-11-24T00:00:00Z", "end": "2026-12-01T23:59:59Z"},
        # Future: Can add more date ranges for special events
    ],
}

def is_lifetime_available(user_id: Optional[str] = None) -> dict:
    """
    Check if Lifetime tier should be shown to a user.
    Returns dict with 'available' (bool) and 'reason' (str)
    """
    if not LIFETIME_AVAILABILITY["enabled"]:
        return {"available": False, "reason": "Lifetime tier is currently disabled"}
    
    availability_type = LIFETIME_AVAILABILITY["availability_type"]
    
    if availability_type == "always":
        return {"available": True, "reason": "Always available"}
    
    elif availability_type == "date_range":
        current_time = datetime.now(timezone.utc)
        for date_range in LIFETIME_AVAILABILITY["date_ranges"]:
            start = datetime.fromisoformat(date_range["start"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(date_range["end"].replace("Z", "+00:00"))
            if start <= current_time <= end:
                return {"available": True, "reason": "Within date range"}
        return {"available": False, "reason": "Outside of promotional period"}
    
    elif availability_type == "random":
        # Use user_id for consistent random selection per user
        if user_id:
            import hashlib
            hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
            is_selected = (hash_val % 100) < LIFETIME_AVAILABILITY["random_percentage"]
        else:
            # For anonymous users, use session-based or truly random
            import random
            is_selected = random.randint(1, 100) <= LIFETIME_AVAILABILITY["random_percentage"]
        
        if is_selected:
            return {"available": True, "reason": "Randomly selected"}
        return {"available": False, "reason": "Not randomly selected"}
    
    elif availability_type == "percentage":
        # Similar to random but more deterministic based on user_id
        if user_id:
            import hashlib
            hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
            is_selected = (hash_val % 100) < LIFETIME_AVAILABILITY["random_percentage"]
            if is_selected:
                return {"available": True, "reason": "User percentage match"}
        return {"available": False, "reason": "User percentage no match"}
    
    return {"available": False, "reason": "Unknown availability type"}

# Models
class SubscriptionInfo(BaseModel):
    tier: str = "free"
    status: str = "active"  # active, cancelled, expired
    billing_period: str = "forever"
    price: float = 0.0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    payment_method: Optional[str] = None

class CheckoutRequest(BaseModel):
    tier: str
    origin_url: str

class SubscriptionStatus(BaseModel):
    tier: str
    name: str
    status: str
    features: List[str]
    limits: Dict
    price: float
    billing_period: str
    started_at: datetime
    expires_at: Optional[datetime]

# Get subscription tiers info (public)
@router.get("/tiers")
async def get_subscription_tiers():
    """Get all available subscription tiers and their features (public, no user context)"""
    # For anonymous users, check lifetime availability without user_id
    lifetime_check = is_lifetime_available(None)
    
    # Create a copy of tiers
    available_tiers = dict(SUBSCRIPTION_TIERS)
    
    # Remove lifetime if not available
    if not lifetime_check["available"]:
        available_tiers.pop("lifetime", None)
    
    return {
        "tiers": available_tiers,
        "lifetime_available": lifetime_check["available"]
    }

# Get subscription tiers for authenticated user
@router.get("/tiers/me")
async def get_subscription_tiers_for_user(user_id: str = Depends(get_current_user)):
    """Get available subscription tiers for authenticated user"""
    # Check if lifetime should be shown for this specific user
    lifetime_check = is_lifetime_available(user_id)
    
    # Create a copy of tiers
    available_tiers = dict(SUBSCRIPTION_TIERS)
    
    # Remove lifetime if not available
    if not lifetime_check["available"]:
        available_tiers.pop("lifetime", None)
    
    return {
        "tiers": available_tiers,
        "lifetime_available": lifetime_check["available"],
        "lifetime_reason": lifetime_check["reason"]
    }

# Helper function to check if user has AI access
def has_ai_access(subscription: dict) -> dict:
    """
    Check if user has access to AI features.
    For Lifetime members: Free for first year, then requires add-on.
    For Premium/Pro: Always included.
    
    Returns dict with 'has_access' (bool) and 'reason' (str)
    """
    tier = subscription.get("tier", "free")
    
    # Free tier never has AI
    if tier == "free":
        return {"has_access": False, "reason": "Upgrade to Premium or Pro for AI features"}
    
    # Premium and Pro always have AI included
    if tier in ["premium", "pro"]:
        return {"has_access": True, "reason": "Included in your plan"}
    
    # Lifetime: Check grace period and add-on
    if tier == "lifetime":
        # Check if they have AI add-on
        ai_addon = subscription.get("ai_addon", {})
        if ai_addon.get("status") == "active":
            return {"has_access": True, "reason": "AI Power Pack active"}
        
        # Check grace period (first year free)
        started_at_str = subscription.get("started_at")
        if started_at_str:
            try:
                if isinstance(started_at_str, str):
                    started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                else:
                    started_at = started_at_str
                
                # Calculate days since purchase
                days_since_purchase = (datetime.now(timezone.utc) - started_at).days
                grace_period = SUBSCRIPTION_TIERS["lifetime"].get("ai_grace_period_days", 365)
                
                if days_since_purchase < grace_period:
                    days_remaining = grace_period - days_since_purchase
                    return {
                        "has_access": True, 
                        "reason": f"Grace period ({days_remaining} days remaining)",
                        "grace_period_ending": True,
                        "days_remaining": days_remaining
                    }
                else:
                    return {
                        "has_access": False, 
                        "reason": "Grace period ended. Add AI Power Pack for $4.99/month",
                        "requires_addon": True
                    }
            except Exception as e:
                logger.error(f"Error parsing started_at date: {e}")
                # Default to giving access if we can't parse date
                return {"has_access": True, "reason": "Grace period (date parsing error)"}
        
        # No started_at date, give access by default
        return {"has_access": True, "reason": "Grace period"}
    
    return {"has_access": False, "reason": "Unknown tier"}

# Get user's current subscription
@router.get("/status")
async def get_subscription_status(user_id: str = Depends(get_current_user)):
    """Get current user's subscription status"""
    
    
    # Get user's subscription from database
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("subscription", {
        "tier": "free",
        "status": "active",
        "billing_period": "forever",
        "price": 0.0,
        "started_at": datetime.now(timezone.utc).isoformat()
    })
    
    tier_info = SUBSCRIPTION_TIERS.get(subscription["tier"], SUBSCRIPTION_TIERS["free"])
    
    # Check AI access for Lifetime members
    ai_access_info = has_ai_access(subscription)
    
    return {
        "tier": subscription["tier"],
        "name": tier_info["name"],
        "status": subscription.get("status", "active"),
        "features": tier_info["features"],
        "limits": tier_info["limits"],
        "price": tier_info["price"],
        "billing_period": tier_info["billing_period"],
        "started_at": subscription.get("started_at"),
        "expires_at": subscription.get("expires_at"),
        "ai_access": ai_access_info,  # Include AI access status
        "ai_addon_available": subscription["tier"] in AI_ADDON["compatible_tiers"]
    }

# Check if user has access to a feature
@router.get("/check-feature/{feature_name}")
async def check_feature_access(feature_name: str, user_id: str = Depends(get_current_user)):
    """Check if user has access to a specific feature"""
    
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("subscription", {"tier": "free", "status": "active"})
    tier = subscription.get("tier", "free")
    status = subscription.get("status", "active")
    
    # If subscription is not active, downgrade to free
    if status != "active":
        tier = "free"
    
    tier_info = SUBSCRIPTION_TIERS.get(tier, SUBSCRIPTION_TIERS["free"])
    has_access = feature_name in tier_info["features"]
    
    # Special handling for AI features
    if feature_name in AI_ADDON["features"]:
        ai_access_info = has_ai_access(subscription)
        has_access = ai_access_info["has_access"]
        
        return {
            "feature": feature_name,
            "has_access": has_access,
            "tier": tier,
            "required_tier": "premium" if not has_access else tier,
            "is_ai_feature": True,
            "ai_access_info": ai_access_info,
            "addon_required": ai_access_info.get("requires_addon", False)
        }
    
    return {
        "feature": feature_name,
        "has_access": has_access,
        "tier": tier,
        "required_tier": "premium" if not has_access else tier,
        "is_ai_feature": False
    }

# Create checkout session
@router.post("/checkout")
async def create_checkout_session(
    checkout_req: CheckoutRequest,
    user_id: str = Depends(get_current_user)
):
    """Create a Stripe checkout session for subscription upgrade"""
    
    
    # Validate tier
    if checkout_req.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid subscription tier")
    
    tier_info = SUBSCRIPTION_TIERS[checkout_req.tier]
    
    # Free tier doesn't require payment
    if checkout_req.tier == "free":
        raise HTTPException(status_code=400, detail="Free tier doesn't require payment")
    
    # Get Stripe API key
    stripe_api_key = os.getenv("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Initialize Stripe checkout
    webhook_url = f"{checkout_req.origin_url}/api/subscriptions/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Build success and cancel URLs
    success_url = f"{checkout_req.origin_url}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_req.origin_url}/pricing"
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create checkout session request
    checkout_request = CheckoutSessionRequest(
        amount=tier_info["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "user_email": user["email"],
            "tier": checkout_req.tier,
            "billing_period": tier_info["billing_period"],
            "source": "subscription_upgrade"
        }
    )
    
    try:
        # Create checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store pending transaction in database
        transaction_data = {
            "session_id": session.session_id,
            "user_id": user_id,
            "user_email": user["email"],
            "tier": checkout_req.tier,
            "amount": tier_info["price"],
            "currency": "usd",
            "billing_period": tier_info["billing_period"],
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.payment_transactions.insert_one(transaction_data)
        
        logger.info(f"Created checkout session for user {user_id}, tier {checkout_req.tier}, session {session.session_id}")
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
    
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

# Check payment status
@router.get("/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """Check the status of a checkout session"""
    
    
    # Find transaction in database
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return stored status
    if transaction.get("payment_status") == "paid" and transaction.get("status") == "completed":
        return {
            "status": "completed",
            "payment_status": "paid",
            "tier": transaction.get("tier"),
            "message": "Subscription activated successfully"
        }
    
    # Get Stripe API key
    stripe_api_key = os.getenv("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Check with Stripe
    webhook_url = ""  # Not needed for status check
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        update_data = {
            "payment_status": checkout_status.payment_status,
            "status": checkout_status.status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        # If payment is complete and not already processed, activate subscription
        if checkout_status.payment_status == "paid" and transaction.get("status") != "completed":
            tier = transaction.get("tier")
            billing_period = transaction.get("billing_period")
            
            # Calculate expiration date for monthly subscriptions
            expires_at = None
            if billing_period == "month":
                from dateutil.relativedelta import relativedelta
                expires_at = datetime.now(timezone.utc) + relativedelta(months=1)
            
            # Update user subscription
            subscription_data = {
                "tier": tier,
                "status": "active",
                "billing_period": billing_period,
                "price": transaction.get("amount"),
                "started_at": datetime.now(timezone.utc),
                "expires_at": expires_at,
                "payment_method": "stripe",
                "last_payment_session_id": session_id
            }
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"subscription": subscription_data}}
            )
            
            # Mark transaction as completed
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed"}}
            )
            
            logger.info(f"Activated {tier} subscription for user {user_id}")
            
            return {
                "status": "completed",
                "payment_status": "paid",
                "tier": tier,
                "message": "Subscription activated successfully"
            }
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "tier": transaction.get("tier"),
            "message": "Payment pending" if checkout_status.payment_status != "paid" else "Processing"
        }
    
    except Exception as e:
        logger.error(f"Error checking checkout status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")

# Webhook handler for Stripe
@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    
    # Get Stripe API key
    stripe_api_key = os.getenv("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Get request body and signature
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    webhook_url = ""  # Not used in webhook handling
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook event: {webhook_response.event_type}, session: {webhook_response.session_id}")
        
        # Handle successful payment
        if webhook_response.event_type == "checkout.session.completed" and webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            # Find transaction
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if transaction and transaction.get("status") != "completed":
                user_id = transaction.get("user_id")
                tier = transaction.get("tier")
                billing_period = transaction.get("billing_period")
                
                # Calculate expiration
                expires_at = None
                if billing_period == "month":
                    from dateutil.relativedelta import relativedelta
                    expires_at = datetime.now(timezone.utc) + relativedelta(months=1)
                
                # Update user subscription
                subscription_data = {
                    "tier": tier,
                    "status": "active",
                    "billing_period": billing_period,
                    "price": transaction.get("amount"),
                    "started_at": datetime.now(timezone.utc),
                    "expires_at": expires_at,
                    "payment_method": "stripe",
                    "last_payment_session_id": session_id
                }
                
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"subscription": subscription_data}}
                )
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
                
                logger.info(f"Webhook: Activated {tier} subscription for user {user_id}")
        
        return {"status": "success", "event_type": webhook_response.event_type}
    
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Get AI Add-on info
@router.get("/ai-addon")
async def get_ai_addon_info(user_id: str = Depends(get_current_user)):
    """Get AI add-on information and user's current status"""
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("subscription", {"tier": "free"})
    tier = subscription.get("tier")
    
    # Check if user can purchase AI add-on
    can_purchase = tier in AI_ADDON["compatible_tiers"]
    
    # Get current AI access status
    ai_access = has_ai_access(subscription)
    
    # Check if user already has AI add-on
    ai_addon = subscription.get("ai_addon", {})
    
    return {
        "addon": AI_ADDON,
        "can_purchase": can_purchase,
        "current_status": ai_addon.get("status", "inactive"),
        "ai_access": ai_access,
        "user_tier": tier
    }

# Purchase AI Add-on
@router.post("/ai-addon/purchase")
async def purchase_ai_addon(
    checkout_req: CheckoutRequest,
    user_id: str = Depends(get_current_user)
):
    """Create checkout session for AI add-on purchase"""
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("subscription", {"tier": "free"})
    tier = subscription.get("tier")
    
    # Verify user can purchase add-on
    if tier not in AI_ADDON["compatible_tiers"]:
        raise HTTPException(status_code=400, detail="AI add-on not available for your tier")
    
    # Check if already has active AI add-on
    ai_addon = subscription.get("ai_addon", {})
    if ai_addon.get("status") == "active":
        raise HTTPException(status_code=400, detail="AI add-on already active")
    
    # Get Stripe API key
    stripe_api_key = os.getenv("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Initialize Stripe checkout
    webhook_url = f"{checkout_req.origin_url}/api/subscriptions/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Build success and cancel URLs
    success_url = f"{checkout_req.origin_url}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}&addon=ai"
    cancel_url = f"{checkout_req.origin_url}/settings"
    
    # Create checkout session request
    checkout_request = CheckoutSessionRequest(
        amount=AI_ADDON["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "user_email": user["email"],
            "product": "ai_addon",
            "source": "ai_addon_purchase"
        }
    )
    
    try:
        # Create checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store pending transaction
        transaction_data = {
            "session_id": session.session_id,
            "user_id": user_id,
            "user_email": user["email"],
            "product": "ai_addon",
            "amount": AI_ADDON["price"],
            "currency": "usd",
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.payment_transactions.insert_one(transaction_data)
        
        logger.info(f"Created AI add-on checkout for user {user_id}, session {session.session_id}")
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
    
    except Exception as e:
        logger.error(f"Error creating AI add-on checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")

# Cancel AI Add-on
@router.post("/ai-addon/cancel")
async def cancel_ai_addon(user_id: str = Depends(get_current_user)):
    """Cancel AI add-on subscription"""
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("subscription", {})
    ai_addon = subscription.get("ai_addon", {})
    
    if ai_addon.get("status") != "active":
        raise HTTPException(status_code=400, detail="No active AI add-on to cancel")
    
    # Update AI add-on status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription.ai_addon.status": "cancelled",
            "subscription.ai_addon.cancelled_at": datetime.now(timezone.utc)
        }}
    )
    
    logger.info(f"Cancelled AI add-on for user {user_id}")
    
    return {"message": "AI add-on cancelled successfully"}

# Cancel subscription
@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user)):
    """Cancel user's current subscription"""
    
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("subscription")
    if not subscription or subscription.get("tier") == "free":
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # Update subscription status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "subscription.status": "cancelled",
            "subscription.cancelled_at": datetime.now(timezone.utc)
        }}
    )
    
    logger.info(f"Cancelled subscription for user {user_id}")
    
    return {"message": "Subscription cancelled successfully"}
