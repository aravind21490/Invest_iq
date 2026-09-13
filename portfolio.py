"""
portfolio.py - Invest IQ Virtual Portfolio & Cost Simulation Engine

Simulates realistic Indian equity trading with virtual capital (₹1,00,000 starting).
Accurately models transaction friction:
- Brokerage (Zerodha/Groww discount style: min(₹20, 0.05%))
- STT (Securities Transaction Tax: 0.1% on delivery Buy & Sell)
- Exchange Turnover Charges (0.00345% NSE)
- SEBI Charges (0.0001% - ₹10/crore)
- Stamp Duty (0.0015% on Buy)
- GST (18% on Brokerage + Exchange + SEBI fees)
- STCG (Short Term Capital Gains: 20% provision on net realized profits)

Behavioral Guardrails:
- Mandatory Reflection Gate on any losing trade
- Loss-Streak Cooldown (5-minute cool-off period after 2+ consecutive losses)
- Single-stock concentration warnings (>35% portfolio allocation)

All assets and trades are strictly virtual simulation.
"""

import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

STARTING_VIRTUAL_CASH = 100000.00
COOLDOWN_DURATION_SECONDS = 300  # 5-minute cool-off on loss streak >= 2


def calculate_transaction_charges(turnover: float, is_buy: bool) -> Dict[str, float]:
    """
    Calculate realistic Indian regulatory and brokerage charges down to the paisa.
    """
    if turnover <= 0:
        return {
            "turnover": 0.0,
            "brokerage": 0.0,
            "stt": 0.0,
            "exchange_charges": 0.0,
            "sebi_charges": 0.0,
            "stamp_duty": 0.0,
            "gst": 0.0,
            "total_charges": 0.0,
        }

    # 1. Brokerage: flat ₹20 or 0.05% whichever is lower (min ₹2)
    brokerage = max(2.0, min(20.0, turnover * 0.0005))

    # 2. STT: 0.1% on equity delivery turnover
    stt = round(turnover * 0.001, 2)

    # 3. Exchange charges: 0.00345%
    exchange_charges = round(turnover * 0.0000345, 2)

    # 4. SEBI turnover charge: ₹10 per crore (0.0001%)
    sebi_charges = round(turnover * 0.000001, 2)

    # 5. Stamp duty: 0.0015% on Buy turnover only
    stamp_duty = round(turnover * 0.000015, 2) if is_buy else 0.0

    # 6. GST: 18% on (Brokerage + Exchange + SEBI)
    taxable_services = brokerage + exchange_charges + sebi_charges
    gst = round(taxable_services * 0.18, 2)

    total_charges = round(brokerage + stt + exchange_charges + sebi_charges + stamp_duty + gst, 2)

    return {
        "turnover": round(turnover, 2),
        "brokerage": round(brokerage, 2),
        "stt": stt,
        "exchange_charges": exchange_charges,
        "sebi_charges": sebi_charges,
        "stamp_duty": stamp_duty,
        "gst": gst,
        "total_charges": total_charges,
    }


