-- ==============================================================================
-- 0001_init.sql - Invest IQ Production Schema, Security & Seed Migration
-- Target: Supabase PostgreSQL (Serverless Vercel Architecture)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    auth_provider TEXT NOT NULL CHECK (auth_provider IN ('phone', 'google', 'email')),
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- OTP Verifications Table (Durable Serverless OTP Store)
CREATE TABLE IF NOT EXISTS otps (
    identifier TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    last_sent_at BIGINT NOT NULL,
    attempts INT NOT NULL DEFAULT 0
);

-- Portfolios Table
CREATE TABLE IF NOT EXISTS portfolios (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cash_balance DOUBLE PRECISION NOT NULL DEFAULT 100000.0,
    initial_balance DOUBLE PRECISION NOT NULL DEFAULT 100000.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    shares INT NOT NULL CHECK (shares > 0),
    avg_buy_price DOUBLE PRECISION NOT NULL,
    sector TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_positions_user_symbol UNIQUE (user_id, symbol)
);

-- Trades Table
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
    status TEXT NOT NULL DEFAULT 'Filled' CHECK (status IN ('Filled', 'Pending', 'Cancelled')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learn Progress Table
CREATE TABLE IF NOT EXISTS learn_progress (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    streak_days INT NOT NULL DEFAULT 1,
    last_active_date TEXT NOT NULL
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 4. ROW LEVEL SECURITY (DEFENSE-IN-DEPTH)
-- All operations are performed server-side via Supabase Service Role (which bypasses RLS).
-- We enable RLS and set default-deny for anon/authenticated roles to ensure zero exposure
-- if public API keys are ever misconfigured.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn_progress ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('users', 'sessions', 'otps', 'portfolios', 'positions', 'trades', 'learn_progress')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Deny public access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Deny public access" ON %I FOR ALL TO anon, authenticated USING (false);', tbl);
    END LOOP;
END $$;

-- 5. ATOMIC STORED PROCEDURES (CONCURRENCY DEFECT RESOLUTION)

-- Stored Procedure: Atomic OTP Attempts Increment
CREATE OR REPLACE FUNCTION increment_otp_attempts(p_identifier TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempts INT;
BEGIN
    UPDATE otps
    SET attempts = attempts + 1
    WHERE identifier = p_identifier
    RETURNING attempts INTO v_attempts;

    RETURN COALESCE(v_attempts, 0);
END;
$$;

-- Stored Procedure: Atomic Paper Trade Execution with Row Locking (FOR UPDATE)
CREATE OR REPLACE FUNCTION execute_paper_trade(
    p_user_id TEXT,
    p_symbol TEXT,
    p_name TEXT,
    p_type TEXT,
    p_shares INT,
    p_price DOUBLE PRECISION,
    p_sector TEXT DEFAULT 'General'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_portfolio portfolios%ROWTYPE;
    v_position positions%ROWTYPE;
    v_total_cost DOUBLE PRECISION;
    v_new_shares INT;
    v_new_avg_price DOUBLE PRECISION;
    v_sell_cost_basis DOUBLE PRECISION;
    v_realized_pnl DOUBLE PRECISION;
    v_trade_id TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_trade_record JSONB;
BEGIN
    -- 1. Validate inputs
    IF p_shares <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Share quantity must be greater than zero.');
    END IF;

    IF p_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Price must be greater than zero.');
    END IF;

    IF p_type NOT IN ('BUY', 'SELL') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Trade type must be BUY or SELL.');
    END IF;

    -- 2. Lock and fetch portfolio row (Atomic Serialization)
    SELECT * INTO v_portfolio
    FROM portfolios
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Auto-initialize portfolio if missing
        INSERT INTO portfolios (user_id, cash_balance, initial_balance, updated_at)
        VALUES (p_user_id, 100000.0, 100000.0, v_now)
        RETURNING * INTO v_portfolio;
    END IF;

    v_total_cost := p_shares * p_price;
    v_trade_id := 'ORD-' || floor(10000 + random() * 90000)::text;

    -- 3. Execution Logic
    IF p_type = 'BUY' THEN
        -- Check sufficient cash balance
        IF v_portfolio.cash_balance < v_total_cost THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format('Insufficient paper cash. Required: ₹%s, Available: ₹%s.', 
                                  to_char(v_total_cost, 'FM999,999,990.00'), 
                                  to_char(v_portfolio.cash_balance, 'FM999,999,990.00'))
            );
        END IF;

        -- Deduct cash
        UPDATE portfolios
        SET cash_balance = cash_balance - v_total_cost,
            updated_at = v_now
        WHERE user_id = p_user_id;

        -- Lock position row if exists
        SELECT * INTO v_position
        FROM positions
        WHERE user_id = p_user_id AND symbol = p_symbol
        FOR UPDATE;

        IF FOUND THEN
            v_new_shares := v_position.shares + p_shares;
            v_new_avg_price := ((v_position.shares * v_position.avg_buy_price) + v_total_cost) / v_new_shares;

            UPDATE positions
            SET shares = v_new_shares,
                avg_buy_price = v_new_avg_price,
                updated_at = v_now
            WHERE user_id = p_user_id AND symbol = p_symbol;
        ELSE
            INSERT INTO positions (id, user_id, symbol, name, shares, avg_buy_price, sector, updated_at)
            VALUES ('pos_' || substr(md5(random()::text), 1, 8), p_user_id, p_symbol, p_name, p_shares, p_price, COALESCE(p_sector, 'General'), v_now);
        END IF;

        -- Record Trade
        INSERT INTO trades (id, user_id, symbol, name, type, shares, price, amount, pnl, status, timestamp)
        VALUES (v_trade_id, p_user_id, p_symbol, p_name, 'BUY', p_shares, p_price, v_total_cost, 0.0, 'Filled', v_now);

        v_trade_record := jsonb_build_object(
            'id', v_trade_id,
            'userId', p_user_id,
            'symbol', p_symbol,
            'name', p_name,
            'type', 'BUY',
            'shares', p_shares,
            'price', p_price,
            'amount', v_total_cost,
            'pnl', 0.0,
            'status', 'Filled',
            'timestamp', v_now
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', format('Paper trade executed: BUY %s shares of %s @ ₹%s.', p_shares, p_symbol, to_char(p_price, 'FM999,990.00')),
            'trade', v_trade_record
        );

    ELSE
        -- SELL ORDER
        SELECT * INTO v_position
        FROM positions
        WHERE user_id = p_user_id AND symbol = p_symbol
        FOR UPDATE;

        IF NOT FOUND OR v_position.shares < p_shares THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format('Cannot sell %s shares of %s. Currently holding %s shares.', p_shares, p_symbol, COALESCE(v_position.shares, 0))
            );
        END IF;

        v_sell_cost_basis := v_position.avg_buy_price;
        v_realized_pnl := round((p_shares * (p_price - v_sell_cost_basis))::numeric, 2);

        -- Add cash proceeds
        UPDATE portfolios
        SET cash_balance = cash_balance + v_total_cost,
            updated_at = v_now
        WHERE user_id = p_user_id;

        -- Deduct shares or remove position
        v_new_shares := v_position.shares - p_shares;
        IF v_new_shares <= 0 THEN
            DELETE FROM positions
            WHERE user_id = p_user_id AND symbol = p_symbol;
        ELSE
            UPDATE positions
            SET shares = v_new_shares,
                updated_at = v_now
            WHERE user_id = p_user_id AND symbol = p_symbol;
        END IF;

        -- Record Trade
        INSERT INTO trades (id, user_id, symbol, name, type, shares, price, amount, pnl, status, timestamp)
        VALUES (v_trade_id, p_user_id, p_symbol, p_name, 'SELL', p_shares, p_price, v_total_cost, v_realized_pnl, 'Filled', v_now);

        v_trade_record := jsonb_build_object(
            'id', v_trade_id,
            'userId', p_user_id,
            'symbol', p_symbol,
            'name', p_name,
            'type', 'SELL',
            'shares', p_shares,
            'price', p_price,
            'amount', v_total_cost,
            'pnl', v_realized_pnl,
            'status', 'Filled',
            'timestamp', v_now
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', format('Paper trade executed: SELL %s shares of %s @ ₹%s (P&L: ₹%s).', p_shares, p_symbol, to_char(p_price, 'FM999,990.00'), to_char(v_realized_pnl, 'FM999,990.00')),
            'trade', v_trade_record
        );
    END IF;
END;
$$;

-- 6. DEMO SEED DATA (SINGLE SOURCE OF TRUTH, IDEMPOTENT)
INSERT INTO users (id, phone, email, name, auth_provider, avatar, created_at)
VALUES (
    'usr_demo',
    '+15550192834',
    'demo@investiq.ai',
    'Alex Vance',
    'phone',
    '',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (user_id, cash_balance, initial_balance, updated_at)
VALUES (
    'usr_demo',
    325400.0,
    500000.0,
    NOW()
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO positions (id, user_id, symbol, name, shares, avg_buy_price, sector, updated_at)
VALUES 
    ('pos_demo_1', 'usr_demo', 'RELIANCE.NS', 'Reliance Industries Limited', 50, 1250.0, 'Energy & Conglomerate', NOW()),
    ('pos_demo_2', 'usr_demo', 'TCS.NS', 'Tata Consultancy Services', 30, 2160.0, 'Information Technology', NOW()),
    ('pos_demo_3', 'usr_demo', 'TMPV.NS', 'Tata Motors Pass. Vehicles', 50, 950.0, 'Automobile & EV', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trades (id, user_id, symbol, name, type, shares, price, amount, pnl, status, timestamp)
VALUES 
    ('ORD-94281', 'usr_demo', 'RELIANCE.NS', 'Reliance Industries Limited', 'BUY', 50, 1250.0, 62500.0, 0.0, 'Filled', NOW() - interval '4 hours'),
    ('ORD-87192', 'usr_demo', 'TCS.NS', 'Tata Consultancy Services', 'BUY', 30, 2160.0, 64800.0, 0.0, 'Filled', NOW() - interval '24 hours'),
    ('ORD-73194', 'usr_demo', 'TMPV.NS', 'Tata Motors Pass. Vehicles', 'BUY', 50, 950.0, 47500.0, 0.0, 'Filled', NOW() - interval '48 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO learn_progress (user_id, completed_topics, quiz_scores, streak_days, last_active_date)
VALUES (
    'usr_demo',
    '["t1-1", "t1-2", "t1-3"]'::jsonb,
    '{"t1-1": 100, "t1-2": 100, "t1-3": 100}'::jsonb,
    3,
    TO_CHAR(NOW(), 'YYYY-MM-DD')
)
ON CONFLICT (user_id) DO NOTHING;
