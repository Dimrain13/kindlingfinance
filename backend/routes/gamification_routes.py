"""
Gamification system - achievements, streaks, levels, and mascot
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from datetime import datetime, timedelta, timezone
import uuid

from auth import get_current_user
from database import db, transactions_collection, bills_collection, goals_collection, budgets_collection

router = APIRouter(prefix="/gamification", tags=["gamification"])


# Achievement definitions
ACHIEVEMENTS = {
    "first_sync": {
        "id": "first_sync",
        "name": "Getting Started",
        "description": "Connected your first account",
        "icon": "🎯",
        "points": 50
    },
    "budget_master": {
        "id": "budget_master",
        "name": "Budget Master",
        "description": "Created your first budget",
        "icon": "💰",
        "points": 100
    },
    "goal_setter": {
        "id": "goal_setter",
        "name": "Goal Setter",
        "description": "Set your first financial goal",
        "icon": "🎯",
        "points": 75
    },
    "bill_organizer": {
        "id": "bill_organizer",
        "name": "Bill Organizer",
        "description": "Added your first bill",
        "icon": "📋",
        "points": 50
    },
    "savings_starter": {
        "id": "savings_starter",
        "name": "Savings Starter",
        "description": "Saved $100 or more",
        "icon": "💎",
        "points": 150
    },
    "debt_warrior": {
        "id": "debt_warrior",
        "name": "Debt Warrior",
        "description": "Paid down $500 in debt",
        "icon": "⚔️",
        "points": 200
    },
    "streak_week": {
        "id": "streak_week",
        "name": "Week Warrior",
        "description": "7-day login streak",
        "icon": "🔥",
        "points": 100
    },
    "streak_month": {
        "id": "streak_month",
        "name": "Monthly Master",
        "description": "30-day login streak",
        "icon": "🌟",
        "points": 500
    },
    "net_worth_positive": {
        "id": "net_worth_positive",
        "name": "In the Green",
        "description": "Achieved positive net worth",
        "icon": "💚",
        "points": 300
    },
    "goal_completed": {
        "id": "goal_completed",
        "name": "Goal Crusher",
        "description": "Completed your first goal",
        "icon": "🏆",
        "points": 250
    }
}


@router.get("/profile")
async def get_gamification_profile(user_id: str = Depends(get_current_user)):
    """Get user's gamification profile including level, points, and achievements"""
    
    # Get or create profile
    profile = await db.gamification_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile:
        # Create new profile
        profile = {
            "user_id": user_id,
            "level": 1,
            "total_points": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_login": datetime.now(timezone.utc),
            "unlocked_achievements": [],
            "mascot_mood": "happy",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.gamification_profiles.insert_one(profile)
    
    # Calculate level from points (every 500 points = 1 level)
    level = (profile["total_points"] // 500) + 1
    points_to_next_level = 500 - (profile["total_points"] % 500)
    
    # Get achievement progress
    achievement_stats = await calculate_achievement_progress(user_id, profile)
    
    return {
        "level": level,
        "total_points": profile["total_points"],
        "points_to_next_level": points_to_next_level,
        "current_streak": profile.get("current_streak", 0),
        "longest_streak": profile.get("longest_streak", 0),
        "unlocked_achievements": profile.get("unlocked_achievements", []),
        "available_achievements": list(ACHIEVEMENTS.values()),
        "mascot_mood": profile.get("mascot_mood", "happy"),
        "achievement_progress": achievement_stats
    }


@router.post("/check-in")
async def daily_check_in(user_id: str = Depends(get_current_user)):
    """Record daily check-in and update streak"""
    
    profile = await db.gamification_profiles.find_one({"user_id": user_id})
    
    if not profile:
        profile = {
            "user_id": user_id,
            "level": 1,
            "total_points": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "unlocked_achievements": [],
            "mascot_mood": "happy"
        }
    
    now = datetime.now(timezone.utc)
    last_login = profile.get("last_login")
    
    # Calculate streak
    if last_login:
        # Ensure last_login has timezone info
        if last_login.tzinfo is None:
            last_login = last_login.replace(tzinfo=timezone.utc)
        
        time_diff = now - last_login
        
        if time_diff.days == 1:
            # Consecutive day - increment streak
            profile["current_streak"] = profile.get("current_streak", 0) + 1
        elif time_diff.days > 1:
            # Streak broken - reset
            profile["current_streak"] = 1
        # If same day (< 1 day), don't increment
    else:
        profile["current_streak"] = 1
    
    # Update longest streak
    profile["longest_streak"] = max(profile.get("longest_streak", 0), profile["current_streak"])
    profile["last_login"] = now
    profile["updated_at"] = now
    
    # Check for streak achievements
    new_achievements = []
    if profile["current_streak"] >= 7 and "streak_week" not in profile.get("unlocked_achievements", []):
        new_achievements.append("streak_week")
        profile["total_points"] = profile.get("total_points", 0) + ACHIEVEMENTS["streak_week"]["points"]
    
    if profile["current_streak"] >= 30 and "streak_month" not in profile.get("unlocked_achievements", []):
        new_achievements.append("streak_month")
        profile["total_points"] = profile.get("total_points", 0) + ACHIEVEMENTS["streak_month"]["points"]
    
    if new_achievements:
        profile["unlocked_achievements"] = profile.get("unlocked_achievements", []) + new_achievements
    
    # Update or insert
    await db.gamification_profiles.update_one(
        {"user_id": user_id},
        {"$set": profile},
        upsert=True
    )
    
    return {
        "current_streak": profile["current_streak"],
        "points_earned": 10,  # Base check-in points
        "new_achievements": new_achievements,
        "message": get_mascot_message(profile["current_streak"])
    }


@router.post("/unlock-achievement/{achievement_id}")
async def unlock_achievement(achievement_id: str, user_id: str = Depends(get_current_user)):
    """Manually unlock an achievement"""
    
    if achievement_id not in ACHIEVEMENTS:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    profile = await db.gamification_profiles.find_one({"user_id": user_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check if already unlocked
    if achievement_id in profile.get("unlocked_achievements", []):
        return {"message": "Achievement already unlocked"}
    
    # Unlock achievement
    achievement = ACHIEVEMENTS[achievement_id]
    profile["unlocked_achievements"] = profile.get("unlocked_achievements", []) + [achievement_id]
    profile["total_points"] = profile.get("total_points", 0) + achievement["points"]
    profile["updated_at"] = datetime.now(timezone.utc)
    
    await db.gamification_profiles.update_one(
        {"user_id": user_id},
        {"$set": profile}
    )
    
    return {
        "achievement": achievement,
        "total_points": profile["total_points"],
        "message": f"🎉 Achievement unlocked: {achievement['name']}! +{achievement['points']} points"
    }


@router.get("/mascot-message")
async def get_mascot_greeting(user_id: str = Depends(get_current_user)):
    """Get personalized message from Penny the Piggy"""
    
    profile = await db.gamification_profiles.find_one({"user_id": user_id})
    
    if not profile:
        return {
            "message": "Greetings! I'm Sage, your financial wisdom guide! 🦉 Let's navigate your financial journey together!",
            "mood": "wise"
        }
    
    streak = profile.get("current_streak", 0)
    level = (profile.get("total_points", 0) // 500) + 1
    
    message = get_mascot_message(streak, level)
    
    return {
        "message": message,
        "mood": profile.get("mascot_mood", "happy"),
        "level": level,
        "streak": streak
    }


async def calculate_achievement_progress(user_id: str, profile: dict) -> dict:
    """Calculate progress toward locked achievements"""
    
    progress = {}
    
    # Count various user activities
    bills_count = await bills_collection.count_documents({"user_id": user_id})
    goals_count = await goals_collection.count_documents({"user_id": user_id})
    budgets_count = await budgets_collection.count_documents({"user_id": user_id})
    
    # Bill organizer progress
    if "bill_organizer" not in profile.get("unlocked_achievements", []):
        progress["bill_organizer"] = min(bills_count, 1) * 100
    
    # Goal setter progress
    if "goal_setter" not in profile.get("unlocked_achievements", []):
        progress["goal_setter"] = min(goals_count, 1) * 100
    
    # Budget master progress
    if "budget_master" not in profile.get("unlocked_achievements", []):
        progress["budget_master"] = min(budgets_count, 1) * 100
    
    return progress


def get_mascot_message(streak: int = 0, level: int = 1) -> str:
    """Generate personalized message from Sage the Owl"""
    
    messages = {
        "new_user": [
            "Welcome, wise one! I'm Sage, and I'll guide you on your path to financial wisdom! 🦉✨",
            "Greetings! Together we'll unlock the secrets of smart money management! 📚"
        ],
        "streak_low": [
            "Another day, another step toward financial enlightenment! 🌟",
            "Wisdom is built one day at a time. You're on the right path! 🎯"
        ],
        "streak_medium": [
            f"Impressive! {streak} consecutive days of financial mindfulness! 🔥 Your dedication shows!",
            f"Remarkable! {streak} days of consistent wisdom-building! Knowledge grows with persistence! 💎"
        ],
        "streak_high": [
            f"Extraordinary! {streak} days of unwavering commitment! You've truly mastered the art of consistency! 🌟",
            f"Magnificent! {streak} consecutive days! Your financial wisdom deepens daily! 🦉✨"
        ],
        "level_up": [
            f"Level {level} achieved! Your financial acumen grows stronger! 🏆",
            f"Congratulations! Level {level} unlocked! True wisdom comes from experience! 📚✨"
        ]
    }
    
    if streak == 0:
        import random
        return random.choice(messages["new_user"])
    elif streak < 7:
        import random
        return random.choice(messages["streak_low"])
    elif streak < 30:
        import random
        return random.choice(messages["streak_medium"])
    else:
        import random
        return random.choice(messages["streak_high"])
