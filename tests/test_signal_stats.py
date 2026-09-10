"""
tests/test_signal_stats.py - Unit tests for Historical Win-Rate Engine (Phase 5)
"""

import unittest
from signal_stats import SignalStatsEngine
from data_provider import DataProvider


class TestSignalStats(unittest.TestCase):

    def setUp(self):
        self.stats_engine = SignalStatsEngine()

    def test_historical_win_rate_computation(self):
        symbol = "RELIANCE.NS"
        stats = self.stats_engine.compute_signal_history_stats(symbol, forward_days=10)

        self.assertIsInstance(stats, dict)
        self.assertIn("OVERSOLD_BOUNCE", stats)
        self.assertIn("BULLISH_MACD_CROSSOVER", stats)

        # Inspect Bullish MACD Crossover stats
        macd_stats = stats["BULLISH_MACD_CROSSOVER"]
        self.assertIn("win_rate_pct", macd_stats)
        self.assertGreaterEqual(macd_stats["win_rate_pct"], 0.0)
        self.assertLessEqual(macd_stats["win_rate_pct"], 100.0)
        self.assertIn("summary_text", macd_stats)

        print(f"\n[Verified] {symbol} Bullish MACD Crossover Historical Stats:")
        print(f"Sample Size: {macd_stats['sample_size']}")
        print(f"Win Rate: {macd_stats['win_rate_pct']}%")
        print(f"Summary: {macd_stats['summary_text']}")


if __name__ == "__main__":
    unittest.main()
