"""
models.py - Invest IQ Database Schema & Data Models

Supports SQLite for zero-config local development and PostgreSQL for production.
Entities:
- User (credentials & registration)
- Portfolio (virtual cash balance, behavioral cooldown state)
- Position (open holdings)
- Trade (closed executions with full Indian fee breakdown)
- Reflection (behavioral learning journal after loss)
- SignalCache (cached plain-English explanations per symbol per day)
"""

import os
import sqlite3
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "investiq.db")

# Auto-migrate existing database if finsim.db exists and investiq.db does not
_legacy_db = os.path.join(os.path.dirname(__file__), "finsim.db")
if not os.path.exists(DB_PATH) and os.path.exists(_legacy_db):
    import shutil
    try:
        shutil.copyfile(_legacy_db, DB_PATH)
    except Exception:
        pass


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create database tables if they do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Portfolios Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        cash_balance REAL DEFAULT 100000.0,
        initial_cash REAL DEFAULT 100000.0,
        total_charges_paid REAL DEFAULT 0.0,
        total_stcg_tax REAL DEFAULT 0.0,
        loss_streak INTEGER DEFAULT 0,
        is_locked_for_reflection BOOLEAN DEFAULT 0,
        cooldown_until REAL DEFAULT 0.0,
        lock_reason TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Positions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        avg_price REAL NOT NULL,
        total_cost REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(portfolio_id, symbol),
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
    );
    """)

    # 4. Trades Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        trade_type TEXT NOT NULL, -- BUY or SELL
        symbol TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        turnover REAL NOT NULL,
        brokerage REAL NOT NULL,
        stt REAL NOT NULL,
        exchange_charges REAL NOT NULL,
        sebi_charges REAL NOT NULL,
        stamp_duty REAL NOT NULL,
        gst REAL NOT NULL,
        total_charges REAL NOT NULL,
        gross_pnl REAL DEFAULT 0.0,
        net_pnl REAL DEFAULT 0.0,
        stcg_tax_provision REAL DEFAULT 0.0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
    );
    """)

    # 5. Reflections Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reflections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        trade_id INTEGER,
        thesis TEXT NOT NULL,
        reason_for_loss TEXT NOT NULL,
        lesson_learned TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
    );
    """)

    # 6. Signal Cache Table (Per stock per day caching for Phase 10)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS signal_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        date_str TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        explanation_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, date_str)
    );
    """)

    # 7. Broker Settings Table (Zerodha Kite Integration)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS broker_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        broker_mode TEXT DEFAULT 'SIMULATED', -- 'SIMULATED' or 'KITE_CONNECT'
        kite_api_key TEXT DEFAULT '',
        kite_api_secret TEXT DEFAULT '',
        kite_access_token TEXT DEFAULT '',
        default_product TEXT DEFAULT 'CNC', -- 'CNC' or 'MIS'
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()


# Initialize tables on import
init_db()


