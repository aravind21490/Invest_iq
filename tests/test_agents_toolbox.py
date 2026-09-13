"""
tests/test_agents_toolbox.py - Test suite for Phase 1 shared toolbox
"""

import os
import pytest
from datetime import datetime

from agents.toolbox import (
    get_trade_history,
    get_indicators,
    get_signals,
    get_win_rate,
    get_user_watchlist,
    scan_universe_for_signals,
    get_recent_trade_pattern,
    DEFAULT_WATCHLIST,
)


def test_get_trade_history():
    """Verify get_trade_history returns a list of dictionaries with standard schema."""
    trades = get_trade_history("usr_demo")
    assert isinstance(trades, list)
    if trades:
        t = trades[0]
        assert "id" in t
        assert "symbol" in t
        assert "type" in t
        assert t["type"] in ("BUY", "SELL")
        assert "shares" in t
        assert "price" in t


def test_get_indicators_current_and_historical():
    """Verify indicators computation for current and historical reconstructed state."""
    # Current
    curr = get_indicators("RELIANCE.NS")
    assert "symbol" in curr
    assert curr["symbol"] == "RELIANCE.NS"
    assert "snapshot" in curr
    assert "rsi" in curr["snapshot"]
    assert "macd" in curr["snapshot"]
    assert "bollinger" in curr["snapshot"]

    # Historical reconstruction
    hist = get_indicators("RELIANCE.NS", as_of_date="2025-01-15")
    assert "symbol" in hist
    assert "snapshot" in hist
    assert hist.get("as_of_date") is not None


def test_get_signals():
    """Verify signal detection returns analyzed results with primary signal and snapshot."""
    sig_result = get_signals("TCS.NS")
    assert sig_result["symbol"] == "TCS.NS"
    assert "signals" in sig_result
    assert "primary_signal" in sig_result
    assert "snapshot" in sig_result


def test_get_win_rate():
    """Verify get_win_rate returns valid empirical stats and forward window metrics."""
    res = get_win_rate("OVERSOLD_BOUNCE", forward_days=10)
    assert res["signal_type"] == "OVERSOLD_BOUNCE"
    assert 0.0 <= res["win_rate_pct"] <= 100.0
    assert res["sample_size"] > 0
    assert "summary_text" in res


def test_get_user_watchlist_fallback():
    """Verify watchlist retrieval falls back to default 6 core tickers when no user rows exist."""
    symbols = get_user_watchlist("non_existent_user_99999")
    assert isinstance(symbols, list)
    assert len(symbols) == 6
    assert symbols == DEFAULT_WATCHLIST


def test_scan_universe_for_signals():
    """Verify scanning universe respects excluded symbols."""
    excluded = ["RELIANCE.NS", "TCS.NS"]
    results = scan_universe_for_signals(exclude_symbols=excluded)
    assert isinstance(results, list)
    symbols_scanned = [r["symbol"] for r in results]
    for ex in excluded:
        assert ex not in symbols_scanned


def test_get_recent_trade_pattern():
    """Verify trade velocity, sizing, and sector concentration computation."""
    pattern = get_recent_trade_pattern("usr_demo", window="24h")
    assert "trade_count" in pattern
    assert "average_position_size" in pattern
    assert "sector_concentration_pct" in pattern
    assert "consecutive_losses" in pattern
    assert pattern["user_id"] == "usr_demo"
