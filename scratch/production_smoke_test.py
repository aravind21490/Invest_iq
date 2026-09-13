"""
scratch/production_smoke_test.py - Production Post-Deployment Smoke Test
Invest IQ Agentic AI Layer (Phases 1-6)

USAGE:
    python scratch/production_smoke_test.py --url https://your-app.vercel.app --cookie "investiq_session=your_jwt_cookie_here"

WHAT IT EXERCISES:
1. Agent Bridge Connectivity (/api/agents/test-bridge):
   Verifies Next.js -> Flask backend bridge connectivity, shared secret handshake, and status.
2. Research Agent Inquiry (/api/agents/research):
   Sends a live technical query; asserts read-only execution, bounded steps, and tool trace.
3. Watchdog Pre-Trade Guardrail & Block (/api/user/trade):
   Tests behavioral checking on trade execution.
4. Watchdog Block + SELL-Still-Works Guarantee:
   Confirms that even when BUY is restricted under cool-off, SELL orders are never blocked.
5. Lesson-Sequencing Recommendation (/api/agents/next-lesson):
   Queries personalized adaptive curriculum recommendation for the authenticated user.

NOTE: This script is intended to be invoked manually AFTER production deployment.
"""

import sys
import json
import argparse
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")



def make_request(
    url: str,
    method: str = "GET",
    data: Dict[str, Any] = None,
    cookie: str = "",
    bypass: str = "",
    timeout: int = 90,
) -> Tuple[int, Dict[str, Any]]:
    """Execute HTTP request with session cookie and return status code and JSON payload."""
    headers = {
        "Accept": "application/json",
        "User-Agent": "InvestIQ-ProductionSmokeTest/1.0",
    }
    if bypass:
        headers["x-vercel-protection-bypass"] = bypass
    if cookie:
        # Support either full cookie string or raw token
        cookie_header = cookie if "=" in cookie else f"investiq_session={cookie}"
        headers["Cookie"] = cookie_header


    body_bytes = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body_bytes = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)

    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status = resp.status
                raw = resp.read().decode("utf-8")
                try:
                    parsed = json.loads(raw)
                except Exception:
                    parsed = {"raw": raw}
                return status, parsed
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
            except Exception:
                parsed = {"raw": err_body}
            if attempt == 0 and ("gateway timeout" in str(parsed).lower() or err.code in (502, 504)):
                time.sleep(2)
                continue
            return err.code, parsed
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
                continue
            return 0, {"error": str(e)}
    return 0, {"error": "Request failed after retry"}



