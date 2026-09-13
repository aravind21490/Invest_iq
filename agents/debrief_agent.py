"""
agents/debrief_agent.py - Post-Trade Debrief Agent (Phase 2)

Read-only, event-triggered educational agent that analyzes a closed trade (SELL):
1. Identifies the closed position (SELL order), exit price, and realized P&L.
2. Locates matching historical entry (BUY order) to reconstruct indicators & setups AT ENTRY.
3. Evaluates historical empirical win rate for the entry setup.
4. Generates a 2-4 sentence plain-English educational debrief with explicit Win/Loss framing.
5. Includes mandatory EDUCATIONAL_DISCLAIMER pattern.
6. Caches generated debriefs in `agent_runs` table to avoid unnecessary re-computation.
"""

import os
import json
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from explainer import EDUCATIONAL_DISCLAIMER
from agents.toolbox import (
    get_trade_history,
    get_indicators,
    get_signals,
    get_win_rate,
    get_supabase_client,
)
from agents.runner import run_agent
from models import get_db_connection

logger = logging.getLogger("investiq.agents.debrief")


def _get_cached_debrief(user_id: str, trade_id: str) -> Optional[Dict[str, Any]]:
    """Check agent_runs table in Supabase or local SQLite for an existing debrief."""
    client = get_supabase_client()
    if client:
        try:
            res = (
                client.table("agent_runs")
                .select("output")
                .eq("agent_name", "post_trade_debrief")
                .eq("user_id", str(user_id))
                .eq("trade_id", str(trade_id))
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                out = res.data[0]["output"]
                return json.loads(out) if isinstance(out, str) else out
        except Exception as e:
            logger.debug("Supabase agent_runs cache lookup error: %s", e)

    # Local DB fallback
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT output FROM agent_runs
            WHERE agent_name = %s AND user_id = %s AND trade_id = %s
            LIMIT 1
            """,
            ("post_trade_debrief", str(user_id), str(trade_id)),
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            raw = row[0] if isinstance(row, (list, tuple)) else row["output"]
            return json.loads(raw) if isinstance(raw, str) else raw
    except Exception as e:
        logger.debug("Local agent_runs lookup error: %s", e)

    return None


def _save_debrief_run(user_id: str, trade_id: str, debrief: Dict[str, Any]) -> None:
    """Store generated debrief in agent_runs table for audit log and caching."""
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    now_str = datetime.now().isoformat()
    output_json = json.dumps(debrief, default=str)

    client = get_supabase_client()
    if client:
        try:
            client.table("agent_runs").insert({
                "id": run_id,
                "agent_name": "post_trade_debrief",
                "user_id": str(user_id),
                "trade_id": str(trade_id),
                "output": debrief,
                "created_at": now_str,
            }).execute()
            return
        except Exception as e:
            logger.warning("Failed to cache debrief in Supabase agent_runs: %s", e)

    # Local DB fallback
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO agent_runs (id, agent_name, user_id, trade_id, output, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (run_id, "post_trade_debrief", str(user_id), str(trade_id), output_json, now_str),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Failed to save debrief in local agent_runs: %s", e)


def generate_debrief(user_id: str, trade_id: str) -> Dict[str, Any]:
    """
    Generate an educational post-trade debrief for a position exit.
    - Evaluates the closed trade (SELL order) with realized P&L.
    - Reconstructs technical indicators and setups as they were AT ENTRY (from matching BUY).
    - Evaluates historical empirical win rate.
    - Makes one LLM call via runner.py (or deterministic fallback) in explainer.py's tone.
    - Returns structured result including realized P&L framing and educational disclaimer.
    """
    # 1. Check existing cached debrief
    cached = _get_cached_debrief(user_id, trade_id)
    if cached:
        cached["is_cached"] = True
        return cached

    # 2. Locate trade
    trades = get_trade_history(user_id)
    target_trade = next((t for t in trades if str(t.get("id")) == str(trade_id)), None)

    if not target_trade:
        return {
            "success": False,
            "error": f"Trade '{trade_id}' not found for user '{user_id}'.",
        }

    symbol = target_trade.get("symbol", "").upper()
    trade_type = target_trade.get("type", "BUY").upper()
    shares = int(target_trade.get("shares", 0))
    exit_price = float(target_trade.get("price", 0.0))
    turnover = float(target_trade.get("amount", 0.0))
    realized_pnl = float(target_trade.get("pnl", 0.0))
    exit_timestamp = target_trade.get("timestamp", "")

    # 3. Locate historical entry BUY trade for this symbol to evaluate setup AT ENTRY
    matching_buy = None
    for t in reversed(trades):
        if t.get("symbol", "").upper() == symbol and t.get("type", "").upper() == "BUY":
            matching_buy = t
            break

    entry_price = float(matching_buy.get("price", exit_price)) if matching_buy else exit_price
    entry_timestamp = matching_buy.get("timestamp", exit_timestamp) if matching_buy else exit_timestamp

    as_of_date = None
    if entry_timestamp:
        try:
            clean_ts = entry_timestamp[:10]
            datetime.strptime(clean_ts, "%Y-%m-%d")
            as_of_date = clean_ts
        except Exception:
            as_of_date = None

    # Calculate return percentage
    return_pct = round(((exit_price - entry_price) / entry_price) * 100.0, 2) if entry_price > 0 else 0.0

    # Win / Loss outcome classification
    if realized_pnl > 0:
        outcome = "WIN"
        outcome_desc = f"a realized virtual profit of +₹{realized_pnl:,.2f} (+{return_pct}%)"
    elif realized_pnl < 0:
        outcome = "LOSS"
        outcome_desc = f"a realized virtual loss of -₹{abs(realized_pnl):,.2f} ({return_pct}%)"
    else:
        outcome = "BREAKEVEN"
        outcome_desc = "a break-even exit (₹0.00 net P&L)"

    # 4. Get indicators & signals AS THEY WERE AT ENTRY
    indicator_data = get_indicators(symbol, as_of_date=as_of_date)
    signal_data = get_signals(symbol, as_of_date=as_of_date)

    snapshot = indicator_data.get("snapshot", {})
    primary_sig = signal_data.get("primary_signal", {})
    sig_type = primary_sig.get("signal_type", "NEUTRAL_CONSOLIDATION")

    # 5. Get historical win rate for that signal type
    win_rate_stats = get_win_rate(sig_type, forward_days=10)

    # 6. Formulate context
    context = {
        "user_id": user_id,
        "trade_id": trade_id,
        "symbol": symbol,
        "trade_type": trade_type,
        "shares": shares,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "realized_pnl": realized_pnl,
        "return_pct": return_pct,
        "outcome": outcome,
        "entry_date": as_of_date or snapshot.get("date", "Entry Session"),
        "exit_date": exit_timestamp[:10] if exit_timestamp else "Exit Session",
        "signal_at_entry": sig_type,
        "rsi_at_entry": snapshot.get("rsi", {}).get("value"),
        "macd_hist_at_entry": snapshot.get("macd", {}).get("hist"),
        "volume_ratio_at_entry": snapshot.get("volume", {}).get("ratio"),
        "win_rate_pct": win_rate_stats.get("win_rate_pct"),
        "sample_size": win_rate_stats.get("sample_size"),
        "historical_summary": win_rate_stats.get("summary_text"),
    }

    system_prompt = (
        "You are an expert fintech educator teaching market mechanics for Invest IQ. "
        "Your debriefs are exactly 2 to 4 sentences in plain English, objective, numbers-grounded, "
        "and strictly educational. NEVER use imperative advice ('buy' or 'sell'). "
        "Always highlight how technical setups represent probabilities, not certainties. Connect "
        "the entry conditions (RSI, setup type, win rate) to the realized P&L outcome."
    )

    goal = (
        f"Generate a 2-4 sentence educational post-trade debrief for a position exit ({trade_type}) of "
        f"{shares} shares of {symbol} sold at ₹{exit_price:,.2f} (Entry: ₹{entry_price:,.2f}), resulting in {outcome_desc}. "
        f"Technical indicators at entry showed {sig_type} (RSI: {context['rsi_at_entry']}, "
        f"MACD Hist: {context['macd_hist_at_entry']}, Volume Ratio: {context['volume_ratio_at_entry']}x). "
        f"Historically, this setup has a {context['win_rate_pct']}% favorable outcome over 10 sessions across {context['sample_size']} precedents. "
        "Return a JSON object with: "
        "'title' (e.g. 'Post-Trade Debrief: RELIANCE.NS Profit Realization (+₹...)' or 'Loss Reflection (-₹...)'), "
        "'summary' (2-4 sentence plain-English debrief linking entry metrics to realized P&L), "
        "'lesson' (1 sentence behavioral or risk management lesson on probabilistic outcomes)."
    )

    # 7. Execute via runner
    agent_res = run_agent(
        goal=goal,
        allowed_tools=[],
        context=context,
        system_prompt=system_prompt,
        enforce_json=True,
    )

    parsed = agent_res.get("structured") or {}
    title = parsed.get("title")
    summary = parsed.get("summary")
    lesson = parsed.get("lesson")

    # High-fidelity deterministic fallback if LLM returned incomplete or running offline
    if not title or not summary or not lesson or agent_res.get("provider") == "Invest IQ Deterministic Engine":
        pnl_badge = (
            f"Gain (+₹{realized_pnl:,.2f})"
            if realized_pnl > 0
            else (f"Loss (-₹{abs(realized_pnl):,.2f})" if realized_pnl < 0 else "Break-Even")
        )
        title = f"Post-Trade Debrief: {symbol} — {pnl_badge}"
        summary = (
            f"You closed {shares} shares of {symbol} at ₹{exit_price:,.2f} (bought at ₹{entry_price:,.2f}), "
            f"locking in {outcome_desc}. "
            f"When this trade was initiated, the stock showed a {sig_type.replace('_', ' ').title()} setup "
            f"with RSI at {context.get('rsi_at_entry') or 50.0} and volume at {context.get('volume_ratio_at_entry') or 1.0}x average. "
            f"Empirical backtests show this entry pattern succeeds {context['win_rate_pct']}% of the time, "
            f"reinforcing that even high-probability setups carry inherent market risk."
        )
        lesson = (
            "Consistently profitable trading relies on position-sizing and disciplined stop-losses rather than expecting "
            "any single technical pattern to work 100% of the time."
        )

    debrief_result = {
        "success": True,
        "trade_id": trade_id,
        "user_id": user_id,
        "symbol": symbol,
        "trade_type": trade_type,
        "shares": shares,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "realized_pnl": realized_pnl,
        "return_pct": return_pct,
        "outcome": outcome,
        "title": title,
        "summary": summary,
        "lesson": lesson,
        "disclaimer": EDUCATIONAL_DISCLAIMER,
        "entry_conditions": {
            "entry_date": context["entry_date"],
            "signal_type": sig_type,
            "rsi": context["rsi_at_entry"],
            "macd_hist": context["macd_hist_at_entry"],
            "volume_ratio": context["volume_ratio_at_entry"],
            "historical_win_rate_pct": context["win_rate_pct"],
            "sample_size": context["sample_size"],
        },
        "is_cached": False,
        "provider": agent_res.get("provider", "Invest IQ Explainer Engine"),
        "created_at": datetime.now().isoformat(),
    }

    # 8. Cache output in agent_runs table
    _save_debrief_run(user_id, trade_id, debrief_result)

    return debrief_result
