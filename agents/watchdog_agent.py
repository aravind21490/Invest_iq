"""
agents/watchdog_agent.py - Invest IQ Watchdog Agent (Pre-Trade Behavioral Guardrails)

Enforces deterministic risk and behavioral guardrails before trade confirmation:
1. Detects position sizing up after consecutive losses (Revenge Trading Guardrail).
2. Detects portfolio concentration exceeding 60% in a single sector after proposed trade.
3. Detects trade execution velocity exceeding 5 trades in the last hour (Overtrading Guardrail).
4. Detects active cooldown timers and enforces cooling-off periods.

Architecture & Lock-State Decision (Phase 3):
- Detection logic is 100% deterministic, governed by explicit named constants.
- Human-readable explanations are generated via the shared runner (or deterministic fallback)
  in explainer.py's objective, educational tone with EDUCATIONAL_DISCLAIMER.
- On 'block': sets time-based, self-resolving cooldown (`cooldown_until = now + 300`) and
  records the reason in `portfolios` table (read/writeable by both Next.js and Python)
  without permanently stranding the user with is_locked_for_reflection.
"""

import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from agents.toolbox import get_trade_history, get_supabase_client
from agents.runner import run_agent
from data_provider import CORE_NSE_STOCKS
from models import get_db_connection

logger = logging.getLogger("investiq.agents.watchdog")

# ==============================================================================
# DETERMINISTIC BEHAVIORAL & RISK THRESHOLDS (NO MAGIC NUMBERS)
# ==============================================================================
CONSECUTIVE_LOSS_THRESHOLD: int = 2          # Loss streak triggering revenge-trading check
POSITION_SIZE_EXPANSION_RATIO: float = 1.25  # Proposed size >= 125% of prior loss size
MAX_SECTOR_CONCENTRATION_PCT: float = 60.0   # Post-trade sector concentration threshold (>60%)
MAX_TRADES_PER_HOUR: int = 5                 # Maximum allowable trade executions within 60 mins
COOLDOWN_DURATION_SECONDS: int = 300         # 5-minute cool-off period on loss-streak block

EDUCATIONAL_DISCLAIMER = (
    "SIMULATION ONLY — Educational Context, Not Investment Advice. "
    "All technical indicators and historical win rates represent past probabilistic patterns "
    "and are strictly for educational practice. Invest IQ is not a SEBI-registered investment advisor, "
    "and this is not an invitation to execute real financial trades."
)


def _get_symbol_sector(symbol: str) -> str:
    """Resolve stock sector using data provider catalog, with fallback to General."""
    sym_upper = symbol.upper()
    if sym_upper in CORE_NSE_STOCKS:
        return CORE_NSE_STOCKS[sym_upper].get("sector", "General")
    # Clean NSE suffix if needed
    base_sym = sym_upper.replace(".NS", "")
    for k, v in CORE_NSE_STOCKS.items():
        if k.startswith(base_sym):
            return v.get("sector", "General")
    return "General"


