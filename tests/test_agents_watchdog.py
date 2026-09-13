"""
tests/test_agents_watchdog.py - Test suite for Phase 3 Watchdog Agent
"""

import os
import time
import pytest
from unittest.mock import patch

from app import app
from agents.watchdog_agent import (
    CONSECUTIVE_LOSS_THRESHOLD,
    POSITION_SIZE_EXPANSION_RATIO,
    MAX_SECTOR_CONCENTRATION_PCT,
    MAX_TRADES_PER_HOUR,
    COOLDOWN_DURATION_SECONDS,
    check_before_trade,
)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_watchdog_named_constants():
    """Verify named constants match the required behavioral specifications."""
    assert CONSECUTIVE_LOSS_THRESHOLD == 2
    assert POSITION_SIZE_EXPANSION_RATIO == 1.25
    assert MAX_SECTOR_CONCENTRATION_PCT == 60.0
    assert MAX_TRADES_PER_HOUR == 5
    assert COOLDOWN_DURATION_SECONDS == 300


def test_watchdog_normal_trade():
    """Verify normal moderate trade passes without being flagged."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock, \
         patch("agents.watchdog_agent.get_trade_history") as mock_history, \
         patch("agents.watchdog_agent._get_active_positions") as mock_pos:
        
        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": 0.0,
            "cooldown_remaining": 0,
            "loss_streak": 0,
            "lock_reason": "",
        }
        mock_history.return_value = []
        mock_pos.return_value = []

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="TCS.NS",
            proposed_size=5,
            proposed_type="BUY",
            proposed_price=2200.0,
        )

        assert result["flagged"] is False
        assert result["severity"] is None
        assert "passed" in result["reason"].lower()


def test_watchdog_sector_concentration_warning():
    """Verify sector concentration > 60% flags a warning."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock, \
         patch("agents.watchdog_agent.get_trade_history") as mock_history, \
         patch("agents.watchdog_agent._get_active_positions") as mock_pos:

        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": 0.0,
            "cooldown_remaining": 0,
            "loss_streak": 0,
            "lock_reason": "",
        }
        mock_history.return_value = []
        # Total portfolio: 100,000 cash. Propose BUY 80,000 of RELIANCE (Energy) -> 80%
        mock_pos.return_value = []

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="RELIANCE.NS",
            proposed_size=60,
            proposed_type="BUY",
            proposed_price=1350.0,  # 60 * 1350 = 81,000 (81% of 100,000)
        )

        assert result["flagged"] is True
        assert result["severity"] == "warning"
        assert result["rule_triggered"] == "SECTOR_CONCENTRATION"
        assert "Concentration Warning" in result["reason"]
        assert "SIMULATION ONLY" in result["reason"]


def test_watchdog_trade_velocity_warning():
    """Verify > 5 trades in the last hour flags an overtrading warning."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock, \
         patch("agents.watchdog_agent.get_trade_history") as mock_history, \
         patch("agents.watchdog_agent._get_active_positions") as mock_pos:

        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": 0.0,
            "cooldown_remaining": 0,
            "loss_streak": 0,
            "lock_reason": "",
        }
        # 6 trades in the last 10 minutes
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        recent_trades = [
            {
                "id": f"t_{i}",
                "symbol": "INFY.NS",
                "type": "BUY",
                "amount": 1000.0,
                "timestamp": (now - timedelta(minutes=i * 5)).isoformat(),
            }
            for i in range(6)
        ]
        mock_history.return_value = recent_trades
        mock_pos.return_value = []

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="INFY.NS",
            proposed_size=1,
            proposed_type="BUY",
            proposed_price=1500.0,
        )

        assert result["flagged"] is True
        assert result["severity"] == "warning"
        assert result["rule_triggered"] == "OVERTRADING_VELOCITY"
        assert "Overtrading Notice" in result["reason"]


def test_watchdog_revenge_sizing_block():
    """Verify sizing up >= 1.25x after 2 consecutive losses triggers block and sets cooldown."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock, \
         patch("agents.watchdog_agent.get_trade_history") as mock_history, \
         patch("agents.watchdog_agent._set_cooldown_lock") as mock_set_cd:

        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": 0.0,
            "cooldown_remaining": 0,
            "loss_streak": 0,
            "lock_reason": "",
        }
        # Two consecutive losing SELL trades with avg size ₹10,000
        losing_trades = [
            {"id": "t1", "symbol": "SBIN.NS", "type": "SELL", "amount": 10000.0, "pnl": -500.0},
            {"id": "t2", "symbol": "TCS.NS", "type": "SELL", "amount": 10000.0, "pnl": -800.0},
        ]
        mock_history.return_value = losing_trades

        # Propose trade of ₹15,000 (1.5x >= 1.25x threshold)
        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="RELIANCE.NS",
            proposed_size=10,
            proposed_type="BUY",
            proposed_price=1500.0,  # 10 * 1500 = 15,000
        )

        assert result["flagged"] is True
        assert result["severity"] == "block"
        assert result["rule_triggered"] == "REVENGE_SIZING_UP"
        assert "Trading Blocked" in result["reason"]
        assert mock_set_cd.called


