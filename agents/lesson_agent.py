"""
agents/lesson_agent.py - Lesson-Sequencing Agent for Invest IQ (Phase 6)

Dynamically recommends the user's next educational curriculum lesson based on:
1. Behavioral mistake patterns flagged by the Watchdog Agent (revenge sizing, sector concentration, overtrading velocity).
2. Technical signal patterns identified from recent losing trades (via Debrief / trade history data).
3. Standard progressive curriculum flow when no risk or mistake patterns are detected.

CRITICAL DESIGN RULE:
The mapping from mistake pattern -> lesson ID is STRICTLY RULE-BASED via `MISTAKE_TO_LESSON_MAP`.
The LLM is NEVER allowed to pick the lesson ID. The LLM (or deterministic fallback) is used
ONLY to phrase a human-readable, supportive coaching nudge message explaining why this lesson
is recommended based on the user's recent trading actions.
"""

import os
import json
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta

from explainer import EDUCATIONAL_DISCLAIMER
from agents.toolbox import (
    get_trade_history,
    get_signals,
    get_supabase_client,
)
from agents.runner import run_agent
from models import get_db_connection

logger = logging.getLogger("investiq.agents.lesson")

# ---------------------------------------------------------------------------
# RULE-BASED MISTAKE PATTERN -> LESSON ID MAPPING
# Plain, readable Python dict covering Watchdog patterns and signal-type losses.
# Every lesson ID maps directly to an active topic in frontend/src/lib/curriculum-data.ts.
# ---------------------------------------------------------------------------
MISTAKE_TO_LESSON_MAP: Dict[str, Dict[str, Any]] = {
    # 1. Watchdog Behavioral Patterns
    "REVENGE_SIZING": {
        "lesson_id": "t5-4",
        "title": "Psychological Biases: FOMO & Revenge Trading",
        "tier_id": 5,
        "tier_title": "Strategy & Risk Management",
        "trigger_source": "watchdog",
        "rationale": "Sizing escalation detected following consecutive losses. Reconnect with emotional discipline and loss acceptance.",
        "default_nudge": (
            "We noticed recent trade sizing expansion following losses. Reviewing "
            "'Psychological Biases: FOMO & Revenge Trading' will help you reset risk parameters and prevent emotional tilt."
        ),
    },
    "SECTOR_CONCENTRATION": {
        "lesson_id": "t2-4",
        "title": "Diversification: Protecting Your Portfolio",
        "tier_id": 2,
        "tier_title": "Getting Started",
        "trigger_source": "watchdog",
        "rationale": "Portfolio exposure heavily clustered in a single sector (>60%). Re-align with asset allocation principles.",
        "default_nudge": (
            "Your recent holdings show high concentration in a single sector. Revisit "
            "'Diversification: Protecting Your Portfolio' to explore correlation risk and cross-sector balance."
        ),
    },
    "OVERTRADING_VELOCITY": {
        "lesson_id": "t5-2",
        "title": "Stop-Losses & Take-Profit Orders",
        "tier_id": 5,
        "tier_title": "Strategy & Risk Management",
        "trigger_source": "watchdog",
        "rationale": "Elevated execution frequency within a short time window. Replace rapid manual entries with structured bracket orders.",
        "default_nudge": (
            "High trade velocity often leads to transaction fee drag and fatigue. Re-studying "
            "'Stop-Losses & Take-Profit Orders' shows how automated limit rules keep you from overtrading."
        ),
    },

    # 2. Technical Signal Losses (from Debrief / trade history)
    "OVERSOLD_BOUNCE": {
        "lesson_id": "t4-1",
        "title": "RSI (Relative Strength Index) Explained",
        "tier_id": 4,
        "tier_title": "Technical & Fundamental Analysis",
        "trigger_source": "trade_signal_loss",
        "rationale": "Recent loss occurred on an oversold setup where prices experienced downward continuation.",
        "default_nudge": (
            "Your recent exit involved an oversold setup that continued downward. Dive into "
            "'RSI Explained' to learn why extreme readings can persist during strong downtrends."
        ),
    },
    "OVERBOUGHT_EXHAUSTION": {
        "lesson_id": "t4-1",
        "title": "RSI (Relative Strength Index) Explained",
        "tier_id": 4,
        "tier_title": "Technical & Fundamental Analysis",
        "trigger_source": "trade_signal_loss",
        "rationale": "Trade initiated during overbought conditions without waiting for momentum confirmation.",
        "default_nudge": (
            "Entering near overbought extremes requires careful momentum confirmation. Review "
            "'RSI Explained' to master exit timing and exhaustion levels."
        ),
    },
    "BULLISH_MACD_CROSSOVER": {
        "lesson_id": "t4-3",
        "title": "MACD: Momentum & Trend Direction",
        "tier_id": 4,
        "tier_title": "Technical & Fundamental Analysis",
        "trigger_source": "trade_signal_loss",
        "rationale": "Loss incurred on a lagging MACD crossover in choppy or range-bound price action.",
        "default_nudge": (
            "MACD crossovers can produce whipsaws in sideways regimes. Refreshing "
            "'MACD: Momentum & Trend Direction' will sharpen your histogram divergence analysis."
        ),
    },
    "BEARISH_MACD_CROSSOVER": {
        "lesson_id": "t4-3",
        "title": "MACD: Momentum & Trend Direction",
        "tier_id": 4,
        "tier_title": "Technical & Fundamental Analysis",
        "trigger_source": "trade_signal_loss",
        "rationale": "Momentum shifted against the position following a bearish signal line divergence.",
        "default_nudge": (
            "Understanding histogram deceleration is crucial for managing trend exits. Review "
            "'MACD: Momentum & Trend Direction' for clearer momentum confirmation."
        ),
    },
    "VOLUME_BREAKOUT": {
        "lesson_id": "t3-3",
        "title": "Trading Volume: Conviction Indicator",
        "tier_id": 3,
        "tier_title": "Reading the Market",
        "trigger_source": "trade_signal_loss",
        "rationale": "Breakout attempt failed due to insufficient institutional volume support.",
        "default_nudge": (
            "A recent breakout trade faced false-breakout reversal. Revisiting "
            "'Trading Volume: Conviction Indicator' helps you separate true institutional moves from traps."
        ),
    },
    "VOLATILITY_SQUEEZE": {
        "lesson_id": "t5-5",
        "title": "The Risk-to-Reward Ratio (Asymmetry)",
        "tier_id": 5,
        "tier_title": "Strategy & Risk Management",
        "trigger_source": "trade_signal_loss",
        "rationale": "Bandwidth expansion trades failed due to poor risk-to-reward asymmetry.",
        "default_nudge": (
            "Trading breakouts from volatility compression requires asymmetric reward ratios. Study "
            "'The Risk-to-Reward Ratio' to protect capital when volatility expands unexpectedly."
        ),
    },
    "CONSECUTIVE_LOSSES": {
        "lesson_id": "t5-1",
        "title": "The 1-2% Position Sizing Rule",
        "tier_id": 5,
        "tier_title": "Strategy & Risk Management",
        "trigger_source": "trade_loss_streak",
        "rationale": "Recent consecutive losses highlight the importance of sizing preservation to survive drawdowns.",
        "default_nudge": (
            "Surviving losing streaks requires strict capital protection. Revisit "
            "'The 1-2% Position Sizing Rule' to ensure no individual trade endangers your account."
        ),
    },

    # 3. Default Curriculum Progression
    "DEFAULT_PROGRESSION": {
        "lesson_id": "t1-1",
        "title": "What is a Stock?",
        "tier_id": 1,
        "tier_title": "Absolute Basics",
        "trigger_source": "curriculum_progression",
        "rationale": "No active behavioral flags or recent loss patterns detected. Continue through core curriculum.",
        "default_nudge": (
            "Your risk profile is clean with no recent behavioral flags. Continue your learning journey "
            "with 'What is a Stock?' to build rock-solid market foundations."
        ),
    },
}