def _get_portfolio_lock_state(user_id: str) -> Dict[str, Any]:
    """
    Read the user's current lock and cooldown state from the portfolios table
    in Supabase (with SQLite fallback).
    """
    client = get_supabase_client()
    now_epoch = time.time()
    cash_bal = 100000.0
    cd_until = 0.0
    is_locked = False
    streak = 0
    reason = ""

    # 1. Fetch cash_balance from Supabase if connected
    if client:
        try:
            res_cash = (
                client.table("portfolios")
                .select("cash_balance")
                .eq("user_id", str(user_id))
                .maybe_single()
                .execute()
            )
            if res_cash and res_cash.data:
                cash_bal = float(res_cash.data.get("cash_balance") or 100000.0)
        except Exception as e:
            logger.debug("Supabase cash_balance lookup: %s", e)

        # 2. Try fetching lock columns from Supabase (if migration 0004 applied)
        try:
            res_locks = (
                client.table("portfolios")
                .select("is_locked_for_reflection, cooldown_until, loss_streak, lock_reason")
                .eq("user_id", str(user_id))
                .maybe_single()
                .execute()
            )
            if res_locks and res_locks.data:
                row = res_locks.data
                cd_until = float(row.get("cooldown_until") or 0.0)
                is_locked = bool(row.get("is_locked_for_reflection") or False)
                streak = int(row.get("loss_streak") or 0)
                reason = str(row.get("lock_reason") or "")
        except Exception as e:
            logger.debug("Supabase lock columns not present yet on remote: %s", e)

    # 3. If cooldown not set or columns missing on remote Supabase, inspect local DB
    if cd_until == 0.0 and not is_locked:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT cash_balance, is_locked_for_reflection, cooldown_until, loss_streak, lock_reason
                FROM portfolios
                WHERE user_id = %s
                LIMIT 1
                """,
                (str(user_id),),
            )
            row = cursor.fetchone()
            conn.close()
            if row:
                if not client or cash_bal == 100000.0:
                    cash_bal = float(row.get("cash_balance") or 100000.0)
                cd_until = float(row.get("cooldown_until") or 0.0)
                is_locked = bool(row.get("is_locked_for_reflection") or False)
                streak = int(row.get("loss_streak") or 0)
                reason = str(row.get("lock_reason") or "")
        except Exception as e:
            logger.debug("Local portfolios lookup error: %s", e)

    remaining = max(0, int(cd_until - now_epoch))
    return {
        "cash_balance": cash_bal,
        "is_locked_for_reflection": is_locked,
        "cooldown_until": cd_until,
        "cooldown_remaining": remaining,
        "loss_streak": streak,
        "lock_reason": reason,
    }


def _get_active_positions(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve active positions for sector concentration calculations."""
    client = get_supabase_client()
    if client:
        try:
            res = (
                client.table("positions")
                .select("symbol, shares, avg_buy_price, sector")
                .eq("user_id", str(user_id))
                .execute()
            )
            if res and res.data:
                return res.data
        except Exception as e:
            logger.debug("Supabase positions lookup error: %s", e)

    # SQLite fallback
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT symbol, shares, avg_buy_price, sector
            FROM positions
            WHERE user_id = %s
            """,
            (str(user_id),),
        )
        rows = cursor.fetchall()
        conn.close()
        if rows:
            return [
                {
                    "symbol": r.get("symbol"),
                    "shares": r.get("shares"),
                    "avg_buy_price": r.get("avg_buy_price"),
                    "sector": r.get("sector") or _get_symbol_sector(r.get("symbol", "")),
                }
                for r in rows
            ]
    except Exception as e:
        logger.debug("Local positions lookup error: %s", e)

    return []


def _set_cooldown_lock(
    user_id: str,
    reason: str,
    loss_streak: int,
    symbol: Optional[str] = None,
    cooldown_seconds: int = COOLDOWN_DURATION_SECONDS,
) -> None:
    """
    Persist cooldown lock state to portfolios table and record the flag in agent_flags.
    Enforces Phase 3 architecture: sets time-based cooldown_until without permanently
    stranding is_locked_for_reflection.
    """
    now_epoch = time.time()
    cooldown_until = now_epoch + cooldown_seconds
    now_str = datetime.now().isoformat()
    client = get_supabase_client()

    if client:
        try:
            client.table("portfolios").update({
                "cooldown_until": cooldown_until,
                "loss_streak": loss_streak,
                "lock_reason": reason,
                "updated_at": now_str,
            }).eq("user_id", str(user_id)).execute()
        except Exception as e:
            logger.warning("Failed to update cooldown in Supabase portfolios: %s", e)

        try:
            flag_id = f"flag_{int(now_epoch * 1000)}"
            client.table("agent_flags").insert({
                "id": flag_id,
                "user_id": str(user_id),
                "symbol": symbol,
                "agent_name": "watchdog",
                "reason": reason,
                "created_at": now_str,
            }).execute()
        except Exception as e:
            logger.debug("Failed to record agent_flags in Supabase: %s", e)

    # Local DB synchronization / fallback
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM portfolios WHERE user_id = %s", (str(user_id),))
        if cursor.fetchone():
            cursor.execute(
                """
                UPDATE portfolios
                SET cooldown_until = %s, loss_streak = %s, lock_reason = %s
                WHERE user_id = %s
                """,
                (cooldown_until, loss_streak, reason, str(user_id)),
            )
        else:
            cursor.execute(
                """
                INSERT INTO portfolios (user_id, cash_balance, cooldown_until, loss_streak, lock_reason)
                VALUES (%s, 100000.0, %s, %s, %s)
                """,
                (str(user_id), cooldown_until, loss_streak, reason),
            )

        flag_id = f"flag_{int(now_epoch * 1000)}"
        cursor.execute(
            """
            INSERT INTO agent_flags (id, user_id, symbol, agent_name, reason, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (flag_id, str(user_id), symbol, "watchdog", reason, now_str),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Failed to update cooldown in local portfolios: %s", e)


def check_before_trade(
    user_id: str,
    proposed_symbol: str,
    proposed_size: int,
    proposed_type: str = "BUY",
    proposed_price: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Synchronously evaluate a proposed trade against behavioral risk guardrails.
    Returns:
    {
        "flagged": bool,
        "severity": "warning" | "block" | None,
        "rule_triggered": str | None,
        "reason": str,
        "lock_state": dict,
        "provider": str,
    }
    """
    symbol = proposed_symbol.upper().strip()
    proposed_type = proposed_type.upper().strip()
    shares = int(proposed_size)
    price = float(proposed_price) if proposed_price and proposed_price > 0 else 100.0
    turnover = shares * price

    lock_state = _get_portfolio_lock_state(user_id)

    trades = get_trade_history(user_id)

    # 1. Hard BLOCK checks: Active Cooldown, Reflection Lock, and Revenge Sizing Escalation.
    # These hard blocks apply strictly to BUY orders. Position exits (SELL) are exempt
    # from blocks to ensure users can always exit positions and manage risk even during cooldowns.
    if proposed_type == "BUY":
        if lock_state["cooldown_remaining"] > 0:
            sec_left = lock_state["cooldown_remaining"]
            reason = (
                f"Trading is temporarily locked in behavioral cooldown ({sec_left}s remaining). "
                f"A mandatory cool-off period protects you from impulsive revenge trading. {EDUCATIONAL_DISCLAIMER}"
            )
            return {
                "flagged": True,
                "severity": "block",
                "rule_triggered": "ACTIVE_COOLDOWN",
                "reason": reason,
                "lock_state": lock_state,
                "provider": "Invest IQ Deterministic Engine",
            }

        if lock_state["is_locked_for_reflection"]:
            reason = (
                f"Trading is locked: {lock_state['lock_reason'] or 'Mandatory post-loss reflection required'}. "
                f"{EDUCATIONAL_DISCLAIMER}"
            )
            return {
                "flagged": True,
                "severity": "block",
                "rule_triggered": "REFLECTION_LOCK",
                "reason": reason,
                "lock_state": lock_state,
                "provider": "Invest IQ Deterministic Engine",
            }

        # RULE A: Check position sizing up after consecutive losses (Revenge Trading)
        loss_streak = 0
        recent_losing_turnovers: List[float] = []

        # Count consecutive SELL trades that realized negative P&L (newest trades first)
        for t in trades:
            if str(t.get("type", "")).upper() == "SELL":
                pnl = float(t.get("pnl") or 0.0)
                if pnl < 0:
                    loss_streak += 1
                    recent_losing_turnovers.append(float(t.get("amount") or 0.0))
                else:
                    break  # Streak broken by a profitable or breakeven exit

        if loss_streak >= CONSECUTIVE_LOSS_THRESHOLD and len(recent_losing_turnovers) > 0:
            avg_loss_turnover = sum(recent_losing_turnovers) / len(recent_losing_turnovers)
            if turnover >= (avg_loss_turnover * POSITION_SIZE_EXPANSION_RATIO):
                ratio = round(turnover / avg_loss_turnover, 2) if avg_loss_turnover > 0 else 1.5
                block_reason = (
                    f"Trading Blocked (Revenge Sizing Guardrail): You have logged {loss_streak} consecutive losses, "
                    f"and your proposed trade (₹{turnover:,.2f}) is {ratio}x larger than your average losing trade (₹{avg_loss_turnover:,.2f}). "
                    f"A 5-minute cool-off period has been activated to protect your capital from emotional sizing escalation."
                )

                # Enforce cooldown in datastore
                _set_cooldown_lock(
                    user_id=user_id,
                    reason=block_reason,
                    loss_streak=loss_streak,
                    symbol=symbol,
                    cooldown_seconds=COOLDOWN_DURATION_SECONDS,
                )

                # Updated lock state
                lock_state["cooldown_until"] = time.time() + COOLDOWN_DURATION_SECONDS
                lock_state["cooldown_remaining"] = COOLDOWN_DURATION_SECONDS
                lock_state["loss_streak"] = loss_streak
                lock_state["lock_reason"] = block_reason

                return {
                    "flagged": True,
                    "severity": "block",
                    "rule_triggered": "REVENGE_SIZING_UP",
                    "reason": f"{block_reason} {EDUCATIONAL_DISCLAIMER}",
                    "lock_state": lock_state,
                    "provider": "Invest IQ Deterministic Engine",
                }

    # 3. Check Warning Rules (Sector Concentration and Overtrading Velocity)
    warnings: List[str] = []
    rules_triggered: List[str] = []

    # RULE B: Check Sector Concentration (> 60% after this trade)
    if proposed_type == "BUY":
        sector = _get_symbol_sector(symbol)
        positions = _get_active_positions(user_id)
        cash_balance = lock_state["cash_balance"]

        total_holdings_val = 0.0
        sector_holdings_val = 0.0

        for pos in positions:
            pos_sym = pos.get("symbol", "")
            pos_qty = int(pos.get("shares") or 0)
            pos_price = float(pos.get("avg_buy_price") or 0.0)
            pos_sector = pos.get("sector") or _get_symbol_sector(pos_sym)
            pos_val = pos_qty * pos_price

            total_holdings_val += pos_val
            if pos_sector.lower() == sector.lower():
                sector_holdings_val += pos_val

        total_portfolio_val = cash_balance + total_holdings_val
        post_trade_sector_val = sector_holdings_val + turnover

        if total_portfolio_val > 0:
            post_sector_pct = round((post_trade_sector_val / total_portfolio_val) * 100.0, 1)
            if post_sector_pct > MAX_SECTOR_CONCENTRATION_PCT:
                warnings.append(
                    f"Sector Concentration Warning: Executing this {proposed_type} of {symbol} would concentrate "
                    f"{post_sector_pct}% of your total portfolio in the '{sector}' sector (limit {MAX_SECTOR_CONCENTRATION_PCT}%). "
                    f"Over-concentration exposes your portfolio to severe sector-specific volatility."
                )
                rules_triggered.append("SECTOR_CONCENTRATION")

    # RULE C: Check Trade Velocity (> 5 trades in the last hour)
    now = datetime.now(timezone.utc)
    trades_last_hour = 0
    for t in trades:
        ts_str = t.get("timestamp")
        if ts_str:
            try:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                age_seconds = (now - dt).total_seconds()
                if 0 <= age_seconds <= 3600:
                    trades_last_hour += 1
            except Exception:
                continue

    if trades_last_hour >= MAX_TRADES_PER_HOUR:
        warnings.append(
            f"Overtrading Notice: You have executed {trades_last_hour} trades in the last hour (threshold {MAX_TRADES_PER_HOUR}). "
            f"High trading frequency often increases transaction friction and behavioral fatigue."
        )
        rules_triggered.append("OVERTRADING_VELOCITY")

    if warnings:
        combined_reason = " ".join(warnings) + f" {EDUCATIONAL_DISCLAIMER}"
        return {
            "flagged": True,
            "severity": "warning",
            "rule_triggered": "+".join(rules_triggered),
            "reason": combined_reason,
            "lock_state": lock_state,
            "provider": "Invest IQ Deterministic Engine",
        }

    # 3. Clean bill of health
    if proposed_type == "SELL" and (lock_state.get("cooldown_remaining", 0) > 0 or lock_state.get("is_locked_for_reflection")):
        clean_reason = "Position exit orders (SELL) are exempt from behavioral cooldowns and reflection locks."
    else:
        clean_reason = "Trade passed all behavioral and risk guardrail checks."

    return {
        "flagged": False,
        "severity": None,
        "rule_triggered": None,
        "reason": clean_reason,
        "lock_state": lock_state,
        "provider": "Invest IQ Watchdog Engine",
    }
