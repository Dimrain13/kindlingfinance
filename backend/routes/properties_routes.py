from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from datetime import datetime
from uuid import uuid4
from auth import get_current_user
from database import db
from models import Property, PropertyCreate, PropertyUpdate, ZillowValuationRequest

router = APIRouter()


@router.get("/properties")
async def get_properties(user_id: str = Depends(get_current_user)):
    """Get all properties for a user"""
    try:
        properties = await db.properties.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(1000)
        
        # For each property, calculate equity
        for prop in properties:
            mortgage_balance = 0
            
            # Check for linked mortgage account
            if prop.get("linked_mortgage_account_id"):
                mortgage = await db.accounts.find_one({
                    "id": prop["linked_mortgage_account_id"],
                    "user_id": user_id
                }, {"_id": 0})
                
                if mortgage:
                    mortgage_balance = abs(mortgage.get("balance", 0))
            
            # Check for manual mortgage balance
            elif prop.get("manual_mortgage_balance"):
                mortgage_balance = prop.get("manual_mortgage_balance", 0)
            
            # Calculate equity if there's a mortgage
            if mortgage_balance > 0:
                current_value = prop.get("current_value", 0)
                equity = current_value - mortgage_balance
                equity_percentage = (equity / current_value * 100) if current_value > 0 else 0
                
                prop["mortgage_balance"] = mortgage_balance
                prop["equity"] = equity
                prop["equity_percentage"] = round(equity_percentage, 2)
        
        return properties
    except Exception as e:
        print(f"Error fetching properties: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/properties")
