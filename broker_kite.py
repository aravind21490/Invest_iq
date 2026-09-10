"""
broker_kite.py - Zerodha Kite Connect Paper Trading & Live Broker Bridge for Invest IQ

Section 4.5 Implementation:
- Free-tier simulated Kite paper trading engine (Default: ₹0 stack, no credentials required)
- Optional live Zerodha Kite Connect Personal API bridge for advanced users
- Strict human-in-the-loop order confirmation safety validation
- Exact Zerodha CNC (Delivery) & MIS (Intraday) margin and brokerage fee calculations
"""

import os
import json
import logging
import random
from datetime import datetime
from typing import Dict, Any, Optional

import requests

from portfolio import calculate_transaction_charges

logger = logging.getLogger("investiq.broker_kite")

KITE_API_BASE = "https://api.kite.trade"


class KiteBrokerException(Exception):
    """Custom exception for Kite Broker validation or execution errors."""
    pass


class KiteBroker:
    """
    Zerodha Kite Connect Bridge supporting both simulated sandbox and live personal API.
    Enforces mandatory human confirmation for every order execution.
    """

    def __init__(
        self,
        user_id: int,
        mode: str = "SIMULATED",
        api_key: str = "",
        access_token: str = "",
        default_product: str = "CNC",
    ):
        self.user_id = user_id
        self.mode = mode.upper() if mode in ("SIMULATED", "KITE_CONNECT") else "SIMULATED"
        self.api_key = api_key.strip()
        self.access_token = access_token.strip()
        self.default_product = default_product if default_product in ("CNC", "MIS") else "CNC"

    def estimate_order_impact(
        self,
        symbol: str,
        transaction_type: str,
        quantity: int,
        price: float,
        product: str = "CNC",
    ) -> Dict[str, Any]:
        """
        Preview order margin requirement and full Indian statutory fee breakdown
        before user gives human approval.
        """
        clean_symbol = symbol.replace(".NS", "").upper()
        trans_type = transaction_type.upper()
        prod = product.upper() if product in ("CNC", "MIS") else self.default_product
        qty = int(quantity)
        px = float(price)

        if qty <= 0 or px <= 0:
            raise KiteBrokerException("Quantity and price must be positive numbers.")

        turnover = px * qty

        # CNC requires 100% margin; MIS (Intraday) gives 5x leverage (20% margin)
        margin_multiplier = 1.0 if prod == "CNC" else 0.20
        margin_required = round(turnover * margin_multiplier, 2)

        # Indian regulatory fee calculations
        charges = calculate_transaction_charges(turnover=turnover, is_buy=(trans_type == "BUY"))

        # For CNC delivery equity, Zerodha charges ₹0 brokerage
        if prod == "CNC":
            brokerage_savings = charges["brokerage"]
            charges["brokerage"] = 0.0
            charges["gst"] = round((charges["exchange_charges"] + charges["sebi_charges"]) * 0.18, 2)
            charges["total_charges"] = round(
                charges["stt"] + charges["exchange_charges"] + charges["sebi_charges"] + charges["stamp_duty"] + charges["gst"],
                2
            )
        else:
            brokerage_savings = 0.0

        total_capital_needed = margin_required + (charges["total_charges"] if trans_type == "BUY" else 0.0)

        return {
            "symbol": clean_symbol,
            "display_symbol": f"{clean_symbol}.NS",
            "transaction_type": trans_type,
            "product": prod,
            "product_label": "Equity Delivery (CNC - 100% Margin, ₹0 Brokerage)" if prod == "CNC" else "Equity Intraday (MIS - 5x Leverage)",
            "quantity": qty,
            "price": px,
            "turnover": round(turnover, 2),
            "margin_required": margin_required,
            "charges": charges,
            "brokerage_savings": brokerage_savings,
            "total_capital_needed": round(total_capital_needed, 2),
            "broker_mode": self.mode,
        }

    def validate_order(self, order_payload: Dict[str, Any]) -> None:
        """
        Verify that order payload matches Zerodha Kite Connect specifications and
        that human approval was explicitly granted.
        """
        # 1. MANDATORY HUMAN-IN-THE-LOOP CHECK
        if not order_payload.get("human_confirmed"):
            raise KiteBrokerException(
                "Order rejected: Explicit human-in-the-loop confirmation is mandatory. "
                "No autonomous algorithmic execution is permitted."
            )

        # 2. Schema validation
        required_fields = ["tradingsymbol", "transaction_type", "quantity", "price"]
        for f in required_fields:
            if f not in order_payload or order_payload[f] is None:
                raise KiteBrokerException(f"Missing mandatory order field: '{f}'")

        if order_payload["transaction_type"].upper() not in ("BUY", "SELL"):
            raise KiteBrokerException("transaction_type must be either 'BUY' or 'SELL'.")

        try:
            qty = int(order_payload["quantity"])
            if qty <= 0:
                raise ValueError
        except Exception:
            raise KiteBrokerException("Quantity must be a positive integer.")

        try:
            px = float(order_payload["price"])
            if px <= 0:
                raise ValueError
        except Exception:
            raise KiteBrokerException("Price must be a positive number.")

        prod = order_payload.get("product", self.default_product).upper()
        if prod not in ("CNC", "MIS"):
            raise KiteBrokerException("Product must be either 'CNC' (Delivery) or 'MIS' (Intraday).")

    def place_order(
        self,
        order_payload: Dict[str, Any],
        execute_in_portfolio: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute an order via Zerodha Kite Connect interface.
        If in SIMULATED mode, validates against Kite specs and commits to Invest IQ portfolio.
        If in KITE_CONNECT mode, transmits payload to Zerodha live API.
        """
        self.validate_order(order_payload)

        symbol = order_payload["tradingsymbol"].replace(".NS", "").upper()
        full_symbol = f"{symbol}.NS"
        trans_type = order_payload["transaction_type"].upper()
        qty = int(order_payload["quantity"])
        px = float(order_payload["price"])
        prod = order_payload.get("product", self.default_product).upper()
        order_type = order_payload.get("order_type", "MARKET").upper()
        validity = order_payload.get("validity", "DAY").upper()

        preview = self.estimate_order_impact(
            symbol=symbol,
            transaction_type=trans_type,
            quantity=qty,
            price=px,
            product=prod,
        )

        # ----------------------------------------------------------------------
        # MODE 1: SIMULATED (Zero cost, paper trading default)
        # ----------------------------------------------------------------------
        if self.mode == "SIMULATED" or not self.api_key or not self.access_token:
            # Generate realistic 15-digit Kite order ID
            timestamp_prefix = datetime.now().strftime("%y%m%d")
            random_suffix = f"{random.randint(100000000, 999999999)}"
            simulated_order_id = f"{timestamp_prefix}{random_suffix}"

            trade_record = None
            if execute_in_portfolio:
                from models import load_user_portfolio, sync_user_portfolio
                portfolio = load_user_portfolio(self.user_id)
                if trans_type == "BUY":
                    res = portfolio.buy(symbol=full_symbol, quantity=qty, price=px)
                else:
                    res = portfolio.sell(symbol=full_symbol, quantity=qty, price=px)
                
                if not res.get("success"):
                    raise KiteBrokerException(res.get("error", "Portfolio execution failed."))
                
                trade_record = res.get("trade")
                sync_user_portfolio(self.user_id, portfolio)

            return {
                "status": "success",
                "mode": "SIMULATED",
                "broker": "Zerodha Kite Connect (Simulated Sandbox)",
                "data": {
                    "order_id": simulated_order_id,
                    "tradingsymbol": symbol,
                    "exchange": "NSE",
                    "transaction_type": trans_type,
                    "product": prod,
                    "order_type": order_type,
                    "validity": validity,
                    "quantity": qty,
                    "price": px,
                    "status": "COMPLETE",
                    "margin_utilized": preview["margin_required"],
                    "estimated_charges": preview["charges"]["total_charges"],
                    "human_confirmed": True,
                    "placed_at": datetime.now().isoformat(),
                    "trade_record": trade_record,
                    "is_loss": res.get("is_loss", False) if execute_in_portfolio else False,
                    "is_locked": res.get("is_locked", False) if execute_in_portfolio else False,
                    "loss_streak": res.get("loss_streak", 0) if execute_in_portfolio else 0,
                    "lock_reason": res.get("lock_reason", "") if execute_in_portfolio else "",
                },
                "is_locked": res.get("is_locked", False) if execute_in_portfolio else False,
                "is_loss": res.get("is_loss", False) if execute_in_portfolio else False,
                "message": (
                    f"Order #{simulated_order_id} placed successfully via Kite paper trading bridge. "
                    f"Executed {qty} shares of {symbol} at ₹{px:,.2f} ({prod})."
                ),
            }

        # ----------------------------------------------------------------------
        # MODE 2: LIVE KITE CONNECT (Personal API)
        # ----------------------------------------------------------------------
        headers = {
            "X-Kite-Version": "3",
            "Authorization": f"token {self.api_key}:{self.access_token}",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        kite_data = {
            "tradingsymbol": symbol,
            "exchange": "NSE",
            "transaction_type": trans_type,
            "order_type": order_type,
            "quantity": qty,
            "product": prod,
            "validity": validity,
            "price": px if order_type == "LIMIT" else 0.0,
        }

        try:
            res = requests.post(
                f"{KITE_API_BASE}/orders/regular",
                headers=headers,
                data=kite_data,
                timeout=10,
            )
            data = res.json()
            if res.status_code == 200 and data.get("status") == "success":
                live_order_id = data.get("data", {}).get("order_id", "UNKNOWN")
                
                # Also record in virtual portfolio to mirror real position
                if execute_in_portfolio:
                    from models import load_user_portfolio, sync_user_portfolio
                    portfolio = load_user_portfolio(self.user_id)
                    if trans_type == "BUY":
                        portfolio.buy(symbol=full_symbol, quantity=qty, price=px)
                    else:
                        portfolio.sell(symbol=full_symbol, quantity=qty, price=px)
                    sync_user_portfolio(self.user_id, portfolio)

                return {
                    "status": "success",
                    "mode": "KITE_CONNECT",
                    "broker": "Zerodha Kite Connect (Live API)",
                    "data": {
                        "order_id": live_order_id,
                        "tradingsymbol": symbol,
                        "exchange": "NSE",
                        "transaction_type": trans_type,
                        "product": prod,
                        "quantity": qty,
                        "price": px,
                        "status": "SUBMITTED",
                    },
                    "message": f"Live Kite Order #{live_order_id} submitted to Zerodha.",
                }
            else:
                err_msg = data.get("message", "Unknown Kite Connect error")
                logger.warning("Kite Live API rejected order: %s", err_msg)
                raise KiteBrokerException(f"Zerodha Kite API error: {err_msg}")

        except requests.RequestException as e:
            logger.error("Kite network request failed: %s", e)
            raise KiteBrokerException(f"Failed to connect to Zerodha Kite servers: {e}")


def get_broker_for_user(user_id: int) -> KiteBroker:
    """Factory helper to instantiate KiteBroker with user's saved settings."""
    from models import get_user_broker_settings
    settings = get_user_broker_settings(user_id)
    return KiteBroker(
        user_id=user_id,
        mode=settings.get("broker_mode", "SIMULATED"),
        api_key=settings.get("kite_api_key", ""),
        access_token=settings.get("kite_access_token", ""),
        default_product=settings.get("default_product", "CNC"),
    )
