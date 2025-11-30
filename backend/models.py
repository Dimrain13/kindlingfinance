from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Union
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

class GoalType(str, Enum):
    EMERGENCY_FUND = "emergency_fund"
    VACATION = "vacation"
    HOME_DOWN_PAYMENT = "home_down_payment"
    CAR = "car"
    DEBT_PAYOFF = "debt_payoff"
    WEDDING = "wedding"
    EDUCATION = "education"
    CUSTOM = "custom"

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

# User Settings Models
class UserSettings(BaseModel):
    user_id: str
    family_size: int = 1  # Number of people in household
    has_children: bool = False
    primary_goals: List[str] = []  # e.g., ["save_money", "pay_debt", "build_emergency_fund"]
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive
    monthly_income: Optional[float] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserSettingsUpdate(BaseModel):
    family_size: Optional[int] = None
    has_children: Optional[bool] = None
    primary_goals: Optional[List[str]] = None
    risk_tolerance: Optional[str] = None
    monthly_income: Optional[float] = None


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
    cost_basis: Optional[float] = None  # For investment accounts - actual purchase price
    institution_name: Optional[str] = None
    plaid_account_id: Optional[str] = None
    plaid_item_id: Optional[str] = None
    mx_account_guid: Optional[str] = None  # MX Platform account GUID
    mx_member_guid: Optional[str] = None  # MX Platform member (institution) GUID
    currency: str = "USD"
    mask: Optional[str] = None
    reviewed: Optional[bool] = None  # For transaction review workflow
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
    reviewed: bool = False
    ai_categorized: bool = False
    created_at: datetime
    updated_at: datetime

# Budget Models
class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str = "monthly"  # monthly, yearly
    start_date: date
    rollover: bool = False
    icon: Optional[str] = None
    color: Optional[str] = None

class Budget(BaseModel):
    id: str
    user_id: str
    category: str
    amount: float
    period: str
    start_date: date
    rollover: bool = False
    rollover_amount: float = 0.0
    icon: Optional[str] = None
    color: Optional[str] = None
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
    due_date: Union[date, str]
    frequency: BillFrequency
    category: Optional[str] = None
    icon: Optional[str] = None
    auto_pay: bool = False
    is_paid: bool = False
    linked_transaction_ids: Optional[List[str]] = []  # Transaction IDs linked to this bill
    created_at: datetime
    updated_at: datetime
    
    @field_validator('due_date', mode='before')
    @classmethod
    def parse_due_date(cls, v):
        """Convert string dates from MongoDB back to date objects"""
        if isinstance(v, str):
            return datetime.fromisoformat(v).date()
        return v

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

# Goal Models
class GoalCreate(BaseModel):
    name: str
    type: GoalType
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[date] = None
    linked_account_id: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    linked_account_id: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class Goal(BaseModel):
    id: str
    user_id: str
    name: str
    type: GoalType
    target_amount: float
    current_amount: float
    target_date: Optional[date] = None
    linked_account_id: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    progress_percentage: float = 0.0
    created_at: datetime
    updated_at: datetime

# Analytics Models
class SpendingByCategory(BaseModel):
    category: str
    amount: float
    percentage: float

class DashboardStats(BaseModel):
    total_balance: float
    total_income: float
    total_expenses: float
    monthly_bills: float
    net_worth: float
    spending_by_category: List[SpendingByCategory]
    recent_transactions: List[Transaction]


# Session Models (for Google OAuth)
class Session(BaseModel):
    id: str
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class ProcessSessionRequest(BaseModel):
    session_id: str

class SessionResponse(BaseModel):
    session_token: str
    user: User


# Transaction Split Models
class TransactionSplitCreate(BaseModel):
    category: str
    amount: float
    notes: Optional[str] = None

class TransactionSplit(BaseModel):
    id: str
    transaction_id: str
    user_id: str
    category: str
    amount: float
    percentage: float
    notes: Optional[str] = None
    created_at: datetime

# Crypto Source Models (Exchange or Wallet)
class CryptoSourceType(str, Enum):
    EXCHANGE = "exchange"  # Coinbase, Binance, etc.
    WALLET = "wallet"      # Blockchain wallet address

# CryptoExchange is now a string field to support any exchange

class CryptoChain(str, Enum):
    BITCOIN = "bitcoin"
    ETHEREUM = "ethereum"
    POLYGON = "polygon"
    BINANCE_SMART_CHAIN = "bsc"
    SOLANA = "solana"

class CryptoSourceCreate(BaseModel):
    source_type: CryptoSourceType
    # For exchange connections
    exchange: Optional[str] = None  # Any exchange name (e.g., "Coinbase", "Binance", "Kraken", etc.)
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    # For wallet monitoring
    chain: Optional[CryptoChain] = None
    wallet_address: Optional[str] = None
    wallet_label: Optional[str] = None  # User-friendly name