def create_user(username: str, password: str, email: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new user and initialize their virtual portfolio with ₹1,00,000 cash.
    """
    username = username.strip().lower()
    if not username or not password:
        raise ValueError("Username and password are required.")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE LOWER(username) = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"Username '{username}' is already registered.")

    password_hash = generate_password_hash(password)
    cursor.execute(
        "INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)",
        (username, password_hash, email),
    )
    user_id = cursor.lastrowid

    # Create portfolio with ₹1,00,000 virtual balance
    cursor.execute(
        """
        INSERT INTO portfolios (user_id, cash_balance, initial_cash, total_charges_paid, total_stcg_tax, loss_streak)
        VALUES (?, 100000.0, 100000.0, 0.0, 0.0, 0)
        """,
        (user_id,),
    )
    conn.commit()
    conn.close()

    return {"id": user_id, "username": username, "email": email}


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user record by username."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(username) = ?", (username.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve user record by user ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def verify_user_password(user: Dict[str, Any], password: str) -> bool:
    """Verify raw password against stored password hash."""
    return check_password_hash(user["password_hash"], password)


def get_cached_explanation(symbol: str, date_str: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached plain-English explanation for a stock on a given calendar date.
    Phase 10: Ensures all users watching the stock share the cached explanation.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT explanation_json FROM signal_cache WHERE symbol = ? AND date_str = ?",
        (symbol.upper(), date_str),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["explanation_json"])
        except Exception:
            return None
    return None


def save_cached_explanation(symbol: str, date_str: str, signal_type: str, explanation: Dict[str, Any]) -> None:
    """
    Save explanation to signal_cache for daily reuse.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    explanation_json = json.dumps(explanation)
    cursor.execute(
        """
        INSERT OR REPLACE INTO signal_cache (symbol, date_str, signal_type, explanation_json)
        VALUES (?, ?, ?, ?)
        """,
        (symbol.upper(), date_str, signal_type, explanation_json),
    )
    conn.commit()
    conn.close()


def load_user_portfolio(user_id: int):
    """
    Load a VirtualPortfolio instance from the database for the given user.
    """
    from portfolio import VirtualPortfolio

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM portfolios WHERE user_id = ?", (user_id,))
    p_row = cursor.fetchone()

    if not p_row:
        # Create default portfolio if none exists
        cursor.execute(
            """
            INSERT INTO portfolios (user_id, cash_balance, initial_cash)
            VALUES (?, 100000.0, 100000.0)
            """,
            (user_id,),
        )
        conn.commit()
        cursor.execute("SELECT * FROM portfolios WHERE user_id = ?", (user_id,))
        p_row = cursor.fetchone()

    p_data = dict(p_row)
    portfolio_id = p_data["id"]

    portfolio = VirtualPortfolio(initial_cash=p_data["initial_cash"])
    portfolio.cash_balance = p_data["cash_balance"]
    portfolio.total_charges_paid = p_data["total_charges_paid"]
    portfolio.total_stcg_tax_provision = p_data["total_stcg_tax"]
    portfolio.loss_streak = p_data["loss_streak"]
    portfolio.is_locked_for_reflection = bool(p_data["is_locked_for_reflection"])
    portfolio.cooldown_until = p_data["cooldown_until"] if p_data["cooldown_until"] > 0 else None
    portfolio.lock_reason = p_data["lock_reason"] or ""

    # Load positions
    cursor.execute("SELECT * FROM positions WHERE portfolio_id = ?", (portfolio_id,))
    for row in cursor.fetchall():
        pos = dict(row)
        portfolio.positions[pos["symbol"]] = {
            "symbol": pos["symbol"],
            "quantity": pos["quantity"],
            "avg_price": pos["avg_price"],
            "total_cost": pos["total_cost"],
        }

    # Load trades
    cursor.execute("SELECT * FROM trades WHERE portfolio_id = ? ORDER BY id ASC", (portfolio_id,))
    for row in cursor.fetchall():
        t = dict(row)
        portfolio.trade_history.append({
            "id": t["id"],
            "type": t["trade_type"],
            "symbol": t["symbol"],
            "quantity": t["quantity"],
            "price": t["price"],
            "turnover": t["turnover"],
            "charges": {
                "brokerage": t["brokerage"],
                "stt": t["stt"],
                "exchange_charges": t["exchange_charges"],
                "sebi_charges": t["sebi_charges"],
                "stamp_duty": t["stamp_duty"],
                "gst": t["gst"],
                "total_charges": t["total_charges"],
            },
            "gross_pnl": t["gross_pnl"],
            "net_pnl": t["net_pnl"],
            "stcg_tax_provision": t["stcg_tax_provision"],
            "timestamp": str(t["timestamp"]),
        })

    # Load reflections
    cursor.execute("SELECT * FROM reflections WHERE portfolio_id = ? ORDER BY id ASC", (portfolio_id,))
    for row in cursor.fetchall():
        r = dict(row)
        portfolio.reflections.append({
            "id": r["id"],
            "trade_id": r["trade_id"],
            "thesis": r["thesis"],
            "reason_for_loss": r["reason_for_loss"],
            "lesson_learned": r["lesson_learned"],
            "timestamp": str(r["created_at"]),
        })

    conn.close()
    return portfolio


def sync_user_portfolio(user_id: int, portfolio) -> None:
    """
    Persist current in-memory VirtualPortfolio state back into the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM portfolios WHERE user_id = ?", (user_id,))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        return

    portfolio_id = p_row["id"]
    cooldown_val = portfolio.cooldown_until if portfolio.cooldown_until else 0.0

    # 1. Update portfolio summary table
    cursor.execute(
        """
        UPDATE portfolios
        SET cash_balance = ?,
            total_charges_paid = ?,
            total_stcg_tax = ?,
            loss_streak = ?,
            is_locked_for_reflection = ?,
            cooldown_until = ?,
            lock_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (
            portfolio.cash_balance,
            portfolio.total_charges_paid,
            portfolio.total_stcg_tax_provision,
            portfolio.loss_streak,
            1 if portfolio.is_locked_for_reflection else 0,
            cooldown_val,
            portfolio.lock_reason,
            portfolio_id,
        ),
    )

    # 2. Sync positions: remove old positions and insert current
    cursor.execute("DELETE FROM positions WHERE portfolio_id = ?", (portfolio_id,))
    for sym, pos in portfolio.positions.items():
        cursor.execute(
            """
            INSERT INTO positions (portfolio_id, symbol, quantity, avg_price, total_cost)
            VALUES (?, ?, ?, ?, ?)
            """,
            (portfolio_id, sym, pos["quantity"], pos["avg_price"], pos["total_cost"]),
        )

    # 3. Sync any trades not yet saved
    cursor.execute("SELECT COUNT(*) FROM trades WHERE portfolio_id = ?", (portfolio_id,))
    saved_trades_count = cursor.fetchone()[0]

    if len(portfolio.trade_history) > saved_trades_count:
        new_trades = portfolio.trade_history[saved_trades_count:]
        for t in new_trades:
            chg = t.get("charges", {})
            cursor.execute(
                """
                INSERT INTO trades (
                    portfolio_id, trade_type, symbol, quantity, price, turnover,
                    brokerage, stt, exchange_charges, sebi_charges, stamp_duty, gst,
                    total_charges, gross_pnl, net_pnl, stcg_tax_provision, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    portfolio_id,
                    t["type"],
                    t["symbol"],
                    t["quantity"],
                    t["price"],
                    t.get("turnover", 0.0),
                    chg.get("brokerage", 0.0),
                    chg.get("stt", 0.0),
                    chg.get("exchange_charges", 0.0),
                    chg.get("sebi_charges", 0.0),
                    chg.get("stamp_duty", 0.0),
                    chg.get("gst", 0.0),
                    chg.get("total_charges", 0.0),
                    t.get("gross_pnl", 0.0),
                    t.get("net_pnl", 0.0),
                    t.get("stcg_tax_provision", 0.0),
                    t.get("timestamp"),
                ),
            )

    # 4. Sync reflections not yet saved
    cursor.execute("SELECT COUNT(*) FROM reflections WHERE portfolio_id = ?", (portfolio_id,))
    saved_reflections_count = cursor.fetchone()[0]

    if len(portfolio.reflections) > saved_reflections_count:
        new_reflections = portfolio.reflections[saved_reflections_count:]
        for r in new_reflections:
            cursor.execute(
                """
                INSERT INTO reflections (portfolio_id, trade_id, thesis, reason_for_loss, lesson_learned, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    portfolio_id,
                    r.get("trade_id"),
                    r.get("thesis", ""),
                    r.get("reason_for_loss", ""),
                    r.get("lesson_learned", ""),
                    r.get("timestamp"),
                ),
            )

    conn.commit()
    conn.close()


