from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enums
class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    MORTGAGE = "mortgage"
    LOAN = "loan"
    CRYPTO = "crypto"
    MANUAL = "manual"

class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"

class BillFrequency(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Account Models
class AccountCreate(BaseModel):
    name: str
    account_type: AccountType
    balance: float = 0.0
    institution_name: Optional[str] = None
    currency: str = "USD"

class Account(BaseModel):
    id: str
    user_id: str
    name: str
    account_type: AccountType
    balance: float
    institution_name: Optional[str] = None
    plaid_account_id: Optional[str] = None
    plaid_item_id: Optional[str] = None
    currency: str = "USD"
    mask: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Transaction Models
class TransactionCreate(BaseModel):
    account_id: str
    amount: float
    description: str
    transaction_type: TransactionType
    category: Optional[str] = None
    date: date
    merchant_name: Optional[str] = None
    is_recurring: bool = False

class Transaction(BaseModel):
    id: str
    user_id: str
    account_id: str
    plaid_transaction_id: Optional[str] = None
    amount: float
    description: str
    transaction_type: TransactionType
    category: Optional[str] = None
    date: date
    merchant_name: Optional[str] = None
    is_recurring: bool = False
    pending: bool = False
    ai_categorized: bool = False
    created_at: datetime
    updated_at: datetime

# Budget Models
class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str = "monthly"  # monthly, yearly
    start_date: date

class Budget(BaseModel):
    id: str
    user_id: str
    category: str
    amount: float
    period: str
    start_date: date
    created_at: datetime

# Bill Models
class BillCreate(BaseModel):
    name: str
    amount: float
    due_date: date
    frequency: BillFrequency
    category: Optional[str] = None
    icon: Optional[str] = None
    auto_pay: bool = False

class Bill(BaseModel):
    id: str
    user_id: str
    name: str
    amount: float
    due_date: date
    frequency: BillFrequency
    category: Optional[str] = None
    icon: Optional[str] = None
    auto_pay: bool = False
    is_paid: bool = False
    created_at: datetime
    updated_at: datetime

# Plaid Models
class PlaidLinkTokenRequest(BaseModel):
    user_id: str

class PlaidExchangeTokenRequest(BaseModel):
    public_token: str

# AI Insight Models
class AIInsight(BaseModel):
    id: str
    user_id: str
    insight_type: str  # subscription, price_increase, alternative_service, recommendation
    title: str
    description: str
    priority: int = 1  # 1-5
    monthly_savings: float = 0.0
    affiliate_link: Optional[str] = None
    affiliate_text: Optional[str] = None
    created_at: datetime

# Analytics Models
class SpendingByCategory(BaseModel):
    category: str
    amount: float
    percentage: float

class DashboardStats(BaseModel):
    total_balance: float
    total_income: float
    total_expenses: float
    net_worth: float
    spending_by_category: List[SpendingByCategory]
    recent_transactions: List[Transaction]
