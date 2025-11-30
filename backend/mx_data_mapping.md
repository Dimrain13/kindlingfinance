# MX vs Plaid Data Mapping

## Account Data Structure Issues

### Current MX Sync Output (WRONG):
```python
{
    "id": mx_account.get("guid"),
    "user_id": user_id,
    "mx_account_guid": mx_account.get("guid"),
    "mx_member_guid": mx_account.get("member_guid"),
    "name": mx_account.get("name"),
    "official_name": mx_account.get("institution_name"),
    "type": mx_account.get("type", "").lower(),           # WRONG FIELD NAME
    "subtype": mx_account.get("subtype", "").lower(),
    "mask": mx_account.get("account_number", "")[-4:],
    "balance": {                                           # WRONG FORMAT
        "current": mx_account.get("balance"),
        "available": mx_account.get("available_balance"),
        "limit": mx_account.get("credit_limit")
    },
    "currency_code": mx_account.get("currency_code", "USD"), # WRONG FIELD NAME
    "institution_id": mx_account.get("institution_code"),
    "last_synced": datetime.utcnow().isoformat()
}
```

### Expected Format (What App Uses):
```python
{
    "id": str(uuid.uuid4()),
    "user_id": user_id,
    "name": account_name,
    "account_type": "checking|savings|credit_card|loan|mortgage|investment",  # REQUIRED
    "balance": 1234.56,                                    # MUST BE FLOAT, NOT DICT
    "institution_name": "Bank Name",                       # REQUIRED
    "currency": "USD",                                     # NOT currency_code
    "mask": "1234",                                        # Last 4 digits
    "mx_account_guid": "ACT-xxx",                         # MX reference
    "mx_member_guid": "MBR-xxx",                          # MX reference
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}
```

### Key Fixes Needed:
1. ✗ `type` → `account_type` (field name)
2. ✗ `balance` must be flat float, not nested dict
3. ✗ `currency_code` → `currency`
4. ✗ `official_name` → `institution_name` (or map correctly)
5. ✗ Need account type mapping (checking, savings, etc.)
6. ✗ Need to handle liability sign (negative for debts)

## Transaction Data Structure Issues

### Current MX Sync Output (WRONG):
```python
{
    "id": mx_txn.get("guid"),
    "user_id": user_id,
    "mx_transaction_guid": mx_txn.get("guid"),
    "mx_account_guid": mx_txn.get("account_guid"),        # WRONG FIELD
    "amount": mx_txn.get("amount"),
    "date": mx_txn.get("transacted_at"),
    "name": mx_txn.get("description"),                    # WRONG FIELD
    "merchant_name": mx_txn.get("merchant_name"),
    "category": mx_txn.get("category"),
    "pending": mx_txn.get("is_pending", False),
    "currency_code": mx_txn.get("currency_code", "USD"),
    "last_synced": datetime.utcnow().isoformat()
}
```

### Expected Format (What App Uses):
```python
{
    "id": str(uuid.uuid4()),
    "user_id": user_id,
    "account_id": "local_account_id",                     # NOT mx_account_guid
    "amount": 123.45,
    "description": "Transaction description",              # NOT name
    "transaction_type": "expense|income",                  # REQUIRED - MISSING
    "category": "Food & Dining",
    "date": "2025-11-28",                                 # String format
    "merchant_name": "Merchant",
    "is_recurring": False,                                # MISSING
    "pending": False,
    "ai_categorized": False,                              # MISSING
    "mx_transaction_guid": "TRN-xxx",                     # MX reference
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}
```

### Key Fixes Needed:
1. ✗ `name` → `description` (field name)
2. ✗ `mx_account_guid` → must map to local `account_id`
3. ✗ Missing `transaction_type` (expense vs income)
4. ✗ Missing `is_recurring` field
5. ✗ Missing `ai_categorized` field
6. ✗ Need proper date format handling
7. ✗ Amount sign convention (MX vs Plaid differs)

## MX Account Type Mapping

MX provides different account type values than Plaid. Need mapping:

```python
MX_ACCOUNT_TYPE_MAPPING = {
    "CHECKING": "checking",
    "SAVINGS": "savings",
    "CREDIT_CARD": "credit_card",
    "LOAN": "loan",
    "MORTGAGE": "mortgage",
    "INVESTMENT": "investment",
    "LINE_OF_CREDIT": "credit_card",
    "MONEY_MARKET": "savings",
    "CERTIFICATE_OF_DEPOSIT": "savings",
    "CASH_MANAGEMENT": "checking",
    "PREPAID": "checking",
}
```

## Liability Handling

Accounts that are liabilities should have negative balances:
- credit_card
- loan
- mortgage

## Next Steps

1. Update `/app/backend/routes/mx_routes.py` - Fix account sync data mapping
2. Update `/app/backend/routes/mx_routes.py` - Fix transaction sync data mapping
3. Add MX account type mapping logic
4. Add transaction type detection (expense vs income)
5. Add account_id resolution (MX guid → local account id)
6. Test sync with real MX data
7. Verify all pages display correctly