def reset_user_portfolio(user_id: int):
    """
    Completely reset user's virtual portfolio: restore starting cash (₹100,000),
    delete positions, trades, reflections, and reset locks and cooldowns.
    """
    from portfolio import VirtualPortfolio, STARTING_VIRTUAL_CASH
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM portfolios WHERE user_id = ?", (user_id,))
    p_row = cursor.fetchone()
    if p_row:
        p_id = p_row["id"]
        cursor.execute("DELETE FROM positions WHERE portfolio_id = ?", (p_id,))
        cursor.execute("DELETE FROM trades WHERE portfolio_id = ?", (p_id,))
        cursor.execute("DELETE FROM reflections WHERE portfolio_id = ?", (p_id,))
        cursor.execute(
            """
            UPDATE portfolios
            SET cash_balance = ?,
                total_charges_paid = 0.0,
                total_stcg_tax = 0.0,
                loss_streak = 0,
                is_locked_for_reflection = 0,
                cooldown_until = 0.0,
                lock_reason = '',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (STARTING_VIRTUAL_CASH, p_id),
        )
        conn.commit()
    conn.close()
    return VirtualPortfolio(initial_cash=STARTING_VIRTUAL_CASH)


def get_user_broker_settings(user_id: int) -> Dict[str, Any]:
    """Retrieve Zerodha Kite broker configuration for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at FROM broker_settings WHERE user_id = ?",
        (user_id,),
    )
    row = cursor.fetchone()
    if not row:
        cursor.execute(
            "INSERT INTO broker_settings (user_id, broker_mode, default_product) VALUES (?, 'SIMULATED', 'CNC')",
            (user_id,),
        )
        conn.commit()
        cursor.execute(
            "SELECT user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at FROM broker_settings WHERE user_id = ?",
            (user_id,),
        )
        row = cursor.fetchone()

    settings = dict(row) if row else {
        "user_id": user_id,
        "broker_mode": "SIMULATED",
        "kite_api_key": "",
        "kite_api_secret": "",
        "kite_access_token": "",
        "default_product": "CNC",
    }
    conn.close()
    return settings


def update_user_broker_settings(
    user_id: int,
    broker_mode: str = "SIMULATED",
    kite_api_key: str = "",
    kite_api_secret: str = "",
    kite_access_token: str = "",
    default_product: str = "CNC",
) -> Dict[str, Any]:
    """Update or insert user broker configuration."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO broker_settings (user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            broker_mode = excluded.broker_mode,
            kite_api_key = excluded.kite_api_key,
            kite_api_secret = excluded.kite_api_secret,
            kite_access_token = excluded.kite_access_token,
            default_product = excluded.default_product,
            updated_at = CURRENT_TIMESTAMP
        """,
        (user_id, broker_mode, kite_api_key.strip(), kite_api_secret.strip(), kite_access_token.strip(), default_product),
    )
    conn.commit()
    conn.close()
    return get_user_broker_settings(user_id)


