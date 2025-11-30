"""
Debug routes for MX integration - helps troubleshoot connection issues
"""
from fastapi import APIRouter, Depends
from server import get_current_user
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mx_service import mx_service

router = APIRouter(prefix="/mx/debug", tags=["mx-debug"])


@router.get("/members")
async def debug_list_members(user_id: str = Depends(get_current_user)):
    """
    Debug: List all members with detailed status
    """
    try:
        members = await mx_service.list_members(user_id)
        
        result = []
        for member in members:
            member_guid = member.get("guid")
            
            # Get detailed status
            status = await mx_service.get_member_status(user_id, member_guid)
            
            result.append({
                "guid": member_guid,
                "name": member.get("name"),
                "connection_status": status.get("connection_status"),
                "is_being_aggregated": status.get("is_being_aggregated"),
                "successfully_aggregated_at": status.get("successfully_aggregated_at"),
                "status_details": status
            })
        
        return {
            "members": result,
            "count": len(result)
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/accounts")
async def debug_list_accounts(user_id: str = Depends(get_current_user)):
    """
    Debug: List all accounts with raw MX data
    """
    try:
        accounts = await mx_service.list_accounts(user_id)
        return {
            "accounts": accounts,
            "count": len(accounts)
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/transactions")
async def debug_list_transactions(user_id: str = Depends(get_current_user)):
    """
    Debug: List all transactions with raw MX data
    """
    try:
        transactions = await mx_service.get_transactions(user_id)
        return {
            "transactions": transactions[:10],  # First 10
            "total_count": len(transactions)
        }
    except Exception as e:
        return {"error": str(e)}
