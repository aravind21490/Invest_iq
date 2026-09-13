"""
scratch/test_market_badges_live.py
Direct end-to-end verification of real tickers (RELIANCE.NS, AAPL) under:
1. Normal live market condition
2. Simulated 401 Unauthorized / Invalid Crumb condition
"""

import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")

def run_tests():
    # 1. Authenticate with dev OTP
    auth_req = urllib.request.Request(
        "http://127.0.0.1:3000/api/auth/otp/verify",
        data=json.dumps({"identifier": "test@investiq.local", "code": "732109"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(auth_req) as resp:
        cookie_str = resp.headers.get("Set-Cookie").split(";")[0]

    print("=" * 80)
    print("LIVE VERIFICATION ON REAL TICKERS (RELIANCE.NS & AAPL)")
    print("=" * 80)

    # -------------------------------------------------------------
    # STATE A: NORMAL LIVE MARKET CONDITION (REAL TICKERS)
    # -------------------------------------------------------------
    print("\n>>> STATE A: NORMAL LIVE REQUEST (RELIANCE.NS & AAPL)")
    req_live = urllib.request.Request(
        "http://127.0.0.1:3000/api/market/quotes?symbols=RELIANCE.NS,AAPL",
        headers={"Cookie": cookie_str},
    )
    with urllib.request.urlopen(req_live) as resp:
        data_live = json.loads(resp.read().decode("utf-8"))
        for q in data_live.get("quotes", []):
            sym = q.get("symbol")
            price = q.get("price")
            sim = q.get("isSimulated")
            src = q.get("dataSource")
            print(f"  Ticker: {sym:<12} | Price: {price:<8} | isSimulated: {str(sim):<6} | dataSource: {src}")
            assert sim is False, f"Expected isSimulated=False for {sym}"
            assert src == "live", f"Expected dataSource='live' for {sym}"

    # Chart live
    req_chart_live = urllib.request.Request(
        "http://127.0.0.1:3000/api/market/chart?symbol=RELIANCE.NS&range=1mo",
        headers={"Cookie": cookie_str},
    )
    with urllib.request.urlopen(req_chart_live) as resp:
        data_chart_live = json.loads(resp.read().decode("utf-8"))
        print(f"  Chart: RELIANCE.NS  | Points: {len(data_chart_live.get('points', []))} | isSimulated: {data_chart_live.get('isSimulated')}")
        assert data_chart_live.get("isSimulated") is False

    # -------------------------------------------------------------
    # STATE B: 401 INVALID CRUMB ERROR TRIGGERED ON SAME REAL TICKERS
    # -------------------------------------------------------------
    print("\n>>> STATE B: YAHOO 401 ERROR TRIGGERED ON EXACT SAME REAL TICKERS (RELIANCE.NS & AAPL)")
    req_401 = urllib.request.Request(
        "http://127.0.0.1:3000/api/market/quotes?symbols=RELIANCE.NS,AAPL&simulate401=true",
        headers={"Cookie": cookie_str},
    )
    with urllib.request.urlopen(req_401) as resp:
        data_401 = json.loads(resp.read().decode("utf-8"))
        for q in data_401.get("quotes", []):
            sym = q.get("symbol")
            price = q.get("price")
            sim = q.get("isSimulated")
            src = q.get("dataSource")
            print(f"  Ticker: {sym:<12} | Price: {price:<8} | isSimulated: {str(sim):<6} | dataSource: {src}")
            assert sim is True, f"Expected isSimulated=True under 401 error for {sym}"
            assert src == "synthetic", f"Expected dataSource='synthetic' under 401 error for {sym}"

    # Chart 401
    req_chart_401 = urllib.request.Request(
        "http://127.0.0.1:3000/api/market/chart?symbol=RELIANCE.NS&range=1mo&simulate401=true",
        headers={"Cookie": cookie_str},
    )
    with urllib.request.urlopen(req_chart_401) as resp:
        data_chart_401 = json.loads(resp.read().decode("utf-8"))
        print(f"  Chart: RELIANCE.NS  | Points: {len(data_chart_401.get('points', []))} | isSimulated: {data_chart_401.get('isSimulated')}")
        assert data_chart_401.get("isSimulated") is True

    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE: BOTH REAL TICKERS CONFIRMED TRANSITIONING")
    print("FROM isSimulated=False (Live) TO isSimulated=True (Simulated) ON 401 ERROR!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
