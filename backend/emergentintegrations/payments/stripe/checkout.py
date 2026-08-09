"""Replacement for emergentintegrations Stripe wrapper - uses stripe directly."""
import stripe
from typing import Optional, Dict
from pydantic import BaseModel


class CheckoutSessionRequest(BaseModel):
    amount: int  # in cents
    currency: str = "usd"
    success_url: str
    cancel_url: str
    metadata: Dict = {}


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str
    status: str = "open"


class CheckoutStatusResponse(BaseModel):
    session_id: str
    status: str
    payment_status: str
    amount_total: int
    currency: str
    metadata: Dict = {}


class StripeCheckout:
    def __init__(self, api_key: str, webhook_url: str = ""):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, request: CheckoutSessionRequest) -> CheckoutSessionResponse:
        stripe.api_key = self.api_key
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": request.currency,
                    "product_data": {
                        "name": "Kindling Finance Premium",
                    },
                    "unit_amount": request.amount,
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata=request.metadata,
        )
        return CheckoutSessionResponse(
            session_id=session.id,
            checkout_url=session.url or "",
            status=session.status or "open"
        )

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        stripe.api_key = self.api_key
        session = stripe.checkout.Session.retrieve(session_id)
        return CheckoutStatusResponse(
            session_id=session.id,
            status=session.status or "unknown",
            payment_status=session.payment_status or "unknown",
            amount_total=session.amount_total or 0,
            currency=session.currency or "usd",
            metadata=session.metadata or {}
        )
