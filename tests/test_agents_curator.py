"""
tests/test_agents_curator.py - Unit and Route Tests for Watchlist Curator Agent
"""

import os
import sys
import time
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

from agents.curator_agent import (
    run_daily_curation,
    run_batch_curation,
    rank_candidates_deterministically,
    MAX_DAILY_SUGGESTIONS,
    FLAG_RECENCY_DAYS,
    MAX_BATCH_ACTIVE_USERS,
    _get_active_users,
)
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_curator_filters_watchlist_and_recency():
    """Verify curator excludes symbols already on watchlist or flagged in last 14 days."""
    user_id = "usr_curator_test_1"

    # Mock watchlist returns RELIANCE and TCS
    with patch("agents.curator_agent.get_user_watchlist") as mock_wl, \
         patch("agents.curator_agent._get_recent_flagged_symbols") as mock_flags, \
         patch("agents.curator_agent.scan_universe_for_signals") as mock_scan, \
         patch("agents.curator_agent._get_today_curator_flags") as mock_today, \
         patch("agents.curator_agent._record_curator_results") as mock_record, \
         patch("agents.curator_agent.run_agent") as mock_run_agent:

        mock_today.return_value = []
        mock_wl.return_value = ["RELIANCE.NS", "TCS.NS"]
        mock_flags.return_value = {"INFY.NS"}

        mock_scan.return_value = [
            {
                "symbol": "TATAMOTORS.NS",
                "name": "Tata Motors",
                "sector": "Automobile",
                "price": 950.0,
                "primary_signal": {
                    "signal_type": "OVERSOLD_BOUNCE",
                    "title": "Oversold Bounce",
                    "intensity": "Strong",
                    "key_stats": {"volume_ratio": 1.6, "rsi": 22.0},
                },
            },
            {
                "symbol": "SBIN.NS",
                "name": "State Bank of India",
                "sector": "Financial Services",
                "price": 820.0,
                "primary_signal": {
                    "signal_type": "BULLISH_MACD_CROSSOVER",
                    "title": "Bullish MACD Crossover",
                    "intensity": "High",
                    "key_stats": {"volume_ratio": 1.4, "rsi": 48.0},
                },
            },
        ]

        mock_run_agent.return_value = {
            "structured": {
                "suggestions": [
                    {
                        "symbol": "TATAMOTORS.NS",
                        "setup_title": "Oversold Bounce",
                        "reason": "Tata Motors tests 14-day oversold support with high volume confirmation.",
                    },
                    {
                        "symbol": "SBIN.NS",
                        "setup_title": "Bullish MACD Crossover",
                        "reason": "State Bank of India forms positive momentum crossover above signal line.",
                    },
                ]
            },
            "provider": "Mock LLM",
        }

        result = run_daily_curation(user_id)

        assert result["success"] is True
        assert result["count"] == 2
        symbols = [s["symbol"] for s in result["suggestions"]]
        assert "TATAMOTORS.NS" in symbols
        assert "SBIN.NS" in symbols
        # Excluded symbols must never appear
        assert "RELIANCE.NS" not in symbols
        assert "TCS.NS" not in symbols
        assert "INFY.NS" not in symbols

        # Verify scan_universe_for_signals received all excluded symbols
        mock_scan.assert_called_once()
        called_exclusions = mock_scan.call_args[1].get("exclude_symbols", [])
        assert "RELIANCE.NS" in called_exclusions
        assert "TCS.NS" in called_exclusions
        assert "INFY.NS" in called_exclusions


def test_curator_deterministic_ranking():
    """Verify deterministic ranking prefers strong signals and diverse sectors."""
    candidates = [
        {
            "symbol": "STOCK_A.NS",
            "sector": "Tech",
            "price": 100.0,
            "primary_signal": {
                "signal_type": "NEUTRAL_CONSOLIDATION",
                "intensity": "Neutral",
            },
        },
        {
            "symbol": "STOCK_B.NS",
            "sector": "Auto",
            "price": 200.0,
            "primary_signal": {
                "signal_type": "OVERSOLD_BOUNCE",
                "intensity": "Strong",
                "key_stats": {"volume_ratio": 1.8},
            },
        },
        {
            "symbol": "STOCK_C.NS",
            "sector": "Auto", # Same sector as B
            "price": 300.0,
            "primary_signal": {
                "signal_type": "BULLISH_MACD_CROSSOVER",
                "intensity": "Moderate",
                "key_stats": {"volume_ratio": 1.0},
            },
        },
        {
            "symbol": "STOCK_D.NS",
            "sector": "Energy",
            "price": 400.0,
            "primary_signal": {
                "signal_type": "VOLATILITY_SQUEEZE",
                "intensity": "Noteworthy",
                "key_stats": {"volume_ratio": 1.2},
            },
        },
    ]

    ranked = rank_candidates_deterministically(candidates, max_picks=2)

    assert len(ranked) == 2
    # Stock B (Oversold Strong) must rank #1
    assert ranked[0]["candidate"]["symbol"] == "STOCK_B.NS"
    # Stock D (Energy sector, distinct from Auto) must rank #2 due to sector diversification
    assert ranked[1]["candidate"]["symbol"] == "STOCK_D.NS"
    # Stock A (Neutral) must be filtered out
    symbols = [r["candidate"]["symbol"] for r in ranked]
    assert "STOCK_A.NS" not in symbols


