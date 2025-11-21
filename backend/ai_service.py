from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
import json
from typing import List, Dict

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
    
    async def categorize_transaction(self, description: str, amount: float, merchant: str = None) -> str:
        """Use AI to categorize a transaction"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="transaction-categorization",
                system_message="You are a financial assistant that categorizes transactions. Return ONLY the category name, nothing else. Common categories: Groceries, Dining, Transportation, Utilities, Entertainment, Healthcare, Shopping, Bills, Income, Transfer, Other."
            ).with_model("openai", "gpt-4o-mini")
            
            message = UserMessage(
                text=f"Categorize this transaction: '{description}' for ${amount}" + (f" at {merchant}" if merchant else "")
            )
            
            response = await chat.send_message(message)
            category = response.strip()
            return category
        except Exception as e:
            print(f"AI categorization error: {e}")
            return "Other"
    
    async def batch_categorize_transactions(self, transactions: List[Dict]) -> Dict[str, str]:
        """Batch categorize multiple transactions at once"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="batch-categorization",
                system_message="You are a financial assistant. Categorize each transaction with a category name. Use these categories:\n\nINCOME: Income, Salary, Paycheck, Wages, Bonus, Refund, Interest, Dividend\n\nEXPENSES: Groceries, Dining, Transportation, Gas, Utilities, Entertainment, Healthcare, Shopping, Bills, Mortgage, Rent, Insurance, Subscriptions, Travel, Gifts, Clothing, Electronics, Home, Fitness, Education, Personal Care, Pet Care, Charity, Other\n\nTRANSFERS: Transfer, Credit Card Payment, Loan Payment, Savings\n\nReturn as JSON object with transaction index as key and category as value. ONLY return the JSON, nothing else."
            ).with_model("openai", "gpt-4o-mini")
            
            # Build transaction list
            txn_list = ""
            for i, txn in enumerate(transactions[:50]):  # Limit to 50 at a time
                desc = txn.get('description', 'Unknown')
                amount = abs(txn.get('amount', 0))
                merchant = txn.get('merchant_name', '')
                txn_list += f"{i}: {desc} - ${amount:.2f}" + (f" at {merchant}" if merchant else "") + "\n"
            
            message = UserMessage(text=f"Categorize these transactions:\n{txn_list}")
            response = await chat.send_message(message)
            
            # Parse JSON response
            import json
            try:
                # Try to extract JSON from markdown code blocks if present
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    response = response.split("```")[1].split("```")[0].strip()
                
                categories = json.loads(response)
                return categories
            except Exception as e:
                print(f"Failed to parse batch categorization response: {e}")
                print(f"Response was: {response[:200]}")
                return {}
                
        except Exception as e:
            print(f"Batch categorization error: {e}")
            return {}
    
    async def generate_insights(self, transactions: List[Dict], total_income: float, total_expenses: float) -> List[Dict]:
        """Generate AI-powered financial insights focused on savings opportunities"""
        try:
            # Detect recurring transactions (subscriptions)
            recurring = self._detect_recurring_transactions(transactions)
            
            # Detect price increases compared to prior year
            price_increases = self._detect_price_increases(transactions)
            
            # Detect cellular providers
            cellular_info = self._detect_cellular_provider(transactions)
            
            # Prepare detailed context for AI
            chat = LlmChat(
                api_key=self.api_key,
                session_id="financial-insights",
                system_message="""You are a money-saving expert focused on ACTIONABLE monthly savings.

ANALYZE for:
1. Recurring subscriptions (streaming, software, memberships) - suggest cheaper alternatives or cancellations
2. Price increases - flag any service that increased >10% from prior year
3. Internet service - if price increased, suggest negotiating or switching providers
4. Cellular service - specifically suggest Mint Mobile for T-Mobile users (competitive pricing)
5. Overspending categories - suggest specific Amazon products or services that save money

FORMAT: Return JSON array with:
{
  "title": "Short, action-oriented title (max 8 words)",
  "description": "ONE sentence insight + ONE sentence action (max 30 words total)",
  "monthly_savings": 25.50,
  "priority": 5,
  "type": "subscription|price_increase|alternative_service",
  "affiliate_link": "https://amazon.com/... or service URL",
  "affiliate_text": "Switch to X" or "Buy on Amazon"
}

Be CONCISE. Focus on MONEY SAVED per month. Include affiliate opportunities."""
            ).with_model("openai", "gpt-4o-mini")
            
            # Build analysis context
            spending_by_category = {}
            for txn in transactions:
                if txn.get('transaction_type') == 'expense':
                    category = txn.get('category', 'Other')
                    spending_by_category[category] = spending_by_category.get(category, 0) + abs(txn['amount'])
            
            context = f"MONTHLY ANALYSIS:\n"
            context += f"Income: ${total_income:.2f} | Expenses: ${total_expenses:.2f} | Net: ${(total_income - total_expenses):.2f}\n\n"
            
            if recurring:
                context += f"SUBSCRIPTIONS DETECTED ({len(recurring)}):\n"
                for sub in recurring[:10]:
                    context += f"- {sub['merchant']}: ${sub['avg_amount']:.2f}/mo\n"
                context += "\n"
            
            if price_increases:
                context += f"PRICE INCREASES DETECTED:\n"
                for inc in price_increases[:5]:
                    context += f"- {inc['merchant']}: ${inc['old_amount']:.2f} → ${inc['new_amount']:.2f} (+{inc['percent_change']:.1f}%)\n"
                context += "\n"
            
            if cellular_info:
                context += f"CELLULAR: {cellular_info['provider']} (${cellular_info['amount']:.2f}/mo)\n\n"
            
            context += "TOP SPENDING:\n"
            for category, amount in sorted(spending_by_category.items(), key=lambda x: x[1], reverse=True)[:5]:
                context += f"- {category}: ${amount:.2f}\n"
            
            message = UserMessage(text=context)
            response = await chat.send_message(message)
            
            # Parse JSON response
            try:
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    response = response.split("```")[1].split("```")[0].strip()
                
                insights = json.loads(response)
                return insights
            except:
                return [{
                    "title": "Review Your Subscriptions",
                    "description": "Check for unused subscriptions to save money.",
                    "monthly_savings": 0,
                    "priority": 3,
                    "type": "recommendation",
                    "affiliate_link": None,
                    "affiliate_text": None
                }]
        except Exception as e:
            print(f"AI insights error: {e}")
            return []
    
    def _detect_recurring_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """Detect recurring transactions (subscriptions)"""
        merchant_counts = {}
        merchant_amounts = {}
        
        for txn in transactions:
            if txn.get('transaction_type') != 'expense':
                continue
            
            merchant = txn.get('merchant_name') or txn.get('description', '')
            merchant = merchant.lower().strip()
            
            if not merchant or len(merchant) < 3:
                continue
            
            # Common subscription keywords
            subscription_keywords = ['netflix', 'spotify', 'hulu', 'apple', 'amazon prime', 
                                   'disney', 'gym', 'fitness', 'youtube', 'adobe', 'microsoft',
                                   'dropbox', 'icloud', 'membership', 'subscription']
            
            is_subscription = any(kw in merchant for kw in subscription_keywords)
            
            if merchant not in merchant_counts:
                merchant_counts[merchant] = 0
                merchant_amounts[merchant] = []
            
            merchant_counts[merchant] += 1
            merchant_amounts[merchant].append(abs(txn.get('amount', 0)))
        
        # Find merchants with 2+ transactions or subscription keywords
        recurring = []
        for merchant, count in merchant_counts.items():
            is_sub_keyword = any(kw in merchant for kw in subscription_keywords)
            if count >= 2 or is_sub_keyword:
                avg_amount = sum(merchant_amounts[merchant]) / len(merchant_amounts[merchant])
                recurring.append({
                    'merchant': merchant,
                    'count': count,
                    'avg_amount': avg_amount
                })
        
        return sorted(recurring, key=lambda x: x['avg_amount'], reverse=True)
    
    def _detect_price_increases(self, transactions: List[Dict]) -> List[Dict]:
        """Detect price increases by comparing recent to older transactions"""
        from datetime import datetime, timedelta
        
        now = datetime.utcnow()
        one_month_ago = now - timedelta(days=30)
        six_months_ago = now - timedelta(days=180)
        
        recent_transactions = {}
        older_transactions = {}
        
        for txn in transactions:
            if txn.get('transaction_type') != 'expense':
                continue
            
            merchant = txn.get('merchant_name') or txn.get('description', '')
            merchant = merchant.lower().strip()
            amount = abs(txn.get('amount', 0))
            
            # Try to parse date
            try:
                txn_date_str = txn.get('date')
                if isinstance(txn_date_str, str):
                    txn_date = datetime.fromisoformat(txn_date_str.replace('Z', '+00:00'))
                else:
                    continue
            except:
                continue
            
            if txn_date >= one_month_ago:
                if merchant not in recent_transactions:
                    recent_transactions[merchant] = []
                recent_transactions[merchant].append(amount)
            elif txn_date <= six_months_ago:
                if merchant not in older_transactions:
                    older_transactions[merchant] = []
                older_transactions[merchant].append(amount)
        
        increases = []
        for merchant in recent_transactions:
            if merchant in older_transactions:
                recent_avg = sum(recent_transactions[merchant]) / len(recent_transactions[merchant])
                older_avg = sum(older_transactions[merchant]) / len(older_transactions[merchant])
                
                if recent_avg > older_avg:
                    percent_change = ((recent_avg - older_avg) / older_avg) * 100
                    if percent_change > 10:  # At least 10% increase
                        increases.append({
                            'merchant': merchant,
                            'old_amount': older_avg,
                            'new_amount': recent_avg,
                            'percent_change': percent_change
                        })
        
        return sorted(increases, key=lambda x: x['percent_change'], reverse=True)
    
    def _detect_cellular_provider(self, transactions: List[Dict]) -> Dict:
        """Detect cellular provider from transactions"""
        cellular_providers = ['t-mobile', 'tmobile', 'verizon', 'at&t', 'att', 'sprint', 'boost', 'cricket']
        
        for txn in transactions:
            merchant = (txn.get('merchant_name') or txn.get('description', '')).lower()
            for provider in cellular_providers:
                if provider in merchant:
                    return {
                        'provider': merchant,
                        'amount': abs(txn.get('amount', 0))
                    }
        
        return None
    
    async def suggest_savings(self, transactions: List[Dict], budgets: List[Dict]) -> List[str]:
        """Generate savings suggestions using AI"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="savings-suggestions",
                system_message="You are a financial optimizer. Analyze spending and suggest 3-5 specific ways to save money or optimize spending. Be practical and actionable. Return each suggestion as a separate line."
            ).with_model("openai", "gpt-4o-mini")
            
            # Create context
            context = "Recent Transactions:\n"
            for txn in transactions[:20]:  # Last 20 transactions
                if txn.get('transaction_type') == 'expense':
                    context += f"- {txn['description']}: ${abs(txn['amount']):.2f} ({txn.get('category', 'Other')})\n"
            
            message = UserMessage(text=context)
            response = await chat.send_message(message)
            
            suggestions = [s.strip() for s in response.split('\n') if s.strip() and not s.strip().startswith('#')]
            return suggestions[:5]
        except Exception as e:
            print(f"AI savings suggestions error: {e}")
            return []

ai_service = AIService()
