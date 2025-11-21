import plaid
from plaid.api import plaid_api
from typing import Optional
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
import os
from dotenv import load_dotenv

load_dotenv()

def get_plaid_client():
    """Get Plaid client with fresh configuration"""
    configuration = plaid.Configuration(
        host=plaid.Environment.Production,
        api_key={
            'clientId': os.getenv('PLAID_CLIENT_ID'),
            'secret': os.getenv('PLAID_SECRET'),
        }
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)

class PlaidService:
    @staticmethod
    async def create_link_token(user_id: str) -> dict:
        """Create a Plaid Link token for user authentication"""
        try:
            backend_url = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
            plaid_client = get_plaid_client()
            
            request = LinkTokenCreateRequest(
                user=LinkTokenCreateRequestUser(client_user_id=user_id),
                client_name="FinanceHub",
                products=[Products("transactions")],
                country_codes=[CountryCode("US")],
                language="en",
                webhook=f"{backend_url}/api/webhook/plaid"
            )
            response = plaid_client.link_token_create(request)
            return {
                "link_token": response.link_token,
                "expiration": response.expiration
            }
        except plaid.ApiException as e:
            error_msg = f"Plaid API error: {e.status} - {e.body if hasattr(e, 'body') else str(e)}"
            print(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            print(error_msg)
            raise Exception(error_msg)

    @staticmethod
    async def exchange_public_token(public_token: str) -> dict:
        """Exchange public token for access token"""
        try:
            plaid_client = get_plaid_client()
            request = ItemPublicTokenExchangeRequest(public_token=public_token)
            response = plaid_client.item_public_token_exchange(request)
            return {
                "access_token": response.access_token,
                "item_id": response.item_id
            }
        except plaid.ApiException as e:
            raise Exception(f"Token exchange error: {e}")

    @staticmethod
    async def get_accounts(access_token: str) -> list:
        """Get accounts from Plaid"""
        try:
            plaid_client = get_plaid_client()
            request = AccountsGetRequest(access_token=access_token)
            response = plaid_client.accounts_get(request)
            return response.accounts
        except plaid.ApiException as e:
            raise Exception(f"Get accounts error: {e}")

    @staticmethod
    async def get_institution_name(access_token: str) -> str:
        """Get institution name from item"""
        try:
            plaid_client = get_plaid_client()
            item_request = ItemGetRequest(access_token=access_token)
            item_response = plaid_client.item_get(item_request)
            institution_id = item_response.item.institution_id
            
            inst_request = InstitutionsGetByIdRequest(
                institution_id=institution_id,
                country_codes=[CountryCode("US")]
            )
            inst_response = plaid_client.institutions_get_by_id(inst_request)
            return inst_response.institution.name
        except plaid.ApiException as e:
            return "Unknown Institution"

    @staticmethod
    async def sync_transactions(access_token: str, cursor: Optional[str] = None) -> dict:
        """Sync transactions from Plaid"""
        try:
            added = []
            modified = []
            removed = []
            has_more = True
            next_cursor = cursor
            
            while has_more:
                request = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor=next_cursor
                )
                response = plaid_client.transactions_sync(request)
                
                added.extend(response.added)
                modified.extend(response.modified)
                removed.extend([t.transaction_id for t in response.removed])
                
                has_more = response.has_more
                next_cursor = response.next_cursor
            
            return {
                "added": added,
                "modified": modified,
                "removed": removed,
                "cursor": next_cursor
            }
        except plaid.ApiException as e:
            raise Exception(f"Transaction sync error: {e}")
