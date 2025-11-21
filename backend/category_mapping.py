"""
Category to transaction type mapping
"""

# Categories that are income
INCOME_CATEGORIES = {
    'Income',
    'Salary',
    'Paycheck',
    'Wages',
    'Bonus',
    'Refund',
    'Reimbursement',
    'Interest',
    'Dividend',
    'Investment Income',
    'Rental Income',
    'Business Income',
    'Freelance',
    'Commission',
    'Gift Received',
    'Tax Refund',
    'Cash Back',
    'Rewards',
}

# Categories that are transfers (not income or expense)
TRANSFER_CATEGORIES = {
    'Transfer',
    'Credit Card Payment',
    'Loan Payment',
    'Savings',
    'Investment',
}

# All other categories are expenses by default
EXPENSE_CATEGORIES = {
    'Groceries',
    'Dining',
    'Transportation',
    'Gas',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Bills',
    'Mortgage',
    'Rent',
    'Insurance',
    'Subscriptions',
    'Travel',
    'Gifts',
    'Clothing',
    'Electronics',
    'Home',
    'Fitness',
    'Education',
    'Personal Care',
    'Pet Care',
    'Charity',
    'Other',
}

def get_transaction_type_from_category(category: str) -> str:
    """
    Determine transaction type based on category
    Returns: 'income', 'expense', or 'transfer'
    """
    if not category:
        return 'expense'
    
    category_clean = category.strip()
    
    # Check income categories
    if category_clean in INCOME_CATEGORIES:
        return 'income'
    
    # Check transfer categories
    if category_clean in TRANSFER_CATEGORIES:
        return 'transfer'
    
    # Default to expense
    return 'expense'

def get_default_category_from_amount(amount: float) -> str:
    """
    Get default category based on amount sign (legacy support)
    """
    if amount < 0:
        return 'Income'
    else:
        return 'Other'
