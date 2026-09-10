"""
tests/test_end_to_end_verification.py - End-to-end verification of all Flask routes,
data source markers, behavioral guardrails, and templates for Invest IQ.
"""

import unittest
import json
from app import app
from models import init_db, reset_user_portfolio
from auth import get_current_user
from data_provider import default_data_provider


class TestInvestIQEndToEnd(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        app.config["TESTING"] = True
        app.config["WTF_CSRF_ENABLED"] = False
        self.client = app.test_client()
        with app.test_request_context():
            u = get_current_user()
            if u:
                reset_user_portfolio(u["id"])

    def test_01_all_pages_status_200(self):
        """Verify that every route in the File Map returns HTTP 200 without any 500 error."""
        routes = [
            ("/", "Market Dashboard"),
            ("/?regime=covid_crash_2020", "COVID-19"),
            ("/screener", "Educational Technical Screener"),
            ("/screener?sector=Information+Technology", "Screener"),
            ("/screener?signal_filter=OVERSOLD_BOUNCE", "Screener"),
            ("/stock/RELIANCE.NS", "Reliance Industries"),
            ("/learn", "Stock Market Academy"),
            ("/portfolio", "Virtual Portfolio"),
            ("/report", "Daily Performance"),
            ("/settings/broker", "Zerodha Kite Connect Bridge"),
            ("/login", "Sign In"),
            ("/register", "Create Simulator Account"),
        ]
        for url, expected_text in routes:
            with self.subTest(url=url):
                res = self.client.get(url)
                self.assertEqual(res.status_code, 200, f"Route {url} failed with status {res.status_code}")
                html = res.get_data(as_text=True)
                self.assertIn(expected_text, html, f"Expected '{expected_text}' in response of {url}")

    def test_02_data_source_markers(self):
        """Confirm data source markers (live, cached, or fallback_synthetic) are returned and displayed."""
        # 1. Check quote data source marker
        quote = default_data_provider.get_latest_quote("TCS.NS")
        self.assertIn("source", quote)
        self.assertIn(quote["source"], ["live", "cached", "fallback_synthetic"])

        # 2. Check synthetic data source marker
        synth_df = default_data_provider.generate_synthetic_history("SYNTH_TEST.NS")
        self.assertEqual(synth_df.attrs.get("source"), "fallback_synthetic")

        # 3. Check dashboard HTML displays source badges
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        # Should contain at least one source badge
        has_badge = ("Live NSE" in html or "Cached NSE" in html or "Synthetic Model" in html)
        self.assertTrue(has_badge, "Dashboard did not render data source badge")

        # 4. Check screener HTML displays source badge
        res_scr = self.client.get("/screener")
        self.assertEqual(res_scr.status_code, 200)
        html_scr = res_scr.get_data(as_text=True)
        has_scr_badge = ("Live" in html_scr or "Cached" in html_scr or "Synthetic" in html_scr)
        self.assertTrue(has_scr_badge, "Screener did not render data source badge")

    def test_03_equity_progression_chart_in_portfolio(self):
        """Confirm portfolio page renders the equity progression curve canvas and Chart.js."""
        res = self.client.get("/portfolio")
        self.assertEqual(res.status_code, 200)
        html = res.get_data(as_text=True)
        self.assertIn("equityCurveChart", html)
        self.assertIn("Virtual Equity Progression Curve", html)

    def test_04_behavioral_cooldown_and_reflection_gate(self):
        """Verify losing trade locks simulator, displays countdown when in cooldown, and unlocks via /api/reflect."""
        # 1. Buy 10 shares of INFY.NS at 1500
        buy_res = self.client.post(
            "/api/trade",
            data=json.dumps({"symbol": "INFY.NS", "quantity": 10, "action": "BUY", "price": 1500.0}),
            content_type="application/json",
        )
        self.assertEqual(buy_res.status_code, 200)
        self.assertTrue(buy_res.json["success"])

        # 2. Sell at a loss at 1400 -> Triggers reflection lock
        sell_res = self.client.post(
            "/api/trade",
            data=json.dumps({"symbol": "INFY.NS", "quantity": 10, "action": "SELL", "price": 1400.0}),
            content_type="application/json",
        )
        self.assertEqual(sell_res.status_code, 200)
        self.assertTrue(sell_res.json["is_loss"])
        self.assertTrue(sell_res.json["is_locked"])

        # 3. Next trade MUST be rejected
        blocked_buy = self.client.post(
            "/api/trade",
            data=json.dumps({"symbol": "TCS.NS", "quantity": 1, "action": "BUY", "price": 3500.0}),
            content_type="application/json",
        )
        self.assertFalse(blocked_buy.json["success"])
        self.assertIn("Trading is locked", blocked_buy.json["error"])

        # 4. View portfolio page while locked -> must contain reflection section and banner
        port_res = self.client.get("/portfolio")
        port_html = port_res.get_data(as_text=True)
        self.assertIn("Mandatory Trade Reflection Gate", port_html)

        # 5. Submit reflection via /api/reflect
        ref_res = self.client.post(
            "/api/reflect",
            data=json.dumps({
                "thesis": "Expected quick rebound",
                "reason_for_loss": "Broke technical support",
                "lesson_learned": "Always use stop loss"
            }),
            content_type="application/json",
        )
        self.assertEqual(ref_res.status_code, 200)
        self.assertTrue(ref_res.json["success"])

        # 6. Trade is now unblocked
        unblocked_buy = self.client.post(
            "/api/trade",
            data=json.dumps({"symbol": "TCS.NS", "quantity": 1, "action": "BUY", "price": 3500.0}),
            content_type="application/json",
        )
        self.assertTrue(unblocked_buy.json["success"])

    def test_05_kite_human_in_the_loop_mandatory(self):
        """Verify Kite preview endpoint and strict human_confirmed mandate."""
        # 1. Preview order
        preview_res = self.client.post(
            "/api/broker/preview",
            data=json.dumps({"symbol": "RELIANCE.NS", "quantity": 5, "action": "BUY", "price": 2500.0, "product": "CNC"}),
            content_type="application/json",
        )
        self.assertEqual(preview_res.status_code, 200)
        preview_data = preview_res.json
        self.assertTrue(preview_data["success"])
        self.assertEqual(preview_data["preview"]["product"], "CNC")
        self.assertEqual(preview_data["preview"]["margin_required"], 12500.0)

        # 2. Place order without human_confirmed -> Must be hard rejected
        unconfirmed = self.client.post(
            "/api/broker/order",
            data=json.dumps({
                "tradingsymbol": "RELIANCE",
                "transaction_type": "BUY",
                "quantity": 5,
                "price": 2500.0,
                "product": "CNC",
                "human_confirmed": False,
            }),
            content_type="application/json",
        )
        self.assertEqual(unconfirmed.status_code, 400)
        self.assertIn("human-in-the-loop", unconfirmed.json["error"].lower())

        # 3. Place order with human_confirmed: True -> Must succeed
        confirmed = self.client.post(
            "/api/broker/order",
            data=json.dumps({
                "tradingsymbol": "RELIANCE",
                "transaction_type": "BUY",
                "quantity": 5,
                "price": 2500.0,
                "product": "CNC",
                "human_confirmed": True,
            }),
            content_type="application/json",
        )
        self.assertEqual(confirmed.status_code, 200)
        self.assertEqual(confirmed.json["status"], "success")
        self.assertEqual(confirmed.json["data"]["status"], "COMPLETE")


if __name__ == "__main__":
    unittest.main()
