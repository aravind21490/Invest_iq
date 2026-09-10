"""
tests/test_app_routes.py - Integration tests for Invest IQ Flask Web Application (Phase 11)
"""

import unittest
import json
from app import app
from models import create_user, load_user_portfolio


class TestAppRoutes(unittest.TestCase):

    def setUp(self):
        app.config["TESTING"] = True
        app.config["WTF_CSRF_ENABLED"] = False
        self.client = app.test_client()
        with app.test_request_context():
            from auth import get_current_user
            from models import reset_user_portfolio
            u = get_current_user()
            if u:
                reset_user_portfolio(u["id"])

    def test_disclaimer_and_dashboard_page(self):
        # 1. GET Dashboard
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)

        # Mandatory Regulatory Framing in UI
        self.assertIn("SIMULATION ONLY", html)
        self.assertIn("Invest IQ is strictly an educational simulator", html)
        self.assertIn("NOT SEBI-regulated", html)
        self.assertIn("Virtual Market Simulator", html)
        self.assertIn("The COVID-19 Crash", html)

    def test_screener_page(self):
        res = self.client.get("/screener")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("Educational Technical Screener", html)
        self.assertIn("RELIANCE.NS", html)

    def test_stock_detail_page(self):
        res = self.client.get("/stock/RELIANCE.NS")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("RELIANCE.NS", html)
        self.assertIn("Candlestick Price Action Chart", html)
        self.assertIn("How to Read Candlesticks", html)
        self.assertIn("Technical Indicator Matrix", html)
        self.assertIn("AI Grounded Explanation", html)
        self.assertIn("Execute Virtual", html)

    def test_stock_detail_page_with_holding(self):
        # 1. Buy INFY.NS shares
        buy_payload = {"symbol": "INFY.NS", "quantity": 15, "action": "BUY", "price": 1600.0}
        self.client.post("/api/trade", data=json.dumps(buy_payload), content_type="application/json")

        # 2. View stock detail page for INFY.NS
        res = self.client.get("/stock/INFY.NS")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("Holding in Portfolio:", html)
        self.assertIn("15 Shares", html)

    def test_learn_academy_page(self):
        res = self.client.get("/learn")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("Stock Market Academy", html)
        self.assertIn("What is a Share?", html)
        self.assertIn("Candlestick Anatomy", html)
        self.assertIn("Why Are Technical Indicators Used?", html)
        self.assertIn("RSI: The Speedometer", html)

    def test_portfolio_and_report_pages(self):
        res_port = self.client.get("/portfolio")
        self.assertEqual(res_port.status_code, 200)
        html_port = res_port.get_data(as_text=True)
        self.assertIn("Virtual Portfolio", html_port)
        self.assertIn("Available Cash", html_port)

        res_rep = self.client.get("/report")
        self.assertEqual(res_rep.status_code, 200)
        html_rep = res_rep.get_data(as_text=True)
        self.assertIn("Daily Performance", html_rep)
        self.assertIn("Friction Drag", html_rep)

    def test_api_simulated_trade_flow(self):
        # 1. Execute Buy order via API
        buy_payload = {
            "symbol": "INFY.NS",
            "quantity": 10,
            "action": "BUY",
            "price": 1600.0,
        }
        res_buy = self.client.post(
            "/api/trade",
            data=json.dumps(buy_payload),
            content_type="application/json",
        )
        self.assertEqual(res_buy.status_code, 200)
        data_buy = json.loads(res_buy.get_data(as_text=True))
        self.assertTrue(data_buy["success"])
        self.assertEqual(data_buy["trade"]["symbol"], "INFY.NS")
        self.assertGreater(data_buy["trade"]["charges"]["total_charges"], 0)

        # 2. Execute Sell order via API
        sell_payload = {
            "symbol": "INFY.NS",
            "quantity": 5,
            "action": "SELL",
            "price": 1700.0,
        }
        res_sell = self.client.post(
            "/api/trade",
            data=json.dumps(sell_payload),
            content_type="application/json",
        )
        self.assertEqual(res_sell.status_code, 200)
        data_sell = json.loads(res_sell.get_data(as_text=True))
        self.assertTrue(data_sell["success"])
        self.assertEqual(data_sell["trade"]["type"], "SELL")

    def test_api_reflection_flow(self):
        ref_payload = {
            "thesis": "Expected quick breakout on volume surge",
            "reason_for_loss": "False breakout with immediate mean-reversion pull",
            "lesson_learned": "Wait for 15-minute close above resistance before committing full size",
        }
        res = self.client.post(
            "/api/reflect",
            data=json.dumps(ref_payload),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.get_data(as_text=True))
        self.assertTrue(data["success"])
        self.assertEqual(data["reflection"]["thesis"], ref_payload["thesis"])

    def test_api_portfolio_reset(self):
        res = self.client.post("/api/portfolio/reset")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.get_data(as_text=True))
        self.assertTrue(data["success"])
        self.assertEqual(data["cash_balance"], 100000.0)


if __name__ == "__main__":
    unittest.main()
