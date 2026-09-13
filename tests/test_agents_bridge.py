"""
tests/test_agents_bridge.py - Test suite for Flask Agent Bridge shared secret authentication
"""

import os
import pytest
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_agent_health_no_secret_header(client):
    """Verify endpoint rejects requests without X-Agent-Service-Key with 401."""
    res = client.get("/api/agents/health")
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert "Unauthorized" in data["error"]


def test_agent_health_invalid_secret_header(client):
    """Verify endpoint rejects requests with invalid secret key with 401."""
    res = client.get(
        "/api/agents/health",
        headers={"X-Agent-Service-Key": "completely_wrong_secret_123"},
    )
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False


def test_agent_health_valid_secret_header(client):
    """Verify endpoint accepts requests with matching secret key with 200 OK."""
    secret = os.environ.get("AGENT_SERVICE_SECRET", "investiq_agent_secret_dev_key_9812")
    res = client.get(
        "/api/agents/health",
        headers={"X-Agent-Service-Key": secret},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["status"] == "healthy"
    assert "Invest IQ Agent Engine" in data["service"]
