"""
tests/test_agents_runner.py - Test suite for Phase 1 shared agent runner
"""

import pytest
from agents.runner import run_agent, _build_function_schema


def dummy_tool_one(symbol: str) -> dict:
    """Mock analysis for a stock symbol."""
    return {"symbol": symbol, "status": "analyzed", "metric": 42.0}


def dummy_tool_two(limit: int = 5) -> list:
    """Mock listing items."""
    return ["item_" + str(i) for i in range(limit)]


def test_build_function_schema():
    """Verify inspection and schema generation for callable functions."""
    schema = _build_function_schema(dummy_tool_one)
    assert schema["type"] == "function"
    assert schema["function"]["name"] == "dummy_tool_one"
    assert "symbol" in schema["function"]["parameters"]["properties"]
    assert "symbol" in schema["function"]["parameters"]["required"]


def test_runner_deterministic_execution():
    """Verify runner handles deterministic orchestration with trace collection."""
    goal = "Analyze stock technicals and review trade history"
    result = run_agent(
        goal=goal,
        allowed_tools=[dummy_tool_one, dummy_tool_two],
        context={"symbol": "INFY.NS", "user_id": "usr_demo"},
        max_steps=4,
    )

    assert result["success"] is True
    assert "content" in result
    assert "tool_trace" in result
    assert isinstance(result["tool_trace"], list)
    assert result["steps_taken"] <= 4


def test_runner_bounded_steps_limit():
    """Verify runner never exceeds max_steps bound."""
    result = run_agent(
        goal="Simple query with max 2 steps",
        allowed_tools=[dummy_tool_one],
        context={"symbol": "TCS.NS"},
        max_steps=2,
    )
    assert result["steps_taken"] <= 2
