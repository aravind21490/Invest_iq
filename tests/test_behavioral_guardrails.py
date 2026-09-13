"""
tests/test_behavioral_guardrails.py - Unit tests for Behavioral Guardrails & Loss Streaks (Phase 6)
"""

import unittest
import time
from portfolio import VirtualPortfolio


class TestBehavioralGuardrails(unittest.TestCase):

    def setUp(self):
        self.portfolio = VirtualPortfolio(initial_cash=100000.0)

    def test_single_losing_trade_locks_for_reflection(self):
        # 1. Buy 10 shares of stock at 1000
        self.portfolio.buy("TATAMOTORS.NS", quantity=10, price=1000.0)

        # 2. Sell at a loss at 900
        sell_res = self.portfolio.sell("TATAMOTORS.NS", quantity=10, price=900.0)
        self.assertTrue(sell_res["success"])
        self.assertTrue(sell_res["is_loss"])
        self.assertEqual(self.portfolio.loss_streak, 1)
        self.assertTrue(self.portfolio.is_locked_for_reflection)

        # 3. Next Buy attempt MUST be blocked by reflection gate
        blocked_buy = self.portfolio.buy("INFY.NS", quantity=5, price=1500.0)
        self.assertFalse(blocked_buy["success"])
        self.assertIn("Trading is locked", blocked_buy["error"])

        # 4. User submits mandatory reflection
        reflect_res = self.portfolio.submit_reflection(
            trade_id=sell_res["trade"]["id"],
            thesis="Anticipated oversold bounce from support",
            reason_for_loss="Market-wide auto sector selloff violated stop loss",
            lesson_learned="Always honor predefined stop loss rather than holding into lower levels",
        )
        self.assertTrue(reflect_res["success"])
        self.assertTrue(reflect_res["is_unlocked"])
        self.assertFalse(self.portfolio.is_locked_for_reflection)

        # 5. Trading is now unblocked
        unblocked_buy = self.portfolio.buy("INFY.NS", quantity=5, price=1500.0)
        self.assertTrue(unblocked_buy["success"])
        print("\n[Verified] Mandatory reflection successfully enforced and unblocked.")

    def test_consecutive_loss_streak_cooldown(self):
        # Trade 1: Loss
        self.portfolio.buy("ITC.NS", quantity=10, price=400.0)
        self.portfolio.sell("ITC.NS", quantity=10, price=380.0)
        self.portfolio.submit_reflection(1, "Thesis 1", "Loss 1", "Lesson 1")

        # Trade 2: Consecutive Loss -> Triggers Loss Streak Cooldown
        self.portfolio.buy("TCS.NS", quantity=5, price=3500.0)
        res_loss2 = self.portfolio.sell("TCS.NS", quantity=5, price=3400.0)

        self.assertEqual(self.portfolio.loss_streak, 2)
        in_cooldown, sec_left = self.portfolio.is_in_cooldown()
        self.assertTrue(in_cooldown)
        self.assertGreater(sec_left, 280)

        # Buy order is blocked due to cooldown
        attempt = self.portfolio.buy("SBIN.NS", quantity=10, price=600.0)
        self.assertFalse(attempt["success"])
        self.assertIn("cooldown", attempt["error"].lower())

        # SELL order succeeds even while cooldown is active (users can always exit positions)
        self.portfolio.positions["INFY.NS"] = {"quantity": 10, "avg_price": 1500.0, "total_cost": 15000.0}
        sell_attempt = self.portfolio.sell("INFY.NS", quantity=5, price=1450.0)
        self.assertTrue(sell_attempt["success"])

        # Submitting reflection still respects cooldown timer
        reflect_res = self.portfolio.submit_reflection(2, "Thesis 2", "Loss 2", "Lesson 2")
        self.assertFalse(reflect_res["is_unlocked"])  # Still cooling down!
        print(f"\n[Verified] Loss streak cooldown active: {sec_left}s remaining. Impulse trading prevented.")
        print("[Verified] SELL order executed successfully during active cooldown.")

    def test_winning_trade_resets_loss_streak(self):
        # Incur 1 loss
        self.portfolio.buy("LT.NS", quantity=5, price=2000.0)
        self.portfolio.sell("LT.NS", quantity=5, price=1900.0)
        self.assertEqual(self.portfolio.loss_streak, 1)
        self.portfolio.unlock_reflection()

        # Incur 1 win -> Should reset streak to 0
        self.portfolio.buy("LT.NS", quantity=5, price=2000.0)
        self.portfolio.sell("LT.NS", quantity=5, price=2200.0)
        self.assertEqual(self.portfolio.loss_streak, 0)
        self.assertFalse(self.portfolio.is_locked_for_reflection)
        print("\n[Verified] Winning trade successfully reset loss streak to 0.")


if __name__ == "__main__":
    unittest.main()