class CryptoSource(BaseModel):
    id: str
    user_id: str
    source_type: CryptoSourceType
    # Exchange fields
    exchange: Optional[str] = None  # Any exchange name
    api_key_encrypted: Optional[str] = None  # Never expose actual key
    # Wallet fields
    chain: Optional[CryptoChain] = None
    wallet_address: Optional[str] = None
    wallet_label: Optional[str] = None
    # Metadata
    is_active: bool = True
    last_synced: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class CryptoHolding(BaseModel):
    id: str
    user_id: str
    source_id: str  # Links to CryptoSource
    symbol: str  # BTC, ETH, etc.
    name: str    # Bitcoin, Ethereum
    amount: float
    current_price_usd: Optional[float] = None
    current_value_usd: Optional[float] = None
    last_updated: datetime

class CryptoValueHistory(BaseModel):
    id: str
    user_id: str
    holding_id: str
    timestamp: datetime
    amount: float
    price_usd: float
    value_usd: float

class CryptoPriceResponse(BaseModel):
    symbol: str
    name: str
    current_price_usd: float

# Legacy models for backwards compatibility with old manual crypto entries
class CryptoHoldingCreate(BaseModel):
    symbol: str
    name: str
    amount: float
    purchase_price_usd: Optional[float] = None
    notes: Optional[str] = None

class CryptoHoldingUpdate(BaseModel):
    amount: Optional[float] = None
    purchase_price_usd: Optional[float] = None
    notes: Optional[str] = None
    price_change_24h: float
    market_cap: float


# Net Worth Snapshot Models
class NetWorthSnapshot(BaseModel):
    id: str
    user_id: str
    total_assets: float
    total_liabilities: float
    net_worth: float
    snapshot_date: datetime
    accounts_breakdown: Optional[dict] = None  # {account_id: balance}

# Recurring Transaction Models
class RecurringTransaction(BaseModel):
    id: str
    user_id: str
    merchant_name: str
    category: str
    average_amount: float
    frequency: str  # "monthly", "weekly", "yearly", "quarterly"
    last_transaction_date: datetime
    next_expected_date: Optional[datetime] = None
    transaction_count: int
    is_subscription: bool
    status: str = "active"  # "active", "cancelled", "paused"
    created_at: datetime
    updated_at: datetime

# Transaction Rule Models
class TransactionRuleCreate(BaseModel):
    name: str
    conditions: dict  # {"merchant_contains": "starbucks", "amount_greater": 5.0}
    actions: dict  # {"set_category": "Coffee", "add_tags": ["coffee"]}
    priority: int = 0
    is_active: bool = True

class TransactionRule(BaseModel):
    id: str
    user_id: str
    name: str
    conditions: dict
    actions: dict
    priority: int
    is_active: bool
    times_applied: int = 0
    created_at: datetime
    updated_at: datetime

# Transaction Tag Models
class TransactionTag(BaseModel):
    id: str
    user_id: str
    name: str
    color: str
    created_at: datetime

class TransactionTagAssignment(BaseModel):
    transaction_id: str
    tag_id: str
    user_id: str
    created_at: datetime

# Merchant Management Models
class MerchantRule(BaseModel):
    id: str
    user_id: str
    original_name: str
    cleaned_name: str
    auto_category: Optional[str] = None
    created_at: datetime

# Account Group Models
class AccountGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    account_ids: List[str] = []

class AccountGroup(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    color: str
    account_ids: List[str]
    created_at: datetime
    updated_at: datetime

# Alert/Notification Models
class UserAlert(BaseModel):
    id: str
    user_id: str
    alert_type: str  # "low_balance", "large_transaction", "unusual_spending", "bill_due"
    title: str
    message: str
    severity: str  # "info", "warning", "critical"
    is_read: bool = False
    related_transaction_id: Optional[str] = None
    related_account_id: Optional[str] = None
    created_at: datetime

class AlertSettings(BaseModel):
    user_id: str
    low_balance_threshold: float = 100.0
    large_transaction_threshold: float = 500.0
    unusual_spending_enabled: bool = True
    bill_reminder_days: int = 3
    email_notifications: bool = True
    updated_at: datetime

# Investment Performance Models
class InvestmentPerformance(BaseModel):
    user_id: str
    account_id: str
    total_value: float
    total_cost_basis: float
    total_gain_loss: float
    total_gain_loss_percentage: float
    day_change: float
    day_change_percentage: float
    calculated_at: datetime


# Investment Snapshot Models
class InvestmentSnapshot(BaseModel):
    id: str
    user_id: str
    snapshot_date: date
    total_value: float
    total_investment_value: float
    total_savings_value: float
    total_crypto_value: float
    accounts_count: int
    created_at: datetime

class InvestmentSnapshotCreate(BaseModel):
    snapshot_date: date
    total_value: float
    total_investment_value: float
    total_savings_value: float
    total_crypto_value: float
    accounts_count: int

# Investment Holdings Models (for manual entry)
class InvestmentHolding(BaseModel):
    id: str
    user_id: str
    account_id: str
    ticker: str
    name: str
    shares: float
    cost_basis_per_share: float
    total_cost_basis: float
    asset_class: str  # stocks, bonds, cash, real_estate, crypto, other
    created_at: datetime
    updated_at: datetime

class InvestmentHoldingCreate(BaseModel):
    account_id: str
    ticker: str
    name: str
    shares: float
    cost_basis_per_share: float
    asset_class: str = "stocks"

class InvestmentHoldingUpdate(BaseModel):
    shares: Optional[float] = None
    cost_basis_per_share: Optional[float] = None
    asset_class: Optional[str] = None

