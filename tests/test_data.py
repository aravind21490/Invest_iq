"""
tests/test_data.py - Unit tests for Invest IQ Data Provider (Phase 1)
"""

import os
import unittest
import pandas as pd
from data_provider import (
    DataProvider,
    sanitize_ticker,
    CORE_NSE_STOCKS,
    MARKET_REGIMES,
)


class TestDataProvider(unittest.TestCase):

    def setUp(self):
        self.provider = DataProvider(cache_dir="tests/test_cache", cache_ttl_hours=1)

    def test_sanitize_ticker(self):
        self.assertEqual(sanitize_ticker("RELIANCE"), "RELIANCE.NS")
        self.assertEqual(sanitize_ticker("tcs"), "TCS.NS")
        self.assertEqual(sanitize_ticker("INFY.NS"), "INFY.NS")
        self.assertEqual(sanitize_ticker("SBIN.BO"), "SBIN.BO")

    def test_market_regimes_defined(self):
        self.assertIn("current", MARKET_REGIMES)
        self.assertIn("covid_crash_2020", MARKET_REGIMES)
        self.assertIn("post_covid_bull_2021", MARKET_REGIMES)
        self.assertIn("rate_hike_chop_2022", MARKET_REGIMES)

    def test_core_stocks_count(self):
        # Must contain at least 15-20 core liquid stocks across diverse sectors
        self.assertGreaterEqual(len(CORE_NSE_STOCKS), 20)
        self.assertIn("RELIANCE.NS", CORE_NSE_STOCKS)
        self.assertIn("DEEPAKNTR.NS", CORE_NSE_STOCKS)  # Volatile mid-cap included

    def test_fault_isolation_invalid_ticker(self):
        # Invalid ticker should cleanly return empty DataFrame without crashing
        df = self.provider.fetch_stock_history("TOTALLY_INVALID_TICKER_999.NS", retries=1)
        self.assertTrue(df.empty)

    def test_fetch_live_stock_history(self):
        # Fetch real historical data for a premier NSE stock
        symbol = "RELIANCE.NS"
        df = self.provider.fetch_stock_history(symbol, regime="current")
        self.assertFalse(df.empty, f"Failed to fetch real data for {symbol}")
        self.assertTrue(set(["Open", "High", "Low", "Close", "Volume"]).issubset(df.columns))
        self.assertGreater(len(df), 50)  # Over 50 bars in 1y history
        print(f"\n[Verified] Fetched {len(df)} bars for {symbol}. Latest Close: INR {df.iloc[-1]['Close']:.2f}")

    def test_fetch_regime_covid_crash(self):
        symbol = "INFY.NS"
        df = self.provider.fetch_stock_history(symbol, regime="covid_crash_2020")
        self.assertFalse(df.empty, f"Failed to fetch covid crash data for {symbol}")
        # Verify date bounds
        start_date = df.index.min().strftime("%Y-%m-%d")
        end_date = df.index.max().strftime("%Y-%m-%d")
        self.assertTrue(start_date.startswith("2020-01"))
        print(f"\n[Verified] {symbol} COVID crash regime: {start_date} to {end_date}, bars: {len(df)}")

    def test_get_latest_quote(self):
        quote = self.provider.get_latest_quote("TCS.NS")
        self.assertEqual(quote["symbol"], "TCS.NS")
        self.assertGreater(quote["price"], 0)
        self.assertIn("change_pct", quote)
        print(f"\n[Verified] Latest quote for TCS: INR {quote['price']} ({quote['change_pct']}%)")


if __name__ == "__main__":
    unittest.main()
