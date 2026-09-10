"""
tests/test_scanner_explainer.py - Unit tests for Scanner & Explainer Engine (Phase 3)
"""

import unittest
import pandas as pd
import numpy as np
from scanner import MarketScanner, SIGNAL_METADATA
from explainer import (
    explain_stock_signal,
    generate_deterministic_explanation,
    EDUCATIONAL_DISCLAIMER,
)
from indicators import calculate_all_indicators


class TestScannerAndExplainer(unittest.TestCase):

    def setUp(self):
        self.scanner = MarketScanner()

        # Create a mock series engineered with an oversold condition
        dates = pd.date_range("2024-01-01", periods=60, freq="B")
        prices = [1000.0 - i * 15.0 for i in range(60)]  # Persistent downward drop
        self.oversold_df = pd.DataFrame(
            {
                "Open": prices,
                "High": [p + 5 for p in prices],
                "Low": [p - 5 for p in prices],
                "Close": prices,
                "Volume": [1000000] * 60,
            },
            index=dates,
        )

    def test_oversold_signal_detection(self):
        analysis = self.scanner.analyze_stock("TATAMOTORS.NS", df=self.oversold_df)
        self.assertNotIn("error", analysis)
        signals = [s["signal_type"] for s in analysis["signals"]]
        self.assertIn("OVERSOLD_BOUNCE", signals)
        self.assertLess(analysis["snapshot"]["rsi"]["value"], 30.0)

    def test_explainer_contains_disclaimer_and_numbers(self):
        import uuid
        unique_date = f"2099-02-{uuid.uuid4().hex[:8]}"
        analysis = self.scanner.analyze_stock("TATAMOTORS.NS", df=self.oversold_df)
        explanation = explain_stock_signal(analysis, date_str=unique_date)

        # 1. Non-negotiable regulatory disclaimer
        self.assertEqual(explanation["disclaimer"], EDUCATIONAL_DISCLAIMER)
        self.assertIn("SIMULATION ONLY", explanation["disclaimer"])
        self.assertIn("SEBI-registered", explanation["disclaimer"])

        # 2. Grounded in actual numbers
        rsi_val = str(analysis["snapshot"]["rsi"]["value"])
        self.assertIn(rsi_val, explanation["summary"] + explanation["deep_dive"])
        self.assertIn("INR", explanation["summary"].replace("₹", "INR"))

        # 3. Must NOT contain prescriptive investment advice directives
        full_text = (explanation["summary"] + " " + explanation["deep_dive"]).lower()
        self.assertNotIn("you must buy", full_text)
        self.assertNotIn("guaranteed profit", full_text)

        print("\n[Verified] Sample Plain-English Explanation:")
        print("Title:", explanation["title"])
        clean_summary = explanation["summary"][:120].replace("₹", "INR ")
        print("Summary:", clean_summary, "...")

    def test_real_stock_scan(self):
        # Scan real stock data for RELIANCE.NS
        analysis = self.scanner.analyze_stock("RELIANCE.NS")
        self.assertNotIn("error", analysis)
        self.assertIn("primary_signal", analysis)
        primary = analysis["primary_signal"]
        sig_type = primary["signal_type"]
        self.assertIn(sig_type, SIGNAL_METADATA)
        self.assertIn("badge_color", primary)
        self.assertIn("title", primary)
        self.assertTrue(bool(primary["badge_color"]))
        self.assertTrue(bool(primary["title"]))
        print(f"\n[Verified] Live scan on RELIANCE.NS detected primary signal: {sig_type} (Badge: {primary['badge_color']})")

    def test_daily_explanation_cache(self):
        import uuid
        # Use globally unique date string so test starts with cold cache
        unique_date = f"2099-01-{uuid.uuid4().hex[:8]}"
        analysis = self.scanner.analyze_stock("TATAMOTORS.NS", df=self.oversold_df)
        exp1 = explain_stock_signal(analysis, date_str=unique_date)
        self.assertFalse(exp1.get("is_cached", False))

        # Second call on same date must hit cache
        exp2 = explain_stock_signal(analysis, date_str=unique_date)
        self.assertTrue(exp2.get("is_cached", False))
        self.assertEqual(exp1["title"], exp2["title"])
        print("\n[Verified] Second request served directly from daily signal cache.")


if __name__ == "__main__":
    unittest.main()
