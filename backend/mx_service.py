"""
MX Platform Integration Service
Replaces Plaid with MX for financial data aggregation
"""
import os
import httpx
import base64
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class MXService:
    """Service for interacting with MX Platform API"""
    
    def __init__(self):
        self.api_key = os.getenv('MX_API_KEY')
        self.client_id = os.getenv('MX_CLIENT_ID')
        # MX uses different URLs for sandbox/development vs production
        # Sandbox: https://int-api.mx.com
        # Production: https://api.mx.com
        self.base_url = os.getenv('MX_API_URL', 'https://int-api.mx.com')
        
        # Create Basic Auth header
        auth_string = f"{self.client_id}:{self.api_key}"
        self.auth_header = base64.b64encode(auth_string.encode()).decode()
        
        self.headers = {
            "Authorization": f"Basic {self.auth_header}",
            "Accept": "application/vnd.mx.api.v1+json",
            "Content-Type": "application/json"
        }
    
    async def create_user(self, user_id: str, metadata: Optional[Dict] = None) -> Dict:
        """
        Create an MX user
        
        Args:
            user_id: Your internal user ID
            metadata: Optional metadata about the user
            
        Returns:
            Dict with user_guid and other user info
        """
        async with httpx.AsyncClient() as client:
            payload = {
                "user": {
                    "id": user_id,
                    "metadata": metadata or {}
                }
            }
            
            response = await client.post(
                f"{self.base_url}/users",
                headers=self.headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("user", {})
    
    async def get_or_create_user(self, user_id: str) -> str:
        """
        Get existing MX user or create new one
        
        Returns:
            user_guid: MX's unique identifier for the user
        """
        async with httpx.AsyncClient() as client:
            # Try to list users and find existing
            try:
                response = await client.get(
                    f"{self.base_url}/users",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                users = response.json().get("users", [])
                
                # Find user by our ID
                for user in users:
                    if user.get("id") == user_id:
                        return user.get("guid")
                
                # User not found, create new one
                new_user = await self.create_user(user_id)
                return new_user.get("guid")
                
            except Exception as e:
                # If error, try to create user
                new_user = await self.create_user(user_id)
                return new_user.get("guid")
    
    async def create_connect_widget_url(self, user_id: str, institution_code: Optional[str] = None) -> Dict:
        """
        Create a Connect Widget URL for user to link accounts
        
        Args:
            user_id: Your internal user ID
            institution_code: Optional specific institution to connect
            
        Returns:
            Dict with connect_widget_url
        """
        user_guid = await self.get_or_create_user(user_id)
        
        async with httpx.AsyncClient() as client:
            payload = {
                "widget_url": {
                    "widget_type": "connect_widget",
                    "is_mobile_webview": False
                }
            }
            
            if institution_code:
                payload["widget_url"]["institution_code"] = institution_code
            
            response = await client.post(
                f"{self.base_url}/users/{user_guid}/widget_urls",
                headers=self.headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return {
                "connect_url": data.get("widget_url", {}).get("url"),
                "user_guid": user_guid
            }
    
    async def list_members(self, user_id: str) -> List[Dict]:
        """
        List all connected members (institution connections) for a user
        
        Returns:
            List of member objects
        """
        user_guid = await self.get_or_create_user(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users/{user_guid}/members",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("members", [])
    
    async def get_member_status(self, user_id: str, member_guid: str) -> Dict:
        """
        Get status of a specific member (connection)
        
        Returns:
            Dict with connection status, last update, etc.
        """
        user_guid = await self.get_or_create_user(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users/{user_guid}/members/{member_guid}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("member", {})
    
    async def list_accounts(self, user_id: str, member_guid: Optional[str] = None) -> List[Dict]:
        """
        List all accounts for a user, optionally filtered by member
        
        Returns:
            List of account objects
        """
        user_guid = await self.get_or_create_user(user_id)
        
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/users/{user_guid}/accounts"
            if member_guid:
                url += f"?member_guid={member_guid}"
            
            response = await client.get(
                url,
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("accounts", [])
    
    async def get_transactions(
        self,
        user_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        account_guid: Optional[str] = None
    ) -> List[Dict]:
        """
        Get transactions for a user
        
        Args:
            user_id: Your internal user ID
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            account_guid: Optional specific account
            
        Returns:
            List of transaction objects
        """
        user_guid = await self.get_or_create_user(user_id)
        
        # Default to last 90 days if no dates provided
        if not from_date:
            from_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        if not to_date:
            to_date = datetime.now().strftime("%Y-%m-%d")
        
        async with httpx.AsyncClient() as client:
            params = {
                "from_date": from_date,
                "to_date": to_date
            }
            
            if account_guid:
                params["account_guid"] = account_guid
            
            response = await client.get(
                f"{self.base_url}/users/{user_guid}/transactions",
                headers=self.headers,
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("transactions", [])
    
    async def refresh_member(self, user_id: str, member_guid: str) -> Dict:
        """
        Trigger a refresh/update for a specific member connection
        
        Returns:
            Dict with member status
        """
        user_guid = await self.get_or_create_user(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/users/{user_guid}/members/{member_guid}/aggregate",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("member", {})
    
    async def delete_member(self, user_id: str, member_guid: str) -> bool:
        """
        Delete a member (disconnect institution)
        
        Returns:
            True if successful
        """
        user_guid = await self.get_or_create_user(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/users/{user_guid}/members/{member_guid}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return True
    
    async def search_institutions(self, query: str) -> List[Dict]:
        """
        Search for institutions by name
        
        Returns:
            List of institution objects
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/institutions",
                headers=self.headers,
                params={"name": query},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("institutions", [])


# Singleton instance
mx_service = MXService()