FLAG_RECENCY_DAYS: int = 14


# ---------------------------------------------------------------------------
# FLAG AND TRADE INSPECTION HELPERS
# ---------------------------------------------------------------------------
def _get_recent_watchdog_flags(
    user_id: str,
    limit: int = 5,
    days_recency: int = FLAG_RECENCY_DAYS,
) -> List[Dict[str, Any]]:
    """
    Retrieve recent flags specifically generated by the Watchdog Agent within the recency window (14 days).
    CRITICAL: Strictly filters by agent_name IN ('watchdog', 'watchdog-agent').
    Curator suggestions ('curator') and debrief runs are NEVER treated as behavioral mistake patterns.
    """
    clean_uid = str(user_id).strip()
    client = get_supabase_client()
    flags: List[Dict[str, Any]] = []
    cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=days_recency)).isoformat()

    if client:
        try:
            res = (
                client.table("agent_flags")
                .select("*")
                .eq("user_id", clean_uid)
                .in_("agent_name", ["watchdog", "watchdog-agent"])
                .gte("created_at", cutoff_iso)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            if res.data:
                flags = res.data
        except Exception as e:
            logger.debug("Supabase agent_flags lookup error: %s", e)

    if not flags:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, user_id, symbol, agent_name, reason, created_at
                FROM agent_flags
                WHERE user_id = %s 
                  AND LOWER(agent_name) IN ('watchdog', 'watchdog-agent')
                  AND created_at >= %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (clean_uid, cutoff_iso, limit),
            )
            rows = cur.fetchall()
            for r in rows:
                if isinstance(r, dict):
                    flags.append(r)
                else:
                    flags.append({
                        "id": r[0],
                        "user_id": r[1],
                        "symbol": r[2],
                        "agent_name": r[3],
                        "reason": r[4],
                        "created_at": r[5],
                    })
            conn.close()
        except Exception as e:
            logger.debug("Local DB agent_flags lookup error: %s", e)

    return flags


