from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import sys
from uuid import uuid4

sys.path.append('/app/backend')
from auth import get_current_user
from database import db

router = APIRouter(tags=["household"])

# Models
class SpouseRequest(BaseModel):
    email: EmailStr

class ChildRequest(BaseModel):
    name: str
    age: int

class CollaboratorRequest(BaseModel):
    email: EmailStr

class SpouseInfo(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    status: str = "pending"  # pending, active

class ChildInfo(BaseModel):
    id: str
    name: str
    age: int

class CollaboratorInfo(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    status: str = "pending"  # pending, active

class HouseholdResponse(BaseModel):
    spouse: Optional[SpouseInfo] = None
    children: List[ChildInfo] = []
    collaborators: List[CollaboratorInfo] = []

# Get household information
@router.get("/household")
async def get_household(user_id: str = Depends(get_current_user)):
    """Get user's household information"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    household = user.get("household", {})
    
    return {
        "spouse": household.get("spouse"),
        "children": household.get("children", []),
        "collaborators": household.get("collaborators", [])
    }

# Add spouse/partner
@router.post("/household/spouse")
async def add_spouse(
    request: SpouseRequest,
    user_id: str = Depends(get_current_user)
):
    """Add spouse/partner to household"""
    # Check if spouse already exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    household = user.get("household", {})
    if household.get("spouse"):
        raise HTTPException(status_code=400, detail="Spouse already added")
    
    # Create spouse entry
    spouse_data = {
        "id": str(uuid4()),
        "email": request.email,
        "name": None,  # Will be filled when they accept
        "status": "pending",
        "added_at": datetime.now(timezone.utc)
    }
    
    # Update user's household
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"household.spouse": spouse_data}}
    )
    
    # TODO: Send invitation email
    
    return {
        "message": "Spouse invitation sent",
        "spouse": spouse_data
    }

# Remove spouse
@router.delete("/household/spouse")
async def remove_spouse(user_id: str = Depends(get_current_user)):
    """Remove spouse from household"""
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"household.spouse": ""}}
    )
    
    return {"message": "Spouse removed from household"}

# Add child
@router.post("/household/children")
async def add_child(
    request: ChildRequest,
    user_id: str = Depends(get_current_user)
):
    """Add child to household"""
    if request.age < 0 or request.age > 25:
        raise HTTPException(status_code=400, detail="Age must be between 0 and 25")
    
    child_data = {
        "id": str(uuid4()),
        "name": request.name,
        "age": request.age,
        "added_at": datetime.now(timezone.utc)
    }
    
    await db.users.update_one(
        {"id": user_id},
        {"$push": {"household.children": child_data}}
    )
    
    return {
        "message": "Child added to household",
        "child": child_data
    }

# Remove child
@router.delete("/household/children/{child_id}")
async def remove_child(
    child_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove child from household"""
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"household.children": {"id": child_id}}}
    )
    
    return {"message": "Child removed from household"}

# Add collaborator
@router.post("/household/collaborators")
async def add_collaborator(
    request: CollaboratorRequest,
    user_id: str = Depends(get_current_user)
):
    """Add collaborator (financial advisor, accountant, etc.)"""
    # Check if collaborator already exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    household = user.get("household", {})
    collaborators = household.get("collaborators", [])
    
    # Check if email already invited
    if any(c.get("email") == request.email for c in collaborators):
        raise HTTPException(status_code=400, detail="Collaborator already invited")
    
    collaborator_data = {
        "id": str(uuid4()),
        "email": request.email,
        "name": None,
        "status": "pending",
        "added_at": datetime.now(timezone.utc)
    }
    
    await db.users.update_one(
        {"id": user_id},
        {"$push": {"household.collaborators": collaborator_data}}
    )
    
    # TODO: Send invitation email
    
    return {
        "message": "Collaborator invitation sent",
        "collaborator": collaborator_data
    }

# Remove collaborator
@router.delete("/household/collaborators/{collaborator_id}")
async def remove_collaborator(
    collaborator_id: str,
    user_id: str = Depends(get_current_user)
):
    """Remove collaborator from household"""
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"household.collaborators": {"id": collaborator_id}}}
    )
    
    return {"message": "Collaborator removed from household"}