def test_watchdog_active_cooldown_immediate_block():
    """Verify user with active cooldown is immediately blocked with remaining time."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock:
        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": time.time() + 180,
            "cooldown_remaining": 180,
            "loss_streak": 2,
            "lock_reason": "Revenge trading guardrail",
        }

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="TCS.NS",
            proposed_size=1,
            proposed_type="BUY",
            proposed_price=2200.0,
        )

        assert result["flagged"] is True
        assert result["severity"] == "block"
        assert result["rule_triggered"] == "ACTIVE_COOLDOWN"
        assert "180s remaining" in result["reason"]


def test_watchdog_sell_during_cooldown_permitted():
    """Verify SELL orders (position exits) are completely exempt from cooldown blocks."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock:
        # Active cooldown with 240 seconds remaining
        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": time.time() + 240,
            "cooldown_remaining": 240,
            "loss_streak": 2,
            "lock_reason": "Active cooldown lock",
        }

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="TCS.NS",
            proposed_size=10,
            proposed_type="SELL",
            proposed_price=2200.0,
        )

        # SELL must NOT be flagged or blocked, allowing user to exit position
        assert result["flagged"] is False
        assert result["severity"] is None
        assert "exempt" in result["reason"].lower()


def test_watchdog_sell_trade_velocity_warning():
    """Verify 6+ SELL orders within an hour triggers the overtrading warning identically to 6+ BUYs."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock, \
         patch("agents.watchdog_agent.get_trade_history") as mock_history, \
         patch("agents.watchdog_agent._get_active_positions") as mock_pos:

        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": 0.0,
            "cooldown_remaining": 0,
            "loss_streak": 0,
            "lock_reason": "",
        }
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        recent_sells = [
            {
                "id": f"t_sell_{i}",
                "symbol": "INFY.NS",
                "type": "SELL",
                "amount": 1000.0,
                "timestamp": (now - timedelta(minutes=i * 5)).isoformat(),
            }
            for i in range(6)
        ]
        mock_history.return_value = recent_sells
        mock_pos.return_value = []

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="INFY.NS",
            proposed_size=1,
            proposed_type="SELL",
            proposed_price=1500.0,
        )

        assert result["flagged"] is True
        assert result["severity"] == "warning"
        assert result["rule_triggered"] == "OVERTRADING_VELOCITY"
        assert "Overtrading Notice" in result["reason"]
        assert "SIMULATION ONLY" in result["reason"]


def test_watchdog_sell_during_cooldown_with_overtrading_velocity_warning():
    """Verify SELL order during cooldown is NOT blocked, but soft overtrading velocity warning still surfaces."""
    with patch("agents.watchdog_agent._get_portfolio_lock_state") as mock_lock, \
         patch("agents.watchdog_agent.get_trade_history") as mock_history, \
         patch("agents.watchdog_agent._get_active_positions") as mock_pos:

        mock_lock.return_value = {
            "cash_balance": 100000.0,
            "is_locked_for_reflection": False,
            "cooldown_until": time.time() + 240,
            "cooldown_remaining": 240,
            "loss_streak": 2,
            "lock_reason": "Active cooldown lock",
        }
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        recent_trades = [
            {
                "id": f"t_{i}",
                "symbol": "TCS.NS",
                "type": "SELL",
                "amount": 2000.0,
                "timestamp": (now - timedelta(minutes=i * 5)).isoformat(),
            }
            for i in range(6)
        ]
        mock_history.return_value = recent_trades
        mock_pos.return_value = []

        result = check_before_trade(
            user_id="usr_test",
            proposed_symbol="TCS.NS",
            proposed_size=5,
            proposed_type="SELL",
            proposed_price=2200.0,
        )

        # Must NOT be blocked despite active cooldown, but MUST flag overtrading warning
        assert result["flagged"] is True
        assert result["severity"] == "warning"
        assert result["rule_triggered"] == "OVERTRADING_VELOCITY"
        assert "Overtrading Notice" in result["reason"]


def test_flask_watchdog_check_route(client):
    """Verify /api/agents/watchdog-check endpoint authentication and execution."""
    secret = os.environ.get("AGENT_SERVICE_SECRET", "investiq_agent_secret_dev_key_9812")

    # 1. Unauthenticated (401)
    res_unauth = client.post(
        "/api/agents/watchdog-check",
        json={"userId": "usr_demo", "symbol": "TCS.NS", "shares": 5, "type": "BUY"},
    )
    assert res_unauth.status_code == 401

    # 2. Authenticated with shared secret (200)
    res_auth = client.post(
        "/api/agents/watchdog-check",
        headers={"X-Agent-Service-Key": secret},
        json={
            "userId": "usr_demo",
            "symbol": "TCS.NS",
            "shares": 5,
            "type": "BUY",
            "price": 2200.0,
        },
    )
    assert res_auth.status_code == 200
    data = res_auth.get_json()
    assert data["success"] is True
    assert "flagged" in data
    assert "lock_state" in data
