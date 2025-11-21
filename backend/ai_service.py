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
                categories = json.loads(response)
                return categories
            except:
                print("Failed to parse batch categorization response")
                return {}
                
        except Exception as e:
            print(f"Batch categorization error: {e}")
            return {}
    
    async def generate_insights(self, transactions: List[Dict], total_income: float, total_expenses: float) -> List[Dict]:
        """Generate AI-powered financial insights"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="financial-insights",
                system_message="You are a financial advisor. Analyze spending patterns and provide 3-5 actionable insights. Return ONLY a JSON array of insights with 'title', 'description', 'priority' (1-5), and 'type' (savings/pattern/recommendation). Be specific and helpful."
            ).with_model("openai", "gpt-4o-mini")
            
            # Prepare transaction summary
            spending_by_category = {}
            for txn in transactions:
                if txn.get('transaction_type') == 'expense':
                    category = txn.get('category', 'Other')
                    spending_by_category[category] = spending_by_category.get(category, 0) + abs(txn['amount'])
            
            summary = f"Monthly Summary:\n"
            summary += f"Total Income: ${total_income:.2f}\n"
            summary += f"Total Expenses: ${total_expenses:.2f}\n"
            summary += f"Net: ${total_income - total_expenses:.2f}\n\n"
            summary += "Spending by Category:\n"
            for category, amount in sorted(spending_by_category.items(), key=lambda x: x[1], reverse=True):
                summary += f"- {category}: ${amount:.2f}\n"
            
            message = UserMessage(text=summary)
            response = await chat.send_message(message)
            
            # Parse JSON response
            try:
                insights = json.loads(response)
                return insights
            except:
                # If not JSON, create a single insight
                return [{
                    "title": "Financial Analysis",
                    "description": response,
                    "priority": 3,
                    "type": "recommendation"
                }]
        except Exception as e:
            print(f"AI insights error: {e}")
            return []
    
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
