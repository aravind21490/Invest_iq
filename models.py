"""
models.py - Invest IQ Shared-Ledger Database Schema & Data Models

Supports PostgreSQL (via psycopg2 and Supabase direct connection) for production
and shared ledger operations with the Next.js frontend, plus local SQLite compatibility.
Entities:
- User (canonical identity with optional username/password_hash, phone/email)
- Portfolio (shared cash balance, behavioral cooldown state)
- Position (shared open holdings)
- Trade (shared trade log, populated via execute_paper_trade RPC)
- Reflection (behavioral learning journal after loss)
- SignalCache (cached plain-English explanations per symbol per day)
- BrokerSettings (Zerodha Kite Connect integration settings)
"""

import os
import json
import uuid
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

logger = logging.getLogger("investiq.models")

DATABASE_URL = os.environ.get("DATABASE_URL")
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "investiq.db"))


class DictRow(dict):
    """Dictionary-like row that also allows index-based column access."""
    def __init__(self, data=None, keys=None):
        if data is None:
            data = {}
        super().__init__(data)
        self._keys = list(keys) if keys else list(self.keys())

    def __getitem__(self, item):
        if isinstance(item, int):
            return super().__getitem__(self._keys[item])
        return super().__getitem__(item)


class SQLiteCompatCursor:
    """
    Compatibility wrapper around sqlite3.Cursor that:
    1. Translates %s parameter placeholders to ?
    2. Supports native RETURNING id clauses (SQLite 3.35+)
    3. Normalizes rows to DictRow objects matching psycopg2 RealDictCursor
    """
    def __init__(self, cursor, conn):
        self._cursor = cursor
        self._conn = conn

    def execute(self, query, params=None):
        sqlite_sql = query.replace("%s", "?")
        if params is not None:
            conv_params = []
            for p in params:
                if isinstance(p, bool):
                    conv_params.append(1 if p else 0)
                else:
                    conv_params.append(p)
            self._cursor.execute(sqlite_sql, tuple(conv_params))
        else:
            self._cursor.execute(sqlite_sql)
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        if hasattr(row, "keys"):
            d = {k: row[k] for k in row.keys()}
            return DictRow(d, keys=row.keys())
        return row

    def fetchall(self):
        rows = self._cursor.fetchall()
        result = []
        for r in rows:
            if hasattr(r, "keys"):
                result.append(DictRow({k: r[k] for k in r.keys()}, keys=r.keys()))
            else:
                result.append(r)
        return result

    @property
    def lastrowid(self):
        return self._cursor.lastrowid

    def close(self):
        self._cursor.close()


