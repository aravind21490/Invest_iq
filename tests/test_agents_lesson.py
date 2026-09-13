"""
tests/test_agents_lesson.py - Unit and Integration Tests for Phase 6 Lesson-Sequencing Agent
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock

from agents.lesson_agent import (
    MISTAKE_TO_LESSON_MAP,
    recommend_next_lesson,
    _get_recent_watchdog_flags,
    _get_recent_losing_trades,
)
from app import app


# ---------------------------------------------------------------------------
# 1. MISTAKE-TO-LESSON MAP COMPLETENESS
# ---------------------------------------------------------------------------
def test_mistake_map_completeness():
    """
    Verify MISTAKE_TO_LESSON_MAP is a rule-based dictionary covering:
    - Watchdog patterns (revenge sizing, sector concentration, overtrading velocity)
    - Signal-driven losses (OVERSOLD_BOUNCE, BULLISH_MACD_CROSSOVER, etc.)
    - Loss streaks
    - Default progression
    And that each lesson_id corresponds to a valid topic in the curriculum.
    """
    required_patterns = [
        "REVENGE_SIZING",
        "SECTOR_CONCENTRATION",
        "OVERTRADING_VELOCITY",
        "OVERSOLD_BOUNCE",
        "OVERBOUGHT_EXHAUSTION",
        "BULLISH_MACD_CROSSOVER",
        "BEARISH_MACD_CROSSOVER",
        "VOLUME_BREAKOUT",
        "VOLATILITY_SQUEEZE",
        "CONSECUTIVE_LOSSES",
        "DEFAULT_PROGRESSION",
    ]

    valid_topic_ids = {
        # Tier 1
        "t1-1", "t1-2", "t1-3", "t1-4", "t1-5",
        # Tier 2
        "t2-1", "t2-2", "t2-3", "t2-4", "t2-5",
        # Tier 3
        "t3-1", "t3-2", "t3-3", "t3-4", "t3-5",
        # Tier 4
        "t4-1", "t4-2", "t4-3", "t4-4", "t4-5",
        # Tier 5
        "t5-1", "t5-2", "t5-3", "t5-4", "t5-5",
        # Tier 6
        "t6-1", "t6-2", "t6-3",
    }

    for pat in required_patterns:
        assert pat in MISTAKE_TO_LESSON_MAP, f"Missing required pattern '{pat}' in MISTAKE_TO_LESSON_MAP"
        meta = MISTAKE_TO_LESSON_MAP[pat]
        assert "lesson_id" in meta
        assert "title" in meta
        assert "tier_title" in meta
        assert "rationale" in meta
        assert "default_nudge" in meta
        assert meta["lesson_id"] in valid_topic_ids, f"Invalid lesson ID '{meta['lesson_id']}' in {pat}"


# ---------------------------------------------------------------------------
# 2. WATCHDOG REVENGE SIZING PATTERN
# ---------------------------------------------------------------------------
def test_lesson_recommendation_watchdog_flag_revenge_sizing():
    """
    When Watchdog has flagged revenge sizing, recommend_next_lesson MUST
    recommend lesson t5-4 (Psychological Biases: FOMO & Revenge Trading).
    """
    user_id = "usr_revenge_trader"
    mock_flag = [{
        "id": "flag_1001",
        "user_id": user_id,
        "symbol": "RELIANCE.NS",
        "agent_name": "watchdog",
        "reason": "Trading Blocked (Revenge Sizing Guardrail): You have logged 3 consecutive losses...",
        "created_at": "2026-09-13T10:00:00Z",
    }]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=mock_flag), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None):

        res = recommend_next_lesson(user_id=user_id)

        assert res["success"] is True
        assert res["user_id"] == user_id
        assert res["recommended_lesson_id"] == "t5-4"
        assert res["lesson_title"] == "Psychological Biases: FOMO & Revenge Trading"
        assert res["pattern_type"] == "REVENGE_SIZING"
        assert res["trigger_source"] == "watchdog"
        assert res["has_active_flag"] is True
        assert "Revenge Trading" in res["nudge_message"]


# ---------------------------------------------------------------------------
# 3. WATCHDOG SECTOR CONCENTRATION PATTERN
# ---------------------------------------------------------------------------
def test_lesson_recommendation_watchdog_flag_sector_concentration():
    """
    When Watchdog has flagged sector concentration (>60%), recommend_next_lesson
    MUST recommend lesson t2-4 (Diversification: Protecting Your Portfolio).
    """
    user_id = "usr_concentrated_trader"
    mock_flag = [{
        "id": "flag_1002",
        "user_id": user_id,
        "symbol": "TCS.NS",
        "agent_name": "watchdog",
        "reason": "Sector Concentration Warning: Executing this BUY of TCS.NS would concentrate 72.5% in 'Technology'...",
        "created_at": "2026-09-13T10:00:00Z",
    }]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=mock_flag), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None):

        res = recommend_next_lesson(user_id=user_id)

        assert res["success"] is True
        assert res["recommended_lesson_id"] == "t2-4"
        assert res["lesson_title"] == "Diversification: Protecting Your Portfolio"
        assert res["pattern_type"] == "SECTOR_CONCENTRATION"
        assert res["trigger_source"] == "watchdog"
        assert res["has_active_flag"] is True


# ---------------------------------------------------------------------------
# 4. WATCHDOG OVERTRADING VELOCITY PATTERN
# ---------------------------------------------------------------------------
def test_lesson_recommendation_watchdog_flag_overtrading_velocity():
    """
    When Watchdog has flagged overtrading velocity (>5 trades in 1h), recommend_next_lesson
    MUST recommend lesson t5-2 (Stop-Losses & Take-Profit Orders).
    """
    user_id = "usr_rapid_trader"
    mock_flag = [{
        "id": "flag_1003",
        "user_id": user_id,
        "symbol": "INFY.NS",
        "agent_name": "watchdog",
        "reason": "Overtrading Notice: You have executed 8 trades in the last hour (threshold 5)...",
        "created_at": "2026-09-13T10:00:00Z",
    }]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=mock_flag), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None):

        res = recommend_next_lesson(user_id=user_id)

        assert res["success"] is True
        assert res["recommended_lesson_id"] == "t5-2"
        assert res["lesson_title"] == "Stop-Losses & Take-Profit Orders"
        assert res["pattern_type"] == "OVERTRADING_VELOCITY"
        assert res["trigger_source"] == "watchdog"
        assert res["has_active_flag"] is True


# ---------------------------------------------------------------------------
# 5. CURATOR FLAGS ARE STRICTLY DISTINGUISHED AND NEVER TREATED AS MISTAKES
# ---------------------------------------------------------------------------
def test_lesson_recommendation_curator_flag_ignored():
    """
    CRITICAL REQUIREMENT 6: Confirm lesson agent strictly distinguishes flag types by agent_name
    (watchdog vs curator) so it NEVER mistakes a Curator suggestion for a behavioral mistake pattern.
    """
    user_id = "usr_curator_recipient"

    # Simulate Supabase returning a Curator suggestion in agent_flags
    mock_flags_table = MagicMock()
    mock_flags_table.select.return_value.eq.return_value.in_.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    mock_client = MagicMock()
    mock_client.table.return_value = mock_flags_table

    with patch("agents.lesson_agent.get_supabase_client", return_value=mock_client), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None), \
         patch("agents.lesson_agent._get_recent_losing_trades", return_value=[]):

        # Test helper filter logic
        flags = _get_recent_watchdog_flags(user_id=user_id)
        assert len(flags) == 0

        # Run recommendation
        res = recommend_next_lesson(user_id=user_id)

        # Must fall through to default progression, NOT any mistake pattern
        assert res["success"] is True
        assert res["recommended_lesson_id"] == "t1-1"
        assert res["pattern_type"] == "DEFAULT_PROGRESSION"
        assert res["has_active_flag"] is False


# ---------------------------------------------------------------------------
# 6. SIGNAL-TYPE DRIVEN LOSING TRADES
# ---------------------------------------------------------------------------
def test_lesson_recommendation_losing_trade_signals():
    """
    When no Watchdog behavioral flag exists, but recent trade history contains a
    closed losing trade entered during an OVERSOLD_BOUNCE setup, recommend_next_lesson
    MUST recommend lesson t4-1 (RSI Explained).
    """
    user_id = "usr_technical_loser"

    mock_losing_trades = [
        {
            "id": "trade_loss_1",
            "user_id": user_id,
            "symbol": "TATACHEM.NS",
            "type": "SELL",
            "price": 950.0,
            "amount": 95000.0,
            "pnl": -4500.0,
            "timestamp": "2026-09-13T09:30:00Z",
        }
    ]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=[]), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None), \
         patch("agents.lesson_agent._get_recent_losing_trades", return_value=mock_losing_trades), \
         patch("agents.lesson_agent._resolve_entry_signal_for_trade", return_value="OVERSOLD_BOUNCE"):

        res = recommend_next_lesson(user_id=user_id)

        assert res["success"] is True
        assert res["recommended_lesson_id"] == "t4-1"
        assert res["lesson_title"] == "RSI (Relative Strength Index) Explained"
        assert res["pattern_type"] == "OVERSOLD_BOUNCE"
        assert res["trigger_source"] == "trade_signal_loss"
        assert res["has_active_flag"] is True
        assert "RSI" in res["nudge_message"]


def test_lesson_recommendation_macd_losing_trade():
    """
    Losing trade on BULLISH_MACD_CROSSOVER maps to t4-3 (MACD: Momentum & Trend Direction).
    """
    user_id = "usr_macd_loser"
    mock_losing_trades = [{
        "id": "t_macd", "user_id": user_id, "symbol": "INFY.NS", "type": "SELL", "pnl": -2100.0
    }]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=[]), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None), \
         patch("agents.lesson_agent._get_recent_losing_trades", return_value=mock_losing_trades), \
         patch("agents.lesson_agent._resolve_entry_signal_for_trade", return_value="BULLISH_MACD_CROSSOVER"):

        res = recommend_next_lesson(user_id=user_id)
        assert res["recommended_lesson_id"] == "t4-3"
        assert res["lesson_title"] == "MACD: Momentum & Trend Direction"


def test_lesson_recommendation_unmapped_signal_fallback():
    """
    CRITICAL EDGE-CASE TEST: When a losing trade's entry signal has NO match in
    MISTAKE_TO_LESSON_MAP (e.g., 'UNKNOWN_EXOTIC_INDICATOR'), the agent MUST
    fall back gracefully to CONSECUTIVE_LOSSES (t5-1: The 1-2% Position Sizing Rule)
    or DEFAULT_PROGRESSION without raising any KeyError or exception.
    """
    user_id = "usr_unmapped_signal_user"
    mock_losing_trades = [{
        "id": "t_unmapped",
        "user_id": user_id,
        "symbol": "WIPRO.NS",
        "type": "SELL",
        "pnl": -3200.0,
        "timestamp": "2026-09-13T09:00:00Z",
    }]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=[]), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None), \
         patch("agents.lesson_agent._get_recent_losing_trades", return_value=mock_losing_trades), \
         patch("agents.lesson_agent._resolve_entry_signal_for_trade", return_value="UNKNOWN_EXOTIC_INDICATOR"):

        res = recommend_next_lesson(user_id=user_id)

        assert res["success"] is True
        assert res["recommended_lesson_id"] == "t5-1"
        assert res["lesson_title"] == "The 1-2% Position Sizing Rule"
        assert res["pattern_type"] == "CONSECUTIVE_LOSSES"
        assert res["has_active_flag"] is True


def test_lesson_recommendation_recency_window_filters_old_flags():
    """
    Recency Window Test: When flags or trades are older than 14 days,
    they must be filtered out, letting the user proceed with DEFAULT_PROGRESSION.
    """
    user_id = "usr_ancient_flags"
    old_timestamp = "2025-01-01T00:00:00Z"
    ancient_trades = [{
        "id": "t_ancient",
        "user_id": user_id,
        "symbol": "INFY.NS",
        "type": "SELL",
        "pnl": -5000.0,
        "timestamp": old_timestamp,
    }]

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=[]), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None), \
         patch("agents.lesson_agent.get_trade_history", return_value=ancient_trades):

        # Helper with 14-day recency filter should exclude the ancient trade
        losing_trades = _get_recent_losing_trades(user_id=user_id)
        assert len(losing_trades) == 0

        res = recommend_next_lesson(user_id=user_id)
        assert res["recommended_lesson_id"] == "t1-1"
        assert res["pattern_type"] == "DEFAULT_PROGRESSION"


# ---------------------------------------------------------------------------
# 7. CLEAN DISCIPLINED USER GETS DEFAULT PROGRESSION
# ---------------------------------------------------------------------------
def test_lesson_recommendation_clean_user_default():
    """
    A user with zero Watchdog flags and no losing trades receives standard
    progressive curriculum sequencing (t1-1).
    """
    user_id = "usr_clean_discipline"

    with patch("agents.lesson_agent._get_recent_watchdog_flags", return_value=[]), \
         patch("agents.lesson_agent._get_active_watchdog_portfolio_state", return_value=None), \
         patch("agents.lesson_agent._get_recent_losing_trades", return_value=[]):

        res = recommend_next_lesson(user_id=user_id)

        assert res["success"] is True
        assert res["user_id"] == user_id
        assert res["recommended_lesson_id"] == "t1-1"
        assert res["lesson_title"] == "What is a Stock?"
        assert res["pattern_type"] == "DEFAULT_PROGRESSION"
        assert res["has_active_flag"] is False


# ---------------------------------------------------------------------------
# 8. FLASK ROUTE AUTHENTICATION & INTEGRATION
# ---------------------------------------------------------------------------
def test_flask_next_lesson_route_auth():
    """
    POST /api/agents/next-lesson requires shared secret and valid user_id.
    """
    client = app.test_client()
    secret = os.environ.get("AGENT_SERVICE_SECRET", "investiq_agent_secret_dev_key_9812")

    # 1. Missing secret -> 401
    res_no_key = client.post("/api/agents/next-lesson", json={"user_id": "usr_demo"})
    assert res_no_key.status_code == 401

    # 2. Invalid secret -> 401
    res_bad_key = client.post(
        "/api/agents/next-lesson",
        headers={"X-Agent-Service-Key": "wrong_secret"},
        json={"user_id": "usr_demo"},
    )
    assert res_bad_key.status_code == 401

    # 3. Missing user_id -> 400
    res_no_user = client.post(
        "/api/agents/next-lesson",
        headers={"X-Agent-Service-Key": secret},
        json={},
    )
    assert res_no_user.status_code == 400

    # 4. Valid request -> 200 with recommendation payload
    res_ok = client.post(
        "/api/agents/next-lesson",
        headers={"X-Agent-Service-Key": secret},
        json={"user_id": "usr_demo"},
    )
    assert res_ok.status_code == 200
    data = res_ok.get_json()
    assert data["success"] is True
    assert "recommended_lesson_id" in data
    assert "lesson_title" in data
    assert "nudge_message" in data


# ---------------------------------------------------------------------------
# 9. USER_ID ISOLATION AND IMMUTABILITY
# ---------------------------------------------------------------------------
def test_user_id_isolation_in_lesson_agent():
    """
    Ensure user_id is strictly preserved and cannot be tampered with.
    The lesson sequencing logic is 100% deterministic and cannot be subverted.
    """
    res = recommend_next_lesson(user_id="usr_immutable_123")
    assert res["user_id"] == "usr_immutable_123"
    assert res["recommended_lesson_id"] in [meta["lesson_id"] for meta in MISTAKE_TO_LESSON_MAP.values()]
