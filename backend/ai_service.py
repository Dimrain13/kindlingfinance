from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv
import json
from typing import List, Dict

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
    
    async def batch_categorize_transactions(self, transactions: List[Dict]) -> Dict[str, str]:
        """Categorize transactions using AI"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="transaction-categorization",
                system_message="""You are a financial transaction categorizer. Analyze transaction descriptions and assign appropriate categories.

Categories to use:
- Food & Dining (restaurants, groceries, coffee shops)
- Transportation (gas, uber, parking, public transit)
- Shopping (retail, online purchases, clothing)
- Entertainment (movies, streaming, games, events)
- Bills & Utilities (phone, internet, electricity, water)
- Healthcare (medical, pharmacy, insurance)
- Travel (hotels, flights, car rental)
- Education (tuition, books, courses)
- Personal Care (salon, gym, beauty)
- Home & Garden (furniture, repairs, supplies)
- Financial (bank fees, investments, loans)
- Other (anything that doesn't fit above)

Return JSON object with transaction index as key and category as value:
{"0": "Food & Dining", "1": "Transportation", ...}"""
            ).with_model("openai", "gpt-4o-mini")
            
            # Prepare transaction descriptions
            descriptions = []
            for i, txn in enumerate(transactions):
                desc = txn.get('merchant_name') or txn.get('description', 'Unknown')
                amount = abs(txn.get('amount', 0))
                descriptions.append(f"{i}: {desc} (${amount:.2f})")
            
            context = "Categorize these transactions:\n" + "\n".join(descriptions)
            
            message = UserMessage(text=context)
            response = await chat.send_message(message)
            
            # Parse JSON response
            try:
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    response = response.split("```")[1].split("```")[0].strip()
                
                categories = json.loads(response)
                return categories
            except Exception as parse_err:
                print(f"Failed to parse categorization JSON: {parse_err}")
                return {}
        except Exception as e:
            print(f"AI categorization error: {e}")
            return {}
    
    async def generate_insights(self, transactions: List[Dict], total_income: float, total_expenses: float) -> List[Dict]:
        """Generate AI-powered financial insights by analyzing actual transaction patterns"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="financial-insights",
                system_message="""You are an expert financial analyst. Your job is to analyze real transaction data and find genuine money-saving opportunities.

ANALYZE THE RAW DATA TO FIND:
1. **Recurring Patterns**: Same merchants appearing multiple times (subscriptions, memberships)
2. **Price Changes**: Same merchant with different amounts over time (price increases)
3. **Overspending Categories**: Categories with high spending that could be optimized
4. **Duplicate Services**: Multiple similar services (streaming, insurance, etc.)
5. **Fee Patterns**: Bank fees, ATM fees, late fees that could be avoided
6. **Seasonal Patterns**: Unusual spikes in certain categories

THINK LIKE A FINANCIAL ADVISOR:
- Look for actual merchant names and amounts in the data
- Calculate realistic savings based on what you see
- Suggest specific alternatives only when you see relevant spending
- Don't make assumptions - base everything on the actual transactions provided

OUTPUT FORMAT (JSON array, 3-5 insights max):
[
  {
    "title": "Specific actionable title (max 8 words)",
    "description": "What you found in their data + specific action (max 40 words)",
    "monthly_savings": 25.00,
    "priority": 4,
    "type": "subscription|overspending|fees|optimization",
    "affiliate_link": null,
    "affiliate_text": null
  }
]

CRITICAL RULES:
- Base insights ONLY on patterns you actually see in the transaction data
- Be specific about merchant names and amounts you observe
- Calculate realistic monthly savings estimates
- Priority: 5=highest savings, 1=lowest
- If no significant patterns found, return empty array []
- Return valid JSON only"""
            ).with_model("openai", "gpt-4o-mini")
            
            # Prepare raw transaction data for AI analysis
            expense_txns = [t for t in transactions if t.get('transaction_type') == 'expense']
            sorted_txns = sorted(expense_txns, key=lambda x: x.get('date', ''), reverse=True)
            
            # Build comprehensive transaction list for pattern detection
            context = f"# TRANSACTION DATA FOR ANALYSIS\n\n"
            context += f"**Financial Summary:**\n"
            context += f"- Total Expenses: ${total_expenses:.2f}\n"
            context += f"- Total Income: ${total_income:.2f}\n"
            context += f"- Net: ${total_income - total_expenses:.2f}\n"
            context += f"- Transaction Count: {len(sorted_txns)}\n\n"
            
            context += "**COMPLETE TRANSACTION HISTORY (Most Recent First):**\n"
            for i, txn in enumerate(sorted_txns[:200]):  # Analyze up to 200 transactions
                merchant = txn.get('merchant_name') or txn.get('description', 'Unknown')
                amount = abs(txn.get('amount', 0))
                date = txn.get('date', '')[:10] if txn.get('date') else 'No Date'
                category = txn.get('category', 'Other')
                
                context += f"{i+1}. {date} | {merchant} | ${amount:.2f} | {category}\n"
            
            # Add category summary for context
            spending_by_category = {}
            for txn in sorted_txns:
                category = txn.get('category', 'Other')
                amount = abs(txn.get('amount', 0))
                spending_by_category[category] = spending_by_category.get(category, 0) + amount
            
            context += f"\n**SPENDING BY CATEGORY:**\n"
            for category, amount in sorted(spending_by_category.items(), key=lambda x: x[1], reverse=True):
                percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
                context += f"- {category}: ${amount:.2f} ({percentage:.1f}%)\n"
            
            context += f"\n**YOUR ANALYSIS TASK:**\n"
            context += f"Study this transaction data carefully. Look for patterns, recurring charges, "
            context += f"price changes, and spending habits that present real savings opportunities. "
            context += f"Base your insights only on what you actually observe in this data."
            
            message = UserMessage(text=context)
            response = await chat.send_message(message)
            
            # Parse and validate JSON response
            try:
                # Extract JSON from response
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    json_str = response.split("```")[1].split("```")[0].strip()
                else:
                    json_str = response.strip()
                
                insights = json.loads(json_str)
                
                # Validate insights structure
                if isinstance(insights, list):
                    validated_insights = []
                    for insight in insights:
                        if isinstance(insight, dict) and insight.get('title') and insight.get('description'):
                            validated_insights.append({
                                'title': str(insight.get('title', 'Financial Tip'))[:60],
                                'description': str(insight.get('description', ''))[:250],
                                'monthly_savings': float(insight.get('monthly_savings', 0)),
                                'priority': max(1, min(5, int(insight.get('priority', 3)))),
                                'type': insight.get('type', 'recommendation'),
                                'affiliate_link': insight.get('affiliate_link'),
                                'affiliate_text': insight.get('affiliate_text')
                            })
                    
                    return validated_insights[:5]  # Max 5 insights
                
                return []
                
            except json.JSONDecodeError as parse_err:
                print(f"Failed to parse insights JSON: {parse_err}")
                print(f"Raw AI response: {response[:300]}")
                return []
                
        except Exception as e:
            print(f"AI insights generation error: {e}")
            return []
    
    async def suggest_savings(self, transactions: List[Dict], budgets: List[Dict]) -> List[str]:
        """Generate savings suggestions using AI based on actual spending patterns"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="savings-suggestions",
                system_message="You are a financial optimizer. Analyze actual spending patterns and suggest 3-5 specific ways to save money. Be practical and actionable based on the real data provided. Return each suggestion as a separate line."
            ).with_model("openai", "gpt-4o-mini")
            
            # Create context from actual transactions
            expense_txns = [t for t in transactions if t.get('transaction_type') == 'expense']
            recent_txns = sorted(expense_txns, key=lambda x: x.get('date', ''), reverse=True)[:50]
            
            context = "Recent Spending Patterns:\n"
            for txn in recent_txns:
                merchant = txn.get('merchant_name') or txn.get('description', 'Unknown')
                amount = abs(txn.get('amount', 0))
                category = txn.get('category', 'Other')
                context += f"- {merchant}: ${amount:.2f} ({category})\n"
            
            # Add budget context if available
            if budgets:
                context += "\nBudget Information:\n"
                for budget in budgets:
                    context += f"- {budget.get('category', 'Unknown')}: ${budget.get('amount', 0):.2f} budgeted\n"
            
            message = UserMessage(text=context)
            response = await chat.send_message(message)
            
            suggestions = [s.strip() for s in response.split('\n') if s.strip() and not s.strip().startswith('#')]
            return suggestions[:5]
        except Exception as e:
            print(f"AI savings suggestions error: {e}")
            return []

ai_service = AIService()
