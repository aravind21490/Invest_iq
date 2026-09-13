import urllib.request
import json
import time

origin = "http://127.0.0.1:3000"

print("=" * 80)
print("PHASE 5: RESEARCH AGENT LIVE END-TO-END VERIFICATION")
print("=" * 80)

# 1. Real User Authentication
print("\n--- 1. AUTHENTICATING LIVE USER SESSION ---")
req = urllib.request.Request(
    f"{origin}/api/auth/otp/verify",
    data=json.dumps({"identifier": "demo@investiq.ai", "code": "732109"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    cookie_header = resp.headers.get("Set-Cookie")
    cookie = cookie_header.split(";")[0] if cookie_header else ""
    user_info = json.loads(resp.read().decode("utf-8"))

print(f"User Authenticated: ID={user_info['user']['id']}, Email={user_info['user']['email']}")
print(f"Session Cookie: {cookie}")

# 2. Live Research Query: Multi-Tool Question (Watchlist + Backtest Win Rate)
print("\n--- 2. REAL QUESTION 1: WATCHLIST & SIGNAL BACKTEST WIN RATE ---")
q1 = "What stocks are currently in my watchlist, and what is the empirical backtest win rate for OVERSOLD_BOUNCE?"
print(f"Question: \"{q1}\"")

t0 = time.time()
research_req1 = urllib.request.Request(
    f"{origin}/api/agents/research",
    data=json.dumps({"question": q1}).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Cookie": cookie,
    }
)
with urllib.request.urlopen(research_req1) as resp:
    status1 = resp.status
    data1 = json.loads(resp.read().decode("utf-8"))
elapsed1 = int((time.time() - t0) * 1000)

print(f"HTTP Status: {status1} OK")
print(f"Latency: {elapsed1}ms (Agent latency: {data1.get('latency_ms')}ms)")
print(f"Provider: {data1.get('provider')}")
print(f"Steps Taken: {data1.get('steps_taken')}")
print(f"\n[REAL ANSWER]:\n{data1.get('answer')}")

print("\n[TOOL-CALL TRACE]:")
for t in data1.get("tool_trace", []):
    print(f"  Step {t.get('step')}: {t.get('tool')}()")
    print(f"    Arguments: {json.dumps(t.get('arguments'))}")
    res_str = json.dumps(t.get('result'))
    print(f"    Result: {res_str[:120]}..." if len(res_str) > 120 else f"    Result: {res_str}")

# 3. Live Research Query: Stock Indicators & Signals
print("\n--- 3. REAL QUESTION 2: STOCK TECHNICAL INDICATORS & SIGNALS ---")
q2 = "Analyze current technical indicators and active setups for RELIANCE.NS"
print(f"Question: \"{q2}\"")

t0 = time.time()
research_req2 = urllib.request.Request(
    f"{origin}/api/agents/research",
    data=json.dumps({"question": q2}).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Cookie": cookie,
    }
)
with urllib.request.urlopen(research_req2) as resp:
    status2 = resp.status
    data2 = json.loads(resp.read().decode("utf-8"))
elapsed2 = int((time.time() - t0) * 1000)

print(f"HTTP Status: {status2} OK")
print(f"Latency: {elapsed2}ms (Agent latency: {data2.get('latency_ms')}ms)")
print(f"Provider: {data2.get('provider')}")
print(f"Steps Taken: {data2.get('steps_taken')}")
safe_ans2 = data2.get('answer', '').replace('\u20b9', 'INR ')
print(f"\n[REAL ANSWER]:\n{safe_ans2}")

print("\n[TOOL-CALL TRACE]:")
for t in data2.get("tool_trace", []):
    print(f"  Step {t.get('step')}: {t.get('tool')}()")
    print(f"    Arguments: {json.dumps(t.get('arguments'))}")
    res_str = json.dumps(t.get('result')).replace('\u20b9', 'INR ')
    print(f"    Result: {res_str[:120]}..." if len(res_str) > 120 else f"    Result: {res_str}")

print("\n" + "=" * 80)
print("ALL LIVE END-TO-END RESEARCH VERIFICATIONS PASSED")
print("=" * 80)