def test_curator_hard_cap_3():
    """Verify that if user already has 3 suggestions today, no scan/LLM work is executed."""
    user_id = "usr_curator_test_cap"

    with patch("agents.curator_agent._get_today_curator_flags") as mock_today, \
         patch("agents.curator_agent.scan_universe_for_signals") as mock_scan, \
         patch("agents.curator_agent.run_agent") as mock_run_agent:

        # User already has 3 curator flags from today
        mock_today.return_value = [
            {"symbol": "TCS.NS", "reason": "Reason 1", "created_at": "2026-09-12T04:00:00Z"},
            {"symbol": "INFY.NS", "reason": "Reason 2", "created_at": "2026-09-12T04:00:00Z"},
            {"symbol": "WIPRO.NS", "reason": "Reason 3", "created_at": "2026-09-12T04:00:00Z"},
        ]

        result = run_daily_curation(user_id, force_refresh=False)

        assert result["success"] is True
        assert result["capped"] is True
        assert result["count"] == 3
        assert result["llm_calls"] == 0
        assert "cap reached" in result["message"].lower()

        # Zero scans and zero LLM calls must have been made
        mock_scan.assert_not_called()
        mock_run_agent.assert_not_called()


def test_curator_never_auto_adds_to_watchlist():
    """Confirm curator persistence only writes to agent_flags/agent_runs, never user_watchlists."""
    user_id = "usr_curator_safe_test"

    with patch("agents.curator_agent.get_user_watchlist") as mock_wl, \
         patch("agents.curator_agent._get_recent_flagged_symbols") as mock_flags, \
         patch("agents.curator_agent.scan_universe_for_signals") as mock_scan, \
         patch("agents.curator_agent._get_today_curator_flags") as mock_today, \
         patch("agents.curator_agent._record_curator_results") as mock_record, \
         patch("agents.curator_agent.run_agent") as mock_run_agent, \
         patch("agents.toolbox.get_supabase_client") as mock_sb:

        mock_today.return_value = []
        mock_wl.return_value = ["RELIANCE.NS"]
        mock_flags.return_value = set()
        mock_scan.return_value = [
            {
                "symbol": "HDFCBANK.NS",
                "sector": "Banking",
                "price": 1600.0,
                "primary_signal": {
                    "signal_type": "OVERSOLD_BOUNCE",
                    "intensity": "Strong",
                    "key_stats": {"volume_ratio": 1.5},
                },
            }
        ]
        mock_run_agent.return_value = {
            "structured": {
                "suggestions": [
                    {
                        "symbol": "HDFCBANK.NS",
                        "setup_title": "Oversold Bounce",
                        "reason": "HDFC Bank tests oversold support.",
                    }
                ]
            },
            "provider": "Mock LLM",
        }

        mock_client = MagicMock()
        mock_sb.return_value = mock_client

        res = run_daily_curation(user_id)
        assert res["success"] is True

        # _record_curator_results was called
        mock_record.assert_called_once()
        # Verify user_watchlists table was NEVER inserted into
        for call in mock_client.table.mock_calls:
            assert "user_watchlists" not in str(call), "user_watchlists table must NEVER be written by curator!"


