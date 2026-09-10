"""
tests/test_auth_app.py - Unit tests for Authentication and Database Portfolio Sync (Phase 8)
"""

import unittest
import os
import sqlite3
from models import (
    create_user,
    get_user_by_username,
    verify_user_password,
    load_user_portfolio,
    sync_user_portfolio,
    get_cached_explanation,
    save_cached_explanation,
)
from auth import authenticate_user, register_user


class TestAuthAndPersistence(unittest.TestCase):

    def setUp(self):
        # Generate unique test username per run
        self.username = f"test_trader_{os.urandom(4).hex()}"
        self.password = "secure_pass_123"

    def test_user_registration_and_portfolio_init(self):
        # 1. Register user
        user = register_user(self.username, self.password, email="trader@investiq.ai")
        self.assertIsNotNone(user["id"])
        self.assertEqual(user["username"], self.username.lower())

        # 2. Portfolio auto-initialized with ₹1,00,000 virtual balance
        portfolio = load_user_portfolio(user["id"])
        self.assertEqual(portfolio.cash_balance, 100000.0)
        self.assertEqual(portfolio.initial_cash, 100000.0)
        self.assertEqual(len(portfolio.positions), 0)

        # 3. Duplicate registration rejected
        with self.assertRaises(ValueError):
            register_user(self.username, "another_pass")

    def test_authentication_workflow(self):
        register_user(self.username, self.password)

        # Correct password
        auth_success = authenticate_user(self.username, self.password)
        self.assertIsNotNone(auth_success)
        self.assertEqual(auth_success["username"], self.username.lower())

        # Incorrect password
        auth_fail = authenticate_user(self.username, "wrong_password")
        self.assertIsNone(auth_fail)

        # Non-existent user
        auth_none = authenticate_user("non_existent_user_999", "pass")
        self.assertIsNone(auth_none)

    def test_portfolio_database_persistence_cycle(self):
        user = register_user(self.username, self.password)
        portfolio = load_user_portfolio(user["id"])

        # Execute a simulated buy
        buy_res = portfolio.buy("RELIANCE.NS", quantity=10, price=2500.0)
        self.assertTrue(buy_res["success"])

        # Sync to DB
        sync_user_portfolio(user["id"], portfolio)

        # Reload from DB into a fresh instance
        reloaded = load_user_portfolio(user["id"])
        self.assertEqual(reloaded.cash_balance, portfolio.cash_balance)
        self.assertIn("RELIANCE.NS", reloaded.positions)
        self.assertEqual(reloaded.positions["RELIANCE.NS"]["quantity"], 10)
        self.assertEqual(len(reloaded.trade_history), 1)
        self.assertEqual(reloaded.trade_history[0]["type"], "BUY")

    def test_daily_signal_cache(self):
        test_sym = f"MOCK_{os.urandom(3).hex().upper()}"
        today = "2026-09-08"

        # Initially not in cache
        cached = get_cached_explanation(test_sym, today)
        self.assertIsNone(cached)

        # Save to cache
        payload = {
            "title": "Oversold RSI Reversal",
            "summary": "Mock summary test",
            "grounded_numbers": {"rsi": 26.5},
        }
        save_cached_explanation(test_sym, today, "OVERSOLD_BOUNCE", payload)

        # Retrieve
        cached_after = get_cached_explanation(test_sym, today)
        self.assertIsNotNone(cached_after)
        self.assertEqual(cached_after["title"], "Oversold RSI Reversal")
        self.assertEqual(cached_after["grounded_numbers"]["rsi"], 26.5)


if __name__ == "__main__":
    unittest.main()