class SQLiteCompatConnection:
    """Wrapper around sqlite3.Connection to provide SQLiteCompatCursor."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return SQLiteCompatCursor(self._conn.cursor(), self._conn)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_db_connection():
    """
    Returns a database connection.
    Connects to PostgreSQL via psycopg2 using DATABASE_URL if available;
    falls back to SQLite with full parameter compatibility for local test runs.
    """
    url = os.environ.get("DATABASE_URL")
    if url and (url.startswith("postgres://") or url.startswith("postgresql://")):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
        return conn

    # Fallback to SQLite for zero-config offline tests
    import sqlite3
    sqlite_conn = sqlite3.connect(DB_PATH, timeout=15.0)
    sqlite_conn.execute("PRAGMA foreign_keys = ON")
    sqlite_conn.row_factory = sqlite3.Row
    return SQLiteCompatConnection(sqlite_conn)


def init_db():
    """Create database tables if they do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    is_pg = bool(os.environ.get("DATABASE_URL", "").startswith("postgres"))

    if is_pg:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE,
            email TEXT UNIQUE,
            username TEXT,
            password_hash TEXT,
            name TEXT NOT NULL DEFAULT 'Trader',
            auth_provider TEXT NOT NULL DEFAULT 'email',
            avatar TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_not_null 
        ON users(LOWER(username)) 
        WHERE username IS NOT NULL;
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolios (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            cash_balance DOUBLE PRECISION NOT NULL DEFAULT 100000.0,
            initial_balance DOUBLE PRECISION NOT NULL DEFAULT 100000.0,
            total_charges_paid DOUBLE PRECISION DEFAULT 0.0,
            total_stcg_tax DOUBLE PRECISION DEFAULT 0.0,
            loss_streak INT DEFAULT 0,
            is_locked_for_reflection BOOLEAN DEFAULT FALSE,
            cooldown_until DOUBLE PRECISION DEFAULT 0.0,
            lock_reason TEXT DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            shares INT NOT NULL CHECK (shares > 0),
            avg_buy_price DOUBLE PRECISION NOT NULL,
            sector TEXT DEFAULT 'General',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_positions_user_symbol UNIQUE (user_id, symbol)
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
            shares INT NOT NULL CHECK (shares > 0),
            price DOUBLE PRECISION NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            pnl DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'Filled',
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS signal_cache (
            id SERIAL PRIMARY KEY,
            symbol TEXT NOT NULL,
            date_str TEXT NOT NULL,
            signal_type TEXT NOT NULL,
            explanation_json TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(symbol, date_str)
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS broker_settings (
            id SERIAL PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            broker_mode TEXT DEFAULT 'SIMULATED',
            kite_api_key TEXT DEFAULT '',
            kite_api_secret TEXT DEFAULT '',
            kite_access_token TEXT DEFAULT '',
            default_product TEXT DEFAULT 'CNC',
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reflections (
            id SERIAL PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            trade_id TEXT,
            thesis TEXT NOT NULL,
            reason_for_loss TEXT NOT NULL,
            lesson_learned TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_runs (
            id TEXT PRIMARY KEY,
            agent_name TEXT NOT NULL,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            trade_id TEXT,
            output JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_flags (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol TEXT,
            agent_name TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_watchlists (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_user_watchlists UNIQUE (user_id, symbol)
        );
        """)
    else:
        # SQLite schema
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            email TEXT,
            phone TEXT,
            name TEXT DEFAULT 'Trader',
            auth_provider TEXT DEFAULT 'email',
            avatar TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            cash_balance REAL DEFAULT 100000.0,
            initial_balance REAL DEFAULT 100000.0,
            initial_cash REAL DEFAULT 100000.0,
            total_charges_paid REAL DEFAULT 0.0,
            total_stcg_tax REAL DEFAULT 0.0,
            loss_streak INTEGER DEFAULT 0,
            is_locked_for_reflection BOOLEAN DEFAULT 0,
            cooldown_until REAL DEFAULT 0.0,
            lock_reason TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            portfolio_id INTEGER,
            symbol TEXT NOT NULL,
            name TEXT DEFAULT '',
            shares INTEGER DEFAULT 0,
            quantity INTEGER DEFAULT 0,
            avg_buy_price REAL DEFAULT 0.0,
            avg_price REAL DEFAULT 0.0,
            total_cost REAL DEFAULT 0.0,
            sector TEXT DEFAULT 'General',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            portfolio_id INTEGER,
            trade_type TEXT DEFAULT 'BUY',
            type TEXT DEFAULT 'BUY',
            symbol TEXT NOT NULL,
            name TEXT DEFAULT '',
            shares INTEGER DEFAULT 0,
            quantity INTEGER DEFAULT 0,
            price REAL NOT NULL,
            turnover REAL DEFAULT 0.0,
            amount REAL DEFAULT 0.0,
            brokerage REAL DEFAULT 0.0,
            stt REAL DEFAULT 0.0,
            exchange_charges REAL DEFAULT 0.0,
            sebi_charges REAL DEFAULT 0.0,
            stamp_duty REAL DEFAULT 0.0,
            gst REAL DEFAULT 0.0,
            total_charges REAL DEFAULT 0.0,
            gross_pnl REAL DEFAULT 0.0,
            net_pnl REAL DEFAULT 0.0,
            pnl REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Filled',
            stcg_tax_provision REAL DEFAULT 0.0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reflections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            portfolio_id INTEGER,
            trade_id TEXT,
            thesis TEXT NOT NULL,
            reason_for_loss TEXT NOT NULL,
            lesson_learned TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
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
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS broker_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            broker_mode TEXT DEFAULT 'SIMULATED',
            kite_api_key TEXT DEFAULT '',
            kite_api_secret TEXT DEFAULT '',
            kite_access_token TEXT DEFAULT '',
            default_product TEXT DEFAULT 'CNC',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_runs (
            id TEXT PRIMARY KEY,
            agent_name TEXT NOT NULL,
            user_id TEXT NOT NULL,
            trade_id TEXT,
            output TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_flags (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            symbol TEXT,
            agent_name TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_watchlists (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, symbol)
        );
        """)

        # Auto-migrate existing SQLite table columns if created under older schema
        raw_cur = conn._conn.cursor()
        for tbl, col, col_def in [
            ("users", "name", "TEXT DEFAULT 'Trader'"),
            ("users", "auth_provider", "TEXT DEFAULT 'email'"),
            ("users", "avatar", "TEXT"),
            ("portfolios", "initial_balance", "REAL DEFAULT 100000.0"),
            ("positions", "user_id", "TEXT"),
            ("positions", "shares", "INTEGER DEFAULT 0"),
            ("trades", "user_id", "TEXT"),
            ("trades", "shares", "INTEGER DEFAULT 0"),
            ("trades", "trade_type", "TEXT DEFAULT 'BUY'"),
            ("reflections", "user_id", "TEXT"),
        ]:
            try:
                cols = [r[1] for r in raw_cur.execute(f"PRAGMA table_info({tbl})").fetchall()]
                if col not in cols:
                    raw_cur.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}")
                    conn._conn.commit()
            except Exception:
                pass

    conn.commit()
    conn.close()


# Initialize tables on import
init_db()


def create_user(username: str, password: str, email: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new user and initialize their virtual portfolio with ₹1,00,000 cash.
    If an existing user row matches the provided email, attaches username and password_hash
    to that existing user instead of creating a duplicate user row.
    """
    username = username.strip().lower()
    if not username or not password:
        raise ValueError("Username and password are required.")
    clean_email = email.strip().lower() if email else None

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Check if username is already registered to a different account
    cursor.execute("SELECT id, email FROM users WHERE LOWER(username) = %s", (username,))
    existing_by_username = cursor.fetchone()

    # 2. Check if user already exists with that email
    existing_by_email = None
    if clean_email:
        cursor.execute("SELECT id, username FROM users WHERE LOWER(email) = %s", (clean_email,))
        existing_by_email = cursor.fetchone()

    # Conflict check: username belongs to another user
    if existing_by_username:
        if not existing_by_email or str(existing_by_email["id"]) != str(existing_by_username["id"]):
            conn.close()
            raise ValueError(f"Username '{username}' is already registered.")

    password_hash = generate_password_hash(password)

    # 3. Canonical identity unification: if email match exists, attach credentials
    if existing_by_email:
        user_id = str(existing_by_email["id"])
        cursor.execute(
            """
            UPDATE users
            SET username = %s,
                password_hash = %s
            WHERE id = %s
            RETURNING id, username, email
            """,
            (username, password_hash, user_id),
        )
        user_row = cursor.fetchone()

        # Ensure portfolio exists
        cursor.execute("SELECT user_id FROM portfolios WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.execute(
                """
                INSERT INTO portfolios (user_id, cash_balance, initial_balance)
                VALUES (%s, 100000.0, 100000.0)
                """,
                (user_id,),
            )
        conn.commit()
        conn.close()
        return {"id": user_id, "username": username, "email": clean_email}

    # 4. No email match found or no email provided: create new canonical row
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    cursor.execute(
        """
        INSERT INTO users (id, username, password_hash, email, name, auth_provider)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, username, email
        """,
        (user_id, username, password_hash, clean_email, username.capitalize(), "email"),
    )
    user_row = cursor.fetchone()

    # Initialize ₹100,000 virtual cash portfolio
    cursor.execute(
        """
        INSERT INTO portfolios (user_id, cash_balance, initial_balance, total_charges_paid, total_stcg_tax, loss_streak)
        VALUES (%s, 100000.0, 100000.0, 0.0, 0.0, 0)
        """,
        (user_id,),
    )
    conn.commit()
    conn.close()

    return {"id": user_id, "username": username, "email": clean_email}


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user record by username."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(username) = %s", (username.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: Any) -> Optional[Dict[str, Any]]:
    """Retrieve user record by user ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (str(user_id),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def verify_user_password(user: Dict[str, Any], password: str) -> bool:
    """Verify raw password against stored password hash."""
    pwd_hash = user.get("password_hash")
    if not pwd_hash:
        return False
    return check_password_hash(pwd_hash, password)


def get_cached_explanation(symbol: str, date_str: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached plain-English explanation for a stock on a given calendar date.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT explanation_json FROM signal_cache WHERE symbol = %s AND date_str = %s",
        (symbol.upper(), date_str),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            exp = row["explanation_json"]
            return json.loads(exp) if isinstance(exp, str) else exp
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
    is_pg = bool(os.environ.get("DATABASE_URL", "").startswith("postgres"))
    if is_pg:
        cursor.execute(
            """
            INSERT INTO signal_cache (symbol, date_str, signal_type, explanation_json)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (symbol, date_str) DO UPDATE SET
                signal_type = EXCLUDED.signal_type,
                explanation_json = EXCLUDED.explanation_json
            """,
            (symbol.upper(), date_str, signal_type, explanation_json),
        )
    else:
        cursor.execute(
            """
            INSERT OR REPLACE INTO signal_cache (symbol, date_str, signal_type, explanation_json)
            VALUES (%s, %s, %s, %s)
            """,
            (symbol.upper(), date_str, signal_type, explanation_json),
        )
    conn.commit()
    conn.close()


def load_user_portfolio(user_id: Any):
    """
    Load a VirtualPortfolio instance from the database for the given user.
    """
    from portfolio import VirtualPortfolio

    uid = str(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM portfolios WHERE user_id = %s", (uid,))
    p_row = cursor.fetchone()

    if not p_row:
        cursor.execute(
            """
            INSERT INTO portfolios (user_id, cash_balance, initial_balance)
            VALUES (%s, 100000.0, 100000.0)
            """,
            (uid,),
        )
        conn.commit()
        cursor.execute("SELECT * FROM portfolios WHERE user_id = %s", (uid,))
        p_row = cursor.fetchone()

    p_data = dict(p_row)
    port_id = p_data.get("id")
    initial_cash = p_data.get("initial_balance") or p_data.get("initial_cash") or 100000.0

    portfolio = VirtualPortfolio(initial_cash=float(initial_cash))
    portfolio.cash_balance = float(p_data.get("cash_balance", 100000.0))
    portfolio.total_charges_paid = float(p_data.get("total_charges_paid") or 0.0)
    portfolio.total_stcg_tax_provision = float(p_data.get("total_stcg_tax") or 0.0)
    portfolio.loss_streak = int(p_data.get("loss_streak") or 0)
    portfolio.is_locked_for_reflection = bool(p_data.get("is_locked_for_reflection", False))
    cooldown_until = float(p_data.get("cooldown_until") or 0.0)
    portfolio.cooldown_until = cooldown_until if cooldown_until > 0 else None
    portfolio.lock_reason = p_data.get("lock_reason") or ""

    # Load positions: check by user_id, fallback to portfolio_id
    cursor.execute("SELECT * FROM positions WHERE user_id = %s", (uid,))
    pos_rows = cursor.fetchall()
    if not pos_rows and port_id:
        cursor.execute("SELECT * FROM positions WHERE portfolio_id = %s", (port_id,))
        pos_rows = cursor.fetchall()

    for row in pos_rows:
        pos = dict(row)
        shares = int(pos.get("shares") or pos.get("quantity") or 0)
        avg_price = float(pos.get("avg_buy_price") or pos.get("avg_price") or 0.0)
        total_cost = float(pos.get("total_cost") or (shares * avg_price))
        portfolio.positions[pos["symbol"]] = {
            "symbol": pos["symbol"],
            "quantity": shares,
            "avg_price": avg_price,
            "total_cost": total_cost,
        }

    # Load trades: check by user_id, fallback to portfolio_id
    cursor.execute("SELECT * FROM trades WHERE user_id = %s ORDER BY timestamp ASC", (uid,))
    trade_rows = cursor.fetchall()
    if not trade_rows and port_id:
        cursor.execute("SELECT * FROM trades WHERE portfolio_id = %s ORDER BY timestamp ASC", (port_id,))
        trade_rows = cursor.fetchall()

    for row in trade_rows:
        t = dict(row)
        trade_type = t.get("type") or t.get("trade_type") or "BUY"
        shares = int(t.get("shares") or t.get("quantity") or 0)
        price = float(t.get("price") or 0.0)
        turnover = float(t.get("amount") or t.get("turnover") or (shares * price))
        pnl = float(t.get("pnl") or t.get("net_pnl") or 0.0)
        portfolio.trade_history.append({
            "id": t["id"],
            "type": trade_type,
            "symbol": t["symbol"],
            "quantity": shares,
            "price": price,
            "turnover": turnover,
            "charges": {
                "brokerage": float(t.get("brokerage") or 0.0),
                "stt": float(t.get("stt") or 0.0),
                "exchange_charges": float(t.get("exchange_charges") or 0.0),
                "sebi_charges": float(t.get("sebi_charges") or 0.0),
                "stamp_duty": float(t.get("stamp_duty") or 0.0),
                "gst": float(t.get("gst") or 0.0),
                "total_charges": float(t.get("total_charges") or 0.0),
            },
            "gross_pnl": float(t.get("gross_pnl") or pnl),
            "net_pnl": pnl,
            "stcg_tax_provision": float(t.get("stcg_tax_provision") or 0.0),
            "timestamp": str(t.get("timestamp")),
        })

    # Load reflections
    try:
        cursor.execute("SELECT * FROM reflections WHERE user_id = %s ORDER BY created_at ASC", (uid,))
        ref_rows = cursor.fetchall()
        if not ref_rows and port_id:
            cursor.execute("SELECT * FROM reflections WHERE portfolio_id = %s ORDER BY created_at ASC", (port_id,))
            ref_rows = cursor.fetchall()
        for row in ref_rows:
            r = dict(row)
            portfolio.reflections.append({
                "id": r["id"],
                "trade_id": r.get("trade_id"),
                "thesis": r.get("thesis", ""),
                "reason_for_loss": r.get("reason_for_loss", ""),
                "lesson_learned": r.get("lesson_learned", ""),
                "timestamp": str(r.get("created_at")),
            })
    except Exception:
        pass

    conn.close()
    return portfolio


def sync_user_portfolio(user_id: Any, portfolio) -> None:
    """
    Persist current in-memory VirtualPortfolio state back into the database.
    """
    uid = str(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM portfolios WHERE user_id = %s", (uid,))
    p_row = cursor.fetchone()
    if not p_row:
        cursor.execute(
            "INSERT INTO portfolios (user_id, cash_balance, initial_balance) VALUES (%s, %s, %s)",
            (uid, portfolio.cash_balance, portfolio.initial_cash),
        )
        cursor.execute("SELECT * FROM portfolios WHERE user_id = %s", (uid,))
        p_row = cursor.fetchone()

    p_data = dict(p_row)
    port_id = p_data.get("id") or uid
    cooldown_val = portfolio.cooldown_until if portfolio.cooldown_until else 0.0

    cursor.execute(
        """
        UPDATE portfolios
        SET cash_balance = %s,
            total_charges_paid = %s,
            total_stcg_tax = %s,
            loss_streak = %s,
            is_locked_for_reflection = %s,
            cooldown_until = %s,
            lock_reason = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (
            portfolio.cash_balance,
            portfolio.total_charges_paid,
            portfolio.total_stcg_tax_provision,
            portfolio.loss_streak,
            1 if portfolio.is_locked_for_reflection else 0,
            cooldown_val,
            portfolio.lock_reason,
            uid,
        ),
    )

    # Sync positions
    cursor.execute("DELETE FROM positions WHERE user_id = %s", (uid,))
    if p_data.get("id"):
        cursor.execute("DELETE FROM positions WHERE portfolio_id = %s", (p_data["id"],))

    for sym, pos in portfolio.positions.items():
        pos_id = f"pos_{uuid.uuid4().hex[:8]}"
        clean_name = sym.replace(".NS", "")
        cursor.execute(
            """
            INSERT INTO positions (id, user_id, portfolio_id, symbol, name, shares, quantity, avg_buy_price, avg_price, total_cost, sector)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                pos_id,
                uid,
                p_data.get("id"),
                sym,
                clean_name,
                pos["quantity"],
                pos["quantity"],
                pos["avg_price"],
                pos["avg_price"],
                pos["total_cost"],
                "General",
            ),
        )

    # Sync trades
    cursor.execute("SELECT COUNT(*) FROM trades WHERE user_id = %s", (uid,))
    count_res = cursor.fetchone()
    saved_trades_count = count_res[0] if isinstance(count_res, (list, tuple, DictRow)) else (count_res.get("count", 0) if count_res else 0)

    if saved_trades_count == 0 and p_data.get("id"):
        cursor.execute("SELECT COUNT(*) FROM trades WHERE portfolio_id = %s", (p_data["id"],))
        c2 = cursor.fetchone()
        saved_trades_count = c2[0] if isinstance(c2, (list, tuple, DictRow)) else (c2.get("count", 0) if c2 else 0)

    if len(portfolio.trade_history) > saved_trades_count:
        new_trades = portfolio.trade_history[saved_trades_count:]
        for t in new_trades:
            raw_id = t.get("id")
            if isinstance(raw_id, str) and (raw_id.startswith("ORD-") or raw_id.startswith("tr_")):
                trade_id = raw_id
            else:
                trade_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
            t["id"] = trade_id
            clean_name = t["symbol"].replace(".NS", "")
            turnover = t.get("turnover") or (t["quantity"] * t["price"])
            chg = t.get("charges", {})
            cursor.execute(
                """
                INSERT INTO trades (
                    id, user_id, portfolio_id, symbol, name, type, trade_type, shares, quantity, price,
                    amount, turnover, brokerage, stt, exchange_charges, sebi_charges,
                    stamp_duty, gst, total_charges, gross_pnl, net_pnl, pnl,
                    stcg_tax_provision, status, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """,
                (
                    trade_id,
                    uid,
                    p_data.get("id"),
                    t["symbol"],
                    clean_name,
                    t["type"],
                    t["type"],
                    t["quantity"],
                    t["quantity"],
                    t["price"],
                    turnover,
                    turnover,
                    chg.get("brokerage", 0.0),
                    chg.get("stt", 0.0),
                    chg.get("exchange_charges", 0.0),
                    chg.get("sebi_charges", 0.0),
                    chg.get("stamp_duty", 0.0),
                    chg.get("gst", 0.0),
                    chg.get("total_charges", 0.0),
                    t.get("gross_pnl", 0.0),
                    t.get("net_pnl", 0.0),
                    t.get("net_pnl", 0.0),
                    t.get("stcg_tax_provision", 0.0),
                    "Filled",
                ),
            )

    # Sync reflections
    try:
        cursor.execute("SELECT COUNT(*) FROM reflections WHERE user_id = %s", (uid,))
        ref_count_res = cursor.fetchone()
        saved_reflections_count = ref_count_res[0] if isinstance(ref_count_res, (list, tuple, DictRow)) else (ref_count_res.get("count", 0) if ref_count_res else 0)

        if len(portfolio.reflections) > saved_reflections_count:
            new_reflections = portfolio.reflections[saved_reflections_count:]
            for r in new_reflections:
                cursor.execute(
                    """
                    INSERT INTO reflections (user_id, portfolio_id, trade_id, thesis, reason_for_loss, lesson_learned, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """,
                    (
                        uid,
                        p_data.get("id"),
                        str(r.get("trade_id")),
                        r.get("thesis", ""),
                        r.get("reason_for_loss", ""),
                        r.get("lesson_learned", ""),
                    ),
                )
    except Exception:
        pass

    conn.commit()
    conn.close()


def reset_user_portfolio(user_id: Any):
    """
    Completely reset user's virtual portfolio: restore starting cash (₹100,000),
    delete positions, trades, reflections, and reset locks and cooldowns.
    """
    from portfolio import VirtualPortfolio, STARTING_VIRTUAL_CASH
    uid = str(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM portfolios WHERE user_id = %s", (uid,))
    p_row = cursor.fetchone()
    p_id = p_row.get("id") if p_row else None

    cursor.execute("DELETE FROM positions WHERE user_id = %s", (uid,))
    cursor.execute("DELETE FROM trades WHERE user_id = %s", (uid,))
    if p_id:
        cursor.execute("DELETE FROM positions WHERE portfolio_id = %s", (p_id,))
        cursor.execute("DELETE FROM trades WHERE portfolio_id = %s", (p_id,))

    try:
        cursor.execute("DELETE FROM reflections WHERE user_id = %s", (uid,))
        if p_id:
            cursor.execute("DELETE FROM reflections WHERE portfolio_id = %s", (p_id,))
    except Exception:
        pass

    cursor.execute(
        """
        UPDATE portfolios
        SET cash_balance = %s,
            total_charges_paid = 0.0,
            total_stcg_tax = 0.0,
            loss_streak = 0,
            is_locked_for_reflection = 0,
            cooldown_until = 0.0,
            lock_reason = '',
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s
        """,
        (STARTING_VIRTUAL_CASH, uid),
    )
    conn.commit()
    conn.close()
    return VirtualPortfolio(initial_cash=STARTING_VIRTUAL_CASH)


def get_user_broker_settings(user_id: Any) -> Dict[str, Any]:
    """Retrieve Zerodha Kite broker configuration for a user."""
    uid = str(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at FROM broker_settings WHERE user_id = %s",
        (uid,),
    )
    row = cursor.fetchone()
    if not row:
        cursor.execute(
            "INSERT INTO broker_settings (user_id, broker_mode, default_product) VALUES (%s, 'SIMULATED', 'CNC')",
            (uid,),
        )
        conn.commit()
        cursor.execute(
            "SELECT user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at FROM broker_settings WHERE user_id = %s",
            (uid,),
        )
        row = cursor.fetchone()

    settings = dict(row) if row else {
        "user_id": uid,
        "broker_mode": "SIMULATED",
        "kite_api_key": "",
        "kite_api_secret": "",
        "kite_access_token": "",
        "default_product": "CNC",
    }
    conn.close()
    return settings


def update_user_broker_settings(
    user_id: Any,
    broker_mode: str = "SIMULATED",
    kite_api_key: str = "",
    kite_api_secret: str = "",
    kite_access_token: str = "",
    default_product: str = "CNC",
) -> Dict[str, Any]:
    """Update or insert user broker configuration."""
    uid = str(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()

    is_pg = bool(os.environ.get("DATABASE_URL", "").startswith("postgres"))
    if is_pg:
        cursor.execute(
            """
            INSERT INTO broker_settings (user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT(user_id) DO UPDATE SET
                broker_mode = EXCLUDED.broker_mode,
                kite_api_key = EXCLUDED.kite_api_key,
                kite_api_secret = EXCLUDED.kite_api_secret,
                kite_access_token = EXCLUDED.kite_access_token,
                default_product = EXCLUDED.default_product,
                updated_at = NOW()
            """,
            (uid, broker_mode, kite_api_key.strip(), kite_api_secret.strip(), kite_access_token.strip(), default_product),
        )
    else:
        cursor.execute(
            """
            INSERT INTO broker_settings (user_id, broker_mode, kite_api_key, kite_api_secret, kite_access_token, default_product, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                broker_mode = excluded.broker_mode,
                kite_api_key = excluded.kite_api_key,
                kite_api_secret = excluded.kite_api_secret,
                kite_access_token = excluded.kite_access_token,
                default_product = excluded.default_product,
                updated_at = CURRENT_TIMESTAMP
            """,
            (uid, broker_mode, kite_api_key.strip(), kite_api_secret.strip(), kite_access_token.strip(), default_product),
        )
    conn.commit()
    conn.close()
    return get_user_broker_settings(uid)