def _get_active_watchdog_portfolio_state(user_id: str) -> Optional[Dict[str, Any]]:
    """Check if the user currently has an active cooldown lock or loss streak in portfolios table."""
    clean_uid = str(user_id).strip()
    client = get_supabase_client()

    if client:
        try:
            res = (
                client.table("portfolios")
                .select("cooldown_until, loss_streak, lock_reason")
                .eq("user_id", clean_uid)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.debug("Supabase portfolio lock state lookup error: %s", e)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT cooldown_until, loss_streak, lock_reason FROM portfolios WHERE user_id = %s",
            (clean_uid,),
        )
        row = cur.fetchone()
        conn.close()
        if row:
            if isinstance(row, dict):
                return row
            return {
                "cooldown_until": row[0],
                "loss_streak": row[1],
                "lock_reason": row[2],
            }
    except Exception as e:
        logger.debug("Local DB portfolio lock state lookup error: %s", e)

    return None


def _get_recent_losing_trades(
    user_id: str,
    max_trades: int = 10,
    days_recency: int = FLAG_RECENCY_DAYS,
) -> List[Dict[str, Any]]:
    """
    Retrieve recent closed SELL trades that incurred realized negative P&L within the recency window.
    """
    trades = get_trade_history(user_id=user_id)
    losing_trades: List[Dict[str, Any]] = []
    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=days_recency)

    # Trades are typically ordered newest to oldest
    for t in trades:
        trade_type = str(t.get("type", "")).upper()
        pnl = float(t.get("pnl") or 0.0)

        # Check recency if timestamp is available
        ts_str = t.get("timestamp")
        if ts_str:
            try:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt < cutoff_dt:
                    continue
            except Exception:
                pass

        if trade_type == "SELL" and pnl < 0:
            losing_trades.append(t)
            if len(losing_trades) >= max_trades:
                break

    return losing_trades


