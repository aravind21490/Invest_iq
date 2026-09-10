"""
tests/test_broker_kite.py - Unit tests for Zerodha Kite Paper Trading & Live Bridge
"""

import unittest
from broker_kite import KiteBroker, KiteBrokerException
from models import init_db, create_user, get_db_connection


class TestKiteBroker(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        try:
            user = create_user("kite_test_user", "password123", "kite@test.com")
            cls.user_id = user["id"]
        except Exception:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE username = 'kite_test_user'")
            cls.user_id = cursor.fetchone()["id"]
            conn.close()

    def test_estimate_order_impact_cnc(self):
        broker = KiteBroker(user_id=self.user_id, mode="SIMULATED")
        impact = broker.estimate_order_impact(
            symbol="RELIANCE.NS",
            transaction_type="BUY",
            quantity=10,
            price=2500.0,
            product="CNC",
        )
        self.assertEqual(impact["symbol"], "RELIANCE")
        self.assertEqual(impact["product"], "CNC")
        self.assertEqual(impact["turnover"], 25000.0)
        self.assertEqual(impact["margin_required"], 25000.0)  # 100% margin for delivery
        self.assertEqual(impact["charges"]["brokerage"], 0.0)  # Zerodha ₹0 delivery brokerage
        self.assertGreater(impact["charges"]["total_charges"], 0.0)

    def test_estimate_order_impact_mis(self):
        broker = KiteBroker(user_id=self.user_id, mode="SIMULATED")
        impact = broker.estimate_order_impact(
            symbol="TCS.NS",
            transaction_type="BUY",
            quantity=10,
            price=3500.0,
            product="MIS",
        )
        self.assertEqual(impact["product"], "MIS")
        self.assertEqual(impact["turnover"], 35000.0)
        self.assertEqual(impact["margin_required"], 7000.0)  # 20% margin for intraday 5x
        self.assertGreater(impact["charges"]["brokerage"], 0.0)  # Intraday has brokerage

    def test_human_confirmation_enforcement(self):
        broker = KiteBroker(user_id=self.user_id, mode="SIMULATED")
        order_without_human = {
            "tradingsymbol": "INFY",
            "transaction_type": "BUY",
            "quantity": 5,
            "price": 1800.0,
            "product": "CNC",
            # missing human_confirmed: True
        }
        with self.assertRaises(KiteBrokerException) as ctx:
            broker.place_order(order_without_human)
        self.assertIn("Explicit human-in-the-loop confirmation is mandatory", str(ctx.exception))

    def test_simulated_order_execution(self):
        broker = KiteBroker(user_id=self.user_id, mode="SIMULATED")
        valid_order = {
            "tradingsymbol": "TATAMOTORS",
            "transaction_type": "BUY",
            "quantity": 5,
            "price": 950.0,
            "product": "CNC",
            "human_confirmed": True,
        }
        result = broker.place_order(valid_order, execute_in_portfolio=True)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["mode"], "SIMULATED")
        data = result["data"]
        self.assertEqual(data["tradingsymbol"], "TATAMOTORS")
        self.assertEqual(data["quantity"], 5)
        self.assertEqual(data["status"], "COMPLETE")
        self.assertTrue(len(data["order_id"]) >= 10)


if __name__ == "__main__":
    unittest.main()
