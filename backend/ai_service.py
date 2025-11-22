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
                system_message="""You are a money-saving expert who finds REAL savings opportunities in transaction data.

LOOK FOR THESE PATTERNS:

1. **Subscriptions You Forgot About**: Recurring charges user may not use (gym, streaming, software)
2. **Price Increases**: Same service costing more now vs 3-6 months ago (>10% increase)
3. **Duplicate Services**: Multiple streaming services, cloud storage, or insurance policies
4. **Expensive Daily Habits**: Coffee shops, food delivery, rideshares (suggest cheaper alternatives)
5. **Banking Fees**: Overdraft, ATM, monthly account fees (suggest fee-free banks)
6. **Internet/Cable Overpaying**: If bill >$70/mo, suggest negotiating or switching
7. **Cellular Plans**: T-Mobile/AT&T/Verizon >$60/mo → suggest Mint Mobile ($15-30/mo)
8. **Grocery Store Choice**: Whole Foods/premium stores → suggest Trader Joe's/Aldi (save 30-40%)
9. **Credit Card Interest**: If you see "interest charge" → suggest balance transfer card
10. **Name Brand Products**: Frequent purchases at premium stores → suggest Amazon Subscribe & Save
11. **Unused Gift Cards**: Starbucks cards being loaded but balance growing (not using efficiently)
12. **Insurance Shopping**: If auto/home insurance >6 months old, suggest re-shopping
13. **Energy Bills**: High utility bills → suggest smart thermostat or energy audit
14. **Meal Kit Services**: HelloFresh/BlueApron → suggest grocery shopping (40% savings)
15. **Extended Warranties**: Recent electronics warranty purchases → usually not worth it
16. **Loan/Mortgage Interest Rates**: Detect interest payments and compare to current market rates

SPECIFIC SERVICE ALTERNATIVES TO SUGGEST (with affiliate opportunities):

**CELLULAR (High Priority):**
- T-Mobile/AT&T/Verizon >$60/mo → Mint Mobile ($15-30/mo = $50-65/mo savings)
- Look for bills increasing year-over-year

**INTERNET/CABLE:**
- Comcast/Spectrum >$70/mo → Negotiate retention deals or T-Mobile 5G Home Internet ($50/mo)
- Compare bills from 12 months ago - flag >10% increases

**STREAMING (Consolidation):**
- Netflix+Hulu+Disney++HBO → Keep max 2, rotate seasonally ($20-40/mo savings)
- Spotify Premium → Family plan split with friends or Spotify Free

**SOFTWARE:**
- Adobe Creative Cloud $55/mo → Affinity Designer one-time $70 total (save $660/year)
- Microsoft 365 → Free Google Workspace or LibreOffice

**FOOD & GROCERIES:**
- DoorDash/UberEats 3+/week → Meal prep Sundays (save $100-150/mo)
- Whole Foods weekly → Trader Joe's or Aldi (save 30-40% = $80-150/mo)
- Starbucks daily ($6x20 days) → Home espresso machine (save $80-100/mo)
- HelloFresh/BlueApron → Grocery shopping with recipes (save 40% = $35-50/mo)

**BANKING:**
- Overdraft fees → Chime/Current/Ally (no-fee checking)
- ATM fees 5+/mo → Bank with fee reimbursement
- Monthly maintenance fees → Online banks (free)

**FITNESS:**
- Planet Fitness/LA Fitness $22-45/mo → YouTube fitness + running (free)
- Peloton subscription → Free workout apps

**SHOPPING HABITS:**
- Amazon one-time purchases → Subscribe & Save (save 15% + free shipping)
- Target/premium brands → Store brands/Amazon Basics (save 30-50%)
- Gas: Premium fuel for regular car → Use Regular (save $0.30/gal)

**INSURANCE (Annual review):**
- Auto/home insurance >12 months old → Re-shop with Progressive/Geico
- Suggest switching every 1-2 years for best rates

**ENERGY:**
- High electric bills → Smart thermostat (Nest/Ecobee) + LED bulbs
- Water heater inefficiency → Lower temp to 120°F

OUTPUT FORMAT (JSON array, exactly 4 UNIQUE insights):
[
  {
    "title": "Cut Coffee Shop Spending",
    "description": "Spending $127/mo at Starbucks. Buy a Keurig + good coffee pods for $40/mo, save $85/mo.",
    "monthly_savings": 85.00,
    "priority": 4,
    "type": "overspending",
    "affiliate_link": "https://amazon.com/keurig",
    "affiliate_text": "Shop Coffee Makers"
  }
]

AFFILIATE LINK STRATEGY:
- Amazon products: https://amazon.com/s?k=[product] (coffee makers, thermostats, LED bulbs)
- Mint Mobile: https://www.mintmobile.com
- Chime Banking: https://www.chime.com
- Trader Joe's: https://www.traderjoes.com
- For service switches: Use the company's main URL

CRITICAL RULES:
- Generate EXACTLY 4 UNIQUE insights (no duplicates!)
- Pick the 4 HIGHEST savings opportunities from different categories
- COMPARE to prior year when possible (look for same merchant 6-12 months ago)
- Be CONCISE (max 35 words per description)
- Use exact merchant names and amounts from transaction data
- Only suggest if you see the actual spending pattern in the data
- Calculate realistic monthly savings
- Priority: 5=huge savings (>$50/mo), 4=good ($30-50), 3=moderate ($15-30), 2=small (<$15)
- ALWAYS include affiliate_link when suggesting products/services
- affiliate_text should be action-oriented: "Switch to X", "Shop Y", "Get Z"
- Return valid JSON only"""
            ).with_model("openai", "gpt-4o-mini")
            
            # Prepare raw transaction data for AI analysis
            expense_txns = [t for t in transactions if t.get('transaction_type') == 'expense']
            sorted_txns = sorted(expense_txns, key=lambda x: x.get('date', ''), reverse=True)
            
            # Build comprehensive transaction list for pattern detection
            context = "# TRANSACTION DATA FOR ANALYSIS\n\n"
            context += "**Financial Summary:**\n"
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
            
            context += "\n**SPENDING BY CATEGORY:**\n"
            for category, amount in sorted(spending_by_category.items(), key=lambda x: x[1], reverse=True):
                percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
                context += f"- {category}: ${amount:.2f} ({percentage:.1f}%)\n"
            
            context += "\n**YOUR ANALYSIS TASK:**\n"
            context += "Study this transaction data carefully. Look for patterns, recurring charges, "
            context += "price changes, and spending habits that present real savings opportunities. "
            context += "Base your insights only on what you actually observe in this data."
            
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