def test_flask_curate_route_auth(client):
    """Verify POST /api/agents/curate route security and execution."""
    secret = os.environ.get("AGENT_SERVICE_SECRET", "investiq_agent_secret_dev_key_9812")

    # 1. Unauthenticated (401)
    res_unauth = client.post("/api/agents/curate", json={"userId": "usr_demo"})
    assert res_unauth.status_code == 401

    # 2. Authenticated single user (200)
    with patch("agents.curator_agent.run_daily_curation") as mock_curate:
        mock_curate.return_value = {
            "success": True,
            "user_id": "usr_demo",
            "count": 2,
            "suggestions": [{"symbol": "TATAMOTORS.NS", "reason": "Test reason"}],
            "llm_calls": 1,
        }

        res_auth = client.post(
            "/api/agents/curate",
            headers={"X-Agent-Service-Key": secret},
            json={"userId": "usr_demo"},
        )
        assert res_auth.status_code == 200
        data = res_auth.get_json()
        assert data["success"] is True
        assert data["count"] == 2

    # 3. Authenticated batch mode (200)
    with patch("agents.curator_agent.run_batch_curation") as mock_batch:
        mock_batch.return_value = {
            "success": True,
            "users_curated": 3,
            "total_llm_calls": 3,
            "results": [],
        }

        res_batch = client.post(
            "/api/agents/curate",
            headers={"X-Agent-Service-Key": secret},
            json={"batch": True},
        )
        assert res_batch.status_code == 200
        data_b = res_batch.get_json()
        assert data_b["success"] is True
        assert data_b["users_curated"] == 3


def test_get_active_users_fallback_cap_exceeded():
    """Verify _get_active_users fallback caps at MAX_BATCH_ACTIVE_USERS (50) prioritized by updated_at DESC."""
    # Simulate 65 registered accounts with initialized portfolios and NO session/trade data
    base_time = datetime(2026, 9, 12, 10, 0, 0, tzinfo=timezone.utc)
    mock_portfolios = [
        {
            "user_id": f"usr_test_{i:03d}",
            "updated_at": (base_time + timedelta(minutes=i)).isoformat(),
        }
        for i in range(65)
    ]
    # In mock_portfolios:
    # i=0 is the oldest (10:00:00)
    # i=64 is the newest (11:04:00)
    # The 50 most recently active should be i=15 to i=64 (ordered newest first: i=64 down to i=15)
    expected_top_50 = [f"usr_test_{i:03d}" for i in range(64, 14, -1)]
    assert len(expected_top_50) == 50

    mock_client = MagicMock()
    # No sessions and no trades found (simulating broken session tracking / zero trades)
    mock_sessions_res = MagicMock(data=[])
    mock_trades_res = MagicMock(data=[])
    mock_portfolios_res = MagicMock(data=mock_portfolios)

    def table_router(table_name):
        mock_table = MagicMock()
        if table_name == "sessions":
            mock_table.select.return_value.gte.return_value.execute.return_value = mock_sessions_res
        elif table_name == "trades":
            mock_table.select.return_value.gte.return_value.execute.return_value = mock_trades_res
        elif table_name == "portfolios":
            mock_table.select.return_value.order.return_value.execute.return_value = mock_portfolios_res
        return mock_table

    mock_client.table.side_effect = table_router

    with patch("agents.curator_agent.get_supabase_client", return_value=mock_client):
        active_users = _get_active_users()

        # 1. Must return exactly MAX_BATCH_ACTIVE_USERS (50), not 65
        assert len(active_users) == 50
        assert len(active_users) == MAX_BATCH_ACTIVE_USERS

        # 2. Must be precisely the 50 most recently updated accounts
        assert active_users == expected_top_50

        # 3. Oldest 15 accounts (i=0 to i=14) must NOT be included
        for i in range(15):
            assert f"usr_test_{i:03d}" not in active_users


def test_get_active_users_fallback_below_cap_unaffected():
    """Verify that when registered user count is below 50, fallback cap has no effect."""
    base_time = datetime(2026, 9, 12, 10, 0, 0, tzinfo=timezone.utc)
    mock_portfolios = [
        {
            "user_id": f"usr_small_{i:02d}",
            "updated_at": (base_time + timedelta(minutes=i)).isoformat(),
        }
        for i in range(20)
    ]
    # Expected: all 20 users returned, sorted by updated_at DESC (19 down to 0)
    expected_users = [f"usr_small_{i:02d}" for i in range(19, -1, -1)]

    mock_client = MagicMock()
    mock_sessions_res = MagicMock(data=[])
    mock_trades_res = MagicMock(data=[])
    mock_portfolios_res = MagicMock(data=mock_portfolios)

    def table_router(table_name):
        mock_table = MagicMock()
        if table_name == "sessions":
            mock_table.select.return_value.gte.return_value.execute.return_value = mock_sessions_res
        elif table_name == "trades":
            mock_table.select.return_value.gte.return_value.execute.return_value = mock_trades_res
        elif table_name == "portfolios":
            mock_table.select.return_value.order.return_value.execute.return_value = mock_portfolios_res
        return mock_table

    mock_client.table.side_effect = table_router

    with patch("agents.curator_agent.get_supabase_client", return_value=mock_client):
        active_users = _get_active_users()

        # Result count must remain unchanged at 20 (not truncated)
        assert len(active_users) == 20
        assert active_users == expected_users


