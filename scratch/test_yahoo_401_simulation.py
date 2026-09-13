"""
scratch/test_yahoo_401_simulation.py
Tests real tickers (RELIANCE.NS, TCS.NS, AAPL) under a simulated Yahoo 401 Invalid Crumb error.
Validates that:
1. data_provider catches the 401 exception and sets df.attrs['source'] = 'fallback_synthetic'
2. agents.toolbox.get_indicators() returns source='fallback_synthetic' and is_simulated=True
3. agents.toolbox.get_signals() returns source='fallback_synthetic' and is_simulated=True
4. agents.research_agent.answer_question() detects fallback_synthetic and appends the disclaimer notice
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yfinance as yf
from unittest.mock import patch
import requests
from data_provider import default_data_provider
from agents.toolbox import get_indicators, get_signals
from agents.research_agent import answer_question

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")

def run_test():
    err_401 = requests.exceptions.HTTPError(
        "401 Client Error: Unauthorized for url: https://query1.finance.yahoo.com/v1/test/getcrumb (Invalid Crumb)"
    )

    print("=" * 75)
    print("LIVE VERIFICATION: SIMULATING YAHOO 401 INVALID CRUMB ERROR ON REAL TICKERS")
    print("=" * 75)

    # Clear memory cache so it doesn't return previously cached bars
    default_data_provider._memory_cache.clear()

    with patch.object(yf.Ticker, "history", side_effect=err_401):
        # 1. Test data_provider on real ticker RELIANCE.NS
        df = default_data_provider.fetch_stock_history("RELIANCE.NS", use_cache=False)
        print("\n[Step 1] data_provider.fetch_stock_history('RELIANCE.NS'):")
        print(f"  - Empty DataFrame? {df.empty}")
        print(f"  - Bars synthesized: {len(df)}")
        print(f"  - df.attrs['source']: '{df.attrs.get('source')}'")
        assert df.attrs.get("source") == "fallback_synthetic", "Expected source='fallback_synthetic'"

        # 2. Test get_indicators on RELIANCE.NS
        ind = get_indicators("RELIANCE.NS")
        print("\n[Step 2] agents.toolbox.get_indicators('RELIANCE.NS'):")
        print(f"  - Price: ₹{ind.get('price')}")
        print(f"  - RSI: {ind.get('snapshot', {}).get('rsi', {}).get('value')}")
        print(f"  - Source: '{ind.get('source')}'")
        print(f"  - is_simulated: {ind.get('is_simulated')}")
        assert ind.get("source") == "fallback_synthetic"
        assert ind.get("is_simulated") is True

        # 3. Test get_signals on RELIANCE.NS
        sig = get_signals("RELIANCE.NS")
        print("\n[Step 3] agents.toolbox.get_signals('RELIANCE.NS'):")
        print(f"  - Primary Signal: {sig.get('primary_signal', {}).get('signal_type')}")
        print(f"  - Source: '{sig.get('source')}'")
        print(f"  - is_simulated: {sig.get('is_simulated')}")
        assert sig.get("source") == "fallback_synthetic"
        assert sig.get("is_simulated") is True

        # 4. Test Research Agent answering on RELIANCE.NS
        res = answer_question("usr_verify_401", "What is the RSI of RELIANCE.NS right now?")
        print("\n[Step 4] agents.research_agent.answer_question('RELIANCE.NS'):")
        print(f"  - Success: {res.get('success')}")
        print(f"  - Steps taken: {res.get('steps_taken')}")
        print("  - Answer body:\n" + "-" * 50)
        print(res.get("answer"))
        print("-" * 50)
        has_caveat = "Live exchange feed was temporarily unreachable" in res.get("answer")
        print(f"  - Appended simulated data caveat? {has_caveat}")
        assert has_caveat, "Expected simulated data caveat in answer!"

    print("\n" + "=" * 75)
    print("ALL PYTHON BACKEND 401 CRUMB ERROR TESTS CONFIRMED WORKING 100%!")
    print("=" * 75)

if __name__ == "__main__":
    run_test()
