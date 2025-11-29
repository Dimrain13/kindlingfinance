# New crypto endpoints to replace old ones

# ==================== CRYPTO SOURCE MANAGEMENT ====================

@api_router.post("/crypto/sources")
async def add_crypto_source(
    source: CryptoSourceCreate,
    user_id: str = Depends(get_current_user)
):
    """Add a new crypto source (exchange or wallet)"""
    source_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    source_doc = {
        "id": source_id,
        "user_id": user_id,
        "source_type": source.source_type,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    if source.source_type == "exchange":
        if not source.exchange or not source.api_key:
            raise HTTPException(status_code=400, detail="Exchange and API key required for exchange source")
        
        # Encrypt API credentials
        source_doc["exchange"] = source.exchange
        source_doc["api_key_encrypted"] = encrypt_api_key(source.api_key, user_id)
        
    elif source.source_type == "wallet":
        if not source.chain or not source.wallet_address:
            raise HTTPException(status_code=400, detail="Chain and wallet address required for wallet source")
        
        source_doc["chain"] = source.chain
        source_doc["wallet_address"] = source.wallet_address
        source_doc["wallet_label"] = source.wallet_label or f"{source.chain.title()} Wallet"
    
    await db.crypto_sources.insert_one(source_doc)
    
    # Immediately sync holdings
    await sync_crypto_source(source_id, user_id)
    
    return {"id": source_id, "message": "Crypto source added successfully"}


@api_router.get("/crypto/sources")
async def get_crypto_sources(user_id: str = Depends(get_current_user)):
    """Get all crypto sources for user"""
    sources = await db.crypto_sources.find(
        {"user_id": user_id},
        {"_id": 0, "api_key_encrypted": 0}  # Don't return encrypted keys
    ).to_list(1000)
    
    return sources


@api_router.delete("/crypto/sources/{source_id}")
async def delete_crypto_source(
    source_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a crypto source and its holdings"""
    # Delete source
    result = await db.crypto_sources.delete_one({"id": source_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crypto source not found")
    
    # Delete associated holdings
    await db.crypto_holdings.delete_many({"source_id": source_id, "user_id": user_id})
    
    return {"message": "Crypto source deleted successfully"}


@api_router.post("/crypto/sources/{source_id}/sync")
async def sync_crypto_source_endpoint(
    source_id: str,
    user_id: str = Depends(get_current_user)
):
    """Manually sync a crypto source"""
    await sync_crypto_source(source_id, user_id)
    return {"message": "Sync completed"}


async def sync_crypto_source(source_id: str, user_id: str):
    """Sync holdings from a crypto source"""
    # Get source
    source = await db.crypto_sources.find_one(
        {"id": source_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not source:
        raise HTTPException(status_code=404, detail="Crypto source not found")
    
    holdings_data = []
    
    try:
        if source["source_type"] == "wallet":
            chain = source["chain"]
            address = source["wallet_address"]
            
            if chain == "bitcoin":
                balance_data = await fetch_wallet_balance_btc(address)
                holdings_data.append(balance_data)
            elif chain == "ethereum":
                holdings_data = await fetch_wallet_balance_eth(address)
            # Add more chains as needed
            
        elif source["source_type"] == "exchange":
            # Fetch from exchange API
            if source["exchange"] == "coinbase":
                # holdings_data = await fetch_coinbase_holdings(...)
                raise HTTPException(status_code=501, detail="Exchange integration coming soon")
        
        # Delete old holdings for this source
        await db.crypto_holdings.delete_many({"source_id": source_id, "user_id": user_id})
        
        # Fetch current prices
        if holdings_data:
            symbols = [h["symbol"] for h in holdings_data]
            prices = await fetch_crypto_prices(symbols)
            
            # Insert new holdings
            now = datetime.now(timezone.utc)
            for holding_data in holdings_data:
                symbol = holding_data["symbol"]
                amount = holding_data["amount"]
                current_price = prices.get(symbol, 0)
                
                holding_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "source_id": source_id,
                    "symbol": symbol,
                    "name": holding_data["name"],
                    "amount": amount,
                    "current_price_usd": current_price,
                    "current_value_usd": amount * current_price,
                    "last_updated": now
                }
                
                await db.crypto_holdings.insert_one(holding_doc)
                
                # Save to value history for tracking
                history_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "holding_id": holding_doc["id"],
                    "timestamp": now,
                    "amount": amount,
                    "price_usd": current_price,
                    "value_usd": amount * current_price
                }
                await db.crypto_value_history.insert_one(history_doc)
        
        # Update last_synced
        await db.crypto_sources.update_one(
            {"id": source_id},
            {"$set": {"last_synced": datetime.now(timezone.utc)}}
        )
        
    except Exception as e:
        print(f"Error syncing crypto source: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


# ==================== CRYPTO HOLDINGS & ANALYTICS ====================

@api_router.get("/crypto/holdings")
async def get_all_crypto_holdings(user_id: str = Depends(get_current_user)):
    """Get all crypto holdings across all sources"""
    holdings = await db.crypto_holdings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    if not holdings:
        return []
    
    # Refresh prices
    symbols = list(set([h["symbol"] for h in holdings]))
    prices = await fetch_crypto_prices(symbols)
    
    # Update with latest prices
    for holding in holdings:
        symbol = holding["symbol"]
        if symbol in prices:
            holding["current_price_usd"] = prices[symbol]
            holding["current_value_usd"] = holding["amount"] * prices[symbol]
    
    return holdings


@api_router.get("/crypto/summary")
async def get_crypto_summary(user_id: str = Depends(get_current_user)):
    """Get crypto portfolio summary"""
    holdings = await db.crypto_holdings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    if not holdings:
        return {
            "total_value_usd": 0,
            "holdings_count": 0,
            "top_holdings": []
        }
    
    # Refresh prices
    symbols = list(set([h["symbol"] for h in holdings]))
    prices = await fetch_crypto_prices(symbols)
    
    total_value = 0
    holdings_with_value = []
    
    for holding in holdings:
        symbol = holding["symbol"]
        if symbol in prices:
            current_price = prices[symbol]
            current_value = holding["amount"] * current_price
            total_value += current_value
            
            holdings_with_value.append({
                "symbol": symbol,
                "name": holding["name"],
                "amount": holding["amount"],
                "current_value_usd": current_value,
                "percentage": 0  # Will calculate after we have total
            })
    
    # Calculate percentages
    for h in holdings_with_value:
        h["percentage"] = (h["current_value_usd"] / total_value * 100) if total_value > 0 else 0
    
    # Sort by value
    holdings_with_value.sort(key=lambda x: x["current_value_usd"], reverse=True)
    
    return {
        "total_value_usd": total_value,
        "holdings_count": len(holdings),
        "top_holdings": holdings_with_value[:5]
    }


@api_router.get("/crypto/history")
async def get_crypto_value_history(
    days: int = 30,
    user_id: str = Depends(get_current_user)
):
    """Get historical value data for crypto portfolio"""
    from datetime import timedelta
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    history = await db.crypto_value_history.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": cutoff_date}
        },
        {"_id": 0}
    ).sort("timestamp", 1).to_list(10000)
    
    # Aggregate by day
    daily_values = {}
    for record in history:
        date_key = record["timestamp"].strftime("%Y-%m-%d")
        if date_key not in daily_values:
            daily_values[date_key] = 0
        daily_values[date_key] += record["value_usd"]
    
    # Format for chart
    result = [
        {"date": date, "value_usd": value}
        for date, value in sorted(daily_values.items())
    ]
    
    return result
