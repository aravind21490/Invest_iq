-- ==============================================================================
-- 0003_agent_runs.sql - Invest IQ Agentic AI Layer Ledger & Flags
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Agent Runs Table (Audit log and cached agent execution results)
CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_id TEXT,
    output JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name ON agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_trade_id ON agent_runs(trade_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at DESC);

-- 2. Agent Flags Table (Behavioral flags from Watchdog, Curator suggestions, etc.)
CREATE TABLE IF NOT EXISTS agent_flags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT,
    agent_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_flags_user_id ON agent_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_flags_agent_name ON agent_flags(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_flags_created_at ON agent_flags(created_at DESC);

-- 3. User Watchlists Table (Persistent cross-platform watchlists)
CREATE TABLE IF NOT EXISTS user_watchlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_watchlists UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);

-- 4. Row-Level Security (Service role access only)
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN ('agent_runs', 'agent_flags', 'user_watchlists')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Deny public access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Deny public access" ON %I FOR ALL TO anon, authenticated USING (false);', tbl);
    END LOOP;
END $$;
