"""
scratch/test_phase3_resolution.py
End-to-End Verification of Phase 3 Resolution:
1. Item 1: Confirm SELL orders succeed during active cooldown while BUY orders are blocked.
2. Item 2: Full live sequence showing 2 real losing SELL trades followed by an oversized BUY
   triggering the revenge-sizing block for the first time.
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))
import time
import json
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

NEXTJS_ORIGIN = "http://127.0.0.1:3000"
FLASK_ORIGIN = "http://127.0.0.1:5000"
USER_ID = "usr_demo"
TEST_TOKEN = "iqs_phase3_resolution_token"

from agents.toolbox import get_supabase_client, get_db_connection

supabase = get_supabase_client()

def setup_session():
    now_iso = datetime.now(timezone.utc).isoformat()
    expires_iso = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    if supabase:
        try:
            supabase.table("sessions").delete().eq("token", TEST_TOKEN).execute()
            supabase.table("sessions").insert({
                "token": TEST_TOKEN,
                "user_id": USER_ID,
                "created_at": now_iso,
                "expires_at": expires_iso,
            }).execute()
        except Exception as e:
            print(f"Supabase session setup notice: {e}")

def call_trade(payload):
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
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def reset_cooldown(cooldown_until=0.0, loss_streak=0, lock_reason=""):
    try:
        conn = sqlite3.connect("investiq.db")
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE portfolios 
            SET cooldown_until = ?, loss_streak = ?, lock_reason = ?, is_locked_for_reflection = 0
            WHERE user_id = ?
            """,
            (cooldown_until, loss_streak, lock_reason, USER_ID),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("SQLite reset error:", e)

    if supabase:
        try:
            supabase.table("portfolios").update({
                "cooldown_until": cooldown_until,
                "loss_streak": loss_streak,
                "lock_reason": lock_reason,
            }).eq("user_id", USER_ID).execute()
        except Exception:
            pass

def ensure_position(symbol, shares, avg_buy_price, sector="General"):
    """Ensure user has a position in Supabase and SQLite."""
    now_iso = datetime.now().isoformat()
    pos_id = f"pos_{USER_ID}_{symbol.lower()}"
    # Supabase
    if supabase:
        try:
            supabase.table("positions").upsert({
                "id": pos_id,
                "user_id": USER_ID,
                "symbol": symbol,
                "name": symbol,
                "shares": shares,
                "avg_buy_price": avg_buy_price,
                "sector": sector,
                "updated_at": now_iso,
            }, on_conflict="user_id,symbol").execute()
        except Exception as e:
            print(f"Supabase upsert position notice: {e}")

    # SQLite
    try:
        conn = sqlite3.connect("investiq.db")
        cur = conn.cursor()
        cur.execute("SELECT id FROM positions WHERE user_id = ? AND symbol = ?", (USER_ID, symbol))
        row = cur.fetchone()
        if row:
            cur.execute(
                "UPDATE positions SET shares = ?, avg_buy_price = ?, sector = ?, updated_at = ? WHERE user_id = ? AND symbol = ?",
                (shares, avg_buy_price, sector, now_iso, USER_ID, symbol),
            )
        else:
            cur.execute(
                "INSERT INTO positions (id, user_id, symbol, name, shares, avg_buy_price, sector, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (pos_id, USER_ID, symbol, symbol, shares, avg_buy_price, sector, now_iso),
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"SQLite position error: {e}")


