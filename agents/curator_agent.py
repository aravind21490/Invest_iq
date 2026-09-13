"""
agents/curator_agent.py - Watchlist Curator Agent

Educational market scanning and candidate proposal engine for Invest IQ.
Features:
1. Filters out symbols currently on the user's active watchlist (via get_user_watchlist).
2. Filters out symbols previously flagged in agent_flags within the last 14 days.
3. Deterministically scores and ranks candidates from scanner.py.
4. Generates educational reasoning for the top 1-3 picks using a SINGLE batched LLM call
   (or high-fidelity deterministic fallback in explainer.py's tone).
5. Enforces a strict hard cap of 3 suggestions per user per day.
6. Persists proposals to agent_flags and agent_runs (NEVER auto-adds to user_watchlists).
"""

import os
import sys
import time
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Set

from agents.toolbox import (
    get_user_watchlist,
    scan_universe_for_signals,
    get_trade_history,
    get_supabase_client,
    get_db_connection,
)
from agents.runner import run_agent

logger = logging.getLogger("InvestIQ.Agents.Curator")
logger.setLevel(logging.INFO)

# ==============================================================================
# DETERMINISTIC NAMED CONSTANTS & THRESHOLDS
# ==============================================================================
MAX_DAILY_SUGGESTIONS: int = 3
FLAG_RECENCY_DAYS: int = 14
MAX_BATCH_ACTIVE_USERS: int = 50

EDUCATIONAL_DISCLAIMER = (
    "SIMULATION ONLY — Educational Context, Not Investment Advice. All technical indicators "
    "and historical win rates represent past probabilistic patterns and are strictly for educational "
    "practice. Invest IQ is not a SEBI-registered investment advisor, and this is not an invitation "
    "to execute real financial trades."
)

SIGNAL_PRIORITY_WEIGHTS: Dict[str, float] = {
    "OVERSOLD_BOUNCE": 4.0,
    "BULLISH_MACD_CROSSOVER": 4.0,
    "VOLUME_BREAKOUT": 3.5,
    "VOLATILITY_SQUEEZE": 3.5,
    "OVERBOUGHT_EXHAUSTION": 2.5,
    "BEARISH_MACD_CROSSOVER": 2.0,
    "NEUTRAL_CONSOLIDATION": 0.5,
}


def _get_today_curator_flags(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve curator suggestions already created for this user today (UTC date)."""
    now_utc = datetime.now(timezone.utc)
    today_start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc).isoformat()
    client = get_supabase_client()

    if client:
        try:
            res = (
                client.table("agent_flags")
                .select("id, user_id, symbol, agent_name, reason, created_at")
                .eq("user_id", str(user_id))
                .eq("agent_name", "curator")
                .gte("created_at", today_start)
                .order("created_at", desc=True)
                .execute()
            )
            if res and res.data:
                return res.data
        except Exception as e:
            logger.debug("Supabase curator flags lookup error: %s", e)

    # SQLite fallback
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        today_prefix = datetime.now().strftime("%Y-%m-%d")
        cur.execute(
            """
            SELECT id, user_id, symbol, agent_name, reason, created_at
            FROM agent_flags
            WHERE user_id = %s AND agent_name = 'curator' AND created_at >= %s
            ORDER BY created_at DESC
            """,
            (str(user_id), today_prefix),
        )
        rows = cur.fetchall()
        conn.close()
        if rows:
            return [
                {
                    "id": r[0] if isinstance(r, (list, tuple)) else r.get("id"),
                    "user_id": r[1] if isinstance(r, (list, tuple)) else r.get("user_id"),
                    "symbol": r[2] if isinstance(r, (list, tuple)) else r.get("symbol"),
                    "agent_name": r[3] if isinstance(r, (list, tuple)) else r.get("agent_name"),
                    "reason": r[4] if isinstance(r, (list, tuple)) else r.get("reason"),
                    "created_at": str(r[5] if isinstance(r, (list, tuple)) else r.get("created_at")),
                }
                for r in rows
            ]
    except Exception as e:
        logger.debug("Local curator flags lookup error: %s", e)

    return []


def _get_recent_flagged_symbols(user_id: str, days: int = FLAG_RECENCY_DAYS) -> Set[str]:
    """Retrieve all symbols flagged for this user across all agents in the last N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    client = get_supabase_client()
    flagged: Set[str] = set()

    if client:
        try:
            res = (
                client.table("agent_flags")
                .select("symbol")
                .eq("user_id", str(user_id))
                .gte("created_at", cutoff)
                .execute()
            )
            if res and res.data:
                for row in res.data:
                    sym = row.get("symbol")
                    if sym:
                        flagged.add(sym.strip().upper())
                return flagged
        except Exception as e:
            logger.debug("Supabase recent flags query error: %s", e)

    # SQLite fallback
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cutoff_str = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            """
            SELECT symbol FROM agent_flags
            WHERE user_id = %s AND created_at >= %s
            """,
            (str(user_id), cutoff_str),
        )
        rows = cur.fetchall()
        conn.close()
        for r in rows:
            sym = r[0] if isinstance(r, (list, tuple)) else r.get("symbol")
            if sym:
                flagged.add(str(sym).strip().upper())
    except Exception as e:
        logger.debug("Local recent flags query error: %s", e)

    return flagged