class VirtualPortfolio:
    """
    Manages virtual cash balance, stock positions, trade history,
    friction calculations, and behavioral psychological guardrails.
    """

    def __init__(self, initial_cash: float = STARTING_VIRTUAL_CASH):
        self.initial_cash: float = initial_cash
        self.cash_balance: float = initial_cash
        self.positions: Dict[str, Dict[str, Any]] = {}
        self.trade_history: List[Dict[str, Any]] = []
        self.reflections: List[Dict[str, Any]] = []
        self.total_charges_paid: float = 0.0
        self.total_stcg_tax_provision: float = 0.0
        self.loss_streak: int = 0
        self.is_locked_for_reflection: bool = False
        self.cooldown_until: Optional[float] = None
        self.lock_reason: str = ""

    def get_position(self, symbol: str) -> Optional[Dict[str, Any]]:
        return self.positions.get(symbol)

    def is_in_cooldown(self) -> Tuple[bool, int]:
        """Check if user is in an active mandatory cooldown period. Returns (is_cooling, seconds_left)."""
        if self.cooldown_until and time.time() < self.cooldown_until:
            seconds_left = int(self.cooldown_until - time.time())
            return True, seconds_left
        return False, 0

    def buy(self, symbol: str, quantity: int, price: float, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a simulated Buy order with realistic fees deducted.
        """
        in_cooldown, sec_left = self.is_in_cooldown()
        if in_cooldown:
            return {
                "success": False,
                "error": f"Trading locked in behavioral cooldown ({sec_left}s left). Take a breather to prevent revenge trading.",
            }

        if self.is_locked_for_reflection:
            return {
                "success": False,
                "error": f"Trading is locked: {self.lock_reason}",
            }

        if quantity <= 0:
            return {"success": False, "error": "Quantity must be greater than zero."}
        if price <= 0:
            return {"success": False, "error": "Invalid price for execution."}

        turnover = quantity * price
        charges = calculate_transaction_charges(turnover, is_buy=True)
        total_required = turnover + charges["total_charges"]

        if total_required > self.cash_balance:
            return {
                "success": False,
                "error": (
                    f"Insufficient virtual cash. Needed: ₹{total_required:,.2f} "
                    f"(Turnover ₹{turnover:,.2f} + Charges ₹{charges['total_charges']:,.2f}), "
                    f"Available: ₹{self.cash_balance:,.2f}"
                ),
            }

        # Deduct cash
        self.cash_balance -= total_required
        self.total_charges_paid += charges["total_charges"]

        # Update position
        if symbol in self.positions:
            pos = self.positions[symbol]
            old_qty = pos["quantity"]
            old_cost = pos["total_cost"]
            new_qty = old_qty + quantity
            new_cost = old_cost + total_required
            pos["quantity"] = new_qty
            pos["total_cost"] = new_cost
            pos["avg_price"] = round((pos["avg_price"] * old_qty + price * quantity) / new_qty, 2)
        else:
            self.positions[symbol] = {
                "symbol": symbol,
                "quantity": quantity,
                "avg_price": round(price, 2),
                "total_cost": round(total_required, 2),
            }

        trade_record = {
            "id": len(self.trade_history) + 1,
            "type": "BUY",
            "symbol": symbol,
            "quantity": quantity,
            "price": round(price, 2),
            "turnover": charges["turnover"],
            "charges": charges,
            "total_outflow": round(total_required, 2),
            "timestamp": timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        self.trade_history.append(trade_record)

        return {
            "success": True,
            "trade": trade_record,
            "remaining_cash": round(self.cash_balance, 2),
            "position": self.positions[symbol],
        }

    def sell(self, symbol: str, quantity: int, price: float, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a simulated Sell order with fees and capital gains tax provision.
        """
        # Position exit orders (SELL) are exempt from behavioral cooldowns and reflection locks,
        # ensuring users can always close positions or cut losses.
        if symbol not in self.positions or self.positions[symbol]["quantity"] <= 0:
            return {"success": False, "error": f"You do not own any shares of {symbol} to sell."}

        pos = self.positions[symbol]
        owned_qty = pos["quantity"]

        if quantity <= 0 or quantity > owned_qty:
            return {
                "success": False,
                "error": f"Invalid sell quantity. You hold {owned_qty} shares, attempted to sell {quantity}.",
            }

        turnover = quantity * price
        charges = calculate_transaction_charges(turnover, is_buy=False)
        gross_proceeds = turnover - charges["total_charges"]

        # Cost basis of sold shares
        cost_basis_sold = pos["avg_price"] * quantity
        gross_pnl = turnover - cost_basis_sold
        net_realized_pnl = gross_pnl - charges["total_charges"]

        # Short-Term Capital Gains (STCG) 20% tax provision on positive net profit
        stcg_tax = round(net_realized_pnl * 0.20, 2) if net_realized_pnl > 0 else 0.0
        self.total_stcg_tax_provision += stcg_tax

        # Update cash
        self.cash_balance += gross_proceeds
        self.total_charges_paid += charges["total_charges"]

        # Update position
        remaining_qty = owned_qty - quantity
        if remaining_qty == 0:
            del self.positions[symbol]
        else:
            pos["quantity"] = remaining_qty
            pos["total_cost"] -= (pos["avg_price"] * quantity)

        # Track behavioral streak
        is_loss = net_realized_pnl < 0
        if is_loss:
            self.loss_streak += 1
            self.is_locked_for_reflection = True
            # Check loss streak cooldown
            if self.loss_streak >= 2:
                self.cooldown_until = time.time() + COOLDOWN_DURATION_SECONDS
                self.lock_reason = (
                    f"Loss-Streak Cooldown Triggered: You have logged {self.loss_streak} consecutive losing trades. "
                    f"A 5-minute cool-off period has been instituted to protect you from revenge trading. "
                    f"Complete your trade reflection while the timer cools down."
                )
            else:
                self.lock_reason = (
                    f"Mandatory Reflection Required: Trade #{len(self.trade_history) + 1} resulted in a virtual loss of "
                    f"₹{abs(net_realized_pnl):,.2f}. Reflect on this trade before taking another action."
                )
        else:
            self.loss_streak = 0

        trade_record = {
            "id": len(self.trade_history) + 1,
            "type": "SELL",
            "symbol": symbol,
            "quantity": quantity,
            "price": round(price, 2),
            "turnover": charges["turnover"],
            "charges": charges,
            "cost_basis": round(cost_basis_sold, 2),
            "gross_pnl": round(gross_pnl, 2),
            "net_pnl": round(net_realized_pnl, 2),
            "stcg_tax_provision": stcg_tax,
            "net_after_tax": round(net_realized_pnl - stcg_tax, 2),
            "timestamp": timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        self.trade_history.append(trade_record)

        return {
            "success": True,
            "trade": trade_record,
            "net_pnl": round(net_realized_pnl, 2),
            "charges": charges,
            "remaining_cash": round(self.cash_balance, 2),
            "is_loss": is_loss,
            "loss_streak": self.loss_streak,
            "is_locked": self.is_locked_for_reflection,
        }

    def submit_reflection(self, trade_id: int, thesis: str, reason_for_loss: str, lesson_learned: str) -> Dict[str, Any]:
        """
        Submits mandatory reflection for a losing trade and unlocks trading
        if cooldown timer has expired.
        """
        reflection_entry = {
            "id": len(self.reflections) + 1,
            "trade_id": trade_id,
            "thesis": thesis.strip(),
            "reason_for_loss": reason_for_loss.strip(),
            "lesson_learned": lesson_learned.strip(),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        self.reflections.append(reflection_entry)

        # Check if cooling down
        in_cooldown, sec_left = self.is_in_cooldown()
        if not in_cooldown:
            self.is_locked_for_reflection = False
            self.lock_reason = ""
        else:
            self.lock_reason = f"Loss streak cooldown active ({sec_left}s remaining to cool down emotional impulse)."

        return {
            "success": True,
            "reflection": reflection_entry,
            "is_unlocked": not self.is_locked_for_reflection,
            "seconds_left": sec_left,
        }

    def unlock_reflection(self) -> None:
        """Unlock portfolio after user completes reflection or manual override."""
        self.is_locked_for_reflection = False
        self.cooldown_until = None
        self.lock_reason = ""

    def get_summary(self, current_prices: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Calculate total valuation, unrealized P&L, realized P&L, fees, and diversification.
        """
        current_prices = current_prices or {}
        holdings_valuation = 0.0
        total_invested_cost = 0.0
        positions_summary = []

        for sym, pos in self.positions.items():
            qty = pos["quantity"]
            avg_p = float(pos["avg_price"])
            raw_p = current_prices.get(sym, avg_p) if current_prices else avg_p
            curr_p = float(raw_p if raw_p is not None else avg_p)
            curr_val = qty * curr_p
            cost_val = qty * avg_p
            unrealized_pnl = curr_val - cost_val
            unrealized_pct = ((curr_val - cost_val) / cost_val * 100) if cost_val > 0 else 0.0

            holdings_valuation += curr_val
            total_invested_cost += cost_val

            positions_summary.append({
                "symbol": sym,
                "quantity": qty,
                "avg_price": round(avg_p, 2),
                "current_price": round(curr_p, 2),
                "current_value": round(curr_val, 2),
                "invested_value": round(cost_val, 2),
                "unrealized_pnl": round(unrealized_pnl, 2),
                "unrealized_pct": round(unrealized_pct, 2),
            })

        total_portfolio_value = self.cash_balance + holdings_valuation
        total_pnl = (total_portfolio_value - self.initial_cash)
        total_return_pct = ((total_pnl / self.initial_cash) * 100.0) if self.initial_cash > 0 else 0.0

        # Calculate realized P&L from closed sell trades
        total_realized_pnl = sum(t.get("net_pnl", 0.0) for t in self.trade_history if t["type"] == "SELL")

        # Diversification concentration check
        max_concentration_pct = 0.0
        concentrated_symbol = None
        if total_portfolio_value > 0 and positions_summary:
            for p in positions_summary:
                pct = (float(p["current_value"]) / total_portfolio_value) * 100.0
                if pct > max_concentration_pct:
                    max_concentration_pct = pct
                    concentrated_symbol = p["symbol"]

        in_cooldown, sec_left = self.is_in_cooldown()

        return {
            "initial_cash": round(self.initial_cash, 2),
            "cash_balance": round(self.cash_balance, 2),
            "holdings_valuation": round(holdings_valuation, 2),
            "total_portfolio_value": round(total_portfolio_value, 2),
            "total_invested": round(total_invested_cost, 2),
            "total_pnl": round(total_pnl, 2),
            "total_return_pct": round(total_return_pct, 2),
            "total_realized_pnl": round(total_realized_pnl, 2),
            "total_charges_paid": round(self.total_charges_paid, 2),
            "stcg_tax_provision": round(self.total_stcg_tax_provision, 2),
            "positions": positions_summary,
            "positions_count": len(positions_summary),
            "total_trades_count": len(self.trade_history),
            "loss_streak": self.loss_streak,
            "is_locked_for_reflection": self.is_locked_for_reflection,
            "is_in_cooldown": in_cooldown,
            "cooldown_seconds_left": sec_left,
            "lock_reason": self.lock_reason,
            "reflections_count": len(self.reflections),
            "concentration": {
                "max_pct": round(max_concentration_pct, 2),
                "symbol": concentrated_symbol,
                "is_overconcentrated": max_concentration_pct > 35.0,
            },
        }
