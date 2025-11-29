"""
Crypto tracking service - supports exchange connections and wallet monitoring
"""
import httpx
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException

# Symbol to CoinGecko ID mapping
SYMBOL_TO_COINGECKO_ID = {
    "btc": "bitcoin", "eth": "ethereum", "bnb": "binancecoin",
    "xrp": "ripple", "ada": "cardano", "sol": "solana",
    "doge": "dogecoin", "dot": "polkadot", "matic": "matic-network",
    "ltc": "litecoin", "avax": "avalanche-2", "link": "chainlink",
    "xlm": "stellar", "atom": "cosmos", "algo": "algorand",
    "vet": "vechain", "icp": "internet-computer", "fil": "filecoin",
    "hbar": "hedera-hashgraph", "apt": "aptos", "usdt": "tether",
    "usdc": "usd-coin", "uni": "uniswap", "aave": "aave"
}

async def fetch_wallet_balance_btc(address: str) -> Dict:
    """Fetch Bitcoin wallet balance from Blockchain.info"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://blockchain.info/balance?active={address}",
                timeout=10.0
            )
            data = response.json()
            
            if address in data:
                balance_satoshis = data[address]["final_balance"]
                balance_btc = balance_satoshis / 100000000  # Convert to BTC
                
                return {
                    "symbol": "BTC",
                    "name": "Bitcoin",
                    "amount": balance_btc,
                    "chain": "bitcoin"
                }
    except Exception as e:
        print(f"Error fetching BTC balance: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch Bitcoin balance: {str(e)}")

async def fetch_wallet_balance_eth(address: str) -> List[Dict]:
    """Fetch Ethereum wallet balance (ETH + ERC20 tokens) using Etherscan"""
    # Note: This is a simplified version. In production, you'd use Etherscan API with API key
    # or use services like Alchemy, Infura
    try:
        holdings = []
        
        # Fetch ETH balance using Etherscan free API
        async with httpx.AsyncClient() as client:
            # ETH balance
            response = await client.get(
                f"https://api.etherscan.io/api?module=account&action=balance&address={address}&tag=latest",
                timeout=10.0
            )
            data = response.json()
            
            if data["status"] == "1":
                balance_wei = int(data["result"])
                balance_eth = balance_wei / 1000000000000000000  # Convert to ETH
                
                if balance_eth > 0:
                    holdings.append({
                        "symbol": "ETH",
                        "name": "Ethereum",
                        "amount": balance_eth,
                        "chain": "ethereum"
                    })
        
        return holdings if holdings else []
    except Exception as e:
        print(f"Error fetching ETH balance: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch Ethereum balance: {str(e)}")

async def fetch_coinbase_holdings(api_key: str, api_secret: str) -> List[Dict]:
    """Fetch holdings from Coinbase using API (read-only)"""
    # This is a placeholder - actual Coinbase API implementation requires:
    # 1. OAuth or API key authentication
    # 2. Signature generation for requests
    # 3. Proper error handling
    
    # For now, return mock data structure
    # In production, you'd implement full Coinbase API integration
    raise HTTPException(
        status_code=501,
        detail="Coinbase integration coming soon. Please use wallet address monitoring for now."
    )

async def fetch_crypto_prices(symbols: List[str]) -> Dict:
    """Fetch current prices for multiple cryptocurrencies"""
    try:
        # Map symbols to CoinGecko IDs
        coin_ids = [SYMBOL_TO_COINGECKO_ID.get(s.lower(), s.lower()) for s in symbols]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": ",".join(set(coin_ids)),
                    "vs_currencies": "usd",
                    "include_24hr_change": "true"
                },
                timeout=10.0
            )
            prices_data = response.json()
            
            # Map back to symbols
            result = {}
            for symbol in symbols:
                coin_id = SYMBOL_TO_COINGECKO_ID.get(symbol.lower(), symbol.lower())
                if coin_id in prices_data:
                    result[symbol.upper()] = prices_data[coin_id].get("usd", 0)
            
            return result
    except Exception as e:
        print(f"Error fetching crypto prices: {e}")
        return {}

def encrypt_api_key(api_key: str, user_id: str) -> str:
    """Simple encryption for API keys (in production, use proper encryption)"""
    # This is a very basic obfuscation - in production use proper encryption like Fernet
    return hashlib.sha256(f"{api_key}:{user_id}".encode()).hexdigest()
