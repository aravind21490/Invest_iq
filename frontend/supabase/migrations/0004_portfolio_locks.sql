-- ==============================================================================
-- 0004_portfolio_locks.sql - Behavioral Guardrail Locks & RPC Enforcement
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Alter portfolios table to support behavioral guardrail locks
ALTER TABLE portfolios 
  ADD COLUMN IF NOT EXISTS is_locked_for_reflection BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cooldown_until DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS loss_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT NOT NULL DEFAULT '';

-- 2. Update execute_paper_trade stored procedure to atomically enforce locks
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
    v_now_epoch DOUBLE PRECISION := EXTRACT(EPOCH FROM NOW());
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
        -- Atomic Behavioral Guardrail Enforcement (Applies to BUY orders only: prevents revenge re-entry)
        IF v_portfolio.is_locked_for_reflection THEN
            RETURN jsonb_build_object(
                'success', false,
                'blocked', true,
                'message', COALESCE(NULLIF(v_portfolio.lock_reason, ''), 'Trading is locked for mandatory post-loss reflection.')
            );
        END IF;

        IF v_portfolio.cooldown_until IS NOT NULL AND v_portfolio.cooldown_until > v_now_epoch THEN
            RETURN jsonb_build_object(
                'success', false,
                'blocked', true,
                'message', format('Trading locked in behavioral cooldown (%ss remaining). Take a breather to prevent revenge trading.', 
                                  floor(v_portfolio.cooldown_until - v_now_epoch)::int)
            );
        END IF;

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
            'message', format('Paper trade executed: SELL %s shares of %s @ ₹%s (P&L: ₹%s).', 
                              p_shares, p_symbol, to_char(p_price, 'FM999,990.00'), to_char(v_realized_pnl, 'FM999,990.00')),
            'trade', v_trade_record
        );
    END IF;
END;
$$;