async def create_property(
    property_data: PropertyCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new property"""
    try:
        # Create property document
        property_doc = {
            "id": str(uuid4()),
            "user_id": user_id,
            **property_data.dict(),
            "valuation_source": "manual",
            "last_updated": datetime.utcnow().isoformat(),
            "zillow_zpid": None
        }
        
        await db.properties.insert_one(property_doc)
        
        # If linked to a mortgage, update the account notes
        if property_data.linked_mortgage_account_id:
            await db.accounts.update_one(
                {
                    "id": property_data.linked_mortgage_account_id,
                    "user_id": user_id
                },
                {
                    "$set": {
                        "property_id": property_doc["id"],
                        "property_address": property_data.address
                    }
                }
            )
        
        return {
            "success": True,
            "property": property_doc,
            "message": "Property created successfully"
        }
    except Exception as e:
        print(f"Error creating property: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/properties/{property_id}")
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a property"""
    try:
        # Verify property exists and belongs to user
        existing = await db.properties.find_one({
            "id": property_id,
            "user_id": user_id
        }, {"_id": 0})
        
        if not existing:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Build update document
        update_data = {
            k: v for k, v in property_data.dict().items()
            if v is not None
        }
        update_data["last_updated"] = datetime.utcnow().isoformat()
        
        # If updating current_value, mark as manual valuation
        if "current_value" in update_data:
            update_data["valuation_source"] = "manual"
        
        await db.properties.update_one(
            {"id": property_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        # If mortgage link changed, update account
        if property_data.linked_mortgage_account_id:
            await db.accounts.update_one(
                {
                    "id": property_data.linked_mortgage_account_id,
                    "user_id": user_id
                },
                {
                    "$set": {
                        "property_id": property_id,
                        "property_address": property_data.address or existing.get("address")
                    }
                }
            )
        
        return {
            "success": True,
            "message": "Property updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating property: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/properties/{property_id}")
async def delete_property(
    property_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a property"""
    try:
        # Verify property exists
        existing = await db.properties.find_one({
            "id": property_id,
            "user_id": user_id
        }, {"_id": 0})
        
        if not existing:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Unlink from mortgage account if linked
        if existing.get("linked_mortgage_account_id"):
            await db.accounts.update_one(
                {
                    "id": existing["linked_mortgage_account_id"],
                    "user_id": user_id
                },
                {
                    "$unset": {
                        "property_id": "",
                        "property_address": ""
                    }
                }
            )
        
        # Delete property
        await db.properties.delete_one({
            "id": property_id,
            "user_id": user_id
        })
        
        return {
            "success": True,
            "message": "Property deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting property: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/properties/{property_id}/zillow-valuation")
async def get_zillow_valuation(
    property_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get property valuation from Zillow API (placeholder for now)
    Note: Requires Zillow API key which user mentioned they'll use quiltt.io or similar service
    """
    try:
        # Verify property exists
        property_doc = await db.properties.find_one({
            "id": property_id,
            "user_id": user_id
        }, {"_id": 0})
        
        if not property_doc:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # TODO: Integrate with Zillow API or quiltt.io
        # For now, return a placeholder response
        return {
            "success": False,
            "message": "Zillow integration coming soon. For now, please update property value manually.",
            "property_address": f"{property_doc.get('address')}, {property_doc.get('city')}, {property_doc.get('state')}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching Zillow valuation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/properties/net-worth-with-real-estate")
async def calculate_net_worth_with_properties(user_id: str = Depends(get_current_user)):
    """
    Calculate net worth including properties
    This gives a more accurate picture of total wealth
    """
    try:
        # Get all accounts
        accounts = await db.accounts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        accounts_total = sum(acc.get("balance", 0) for acc in accounts)
        
        # Get all properties
        properties = await db.properties.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        properties_total = sum(prop.get("current_value", 0) for prop in properties)
        
        # Calculate property equity (property value minus mortgage)
        property_equity = 0
        for prop in properties:
            property_value = prop.get("current_value", 0)
            
            if prop.get("linked_mortgage_account_id"):
                # Find the mortgage account and subtract its balance
                mortgage = next(
                    (acc for acc in accounts if acc["id"] == prop["linked_mortgage_account_id"]),
                    None
                )
                if mortgage:
                    # Mortgage balance is typically negative or we take absolute value
                    mortgage_balance = abs(mortgage.get("balance", 0))
                    property_equity += property_value - mortgage_balance
                else:
                    property_equity += property_value
            else:
                property_equity += property_value
        
        # Net worth = accounts total + property equity
        # Note: If mortgages are in accounts as liabilities, they're already counted
        # So we add property values but don't double-count mortgage debt
        
        # Separate assets and liabilities from accounts
        assets = sum(acc.get("balance", 0) for acc in accounts if acc.get("balance", 0) > 0)
        liabilities = sum(abs(acc.get("balance", 0)) for acc in accounts if acc.get("balance", 0) < 0)
        
        # Add property values to assets
        total_assets = assets + properties_total
        
        # Net worth = total assets - liabilities
        net_worth = total_assets - liabilities
        
        return {
            "net_worth": round(net_worth, 2),
            "accounts_total": round(accounts_total, 2),
            "properties_total": round(properties_total, 2),
            "property_equity": round(property_equity, 2),
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(liabilities, 2),
            "properties_count": len(properties)
        }
    except Exception as e:
        print(f"Error calculating net worth with properties: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts/{account_id}/link-property")
async def link_property_to_mortgage(
    account_id: str,
    address: str,
    city: str,
    state: str,
    zip_code: str,
    purchase_price: float,
    purchase_date: str,
    current_value: float,
    user_id: str = Depends(get_current_user)
):
    """
    Quick endpoint to link a property when adding a mortgage account
    Creates property and links it in one step
    """
    try:
        # Verify account exists and is a mortgage/loan
        account = await db.accounts.find_one({
            "id": account_id,
            "user_id": user_id
        }, {"_id": 0})
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Create property
        property_doc = {
            "id": str(uuid4()),
            "user_id": user_id,
            "address": address,
            "city": city,
            "state": state,
            "zip_code": zip_code,
            "property_type": "single_family",
            "purchase_price": purchase_price,
            "purchase_date": purchase_date,
            "current_value": current_value,
            "last_updated": datetime.utcnow().isoformat(),
            "valuation_source": "manual",
            "linked_mortgage_account_id": account_id,
            "zillow_zpid": None,
            "notes": None
        }
        
        await db.properties.insert_one(property_doc)
        
        # Update account with property info
        await db.accounts.update_one(
            {"id": account_id, "user_id": user_id},
            {
                "$set": {
                    "property_id": property_doc["id"],
                    "property_address": f"{address}, {city}, {state}"
                }
            }
        )
        
        return {
            "success": True,
            "property": property_doc,
            "message": f"Property linked to {account.get('name', 'mortgage account')}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error linking property: {e}")
        raise HTTPException(status_code=500, detail=str(e))
