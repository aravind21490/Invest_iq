import urllib.request
import json
import time
import sys

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")

BASE = "http://127.0.0.1:5000"
KEY = "investiq_agent_secret_dev_key_9812"

def call(endpoint, payload=None, method="POST"):
    url = f"{BASE}{endpoint}"
    data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json", "X-Agent-Service-Key": KEY},
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def main():
    print("=" * 70)
    print("LIVE CROSS-CHECK OF ALL INVEST IQ AGENTS ON RUNNING SERVER")
    print("=" * 70)

    # 0. Health
    st, data = call("/api/agents/health", method="GET")
    assert st == 200 and data.get("status") == "healthy"
    print(f"[0/5] Agent Engine Health Check: HTTP {st} OK ({data.get('service')})")

    # 1. Watchdog Agent
    st, data = call("/api/agents/watchdog-check", {
        "user_id": "usr_demo",
        "symbol": "RELIANCE.NS",
        "shares": 5,
        "type": "BUY",
        "price": 1287.5
    })
    print(f"[1/5] Watchdog Agent: HTTP {st} (allowed={data.get('allowed')}, blocked={data.get('blocked')}, warnings={len(data.get('warnings', []))})")
    assert st == 200

    # 2. Watchlist Curator Agent
    st, data = call("/api/agents/curate", {"user_id": "usr_demo", "force_refresh": False})
    print(f"[2/5] Watchlist Curator Agent: HTTP {st} (success={data.get('success')}, suggestions={len(data.get('suggestions', []))}, capped={data.get('capped')})")
    assert st == 200

    # 3. Stock Research Agent
    st, data = call("/api/agents/research", {
        "user_id": "usr_demo",
        "question": "What are the technical indicators for RELIANCE.NS?"
    })
    print(f"[3/5] Stock Research Agent: HTTP {st} (success={data.get('success')}, tool_calls={len(data.get('tool_calls', []))})")
    print(f"      Answer excerpt: {data.get('answer', '')[:100]}...")
    assert st == 200

    # 4. Lesson-Sequencing Agent
    st, data = call("/api/agents/next-lesson", {"user_id": "usr_demo"})
    print(f"[4/5] Lesson-Sequencing Agent: HTTP {st} (lesson={data.get('recommended_lesson_id')}, title='{data.get('lesson_title')}', has_flag={data.get('has_active_flag')})")
    assert st == 200

    # 5. Post-Trade Debrief Agent
    st, data = call("/api/agents/debrief", {"user_id": "usr_demo", "trade_id": "NONEXISTENT_TRADE"})
    print(f"[5/5] Post-Trade Debrief Agent: HTTP {st} (handled nonexistent trade cleanly: error='{data.get('error')}')")
    assert st == 404

    print("=" * 70)
    print("ALL 5 AGENTS ARE FULLY OPERATIONAL AND VERIFIED LIVE!")
    print("=" * 70)

if __name__ == "__main__":
    main()
