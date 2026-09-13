"""
tests/test_agents_debrief.py - Test suite for Phase 2 Post-Trade Debrief Agent
"""

import os
import pytest
from app import app
from agents.toolbox import get_trade_history
from agents.debrief_agent import generate_debrief


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_generate_debrief_for_real_trade():
    """Verify debrief generation for a real trade from test data."""
    trades = get_trade_history("usr_demo")
    assert len(trades) > 0, "No trades found for usr_demo"
    target_trade = trades[0]
    trade_id = str(target_trade["id"])

    # 1. First generation (live computation)
    result = generate_debrief(user_id="usr_demo", trade_id=trade_id)

    assert result["success"] is True
    assert result["trade_id"] == trade_id
    assert result["user_id"] == "usr_demo"
    assert "title" in result
    assert "summary" in result
    assert len(result["summary"]) > 20
    assert "lesson" in result
    assert "disclaimer" in result
    assert "SIMULATION ONLY" in result["disclaimer"]
    assert "entry_conditions" in result

    # 2. Second generation (must be served from agent_runs cache)
    cached_result = generate_debrief(user_id="usr_demo", trade_id=trade_id)
    assert cached_result["success"] is True
    assert cached_result.get("is_cached") is True


def test_generate_debrief_missing_trade():
    """Verify debrief handles missing trade cleanly with error."""
    result = generate_debrief(user_id="usr_demo", trade_id="ORD-NONEXISTENT-99999")
    assert result["success"] is False
    assert "error" in result


def test_flask_debrief_endpoint_auth(client):
    """Verify Flask POST /api/agents/debrief enforces shared-secret auth."""
    # 1. Missing secret header -> 401
    res = client.post("/api/agents/debrief", json={"user_id": "usr_demo", "trade_id": "ORD-94281"})
    assert res.status_code == 401

    # 2. Invalid secret header -> 401
    res = client.post(
        "/api/agents/debrief",
        headers={"X-Agent-Service-Key": "wrong_key"},
        json={"user_id": "usr_demo", "trade_id": "ORD-94281"},
    )
    assert res.status_code == 401

    # 3. Valid secret header -> 200
    secret = os.environ.get("AGENT_SERVICE_SECRET", "investiq_agent_secret_dev_key_9812")
    res = client.post(
        "/api/agents/debrief",
        headers={"X-Agent-Service-Key": secret},
        json={"user_id": "usr_demo", "trade_id": "ORD-94281"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "title" in data
    assert "summary" in data
