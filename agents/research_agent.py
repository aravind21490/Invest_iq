"""
agents/research_agent.py - Interactive Research Agent for Invest IQ

Answers user queries on market metrics, technical setups, backtested win rates,
and user trading patterns using the bounded multi-step runner.
Read-only: NEVER calls buy(), sell(), or any order execution path.
"""

import time
import logging
from typing import Dict, List, Any, Optional

from agents.runner import run_agent
from agents.toolbox import (
    get_indicators,
    get_signals,
    get_win_rate,
    get_trade_history,
    get_user_watchlist,
    get_recent_trade_pattern,
)

logger = logging.getLogger("investiq.agents.research")

EDUCATIONAL_DISCLAIMER = (
    "SIMULATION ONLY — Educational Context, Not Investment Advice. All technical indicators "
    "and historical win rates represent past probabilistic patterns and are strictly for educational practice. "
    "Invest IQ is not a SEBI-registered investment advisor, and this is not an invitation to execute real financial trades."
)


def answer_question(user_id: str, question: str) -> Dict[str, Any]:
    """
    Execute educational research inquiry for an authenticated user.
    
    Guarantees:
    - Exposes all 6 read-only toolbox functions to the LLM runner:
      [get_indicators, get_signals, get_win_rate, get_trade_history, get_user_watchlist, get_recent_trade_pattern]
    - The LLM dynamically decides which tools to call and in what order based on the question.
    - Bound at at most 4 steps to guarantee sub-minute responsiveness.
    - Strict read-only: No order placement or account mutation functions are exposed or callable.
    - Returns the final answer PLUS the full tool-call trace (tools called, order, arguments, results).
    """
    start_time = time.time()
    user_id_str = str(user_id).strip()
    clean_question = str(question).strip()

    if not clean_question:
        return {
            "success": False,
            "user_id": user_id_str,
            "error": "Question cannot be empty.",
            "answer": "Please provide a valid market or trading question.",
            "tool_trace": [],
            "steps_taken": 0,
            "provider": "Invest IQ Engine",
            "latency_ms": 0,
        }

    # Bind the authenticated session user_id to user-scoped tools before schema generation.
    # The functions exposed to the runner have user_id bound into their closures,
    # ensuring the LLM never sees or sets user_id.
    def user_watchlist_tool() -> List[str]:
        """Retrieve the current authenticated user's active simulated watchlist symbols."""
        return get_user_watchlist(user_id=user_id_str)
    user_watchlist_tool.__name__ = "get_user_watchlist"

    def trade_history_tool() -> List[Dict[str, Any]]:
        """Retrieve the current authenticated user's past simulated trade and order history."""
        return get_trade_history(user_id=user_id_str)
    trade_history_tool.__name__ = "get_trade_history"

    def trade_pattern_tool(window: str = "24h") -> Dict[str, Any]:
        """Analyze the current authenticated user's recent trading velocity, average sizing, and sector concentration."""
        return get_recent_trade_pattern(user_id=user_id_str, window=window)
    trade_pattern_tool.__name__ = "get_recent_trade_pattern"

    # All 6 allowed read-only tools
    allowed_tools = [
        get_indicators,
        get_signals,
        get_win_rate,
        trade_history_tool,
        user_watchlist_tool,
        trade_pattern_tool,
    ]

    system_prompt = (
        "You are the Invest IQ Research Agent, an expert educational financial analyst and market researcher. "
        "Your role is strictly educational. You have access to technical indicator calculations, technical signal detectors, "
        "empirical backtested win-rates, user watchlist symbols, and simulated trade records. "
        "When answering user questions, decide which tools to call and in what order to gather objective data. "
        "Always explain the computed technical indicators (such as RSI, MACD, volume) and historical probabilities in plain English. "
        "NEVER give personal financial advice or instruct the user to 'buy' or 'sell'. "
        "Always emphasize risk management and probabilistic market context."
    )

    context = {
        "user_id": user_id_str,
        "question": clean_question,
    }

    agent_res = run_agent(
        goal=clean_question,
        allowed_tools=allowed_tools,
        context=context,
        system_prompt=system_prompt,
        max_steps=4,
    )

    raw_content = agent_res.get("content") or ""
    if not raw_content and agent_res.get("structured"):
        raw_content = (agent_res.get("structured") or {}).get("summary", "")

    # Ensure educational disclaimer is always present whenever stocks, trades, or win-rates are discussed
    final_answer = raw_content.strip()
    if "SIMULATION ONLY" not in final_answer:
        final_answer = f"{final_answer}\n\n{EDUCATIONAL_DISCLAIMER}"

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "success": True,
        "user_id": user_id_str,
        "question": clean_question,
        "answer": final_answer,
        "tool_trace": agent_res.get("tool_trace", []),
        "steps_taken": agent_res.get("steps_taken", 0),
        "provider": agent_res.get("provider", "Invest IQ Engine"),
        "latency_ms": latency_ms,
    }
