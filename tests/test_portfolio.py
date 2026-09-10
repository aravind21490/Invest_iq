"""
tests/test_portfolio.py - Unit tests for Virtual Portfolio & Cost Simulation (Phase 4)
"""

import unittest
from portfolio import (
    VirtualPortfolio,
    calculate_transaction_charges,
    STARTING_VIRTUAL_CASH,
)


class TestPortfolio(unittest.TestCase):

    def setUp(self):
        self.portfolio = VirtualPortfolio(initial_cash=100000.0)

    def test_initial_state(self):
        self.assertEqual(self.portfolio.cash_balance, 100000.0)
        self.assertEqual(len(self.portfolio.positions), 0)
        self.assertEqual(len(self.portfolio.trade_history), 0)
        self.assertEqual(self.portfolio.total_charges_paid, 0.0)

    def test_fee_calculations(self):
        # Buy turnover = INR 50,000
        turnover = 50000.0
        charges = calculate_transaction_charges(turnover, is_buy=True)

        # STT = 0.1% = INR 50.0
        self.assertEqual(charges["stt"], 50.0)
        # Brokerage = min(20, 50000 * 0.0005) = 20.0
        self.assertEqual(charges["brokerage"], 20.0)
        # Stamp duty = 0.0015% on buy = 0.75
        self.assertEqual(charges["stamp_duty"], 0.75)
        # Total charges must be strictly greater than STT + Brokerage
        self.assertGreater(charges["total_charges"], 70.0)
        print(f"\n[Verified] Charges on INR 50,000 Buy: INR {charges['total_charges']} (STT: {charges['stt']}, Brokerage: {charges['brokerage']})")

    def test_buy_stock_execution(self):
        # Buy 10 shares of RELIANCE at INR 2,500 = INR 25,000 turnover
        res = self.portfolio.buy("RELIANCE.NS", quantity=10, price=2500.0)
        self.assertTrue(res["success"])

        # Check cash deducted
        expected_turnover = 25000.0
        charges = res["trade"]["charges"]
        expected_cash = 100000.0 - (expected_turnover + charges["total_charges"])
        self.assertAlmostEqual(self.portfolio.cash_balance, expected_cash, places=2)

        # Check position recorded
        pos = self.portfolio.get_position("RELIANCE.NS")
        self.assertIsNotNone(pos)
        self.assertEqual(pos["quantity"], 10)
        self.assertEqual(pos["avg_price"], 2500.0)

    def test_insufficient_funds_rejection(self):
        # Attempt to buy INR 150,000 worth of stock with INR 100,000 balance
        res = self.portfolio.buy("TCS.NS", quantity=50, price=3000.0)
        self.assertFalse(res["success"])
        self.assertIn("Insufficient virtual cash", res["error"])

    def test_sell_profit_and_stcg_tax(self):
        # 1. Buy 10 shares at 1000
        self.portfolio.buy("INFY.NS", quantity=10, price=1000.0)

        # 2. Sell 10 shares at 1200 (Gain: 10 * 200 = 2000 gross)
        sell_res = self.portfolio.sell("INFY.NS", quantity=10, price=1200.0)
        self.assertTrue(sell_res["success"])

        trade = sell_res["trade"]
        self.assertGreater(trade["net_pnl"], 1900.0)  # Gross 2000 minus charges
        self.assertGreater(trade["stcg_tax_provision"], 0.0)  # 20% of net gain
        self.assertAlmostEqual(
            trade["stcg_tax_provision"], round(trade["net_pnl"] * 0.20, 2), places=2
        )
        # Position must now be closed
        self.assertIsNone(self.portfolio.get_position("INFY.NS"))
        print(f"\n[Verified] Profit Trade: Gross P&L INR {trade['gross_pnl']}, Net INR {trade['net_pnl']}, STCG Tax: INR {trade['stcg_tax_provision']}")

    def test_sell_quantity_validation(self):
        self.portfolio.buy("SBIN.NS", quantity=5, price=600.0)
        res = self.portfolio.sell("SBIN.NS", quantity=10, price=650.0)
        self.assertFalse(res["success"])
        self.assertIn("Invalid sell quantity", res["error"])

    def test_portfolio_summary_and_concentration(self):
        # Allocate INR 40,000 to single stock out of INR 100k (>35% threshold)
        self.portfolio.buy("HDFCBANK.NS", quantity=25, price=1600.0)
        summary = self.portfolio.get_summary({"HDFCBANK.NS": 1650.0})

        self.assertGreater(summary["total_portfolio_value"], 99000.0)
        self.assertTrue(summary["concentration"]["is_overconcentrated"])
        self.assertEqual(summary["concentration"]["symbol"], "HDFCBANK.NS")
        print(f"\n[Verified] Summary Valuation: INR {summary['total_portfolio_value']}, Max Concentration: {summary['concentration']['max_pct']}%")


if __name__ == "__main__":
    unittest.main()