def _resolve_entry_signal_for_trade(user_id: str, trade: Dict[str, Any]) -> Optional[str]:
    """
    Determine the technical setup / signal that was present when the position was entered.
    First checks the cached debrief in agent_runs, then falls back to get_signals().
    """
    trade_id = str(trade.get("id", ""))
    clean_uid = str(user_id).strip()

    # 1. Check cached debrief in agent_runs
    client = get_supabase_client()
    if client and trade_id:
        try:
            res = (
                client.table("agent_runs")
                .select("output")
                .eq("agent_name", "post_trade_debrief")
                .eq("user_id", clean_uid)
                .eq("trade_id", trade_id)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                out = res.data[0]["output"]
                out_data = json.loads(out) if isinstance(out, str) else out
                sig = out_data.get("signal_at_entry") or out_data.get("signal")
                if sig and sig != "NEUTRAL_CONSOLIDATION":
                    return sig
        except Exception as e:
            logger.debug("Debrief cache lookup error: %s", e)

    # 2. Derive signal from symbol and trade timestamp
    symbol = trade.get("symbol", "")
    ts = trade.get("timestamp", "")
    as_of_date = ts[:10] if ts and len(ts) >= 10 else None

    if symbol:
        try:
            sig_data = get_signals(symbol=symbol, as_of_date=as_of_date)
            primary = sig_data.get("primary_signal", {})
            sig_type = primary.get("signal_type")
            if sig_type and sig_type != "NEUTRAL_CONSOLIDATION":
                return sig_type
        except Exception as e:
            logger.debug("Signal calculation error for trade %s: %s", trade_id, e)

    return None


# ---------------------------------------------------------------------------
# LLM COACHING NUDGE SYNTHESIZER
# ---------------------------------------------------------------------------
def _generate_coaching_nudge(
    pattern_key: str,
    lesson_meta: Dict[str, Any],
    context_details: Dict[str, Any],
) -> str:
    """
    Use the LLM (or deterministic fallback) ONLY to phrase a supportive, disciplined coaching nudge.
    THE LLM NEVER SELECTS OR ALTERS THE LESSON ID OR PATTERN.
    """
    default_nudge = lesson_meta.get("default_nudge", "")
    from agents.runner import _get_groq_client
    client = _get_groq_client()
    if not client:
        return default_nudge

    system_prompt = (
        "You are the Invest IQ Learning Coach. Your role is purely educational, empathetic, and disciplined. "
        "The rule engine has ALREADY chosen the exact next lesson for the user. "
        "Write exactly ONE or TWO sentences explaining why this lesson will sharpen their market execution "
        "and discipline, referencing the context provided. Do NOT change or suggest any other lesson. "
        "Keep it concise, supportive, and professional."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Lesson: '{lesson_meta['title']}' (Tier: {lesson_meta['tier_title']}). "
                        f"Trigger pattern: {pattern_key} ({lesson_meta['rationale']}). "
                        f"Context: {json.dumps(context_details, default=str)}"
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=150,
        )
        content = (completion.choices[0].message.content or "").strip()
        if content and len(content) > 20:
            return content.strip('"\'')
    except Exception as e:
        logger.debug("Coaching nudge synthesis error, using deterministic default: %s", e)

    return default_nudge


# ---------------------------------------------------------------------------
# CORE ENTRYPOINT: RECOMMEND NEXT LESSON
# ---------------------------------------------------------------------------
def recommend_next_lesson(user_id: str) -> Dict[str, Any]:
    """
    Recommend the user's next curriculum lesson based on behavioral flags and losing trade setups.
    
    Guarantees:
    - User ID is strictly session-derived and never controllable by client or LLM.
    - Pattern matching to lesson ID is 100% deterministic via MISTAKE_TO_LESSON_MAP.
    - Accurately filters agent_flags by agent_name IN ('watchdog', 'watchdog-agent'), ignoring Curator suggestions.
    - LLM is used ONLY to phrase the human-readable coaching nudge message.
    - Returns structured payload with recommended lesson ID, metadata, trigger source, and nudge message.
    """
    user_id_str = str(user_id).strip()
    now_epoch = time.time()

    # 1. CHECK WATCHDOG BEHAVIORAL FLAGS (Highest Priority)
    # Check both active portfolio cooldown/loss streak AND persistent agent_flags entries
    portfolio_state = _get_active_watchdog_portfolio_state(user_id_str)
    watchdog_flags = _get_recent_watchdog_flags(user_id_str, limit=5)

    detected_pattern: Optional[str] = None
    trigger_details: Dict[str, Any] = {}

    # Check active lock in portfolio
    if portfolio_state:
        cooldown_until = float(portfolio_state.get("cooldown_until") or 0.0)
        loss_streak = int(portfolio_state.get("loss_streak") or 0)
        lock_reason = str(portfolio_state.get("lock_reason") or "").lower()

        if cooldown_until > now_epoch or loss_streak >= 3:
            if "revenge" in lock_reason or "sizing" in lock_reason or loss_streak >= 3:
                detected_pattern = "REVENGE_SIZING"
                trigger_details = {"loss_streak": loss_streak, "reason": lock_reason}

    # Check recent watchdog agent_flags rows if not already flagged
    if not detected_pattern and watchdog_flags:
        for f in watchdog_flags:
            reason = str(f.get("reason", "")).lower()
            if "revenge" in reason or "sizing" in reason or "consecutive losses" in reason:
                detected_pattern = "REVENGE_SIZING"
                trigger_details = {"flag_id": f.get("id"), "reason": f.get("reason")}
                break
            elif "sector" in reason or "concentration" in reason:
                detected_pattern = "SECTOR_CONCENTRATION"
                trigger_details = {"flag_id": f.get("id"), "reason": f.get("reason")}
                break
            elif "velocity" in reason or "overtrading" in reason or "trades in the last hour" in reason:
                detected_pattern = "OVERTRADING_VELOCITY"
                trigger_details = {"flag_id": f.get("id"), "reason": f.get("reason")}
                break

    # 2. CHECK TECHNICAL SIGNAL PATTERNS FROM LOSING TRADES (Second Priority)
    if not detected_pattern:
        losing_trades = _get_recent_losing_trades(user_id_str, max_trades=5)
        if losing_trades:
            # Check the most recent losing trades for recognizable signal setups
            for lt in losing_trades:
                sig = _resolve_entry_signal_for_trade(user_id_str, lt)
                if sig and sig in MISTAKE_TO_LESSON_MAP:
                    detected_pattern = sig
                    trigger_details = {
                        "trade_id": lt.get("id"),
                        "symbol": lt.get("symbol"),
                        "pnl": lt.get("pnl"),
                        "signal": sig,
                    }
                    break

            # If no specific recognized signal matched but the user has losing trade(s):
            if not detected_pattern:
                if len(losing_trades) >= 2:
                    detected_pattern = "CONSECUTIVE_LOSSES"
                    trigger_details = {
                        "recent_losses_count": len(losing_trades),
                        "latest_loss_pnl": losing_trades[0].get("pnl"),
                    }
                elif len(losing_trades) == 1:
                    # Single loss with unmapped/unknown entry signal -> graceful fallback to position sizing discipline (t5-1)
                    detected_pattern = "CONSECUTIVE_LOSSES"
                    trigger_details = {
                        "recent_losses_count": 1,
                        "latest_loss_pnl": losing_trades[0].get("pnl"),
                        "note": "Unmapped entry setup defaulted to position sizing risk discipline.",
                    }

    # 3. FALLBACK TO DEFAULT PROGRESSION (When no flags or losses exist)
    if not detected_pattern or detected_pattern not in MISTAKE_TO_LESSON_MAP:
        detected_pattern = "DEFAULT_PROGRESSION"
        trigger_details = {"status": "clean_profile"}

    # 4. RESOLVE RULE-BASED LESSON FROM DICT
    lesson_meta = MISTAKE_TO_LESSON_MAP[detected_pattern]
    has_active_flag = detected_pattern != "DEFAULT_PROGRESSION"

    # 5. SYNTHESIZE HUMAN-READABLE COACHING NUDGE
    nudge_message = _generate_coaching_nudge(
        pattern_key=detected_pattern,
        lesson_meta=lesson_meta,
        context_details=trigger_details,
    )

    return {
        "success": True,
        "user_id": user_id_str,
        "recommended_lesson_id": lesson_meta["lesson_id"],
        "lesson_title": lesson_meta["title"],
        "tier_id": lesson_meta["tier_id"],
        "tier_title": lesson_meta["tier_title"],
        "pattern_type": detected_pattern,
        "trigger_source": lesson_meta["trigger_source"],
        "rationale": lesson_meta["rationale"],
        "nudge_message": nudge_message,
        "has_active_flag": has_active_flag,
        "disclaimer": EDUCATIONAL_DISCLAIMER,
    }
