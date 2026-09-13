import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import yfinance as yf

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")

print("yfinance installed version:", yf.__version__)

tickers = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "AAPL", "MSFT"]
for t in tickers:
    try:
        ticker = yf.Ticker(t)
        hist = ticker.history(period="5d")
        if hist is not None and not hist.empty:
            last_close = round(float(hist["Close"].iloc[-1]), 2)
            print(f"{t}: SUCCESS, {len(hist)} bars, last_close={last_close}")
        else:
            print(f"{t}: RETURNED EMPTY DATAFRAME")
    except Exception as e:
        print(f"{t}: FAILED WITH EXCEPTION - {type(e).__name__}: {e}")

from data_provider import default_data_provider
print("\n--- Testing DataProvider fetch_stock_history with fallback ---")
for t in ["RELIANCE.NS", "UNKNOWN_NONEXISTENT.NS"]:
    try:
        df = default_data_provider.fetch_stock_history(t)
        source = df.attrs.get("source", "unknown")
        print(f"DataProvider {t}: shape={df.shape}, source={source}")
    except Exception as e:
        print(f"DataProvider {t}: EXCEPTION - {e}")
