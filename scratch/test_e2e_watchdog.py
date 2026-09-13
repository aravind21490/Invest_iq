"""
scratch/test_e2e_watchdog.py - Real End-to-End Test for Phase 3 Watchdog Agent
Demonstrates:
1. Live Watchdog "Warning" Case (Sector Concentration > 60%) requiring confirmation
2. Live Warning Confirmation (Bypassing warning when explicitly acknowledged)
3. Live Watchdog "Block" Case (HTTP 403 Forbidden with Cooldown Lock Enforcement)
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))
import time
import json
import urllib.request
import urllib.error
from agents.toolbox import get_supabase_client
from datetime import datetime, timezone, timedelta

NEXTJS_ORIGIN = "http://127.0.0.1:3000"
USER_ID = "usr_demo"
TEST_TOKEN = "iqs_test_watchdog_phase3"

client = get_supabase_client()
now_iso = datetime.now(timezone.utc).isoformat()
expires_iso = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

# 1. Establish session in Supabase for usr_demo
print("=== SETUP: INSERT TEST SESSION FOR USR_DEMO ===")
if client:
    try:
        client.table("sessions").delete().eq("token", TEST_TOKEN).execute()
        client.table("sessions").insert({
            "token": TEST_TOKEN,
            "user_id": USER_ID,
            "created_at": now_iso,
            "expires_at": expires_iso,
        }).execute()
        print("Session inserted successfully.")
    except Exception as e:
        print(f"Error creating session: {e}")

# Helper for Next.js trade request
def call_trade_route(payload):
    url = f"{NEXTJS_ORIGIN}/api/user/trade"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Cookie": f"investiq_session={TEST_TOKEN}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            return status, body
    except urllib.error.HTTPError as e:
        status = e.code
        body = json.loads(e.read().decode("utf-8"))
        return status, body


import sqlite3

def set_test_cooldown(cooldown_until=0.0, loss_streak=0, lock_reason=""):
    # SQLite sync
    try:
        conn = sqlite3.connect("investiq.db")
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM portfolios WHERE user_id = ?", (USER_ID,))
        if cur.fetchone():
            cur.execute(
                """
                UPDATE portfolios 
                SET cooldown_until = ?, loss_streak = ?, lock_reason = ?, is_locked_for_reflection = 0
                WHERE user_id = ?
                """,
                (cooldown_until, loss_streak, lock_reason, USER_ID),
            )
        else:
            cur.execute(
                """
                INSERT INTO portfolios (user_id, cash_balance, cooldown_until, loss_streak, lock_reason, is_locked_for_reflection)
                VALUES (?, 100000.0, ?, ?, ?, 0)
                """,
                (USER_ID, cooldown_until, loss_streak, lock_reason),
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print("SQLite update err:", e)

    # Remote Supabase try
    if client:
        try:
            client.table("portfolios").update({
                "cooldown_until": cooldown_until,
                "loss_streak": loss_streak,
                "lock_reason": lock_reason,
            }).eq("user_id", USER_ID).execute()
        except Exception:
            pass

# ==============================================================================
# TEST CASE 1: WATCHDOG "WARNING" CASE (SECTOR CONCENTRATION > 60%)
# ==============================================================================
print("\n=== TEST CASE 1: PROPOSE TRADE WITH SECTOR CONCENTRATION > 60% ===")
set_test_cooldown(0.0, 0, "")

# Propose buying 70 shares of RELIANCE (Energy) -> ~₹89,000 in Energy, exceeding 60% of portfolio
status_warn, body_warn = call_trade_route({
    "symbol": "RELIANCE.NS",
    "type": "BUY",
    "shares": 70,
})

print(f"Status: {status_warn}")
print("Response:")
print(json.dumps(body_warn, indent=2))

# ==============================================================================
# TEST CASE 1B: CONFIRM AND PROCEED WITH WARNING
# ==============================================================================
print("\n=== TEST CASE 1B: USER CONFIRMS WARNING (confirmedWarning: true) ===")
status_confirm, body_confirm = call_trade_route({
    "symbol": "RELIANCE.NS",
    "type": "BUY",
    "shares": 5, # buy small amount to allow execution
    "confirmedWarning": True,
})
print(f"Status: {status_confirm}")
print("Response:")
print(json.dumps(body_confirm, indent=2))

# ==============================================================================
# TEST CASE 2: WATCHDOG "BLOCK" CASE (REVENGE TRADING COOLDOWN ACTIVE)
# ==============================================================================
print("\n=== TEST CASE 2: ATTEMPT TRADE DURING ACTIVE COOLDOWN ('BLOCK' CASE) ===")
# Simulate behavioral cooldown active (e.g. 280 seconds remaining after revenge-sizing block)
cooldown_future = time.time() + 280
block_reason = (
    "Trading Blocked (Revenge Sizing Guardrail): You have logged 2 consecutive losses, "
    "and your proposed trade is 1.8x larger than your average losing trade. "
    "A 5-minute cool-off period has been activated."
)

set_test_cooldown(cooldown_future, 2, block_reason)

status_block, body_block = call_trade_route({
    "symbol": "TCS.NS",
    "type": "BUY",
    "shares": 5,
    "confirmedWarning": True, # Even with confirmedWarning, BLOCK cannot be bypassed!
})

print(f"Status: {status_block} (Expected: 403 Forbidden)")
print("Response:")
print(json.dumps(body_block, indent=2))

# ==============================================================================
# CLEANUP
# ==============================================================================
print("\n=== CLEANUP ===")
set_test_cooldown(0.0, 0, "")
if client:
    try:
        client.table("sessions").delete().eq("token", TEST_TOKEN).execute()
        print("Test session cleaned up.")
    except Exception as e:
        print(f"Cleanup error: {e}")