def test_get_active_users_sqlite_fallback_cap():
    """Verify SQLite fallback path also caps at MAX_BATCH_ACTIVE_USERS (50) sorted by updated_at DESC."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur

    # No trades in last N days
    mock_cur.fetchall.side_effect = [
        [],  # trades query returns empty
        [    # portfolios query returns 60 rows
            (f"usr_sqlite_{i:03d}", f"2026-09-12 12:{60-i:02d}:00")
            for i in range(60)
        ],
    ]

    with patch("agents.curator_agent.get_supabase_client", return_value=None), \
         patch("agents.curator_agent.get_db_connection", return_value=mock_conn):
        active_users = _get_active_users()

        assert len(active_users) == 50
        assert active_users[0] == "usr_sqlite_000"
        assert active_users[49] == "usr_sqlite_049"
        assert "usr_sqlite_050" not in active_users


def test_get_active_users_primary_recency_cap_exceeded():
    """
    CRITICAL TEST: Verify primary recency-scoped path (sessions + trades) caps at
    MAX_BATCH_ACTIVE_USERS (50) prioritized by most recent activity timestamp DESC,
    ensuring a daily batch run NEVER exceeds 50 users even with real active user growth.
    """
    base_time = datetime(2026, 9, 12, 10, 0, 0, tzinfo=timezone.utc)
    # Simulate 70 unique active users across sessions and trades
    # Sessions: users 000..039
    mock_sessions = [
        {
            "user_id": f"usr_rec_{i:03d}",
            "created_at": (base_time + timedelta(minutes=i)).isoformat(),
        }
        for i in range(40)
    ]
    # Trades: users 030..069 (overlapping 30..39, unique total = 70)
    mock_trades = [
        {
            "user_id": f"usr_rec_{i:03d}",
            "timestamp": (base_time + timedelta(minutes=i)).isoformat(),
        }
        for i in range(30, 70)
    ]
    # Expected top 50: users 069 down to 020 (ordered descending by activity timestamp)
    expected_top_50 = [f"usr_rec_{i:03d}" for i in range(69, 19, -1)]
    assert len(expected_top_50) == 50

    mock_client = MagicMock()
    mock_sessions_res = MagicMock(data=mock_sessions)
    mock_trades_res = MagicMock(data=mock_trades)
    mock_portfolios_res = MagicMock(data=[])

    def table_router(table_name):
        mock_table = MagicMock()
        if table_name == "sessions":
            mock_table.select.return_value.gte.return_value.execute.return_value = mock_sessions_res
        elif table_name == "trades":
            mock_table.select.return_value.gte.return_value.execute.return_value = mock_trades_res
        elif table_name == "portfolios":
            mock_table.select.return_value.order.return_value.execute.return_value = mock_portfolios_res
        return mock_table

    mock_client.table.side_effect = table_router

    with patch("agents.curator_agent.get_supabase_client", return_value=mock_client):
        active_users = _get_active_users()

        # 1. Must return exactly MAX_BATCH_ACTIVE_USERS (50), NOT 70
        assert len(active_users) == 50
        assert len(active_users) == MAX_BATCH_ACTIVE_USERS

        # 2. Must be precisely the 50 most recently active users sorted DESC
        assert active_users == expected_top_50

        # 3. Oldest 20 users (usr_rec_000 to usr_rec_019) must NOT be present
        for i in range(20):
            assert f"usr_rec_{i:03d}" not in active_users


def test_get_active_users_sqlite_primary_recency_cap():
    """Verify SQLite primary path also caps at MAX_BATCH_ACTIVE_USERS (50) sorted by timestamp DESC."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur

    # 65 users active in trades within cutoff
    mock_cur.fetchall.side_effect = [
        [
            (f"usr_sqlite_rec_{i:03d}", f"2026-09-12 12:{i:02d}:00")
            for i in range(65)
        ],
        [],  # sessions empty
    ]

    expected_top_50 = [f"usr_sqlite_rec_{i:03d}" for i in range(64, 14, -1)]

    with patch("agents.curator_agent.get_supabase_client", return_value=None), \
         patch("agents.curator_agent.get_db_connection", return_value=mock_conn):
        active_users = _get_active_users()

        assert len(active_users) == 50
        assert active_users == expected_top_50
        assert "usr_sqlite_rec_000" not in active_users