def main():
    print("=" * 70)
    print("STARTING PHASE 3 RESOLUTION VERIFICATION")
    print("=" * 70)
    setup_session()

    # --------------------------------------------------------------------------
    # ITEM 1: CONFIRM SELL ORDERS SUCCEED DURING ACTIVE COOLDOWN
    # --------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("ITEM 1: ATTEMPT SELL WHILE COOLDOWN_UNTIL IS ACTIVE")
    print("=" * 70)

    # 1. Setup active cooldown: 300 seconds left
    future_cd = time.time() + 300
    reset_cooldown(
        cooldown_until=future_cd,
        loss_streak=2,
        lock_reason="Trading locked in behavioral cooldown (300s remaining). Take a breather to prevent revenge trading.",
    )
    print(f"[Setup] Active cooldown instituted until {future_cd} (300s remaining).")

    # 2. Ensure usr_demo has a position of 5 shares in TCS.NS
    ensure_position("TCS.NS", shares=5, avg_buy_price=2200.0, sector="Technology")
    print("[Setup] Holding confirmed: 5 shares of TCS.NS.")

    # 3. First, demonstrate that BUY order IS blocked by the cooldown
    print("\n--> Step 1A: Attempt BUY during cooldown (Expected: 403 Forbidden)")
    buy_status, buy_resp = call_trade({
        "symbol": "TCS.NS",
        "type": "BUY",
        "shares": 1,
    })
    print(f"BUY Response Status: {buy_status}")
    print(f"BUY Response Body:\n{json.dumps(buy_resp, indent=2)}")
    assert buy_status == 403, f"Expected 403 but got {buy_status}"
    assert buy_resp.get("blocked") is True

    # 4. Now, demonstrate that SELL order SUCCEEDS during the same cooldown!
    print("\n--> Step 1B: Attempt SELL during active cooldown (Expected: 200 OK / Success)")
    sell_status, sell_resp = call_trade({
        "symbol": "TCS.NS",
        "type": "SELL",
        "shares": 1,
    })
    print(f"SELL Response Status: {sell_status}")
    print(f"SELL Response Body:\n{json.dumps(sell_resp, indent=2)}")
    assert sell_status == 200, f"Expected 200 but got {sell_status}"
    assert sell_resp.get("success") is True
    print("\n[VERIFIED ITEM 1] SELL order succeeded during active cooldown! Users can freely exit positions.")

    # --------------------------------------------------------------------------
    # ITEM 2: REAL TRIGGER SEQUENCE FOR REVENGE SIZING
    # --------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("ITEM 2: REAL TRIGGER SEQUENCE - 2 REAL LOSING SELLS -> OVERSIZED BUY")
    print("=" * 70)

    # 1. Start from clean state: no cooldown, loss streak 0
    reset_cooldown(0.0, 0, "")
    print("[Setup] Reset portfolio to clean slate: cooldown_until=0, loss_streak=0.")

    # 2. To execute real losing SELLs:
    # Set position cost basis higher than live market price so the sale realizes a loss.
    # Current TCS.NS market price is ~INR 2,200. Setting avg_buy_price = INR 2,500 means INR 300 loss per share.
    ensure_position("TCS.NS", shares=10, avg_buy_price=2500.0, sector="Technology")

    print("\n--> Step 2A: Execute First Real Losing SELL (1 share of TCS.NS)")
    loss1_status, loss1_resp = call_trade({
        "symbol": "TCS.NS",
        "type": "SELL",
        "shares": 1,
    })
    print(f"Loss Trade #1 Status: {loss1_status}")
    trade1 = loss1_resp.get("trade", {})
    t1_pnl = trade1.get("pnl")
    t1_amt = trade1.get("amount")
    print(f"Loss Trade #1 Details: P&L = INR {t1_pnl}, Turnover = INR {t1_amt}")

    print("\n--> Step 2B: Execute Second Real Losing SELL (1 share of TCS.NS)")
    loss2_status, loss2_resp = call_trade({
        "symbol": "TCS.NS",
        "type": "SELL",
        "shares": 1,
    })
    print(f"Loss Trade #2 Status: {loss2_status}")
    trade2 = loss2_resp.get("trade", {})
    t2_pnl = trade2.get("pnl")
    t2_amt = trade2.get("amount")
    print(f"Loss Trade #2 Details: P&L = INR {t2_pnl}, Turnover = INR {t2_amt}")

    avg_loss_turnover = (float(t1_amt) + float(t2_amt)) / 2.0
    print(f"\n[Streak Summary] 2 consecutive losing SELLs logged.")
    print(f"Average Loss Turnover: INR {avg_loss_turnover:,.2f}")
    threshold_125 = avg_loss_turnover * 1.25
    print(f"Revenge Sizing Trigger Threshold (>= 1.25x): INR {threshold_125:,.2f}")

    # Verify that cooldown is NOT yet active before the oversized buy
    from agents.watchdog_agent import _get_portfolio_lock_state
    lock_before = _get_portfolio_lock_state(USER_ID)
    print(f"Cooldown remaining before oversized BUY: {lock_before['cooldown_remaining']}s (Must be 0)")
    assert lock_before["cooldown_remaining"] == 0

    # 3. Now attempt an oversized BUY trade (e.g. 2 shares of TCS.NS = ~INR 4,400 >= INR 2,750 threshold)
    print(f"\n--> Step 2C: Attempt Oversized BUY (2 shares of TCS.NS, ~2.0x average loss size)")
    revenge_status, revenge_resp = call_trade({
        "symbol": "TCS.NS",
        "type": "BUY",
        "shares": 2,
    })
    print(f"Oversized BUY Status: {revenge_status} (Expected: 403 Forbidden)")
    print(f"Oversized BUY Response Body:\n{json.dumps(revenge_resp, indent=2)}")

    assert revenge_status == 403, f"Expected 403 but got {revenge_status}"
    assert revenge_resp.get("blocked") is True
    assert "Revenge Sizing Guardrail" in revenge_resp.get("message", "")
    assert revenge_resp.get("lockState", {}).get("cooldown_remaining", 0) > 0

    print("\n[VERIFIED ITEM 2] Real trigger sequence successfully provoked the revenge-sizing block!")
    print(f"Triggered block for the FIRST time and initiated {revenge_resp['lockState']['cooldown_remaining']}s cooldown.")

    # Cleanup
    reset_cooldown(0.0, 0, "")
    print("\n" + "=" * 70)
    print("ALL TESTS PASSED CLEANLY")
    print("=" * 70)

if __name__ == "__main__":
    main()
