"""
auth.py - Invest IQ Authentication & User Session Management

Handles:
- Secure registration with hashed passwords (werkzeug.security)
- Login / logout session management
- Auto-provisioning ₹1,00,000 virtual cash portfolio on signup
- Authentication decorators (@login_required)
"""

from functools import wraps
from typing import Optional, Dict, Any
from flask import session, redirect, url_for, flash, request
from models import (
    create_user,
    get_user_by_username,
    get_user_by_id,
    verify_user_password,
    load_user_portfolio,
    sync_user_portfolio,
)


def register_user(username: str, password: str, email: Optional[str] = None) -> Dict[str, Any]:
    """
    Registers a new user and creates their virtual portfolio with ₹1,00,000.
    Returns the created user record.
    """
    if not username or len(username.strip()) < 3:
        raise ValueError("Username must be at least 3 characters long.")
    if not password or len(password) < 4:
        raise ValueError("Password must be at least 4 characters long.")

    user = create_user(username=username, password=password, email=email)
    return user


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Validates user credentials. Returns user dict if valid, else None.
    """
    user = get_user_by_username(username)
    if not user:
        return None
    if not verify_user_password(user, password):
        return None
    return user


def login_session(user: Dict[str, Any]) -> None:
    """Sets session variables for authenticated user."""
    session["user_id"] = user["id"]
    session["username"] = user["username"]


def logout_session() -> None:
    """Clears user session."""
    session.pop("user_id", None)
    session.pop("username", None)


def get_current_user() -> Optional[Dict[str, Any]]:
    """
    Returns the currently logged-in user, or creates/returns a default 'demo_trader'
    if running in frictionless demo mode.
    """
    user_id = session.get("user_id")
    if user_id:
        user = get_user_by_id(user_id)
        if user:
            return user

    # Seamless educational demo account fallback
    demo_user = get_user_by_username("demo_trader")
    if not demo_user:
        demo_user = create_user("demo_trader", "demo123", email="demo@investiq.ai")
    session["user_id"] = demo_user["id"]
    session["username"] = demo_user["username"]
    return demo_user


def login_required(f):
    """
    Decorator to ensure user is logged in before accessing protected routes.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("user_id"):
            flash("Please sign in or register to access this simulator feature.", "info")
            return redirect(url_for("login_route", next=request.url))
        return f(*args, **kwargs)
    return decorated_function