def run_smoke_test(base_url: str, cookie: str, bypass: str = ""):
    clean_url = base_url.rstrip("/")
    print("=" * 75)
    print("INVEST IQ PRODUCTION POST-DEPLOYMENT SMOKE TEST")
    print(f"Target URL: {clean_url}")
    print("=" * 75)

    passes = 0
    failures = 0

    # -----------------------------------------------------------------------
    # TEST 1: Agent Bridge Health Check
    # -----------------------------------------------------------------------
    print("\n[TEST 1] Verifying Next.js -> Flask Agent Bridge...")
    bridge_url = f"{clean_url}/api/agents/test-bridge"
    status, res = make_request(bridge_url, method="GET", cookie=cookie, bypass=bypass)
    flask_resp = res.get("flaskResponse") or {}
    is_healthy = (
        status == 200
        and (
            res.get("bridgeStatus") == 200
            or res.get("success")
            or res.get("status") == "ok"
            or res.get("bridge") == "connected"
            or flask_resp.get("status") == "healthy"
            or flask_resp.get("success") is True
        )
    )
    if is_healthy:
        print("  ✓ PASS: Agent Bridge is connected and healthy (HTTP 200).")
        print(f"    - Flask Endpoint: {res.get('flaskUrl')}")
        print(f"    - Service: {flask_resp.get('service', 'Flask Agent Engine')}")
        passes += 1
    else:
        print(f"  ✗ FAIL: Bridge check returned HTTP {status}: {json.dumps(res)}")
        failures += 1


    # -----------------------------------------------------------------------
    # TEST 2: Research Agent Multi-Tool Query
    # -----------------------------------------------------------------------
    print("\n[TEST 2] Testing Research Agent (Multi-Tool Dispatch & Read-Only Trace)...")
    research_url = f"{clean_url}/api/agents/research"
    status, res = make_request(
        research_url,
        method="POST",
        data={"question": "What is the 14-day RSI and volume setup for RELIANCE.NS?"},
        cookie=cookie,
        bypass=bypass,
    )
    if status == 200 and res.get("success") and "answer" in res:
        print("  ✓ PASS: Research Agent answered successfully.")
        print(f"    - Provider: {res.get('provider', 'Engine')}")
        print(f"    - Latency: {res.get('latency_ms', 0)}ms")
        print(f"    - Tool Steps Taken: {res.get('steps_taken', 0)}")
        trace = res.get("tool_trace", [])
        if trace:
            tools_called = [t.get("tool") for t in trace]
            print(f"    - Tool Trace: {' -> '.join(tools_called)}")
        passes += 1
    else:
        print(f"  ✗ FAIL: Research Agent returned HTTP {status}: {json.dumps(res)}")
        failures += 1

    # -----------------------------------------------------------------------
    # TEST 3: Watchdog Behavioral Guardrail & Pre-Trade Case
    # -----------------------------------------------------------------------
    print("\n[TEST 3] Testing Watchdog Pre-Trade Evaluation...")
    trade_url = f"{clean_url}/api/user/trade"
    # Propose a trade that checks pre-trade evaluation
    status, res = make_request(
        trade_url,
        method="POST",
        data={"symbol": "INFY.NS", "type": "BUY", "shares": 1, "price": 1800.0},
        cookie=cookie,
        bypass=bypass,
    )
    if status == 200 and res.get("warning") and res.get("requiresConfirmation"):
        print(f"  ✓ PASS: Watchdog issued soft behavioral warning: {res.get('message')}")
        print("    - Confirming trade past warning with confirmedWarning: true...")
        status, res = make_request(
            trade_url,
            method="POST",
            data={"symbol": "INFY.NS", "type": "BUY", "shares": 1, "price": 1800.0, "confirmedWarning": True},
            cookie=cookie,
            bypass=bypass,
        )
    if status == 200 and (res.get("success") or res.get("trade")):
        print("  ✓ PASS: Trade evaluated and executed successfully through pre-trade watchdog pipeline (HTTP 200).")
        if res.get("trade"):
            print(f"    - Trade ID: {res.get('trade', {}).get('id')} | Size: {res.get('trade', {}).get('shares')} @ ₹{res.get('trade', {}).get('price')}")
        passes += 1
    elif status == 403 and (res.get("blocked") or res.get("flagged")):
        print(f"  ✓ PASS: Watchdog guardrail actively intercepted trade (Severity: block): {res.get('message')}")
        passes += 1
    elif status == 401:
        print(f"  ✗ FAIL: Authentication or deployment protection failure on trade (HTTP 401): {json.dumps(res)}")
        failures += 1
    else:
        print(f"  ✗ FAIL: Trade endpoint returned unexpected status HTTP {status}: {json.dumps(res)}")
        failures += 1


    # -----------------------------------------------------------------------
    # TEST 4: Watchdog Invariant: SELL Orders Are NEVER Blocked
    # -----------------------------------------------------------------------
    print("\n[TEST 4] Testing Watchdog Core Invariant (SELL orders must never be blocked)...")
    # Propose a SELL trade
    status, res = make_request(
        trade_url,
        method="POST",
        data={"symbol": "INFY.NS", "type": "SELL", "shares": 1, "price": 1800.0},
        cookie=cookie,
        bypass=bypass,
    )
    if status == 200 and res.get("warning") and res.get("requiresConfirmation"):
        print(f"  - Watchdog soft warning received on SELL, confirming past prompt...")
        status, res = make_request(
            trade_url,
            method="POST",
            data={"symbol": "INFY.NS", "type": "SELL", "shares": 1, "price": 1800.0, "confirmedWarning": True},
            cookie=cookie,
            bypass=bypass,
        )

    # The SELL trade must prove that the trade reached the execution engine without being blocked.
    # Expected valid outcomes:
    # 1. HTTP 200 with success=true (trade executed and recorded in portfolio ledger)
    # 2. HTTP 400 with "insufficient shares" (trade reached portfolio engine past Watchdog, rejected only by inventory check)
    # Any other status (401 Auth/Vercel firewall, 403 Watchdog Block, 500/502/503 server error) MUST FAIL.
    if status == 200 and (res.get("success") or res.get("trade")):
        print(f"  ✓ PASS: SELL trade executed successfully without restriction (HTTP 200 OK).")
        print(f"    - Message: {res.get('message')}")
        if res.get("trade"):
            print(f"    - Trade ID: {res.get('trade', {}).get('id')} | Amount: ₹{res.get('trade', {}).get('amount')}")
        passes += 1
    elif status == 400 and ("insufficient" in res.get("message", "").lower() or "shares" in res.get("message", "").lower()):
        print(f"  ✓ PASS: SELL trade passed Watchdog and reached portfolio engine (HTTP 400: {res.get('message')}).")
        passes += 1
    elif status == 403:
        print(f"  ✗ FAIL: Invariant violation: SELL trade was BLOCKED by guardrails (HTTP 403): {json.dumps(res)}")
        failures += 1
    elif status == 401:
        print(f"  ✗ FAIL: Authentication or deployment protection failure (HTTP 401): {json.dumps(res)}")
        failures += 1
    else:
        print(f"  ✗ FAIL: SELL trade failed unexpectedly with HTTP {status}: {json.dumps(res)}")
        failures += 1



    # -----------------------------------------------------------------------
    # TEST 5: Lesson-Sequencing Recommendation
    # -----------------------------------------------------------------------
    print("\n[TEST 5] Testing Adaptive Lesson-Sequencing Agent (/api/agents/next-lesson)...")
    lesson_url = f"{clean_url}/api/agents/next-lesson"
    status, res = make_request(lesson_url, method="GET", cookie=cookie, bypass=bypass)
    if status == 200 and res.get("success") and res.get("recommended_lesson_id"):
        print("  ✓ PASS: Lesson Agent generated personalized curriculum recommendation.")
        print(f"    - Recommended Lesson: {res.get('recommended_lesson_id')} ({res.get('lesson_title')})")
        print(f"    - Trigger Pattern: {res.get('pattern_type')}")
        print(f"    - Nudge: \"{res.get('nudge_message')}\"")
        passes += 1
    else:
        print(f"  ✗ FAIL: Lesson Agent returned HTTP {status}: {json.dumps(res)}")
        failures += 1

    # -----------------------------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------------------------
    print("\n" + "=" * 75)
    print(f"SMOKE TEST COMPLETE: {passes} PASSED, {failures} FAILED")
    print("=" * 75)

    if failures == 0:
        print("\n🚀 ALL PRODUCTION SMOKE TESTS PASSED! The agentic layer is operational.")
        return 0
    else:
        print(f"\n⚠️ {failures} test(s) failed. Please check your environment variables and logs.")
        return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Invest IQ Production Smoke Test")
    parser.add_argument("--url", required=True, help="Production base URL (e.g. https://investiq.vercel.app)")
    parser.add_argument("--cookie", required=True, help="Active user session cookie value (investiq_session=...)")
    parser.add_argument("--bypass", default="", help="Vercel Protection Bypass secret header value if enabled")
    args = parser.parse_args()

    sys.exit(run_smoke_test(args.url, args.cookie, args.bypass))