def _record_curator_results(
    user_id: str,
    suggestions: List[Dict[str, Any]],
) -> None:
    """
    Persist generated curator suggestions to agent_flags and agent_runs.
    Guarantees: NEVER modifies user_watchlists table.
    """
    now_epoch = time.time()
    now_str = datetime.now().isoformat()
    client = get_supabase_client()

    for item in suggestions:
        flag_id = f"flag_curator_{int(now_epoch * 1000)}_{item['symbol'].lower().replace('.', '_')}"
        reason = item["reason"]
        symbol = item["symbol"]

        # 1. Write to agent_flags in Supabase
        if client:
            try:
                client.table("agent_flags").insert({
                    "id": flag_id,
                    "user_id": str(user_id),
                    "symbol": symbol,
                    "agent_name": "curator",
                    "reason": reason,
                    "created_at": now_str,
                }).execute()
            except Exception as e:
                logger.warning("Failed to insert curator flag in Supabase: %s", e)

        # Write to local DB agent_flags
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO agent_flags (id, user_id, symbol, agent_name, reason, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (flag_id, str(user_id), symbol, "curator", reason, now_str),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error("Failed to insert curator flag in local DB: %s", e)

    # 2. Write summary run log to agent_runs
    run_id = f"run_curator_{int(now_epoch * 1000)}"
    run_output = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "count": len(suggestions),
        "suggestions": suggestions,
    }
    output_json = json.dumps(run_output)

    if client:
        try:
            client.table("agent_runs").insert({
                "id": run_id,
                "agent_name": "curator",
                "user_id": str(user_id),
                "output": run_output,
                "created_at": now_str,
            }).execute()
        except Exception as e:
            logger.warning("Failed to record curator run in Supabase: %s", e)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO agent_runs (id, agent_name, user_id, output, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (run_id, "curator", str(user_id), output_json, now_str),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Failed to record curator run in local DB: %s", e)


def rank_candidates_deterministically(
    candidates: List[Dict[str, Any]],
    max_picks: int = MAX_DAILY_SUGGESTIONS,
) -> List[Dict[str, Any]]:
    """
    Score and rank market scan candidates deterministically based on:
    - Technical setup category and intensity
    - Volume ratio confirmation
    - Sector diversification (penalizes repeated sectors in the same pick batch)
    """
    scored = []
    for cand in candidates:
        primary = cand.get("primary_signal") or {}
        sig_type = str(primary.get("signal_type", "NEUTRAL_CONSOLIDATION")).upper()
        if sig_type == "NEUTRAL_CONSOLIDATION":
            continue  # Exclude stocks without distinct technical setups

        score = SIGNAL_PRIORITY_WEIGHTS.get(sig_type, 1.0)

        # Intensity scoring
        intensity = str(primary.get("intensity", "")).lower()
        if intensity in ("strong", "high"):
            score += 1.5
        elif intensity in ("moderate", "standard", "noteworthy"):
            score += 0.5

        # Volume confirmation
        key_stats = primary.get("key_stats") or {}
        vol_ratio = float(key_stats.get("volume_ratio") or 1.0)
        if vol_ratio >= 1.5:
            score += 1.0
        elif vol_ratio >= 1.1:
            score += 0.5

        scored.append({
            "candidate": cand,
            "signal_type": sig_type,
            "score": score,
            "sector": cand.get("sector", "General"),
            "price": cand.get("price", 0.0),
            "key_stats": key_stats,
        })

    # Sort descending by score
    scored.sort(key=lambda x: x["score"], reverse=True)

    # Select top picks with sector diversification
    selected: List[Dict[str, Any]] = []
    seen_sectors: Set[str] = set()

    # Pass 1: pick highest scoring distinct sectors
    for item in scored:
        if len(selected) >= max_picks:
            break
        sec = item["sector"]
        if sec not in seen_sectors:
            selected.append(item)
            seen_sectors.add(sec)

    # Pass 2: fill remaining slots if needed
    if len(selected) < max_picks:
        for item in scored:
            if len(selected) >= max_picks:
                break
            if item not in selected:
                selected.append(item)

    return selected


def run_daily_curation(user_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Execute daily Watchlist Curator workflow for a user.
    Guarantees:
    - Checks daily 3-suggestion cap BEFORE performing any scan or LLM invocation.
    - Excludes symbols already in user's watchlist or flagged within 14 days.
    - Ranks candidates deterministically.
    - Makes at most 1 batched LLM call per run.
    - Never auto-adds to user watchlist.
    """
    user_id_str = str(user_id).strip()

    # 1. HARD CAP CHECK (BEFORE any scan or LLM work)
    existing_today = _get_today_curator_flags(user_id_str)
    if len(existing_today) >= MAX_DAILY_SUGGESTIONS and not force_refresh:
        logger.info("User %s already has %d curator suggestions today. Returning cached.", user_id_str, len(existing_today))
        return {
            "success": True,
            "user_id": user_id_str,
            "capped": True,
            "count": len(existing_today),
            "suggestions": [
                {
                    "symbol": f["symbol"],
                    "reason": f["reason"],
                    "created_at": f["created_at"],
                }
                for f in existing_today
            ],
            "message": f"Daily suggestion cap reached ({len(existing_today)}/{MAX_DAILY_SUGGESTIONS} suggestions active today).",
            "llm_calls": 0,
            "provider": "Invest IQ Cache",
        }

    slots_remaining = max(1, MAX_DAILY_SUGGESTIONS - len(existing_today)) if not force_refresh else MAX_DAILY_SUGGESTIONS

    # 2. GATHER EXCLUSIONS
    current_watchlist = get_user_watchlist(user_id_str)
    recent_flagged = _get_recent_flagged_symbols(user_id_str, days=FLAG_RECENCY_DAYS)
    all_exclusions = set(s.upper() for s in current_watchlist) | set(s.upper() for s in recent_flagged)

    logger.info(
        "User %s exclusions: %d on watchlist, %d flagged in last 14d (Total unique: %d)",
        user_id_str, len(current_watchlist), len(recent_flagged), len(all_exclusions),
    )

    # 3. SCAN UNIVERSE (excluding already watched and recently flagged tickers)
    scan_results = scan_universe_for_signals(exclude_symbols=list(all_exclusions))
    if not scan_results:
        return {
            "success": True,
            "user_id": user_id_str,
            "count": 0,
            "suggestions": [],
            "message": "No unflagged universe candidates found with active signals.",
            "llm_calls": 0,
            "provider": "Invest IQ Deterministic Engine",
        }

    # 4. DETERMINISTIC RANKING & FILTERING
    top_candidates = rank_candidates_deterministically(scan_results, max_picks=slots_remaining)
    if not top_candidates:
        return {
            "success": True,
            "user_id": user_id_str,
            "count": 0,
            "suggestions": [],
            "message": "No actionable technical setups identified outside current exclusions.",
            "llm_calls": 0,
            "provider": "Invest IQ Deterministic Engine",
        }

    # 5. REASONING GENERATION (SINGLE BATCHED LLM / DETERMINISTIC CALL)
    # Prepare batch context for the top 1-3 picks
    candidates_context = []
    for item in top_candidates:
        c = item["candidate"]
        pri = c.get("primary_signal") or {}
        candidates_context.append({
            "symbol": c["symbol"],
            "name": c.get("name", c["symbol"]),
            "sector": c.get("sector", "General"),
            "price": c.get("price", 0.0),
            "signal_type": item["signal_type"],
            "signal_title": pri.get("title", item["signal_type"].replace("_", " ").title()),
            "intensity": pri.get("intensity", "Standard"),
            "key_stats": item["key_stats"],
        })

    system_prompt = (
        "You are an expert fintech educator creating educational watchlist suggestions for Invest IQ. "
        "For each suggested stock, write exactly 2 to 3 sentences in plain English explaining why its current "
        "technical setup offers an interesting educational study for a trader's watchlist. "
        "Grounded in the exact numbers (price, RSI, MACD, or volume). NEVER use imperative advice ('buy' or 'sell'). "
        "Always highlight that technical patterns represent past probabilities, not certainties."
    )

    goal = (
        f"Generate educational watchlist curation reasoning for {len(candidates_context)} candidate stocks. "
        f"Candidates data: {json.dumps(candidates_context)}. "
        "Return a JSON object with: 'suggestions' (an array of objects, each containing: "
        "'symbol', 'setup_title', 'reason' (2-3 sentences explaining the setup numbers and why it belongs on a practice watchlist))."
    )

    agent_res = run_agent(
        goal=goal,
        allowed_tools=[],
        context={"candidates": candidates_context},
        system_prompt=system_prompt,
        enforce_json=True,
    )

    llm_suggestions = (agent_res.get("structured") or {}).get("suggestions") or []
    llm_dict = {s.get("symbol", "").upper(): s.get("reason") for s in llm_suggestions if s.get("symbol")}

    # Build final suggestions list
    final_suggestions: List[Dict[str, Any]] = []
    for item in top_candidates:
        cand = item["candidate"]
        sym = cand["symbol"].upper()
        pri = cand.get("primary_signal") or {}
        stats = item["key_stats"]
        setup_title = pri.get("title", item["signal_type"].replace("_", " ").title())

        # Use LLM reasoning if valid, else high-fidelity deterministic fallback
        reason = llm_dict.get(sym)
        if not reason or agent_res.get("provider") == "Invest IQ Deterministic Engine":
            price_val = cand.get("price", 0.0)
            vol_val = stats.get("volume_ratio", 1.0)
            rsi_val = stats.get("rsi")
            rsi_str = f" with 14-day RSI at {rsi_val:.1f}" if rsi_val is not None else ""
            reason = (
                f"{cand.get('name', sym)} ({sym}) is trading at ₹{price_val:,.2f} in the {cand.get('sector', 'General')} sector "
                f"and exhibiting a {setup_title} setup{rsi_str}, supported by volume running {vol_val:.1f}x its 20-day average. "
                f"Adding this stock to your watchlist allows you to track whether this probabilistic momentum continuation or reversal "
                f"confirms over the upcoming trading sessions. {EDUCATIONAL_DISCLAIMER}"
            )
        else:
            if "SIMULATION ONLY" not in reason:
                reason = f"{reason} {EDUCATIONAL_DISCLAIMER}"

        final_suggestions.append({
            "symbol": sym,
            "name": cand.get("name", sym),
            "sector": cand.get("sector", "General"),
            "price": cand.get("price", 0.0),
            "signal_type": item["signal_type"],
            "setup_title": setup_title,
            "reason": reason,
        })

    # 6. PERSIST PROPOSALS (agent_flags & agent_runs)
    _record_curator_results(user_id_str, final_suggestions)

    return {
        "success": True,
        "user_id": user_id_str,
        "count": len(final_suggestions),
        "suggestions": final_suggestions,
        "llm_calls": 1,
        "provider": agent_res.get("provider", "Invest IQ Engine"),
    }


def _get_active_users(days_active: int = 14) -> List[str]:
    """
    Identify active users for batch curation.
    Active users are defined as:
    1. Primary Path (recency-scoped):
       - Users with active session entries in sessions table within the last N days, OR
       - Users with trade activity in trades table in the last N days.
       - Prioritized by most-recently-active first (latest session or trade timestamp DESC).
       - Deterministically capped at at most MAX_BATCH_ACTIVE_USERS (50).
    2. Fallback Path (no recency activity found / session tracking broke):
       - Registered accounts with initialized portfolios in portfolios table.
       - Prioritized by most-recently-active first (portfolios.updated_at DESC).
       - Deterministically capped at at most MAX_BATCH_ACTIVE_USERS (50).
    """
    client = get_supabase_client()
    user_last_active: Dict[str, str] = {}
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_active)).isoformat()

    if client:
        try:
            # 1. Primary path: recency-scoped sessions
            try:
                s_res = (
                    client.table("sessions")
                    .select("user_id, created_at")
                    .gte("created_at", cutoff)
                    .execute()
                )
                if s_res and s_res.data:
                    for row in s_res.data:
                        uid = row.get("user_id")
                        ts = str(row.get("created_at") or "")
                        if uid:
                            s_uid = str(uid)
                            if s_uid not in user_last_active or ts > user_last_active[s_uid]:
                                user_last_active[s_uid] = ts
            except Exception as e:
                logger.debug("Supabase sessions recency query error: %s", e)

            # Primary path: recency-scoped trade activity
            try:
                t_res = (
                    client.table("trades")
                    .select("user_id, timestamp")
                    .gte("timestamp", cutoff)
                    .execute()
                )
                if t_res and t_res.data:
                    for row in t_res.data:
                        uid = row.get("user_id")
                        ts = str(row.get("timestamp") or "")
                        if uid:
                            s_uid = str(uid)
                            if s_uid not in user_last_active or ts > user_last_active[s_uid]:
                                user_last_active[s_uid] = ts
            except Exception as e:
                logger.debug("Supabase trades recency query error: %s", e)

            # If primary recency-scoped users exist, prioritize by most-recent-activity DESC, capped at MAX_BATCH_ACTIVE_USERS
            if user_last_active:
                sorted_users = sorted(user_last_active.keys(), key=lambda u: user_last_active[u], reverse=True)
                return sorted_users[:MAX_BATCH_ACTIVE_USERS]

            # 2. Fallback path (no recency activity narrows list):
            # Query portfolios table, order by updated_at DESC, cap at MAX_BATCH_ACTIVE_USERS
            p_res = (
                client.table("portfolios")
                .select("user_id, updated_at")
                .order("updated_at", desc=True)
                .execute()
            )
            if p_res and p_res.data:
                rows = list(p_res.data)
                rows.sort(key=lambda x: str(x.get("updated_at") or ""), reverse=True)
                fallback_users: List[str] = []
                seen: Set[str] = set()
                for r in rows:
                    uid = r.get("user_id")
                    if uid and str(uid) not in seen:
                        seen.add(str(uid))
                        fallback_users.append(str(uid))
                        if len(fallback_users) >= MAX_BATCH_ACTIVE_USERS:
                            break
                if fallback_users:
                    return fallback_users
        except Exception as e:
            logger.debug("Supabase active users lookup error: %s", e)

    # SQLite fallback
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        local_user_last_active: Dict[str, str] = {}

        # 1. Primary path: check trades within cutoff
        local_cutoff = (datetime.now() - timedelta(days=days_active)).strftime("%Y-%m-%d %H:%M:%S")
        try:
            cur.execute(
                "SELECT user_id, MAX(timestamp) as last_active FROM trades WHERE timestamp >= %s GROUP BY user_id",
                (local_cutoff,),
            )
            t_rows = cur.fetchall()
            for r in t_rows:
                uid = r[0] if isinstance(r, (list, tuple)) else r.get("user_id")
                ts = str(r[1] if isinstance(r, (list, tuple)) else r.get("last_active") or "")
                if uid:
                    s_uid = str(uid)
                    if s_uid not in local_user_last_active or ts > local_user_last_active[s_uid]:
                        local_user_last_active[s_uid] = ts
        except Exception as e:
            logger.debug("Local trades recency query error: %s", e)

        # Primary path: check sessions within cutoff if sessions table exists
        try:
            cur.execute(
                "SELECT user_id, MAX(created_at) as last_active FROM sessions WHERE created_at >= %s GROUP BY user_id",
                (local_cutoff,),
            )
            s_rows = cur.fetchall()
            for r in s_rows:
                uid = r[0] if isinstance(r, (list, tuple)) else r.get("user_id")
                ts = str(r[1] if isinstance(r, (list, tuple)) else r.get("last_active") or "")
                if uid:
                    s_uid = str(uid)
                    if s_uid not in local_user_last_active or ts > local_user_last_active[s_uid]:
                        local_user_last_active[s_uid] = ts
        except Exception as e:
            logger.debug("Local sessions recency query error: %s", e)

        if local_user_last_active:
            conn.close()
            sorted_local = sorted(local_user_last_active.keys(), key=lambda u: local_user_last_active[u], reverse=True)
            return sorted_local[:MAX_BATCH_ACTIVE_USERS]

        # 2. Fallback path: portfolios prioritized by updated_at DESC, capped at MAX_BATCH_ACTIVE_USERS
        cur.execute("SELECT user_id, updated_at FROM portfolios ORDER BY updated_at DESC")
        rows = cur.fetchall()
        conn.close()

        fallback_users: List[str] = []
        seen = set()
        for r in rows:
            uid = str(r[0] if isinstance(r, (list, tuple)) else r.get("user_id"))
            if uid and uid not in seen:
                seen.add(uid)
                fallback_users.append(uid)
                if len(fallback_users) >= MAX_BATCH_ACTIVE_USERS:
                    break

        if fallback_users:
            return fallback_users
    except Exception as e:
        logger.debug("Local active users lookup error: %s", e)

    return ["usr_demo"]


def run_batch_curation(days_active: int = 14) -> Dict[str, Any]:
    """
    Batch curation workflow for scheduler / automated cron.
    Scans active users, runs personalized curation for each, and aggregates results.
    """
    active_users = _get_active_users(days_active=days_active)
    logger.info("Starting batch curation for %d active users.", len(active_users))

    results = []
    total_llm_calls = 0

    for uid in active_users:
        try:
            res = run_daily_curation(uid)
            results.append({
                "user_id": uid,
                "count": res.get("count", 0),
                "capped": res.get("capped", False),
            })
            total_llm_calls += res.get("llm_calls", 0)
        except Exception as e:
            logger.error("Curator error for user %s: %s", uid, e)
            results.append({
                "user_id": uid,
                "error": str(e),
                "count": 0,
            })

    return {
        "success": True,
        "users_curated": len(results),
        "total_active_users": len(active_users),
        "total_llm_calls": total_llm_calls,
        "results": results,
    }
