-- ==============================================================================
-- 0002_add_username_auth.sql - Shared Ledger User Identity Unification
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Add nullable username and password_hash columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Add unique index on lowercase username (only where username IS NOT NULL)
-- This allows phone/email-only users to have NULL username without unique collisions
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_not_null 
ON users(LOWER(username)) 
WHERE username IS NOT NULL;

-- 3. Auxiliary behavioral and tax columns for shared portfolios ledger
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS total_charges_paid DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS total_stcg_tax DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS loss_streak INT DEFAULT 0;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS is_locked_for_reflection BOOLEAN DEFAULT FALSE;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS cooldown_until DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS lock_reason TEXT DEFAULT '';

-- 4. Shared auxiliary tables for AI explanations, Zerodha broker settings, and loss reflections
CREATE TABLE IF NOT EXISTS signal_cache (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    date_str TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    explanation_json TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, date_str)
);

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

CREATE TABLE IF NOT EXISTS reflections (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_id TEXT,
    thesis TEXT NOT NULL,
    reason_for_loss TEXT NOT NULL,
    lesson_learned TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
