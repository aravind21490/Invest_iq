"""
scratch/verify_phase6_e2e.py - End-to-End Verification for Phase 6 Lesson-Sequencing Agent
Tests:
1. Real database insertion of Watchdog flag into agent_flags.
2. Real database insertion of Curator suggestion into agent_flags (to verify it is ignored).
3. Querying /api/agents/next-lesson route with shared secret.
4. Validating recommended lesson matches rule-based map (t5-4).
5. Testing clean user profile returning default progression (t1-1).
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime

# Add workspace to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import get_db_connection
from agents.toolbox import get_supabase_client
from agents.lesson_agent import recommend_next_lesson

def test_e2e():
    print("=" * 70)
    print("PHASE 6 LESSON-SEQUENCING AGENT: REAL END-TO-END VERIFICATION")
    print("=" * 70)

    test_user_flagged = "usr_p6_watchdog_flagged"
    test_user_curator_only = "usr_p6_curator_only"
    test_user_clean = "usr_p6_clean"

    now_str = datetime.now().isoformat()
    now_epoch = time.time()

    # 1. SETUP: Insert real Watchdog flag for test_user_flagged
    conn = get_db_connection()
    cur = conn.cursor()

    # Clean old test rows
    cur.execute("DELETE FROM agent_flags WHERE user_id IN (%s, %s, %s)", 
                (test_user_flagged, test_user_curator_only, test_user_clean))
    
    flag_id_watchdog = f"flag_wd_{int(now_epoch * 1000)}"
    watchdog_reason = (
        "Trading Blocked (Revenge Sizing Guardrail): You have logged 3 consecutive losses, "
        "and your proposed trade (₹150,000.00) is 2.4x larger than your average losing trade. "
        "A 5-minute cool-off period has been activated."
    )
    cur.execute(
        """
        INSERT INTO agent_flags (id, user_id, symbol, agent_name, reason, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (flag_id_watchdog, test_user_flagged, "RELIANCE.NS", "watchdog", watchdog_reason, now_str)
    )

    # 2. SETUP: Insert Curator suggestion for test_user_curator_only
    flag_id_curator = f"flag_cur_{int(now_epoch * 1000)}"
    curator_reason = "AI Curator: Proposing 3 high-conviction simulated setups based on your watchlist."
    cur.execute(
        """
        INSERT INTO agent_flags (id, user_id, symbol, agent_name, reason, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (flag_id_curator, test_user_curator_only, "INFY.NS", "curator", curator_reason, now_str)
    )

    conn.commit()
    conn.close()
    print("[1] Seeded test database with real Watchdog flag and real Curator suggestion.")

    # 3. VERIFY DIRECT AGENT RECOMMENDATION (FLAGEGD USER)
    print("\n[2] Executing recommend_next_lesson for Watchdog-flagged user...")
    res_flagged = recommend_next_lesson(test_user_flagged)
    print(f"    - User: {res_flagged['user_id']}")
    print(f"    - Pattern: {res_flagged['pattern_type']}")
    print(f"    - Trigger Source: {res_flagged['trigger_source']}")
    print(f"    - Recommended Lesson: {res_flagged['recommended_lesson_id']} - {res_flagged['lesson_title']}")
    print(f"    - Tier: {res_flagged['tier_title']} (Tier {res_flagged['tier_id']})")
    print(f"    - Coaching Nudge:\n      \"{res_flagged['nudge_message']}\"")
    
    assert res_flagged["recommended_lesson_id"] == "t5-4", f"Expected t5-4, got {res_flagged['recommended_lesson_id']}"
    assert res_flagged["pattern_type"] == "REVENGE_SIZING"
    assert res_flagged["has_active_flag"] is True
    print("    -> PASS: Watchdog revenge sizing flag correctly mapped to t5-4 (FOMO & Revenge Trading)!")

    # 4. VERIFY CURATOR SUGGESTIONS ARE IGNORED (CURATOR-ONLY USER)
    print("\n[3] Executing recommend_next_lesson for Curator-only user...")
    res_curator = recommend_next_lesson(test_user_curator_only)
    print(f"    - User: {res_curator['user_id']}")
    print(f"    - Pattern: {res_curator['pattern_type']}")
    print(f"    - Recommended Lesson: {res_curator['recommended_lesson_id']} - {res_curator['lesson_title']}")
    assert res_curator["recommended_lesson_id"] == "t1-1", f"Expected t1-1, got {res_curator['recommended_lesson_id']}"
    assert res_curator["pattern_type"] == "DEFAULT_PROGRESSION"
    assert res_curator["has_active_flag"] is False
    print("    -> PASS: Curator suggestion was NOT mistaken for a mistake pattern! Fell back to default progression.")

    # 5. VERIFY CLEAN USER GETS DEFAULT PROGRESSION
    print("\n[4] Executing recommend_next_lesson for clean user...")
    res_clean = recommend_next_lesson(test_user_clean)
    assert res_clean["recommended_lesson_id"] == "t1-1"
    assert res_clean["pattern_type"] == "DEFAULT_PROGRESSION"
    print("    -> PASS: Clean user correctly receives default progression lesson t1-1 (What is a Stock?).")

    # 6. VERIFY FLASK API ROUTE OVER HTTP
    print("\n[5] Testing live Flask route POST /api/agents/next-lesson over HTTP...")
    flask_url = "http://127.0.0.1:5000/api/agents/next-lesson"
    secret = os.environ.get("AGENT_SERVICE_SECRET", "investiq_agent_secret_dev_key_9812")
    headers = {
        "Content-Type": "application/json",
        "X-Agent-Service-Key": secret,
    }
    payload = json.dumps({"user_id": test_user_flagged}).encode("utf-8")
    req = urllib.request.Request(flask_url, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status_code = response.status
            body = json.loads(response.read().decode("utf-8"))
            print(f"    - HTTP Status: {status_code}")
            print(f"    - Response Lesson: {body.get('recommended_lesson_id')} - {body.get('lesson_title')}")
            assert status_code == 200
            assert body["success"] is True
            assert body["recommended_lesson_id"] == "t5-4"
            print("    -> PASS: Live Flask endpoint returned 200 OK with authentic recommendation payload!")
    except Exception as e:
        print(f"    - HTTP Request Failed: {e}")
        raise e

    print("\n" + "=" * 70)
    print("ALL PHASE 6 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_e2e()
