"""
tests/test_indicators.py - Unit tests for Invest IQ Technical Indicators Engine (Phase 2)
"""

import unittest
import numpy as np
import pandas as pd
from indicators import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_volume_ratio,
    calculate_all_indicators,
    get_indicator_snapshot,
)


class TestIndicators(unittest.TestCase):

    def setUp(self):
        # Generate 100 synthetic OHLCV bars with predictable trends
        np.random.seed(42)
        dates = pd.date_range("2023-01-01", periods=100, freq="B")
        base_price = 1000.0 + np.cumsum(np.random.randn(100) * 15.0)
        high = base_price + np.random.uniform(5, 20, 100)
        low = base_price - np.random.uniform(5, 20, 100)
        close = base_price + np.random.uniform(-5, 5, 100)
        open_p = base_price + np.random.uniform(-5, 5, 100)
        volume = np.random.randint(500000, 2000000, 100)

        self.df = pd.DataFrame(
            {
                "Open": open_p,
                "High": high,
                "Low": low,
                "Close": close,
                "Volume": volume,
            },
            index=dates,
        )

    def test_rsi_bounds_and_validity(self):
        rsi = calculate_rsi(self.df["Close"], period=14)
        valid_rsi = rsi.dropna()
        self.assertGreater(len(valid_rsi), 50)
        # All valid values must be between 0 and 100
        self.assertTrue((valid_rsi >= 0).all())
        self.assertTrue((valid_rsi <= 100).all())

        # Test extreme trend
        rising_series = pd.Series([10.0 + i * 2.0 for i in range(30)])
        rising_rsi = calculate_rsi(rising_series, period=14).dropna()
        self.assertGreater(rising_rsi.iloc[-1], 80.0)

    def test_macd_mathematical_consistency(self):
        macd_dict = calculate_macd(self.df["Close"], 12, 26, 9)
        macd = macd_dict["macd_line"].dropna()
        signal = macd_dict["macd_signal"].dropna()
        hist = macd_dict["macd_hist"].dropna()

        # Check common indices
        common_idx = macd.index.intersection(signal.index).intersection(hist.index)
        for idx in common_idx[-5:]:
            expected_hist = round(macd.loc[idx] - signal.loc[idx], 2)
            self.assertAlmostEqual(hist.loc[idx], expected_hist, places=1)

    def test_bollinger_bands_ordering(self):
        bb = calculate_bollinger_bands(self.df["Close"], period=20, num_std=2.0)
        upper = bb["bb_upper"].dropna()
        middle = bb["bb_middle"].dropna()
        lower = bb["bb_lower"].dropna()

        # Upper Band >= Middle Band >= Lower Band
        self.assertTrue((upper >= middle).all())
        self.assertTrue((middle >= lower).all())

        # Bandwidth must be positive
        bw = bb["bb_bandwidth"].dropna()
        self.assertTrue((bw > 0).all())

    def test_volume_ratio(self):
        vol_ratio = calculate_volume_ratio(self.df["Volume"], period=20).dropna()
        self.assertGreater(len(vol_ratio), 50)
        self.assertTrue((vol_ratio > 0).all())

    def test_calculate_all_and_snapshot(self):
        enriched = calculate_all_indicators(self.df)
        expected_cols = [
            "RSI",
            "MACD",
            "MACD_Signal",
            "MACD_Hist",
            "BB_Upper",
            "BB_Middle",
            "BB_Lower",
            "BB_Bandwidth",
            "BB_Percent_B",
            "Volume_Ratio",
        ]
        for col in expected_cols:
            self.assertIn(col, enriched.columns)

        snapshot = get_indicator_snapshot(enriched)
        self.assertIsNotNone(snapshot)
        self.assertIn("rsi", snapshot)
        self.assertIn("macd", snapshot)
        self.assertIn("bollinger", snapshot)
        self.assertIn("volume", snapshot)
        print(f"\n[Verified] Snapshot Close: INR {snapshot['close']}, RSI: {snapshot['rsi']['value']}, Vol Ratio: {snapshot['volume']['ratio']}")


if __name__ == "__main__":
    unittest.main()
