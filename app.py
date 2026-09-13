"""
app.py - Invest IQ Main Application Server

An AI-powered investment learning and market simulator for Indian equities.
Features:
- Educational technical indicators (RSI, MACD, Bollinger Bands, Volume Ratio)
- Grounded AI explanations with daily caching (Groq Llama 3.1 or deterministic)
- Realistic friction (Brokerage, STT, Exchange, SEBI, GST, STCG tax provision)
- Behavioral guardrails (Loss-streak cooldown, mandatory reflection gate)
- Browser-native speech synthesis narration (SpeechSynthesis API)
- Scaled 50+ NSE stock universe & market regime replay
"""

import os
import sys
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# Configure Windows console for UTF-8 to prevent charmap encoding crashes with Rupee symbol
if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    getattr(sys.stderr, "reconfigure")(encoding="utf-8")

import requests
from functools import wraps
from flask_cors import CORS
from flask import (
    Flask,
    Response,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    flash,
)

from data_provider import (
    default_data_provider,
    CORE_NSE_STOCKS,
    MARKET_REGIMES,
    sanitize_ticker,
    resolve_stock_info,
)
from indicators import calculate_all_indicators, get_indicator_snapshot
from scanner import MarketScanner, SIGNAL_METADATA
from explainer import explain_stock_signal, EDUCATIONAL_DISCLAIMER
from signal_stats import default_stats_engine
from models import (
    load_user_portfolio,
    sync_user_portfolio,
    reset_user_portfolio,
    get_cached_explanation,
    save_cached_explanation,
    get_user_broker_settings,
    update_user_broker_settings,
)
from broker_kite import get_broker_for_user, KiteBrokerException
from auth import (
    get_current_user,
    register_user,
    authenticate_user,
    login_session,
    logout_session,
    login_required,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("InvestIQ.App")

# Automatically load .env file if present
def _load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v
        except Exception as e:
            logger.debug("Could not parse .env file: %s", e)

_load_env_file()

app = Flask(__name__)
_secret = os.environ.get("SECRET_KEY")
if not _secret:
    if os.environ.get("FLASK_ENV") == "production":
        raise RuntimeError(
            "CRITICAL SECURITY ERROR: 'SECRET_KEY' environment variable must be set in production mode. "
            "Refusing to start without an explicit secret key."
        )
    logger.info("FLASK_ENV is not production; using development secret key.")
    _secret = "investiq-development-secret-key-do-not-use-in-production"
app.secret_key = _secret

# Configure CORS: Explicitly allowlist local dev and production frontend origins (No wildcard "*")
allowed_origins = ["http://127.0.0.1:3000", "http://localhost:3000"]
custom_origins = os.environ.get("CORS_ALLOWED_ORIGINS") or os.environ.get("FRONTEND_URL")
if custom_origins:
    for o in custom_origins.split(","):
        cleaned = o.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    supports_credentials=True,
)


def require_agent_secret(f):
    """
    Middleware decorator protecting server-to-server agent endpoints.
    Validates X-Agent-Service-Key header against AGENT_SERVICE_SECRET.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        expected_secret = os.environ.get("AGENT_SERVICE_SECRET", "").strip()
        client_key = request.headers.get("X-Agent-Service-Key", "").strip()
        if not expected_secret or client_key != expected_secret:
            return jsonify({
                "success": False,
                "error": "Unauthorized: Invalid or missing X-Agent-Service-Key header."
            }), 401
        return f(*args, **kwargs)
    return decorated


@app.route("/api/agents/health", methods=["GET", "POST"])
@require_agent_secret
def agent_health_route():
    """Health and connectivity check for Next.js -> Flask agent bridge."""
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "Invest IQ Agent Engine",
        "timestamp": datetime.now().isoformat(),
    }), 200


@app.route("/api/agents/debrief", methods=["POST"])
@require_agent_secret
def agent_debrief_route():
    """
    POST /api/agents/debrief
    Server-to-server endpoint for Post-Trade Debrief Agent.
    Body: { user_id, trade_id }
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    trade_id = data.get("trade_id")

    if not user_id or not trade_id:
        return jsonify({
            "success": False,
            "error": "Both 'user_id' and 'trade_id' are required.",
        }), 400

    from agents.debrief_agent import generate_debrief
    result = generate_debrief(user_id=str(user_id), trade_id=str(trade_id))
    status_code = 200 if result.get("success") else 404
    return jsonify(result), status_code


@app.route("/api/agents/watchdog-check", methods=["POST"])
@require_agent_secret
def agent_watchdog_check_route():
    """
    POST /api/agents/watchdog-check
    Synchronous pre-trade behavioral guardrail check.
    Body: { user_id, symbol, shares, type, price }
    """
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("userId")
    symbol = data.get("symbol")
    shares = data.get("shares")
    trade_type = data.get("type", "BUY")
    price = data.get("price")

    if not user_id or not symbol or not shares:
        return jsonify({
            "success": False,
            "error": "Fields 'user_id' (or 'userId'), 'symbol', and 'shares' are required.",
        }), 400

    try:
        shares_int = int(shares)
        price_float = float(price) if price is not None else None
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "Invalid shares or price format.",
        }), 400

    from agents.watchdog_agent import check_before_trade
    result = check_before_trade(
        user_id=str(user_id),
        proposed_symbol=str(symbol),
        proposed_size=shares_int,
        proposed_type=str(trade_type),
        proposed_price=price_float,
    )
    result["success"] = True
    return jsonify(result), 200


@app.route("/api/agents/curate", methods=["POST"])
@require_agent_secret
def agent_curate_route():
    """
    POST /api/agents/curate
    Executes Watchlist Curator workflow.
    Protected by shared secret (@require_agent_secret).
    Body: { user_id?: str, userId?: str, batch?: bool, force_refresh?: bool }
    """
    data = request.get_json() or {}
    batch = bool(data.get("batch", False))
    force_refresh = bool(data.get("force_refresh", False))
    user_id = data.get("user_id") or data.get("userId")

    from agents.curator_agent import run_daily_curation, run_batch_curation

    if batch:
        result = run_batch_curation()
        return jsonify(result), 200

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Field 'user_id' (or 'userId') is required when batch is false.",
        }), 400

    result = run_daily_curation(user_id=str(user_id), force_refresh=force_refresh)
    return jsonify(result), 200


@app.route("/api/agents/research", methods=["POST"])
@require_agent_secret
def agent_research_route():
    """
    POST /api/agents/research
    Executes interactive Research Agent inquiry.
    Protected by shared secret (@require_agent_secret).
    Body: { user_id?: str, userId?: str, question: str }
    """
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("userId")
    question = data.get("question")

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Field 'user_id' (or 'userId') is required.",
        }), 400

    if not question or not str(question).strip():
        return jsonify({
            "success": False,
            "error": "Field 'question' is required and cannot be empty.",
        }), 400

    from agents.research_agent import answer_question
    result = answer_question(user_id=str(user_id), question=str(question))
    return jsonify(result), 200


@app.route("/api/agents/next-lesson", methods=["POST"])
@require_agent_secret
def agent_next_lesson_route():
    """
    POST /api/agents/next-lesson
    Recommends user's next curriculum lesson based on Watchdog behavioral flags and trade signals.
    Protected by shared secret (@require_agent_secret).
    Body: { user_id?: str, userId?: str }
    """
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("userId")

    if not user_id:
        return jsonify({
            "success": False,
            "error": "Field 'user_id' (or 'userId') is required.",
        }), 400

    from agents.lesson_agent import recommend_next_lesson
    result = recommend_next_lesson(user_id=str(user_id))
    return jsonify(result), 200



@app.after_request
def enforce_utf8_charset(response):
    """Ensure all HTML responses explicitly declare UTF-8 charset for Rupee and em-dash symbols."""
    if response.mimetype == "text/html" and "charset" not in response.headers.get("Content-Type", ""):
        response.headers["Content-Type"] = "text/html; charset=utf-8"
    return response

# Global Scanner instance
scanner = MarketScanner(data_provider=default_data_provider)

# In-memory caches for instantaneous sub-second response times
_screener_cache: Dict[str, Any] = {}
_dashboard_cache: Dict[str, Any] = {"timestamp": 0, "regime": None, "data": []}

NEXTJS_ORIGIN = os.environ.get("NEXTJS_ORIGIN", "http://localhost:3000")


def proxy_to_nextjs(path=""):
    """
    Transparent reverse proxy forwarding requests to the Next.js React frontend.
    Allows the user to access the full Next.js UI directly at http://127.0.0.1:5000/.
    """
    url = f"{NEXTJS_ORIGIN}/{path}".rstrip("/") if path else NEXTJS_ORIGIN
    if path.startswith("?"):
        url = f"{NEXTJS_ORIGIN}/{path}"

    headers = {k: v for k, v in request.headers if k.lower() not in ["host", "content-length"]}
    headers["X-Forwarded-Host"] = request.host
    headers["X-Forwarded-For"] = request.remote_addr
    headers["X-Forwarded-Proto"] = request.scheme

    try:
        req_data = request.get_data()
        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=req_data if req_data else None,
            params=request.args,
            cookies=request.cookies,
            allow_redirects=False,
            stream=True,
            timeout=15,
        )

        excluded_headers = ["content-encoding", "content-length", "transfer-encoding", "connection"]
        response_headers = [
            (name, value) for (name, value) in resp.raw.headers.items()
            if name.lower() not in excluded_headers
        ]

        return Response(resp.iter_content(chunk_size=8192), resp.status_code, response_headers)
    except Exception as e:
        logger.warning("Next.js proxy connection to %s failed: %s", url, e)
        return None




@app.context_processor
def inject_global_context():
    """Injects user information and virtual portfolio summary into all templates."""
    user = get_current_user()
    portfolio_summary = None
    if user:
        try:
            portfolio = load_user_portfolio(user["id"])
            portfolio_summary = portfolio.get_summary()
        except Exception as e:
            logger.error("Error loading portfolio summary for user %s: %s", user["id"], e)

    return {
        "user": user,
        "portfolio_summary": portfolio_summary,
        "market_regimes": MARKET_REGIMES,
        "educational_disclaimer": EDUCATIONAL_DISCLAIMER,
        "now_year": datetime.now().year,
    }


# ==============================================================================
# Modern Next.js Frontend Gateway Routes (Serves Next.js on Port 5000)
# ==============================================================================
@app.route("/markets")
@app.route("/trade")
@app.route("/positions")
@app.route("/analytics")
@app.route("/accounts")
@app.route("/watchlist")
@app.route("/orders")
@app.route("/signin")
@app.route("/signup")
@app.route("/settings")
@app.route("/leaderboard")
@app.route("/_next/<path:subpath>")
@app.route("/api/market/<path:subpath>", methods=["GET", "POST"])
@app.route("/api/auth/<path:subpath>", methods=["GET", "POST"])
@app.route("/api/user/<path:subpath>", methods=["GET", "POST", "PUT", "DELETE"])
def nextjs_gateway_route(subpath=""):
    """
    Reverse proxies to Next.js on port 3000 so that http://127.0.0.1:5000/
    serves all modern React pages, live Indian NSE markets, and paper trading.
    """
    if not app.config.get("TESTING"):
        full_path = request.full_path.lstrip("/")
        if full_path.endswith("?"):
            full_path = full_path[:-1]
        if full_path.startswith("_next/hmr"):
            return Response(status=204)
        proxied = proxy_to_nextjs(full_path)
        if proxied:
            return proxied

    # Graceful fallback to working Flask routes when Next.js frontend is offline
    path = request.path
    if path == "/signin":
        return redirect(url_for("login_route"))
    if path == "/signup":
        return redirect(url_for("register_route"))
    if path == "/settings":
        return redirect(url_for("broker_settings_route"))
    if path == "/positions":
        return redirect(url_for("portfolio_route"))
    if path in ["/markets", "/trade", "/watchlist"]:
        return redirect(url_for("screener_route"))
    if path in ["/analytics", "/orders", "/leaderboard", "/accounts"]:
        return redirect(url_for("report_route"))

    return jsonify({"error": "Next.js frontend not responding on port 3000"}), 502


# ==============================================================================
# 1. Dashboard View
# ==============================================================================
@app.route("/")
@app.route("/classic")
def dashboard_route():
    """
    Main educational dashboard: market regimes, active technical signals,
    and portfolio quick status.
    """
    if not app.config.get("TESTING") and not request.args.get("classic") and request.path == "/":
        proxied = proxy_to_nextjs("")
        if proxied:
            return proxied

    regime = request.args.get("regime", "current")
    if regime not in MARKET_REGIMES:
        regime = "current"

    regime_info = MARKET_REGIMES[regime]
    user = get_current_user()

    # Serve cached dashboard if fresh (< 60s)
    now = time.time()
    if _dashboard_cache["regime"] == regime and (now - _dashboard_cache["timestamp"]) < 60 and _dashboard_cache["data"]:
        active_signals = _dashboard_cache["data"]
    else:
        dashboard_symbols = [
            "RELIANCE.NS", "TCS.NS", "TATAMOTORS.NS", "HDFCBANK.NS", "SUZLON.NS",
            "ZOMATO.NS", "DEEPAKNTR.NS", "IRFC.NS", "BEL.NS", "ITC.NS",
            "ADANIENT.NS", "KPITTECH.NS"
        ]

        active_signals = []
        for sym in dashboard_symbols:
            meta = CORE_NSE_STOCKS.get(sym, {"name": sym.replace(".NS", ""), "sector": "General", "cap": "Large"})
            analysis = scanner.analyze_stock(sym, regime=regime)
            if "error" in analysis:
                continue

            primary = analysis.get("primary_signal", {})
            sig_type = primary.get("signal_type", "NEUTRAL_CONSOLIDATION")
            explanation = explain_stock_signal(analysis)

            # Precedent stats
            stats_map = default_stats_engine.compute_signal_history_stats(sym, forward_days=10)
            stats = stats_map.get(sig_type)

            active_signals.append({
                "symbol": sym,
                "name": meta.get("name", sym),
                "sector": meta.get("sector", "General"),
                "cap": meta.get("cap", "Large"),
                "price": analysis.get("price", 0.0),
                "price_change_pct": analysis.get("price_change_pct", 0.0),
                "snapshot": analysis.get("snapshot", {}),
                "primary_signal": primary,
                "explanation": explanation,
                "stats": stats,
                "source": analysis.get("source", "live"),
                "data_source": analysis.get("data_source", "live"),
            })
        _dashboard_cache["regime"] = regime
        _dashboard_cache["timestamp"] = now
        _dashboard_cache["data"] = active_signals

    return render_template(
        "dashboard.html",
        active_page="dashboard",
        active_regime=regime,
        current_regime_info=regime_info,
        active_signals=active_signals,
    )


# ==============================================================================
# 2. Educational Screener View
# ==============================================================================
@app.route("/screener")
def screener_route():
    """
    Educational technical screener across full 2,200+ NSE stocks with search, sector filtering, and server-side pagination.
    """
    from nse_catalog import default_nse_catalog

    regime = request.args.get("regime", "current")
    if regime not in MARKET_REGIMES:
        regime = "current"

    signal_filter = request.args.get("signal_filter", "ALL").strip().upper()
    sector_filter = request.args.get("sector", "ALL").strip()
    search_q = request.args.get("q", "").strip()
    
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    per_page = 20

    custom_symbol = request.args.get("custom_symbol", "").strip()
    if custom_symbol:
        sym_clean = sanitize_ticker(custom_symbol)
        resolve_stock_info(sym_clean)
        return redirect(url_for("stock_detail_route", symbol=sym_clean, regime=regime))

    # Fast cache check (< 1ms response if fresh)
    now = time.time()
    cache_key = f"{regime}:{signal_filter}:{sector_filter}:{search_q}:{page}"
    if cache_key in _screener_cache:
        cached_entry = _screener_cache[cache_key]
        if (now - cached_entry["timestamp"]) < 60:
            return render_template(
                "screener.html",
                active_page="screener",
                active_regime=regime,
                current_filter=signal_filter,
                current_sector=sector_filter,
                search_query=search_q,
                results=cached_entry["results"],
                pagination=cached_entry["pagination"],
                available_sectors=default_nse_catalog.get_sectors(),
            )

    # Fast paginated query across all 2,200+ listed NSE stocks
    catalog_res = default_nse_catalog.search_stocks(
        query=search_q,
        sector=sector_filter if sector_filter != "ALL" else None,
        page=page,
        per_page=per_page,
    )

    page_stocks = catalog_res["stocks"]
    results = []

    for stock_meta in page_stocks:
        raw_sym = stock_meta["symbol"]
        sym = f"{raw_sym}.NS" if not raw_sym.endswith(".NS") else raw_sym
        
        # Analyze technical indicators
        analysis = scanner.analyze_stock(sym, regime=regime)
        if "error" in analysis:
            # Fallback for newly listed/low-history shares
            analysis = {
                "symbol": sym,
                "name": stock_meta["name"],
                "price": 0.0,
                "price_change_pct": 0.0,
                "snapshot": {
                    "rsi": {"value": 50.0, "prev": 50.0},
                    "macd": {"hist": 0.0, "line": 0.0, "signal": 0.0},
                    "bollinger": {"upper": 0.0, "lower": 0.0, "bandwidth": 5.0},
                    "volume": {"ratio": 1.0},
                },
                "primary_signal": {"signal_type": "NEUTRAL_CONSOLIDATION", "badge_color": "slate", "title": "Neutral Range"},
            }

        primary = analysis.get("primary_signal", {"signal_type": "NEUTRAL_CONSOLIDATION", "badge_color": "slate", "title": "Neutral Range"})
        sig_type = primary.get("signal_type", "NEUTRAL_CONSOLIDATION")

        # Apply signal filter if requested
        if signal_filter != "ALL" and sig_type != signal_filter:
            continue

        explanation = explain_stock_signal(analysis)
        # Reuse pre-fetched dataframe from memory cache if available to eliminate duplicate queries
        cached_df = default_data_provider._memory_cache.get((sym, regime))
        stats_map = default_stats_engine.compute_signal_history_stats(sym, df=cached_df, forward_days=10)
        stats = stats_map.get(sig_type)

        results.append({
            "symbol": sym,
            "name": stock_meta["name"],
            "sector": stock_meta["sector"],
            "cap": stock_meta["cap"],
            "price": analysis.get("price", 0.0),
            "price_change_pct": analysis.get("price_change_pct", 0.0),
            "snapshot": analysis.get("snapshot", {}),
            "primary_signal": primary,
            "explanation": explanation,
            "stats": stats,
            "source": analysis.get("source", "live"),
            "data_source": analysis.get("data_source", "live"),
        })

    # Cache screener output
    _screener_cache[cache_key] = {
        "timestamp": now,
        "results": results,
        "pagination": catalog_res,
    }

    return render_template(
        "screener.html",
        active_page="screener",
        active_regime=regime,
        current_filter=signal_filter,
        current_sector=sector_filter,
        search_query=search_q,
        results=results,
        pagination=catalog_res,
        available_sectors=default_nse_catalog.get_sectors(),
    )


# ==============================================================================
# 3. Stock Detail & Practice Trade View
# ==============================================================================
@app.route("/stock/<symbol>")
def stock_detail_route(symbol: str):
    """
    Deep-dive stock view with indicator breakdown, plain-English explanation,
    voice narration, and simulated order execution form.
    """
    sym = sanitize_ticker(symbol)
    regime = request.args.get("regime", "current")
    if regime not in MARKET_REGIMES:
        regime = "current"

    regime_info = MARKET_REGIMES[regime]
    meta = resolve_stock_info(sym)

    analysis = scanner.analyze_stock(sym, regime=regime)
    if "error" in analysis:
        flash(f"Could not load data for {sym}: {analysis['error']}", "error")
        return redirect(url_for("screener_route"))

    explanation = explain_stock_signal(analysis)
    primary = analysis.get("primary_signal", {})
    sig_type = primary.get("signal_type", "NEUTRAL_CONSOLIDATION")

    stats_map = default_stats_engine.compute_signal_history_stats(sym, forward_days=10)
    stats = stats_map.get(sig_type)

    user = get_current_user()
    current_position = None
    if user:
        try:
            user_portfolio = load_user_portfolio(user["id"])
            current_position = user_portfolio.get_position(sym)
        except Exception as e:
            logger.error("Error loading position for %s: %s", sym, e)

    df = default_data_provider.fetch_stock_history(sym, regime=regime)
    chart_bars = []
    if not df.empty:
        tail_df = df.tail(40)
        for row in tail_df.itertuples():
            idx_val = getattr(row, "Index", None)
            dt_str = idx_val.strftime("%d %b") if (idx_val is not None and hasattr(idx_val, "strftime")) else str(idx_val or "")[:10]
            chart_bars.append({
                "date": dt_str,
                "open": round(float(getattr(row, "Open", 0.0)), 2),
                "high": round(float(getattr(row, "High", 0.0)), 2),
                "low": round(float(getattr(row, "Low", 0.0)), 2),
                "close": round(float(getattr(row, "Close", 0.0)), 2),
                "volume": int(float(getattr(row, "Volume", 0) or 0)),
            })

    return render_template(
        "stock_detail.html",
        active_page="screener",
        active_regime=regime,
        current_regime_info=regime_info,
        stock_info={"symbol": sym, "name": meta.get("name"), "sector": meta.get("sector"), "cap": meta.get("cap"), "source": analysis.get("source", "live")},
        analysis=analysis,
        explanation=explanation,
        stats=stats,
        current_position=current_position,
        chart_bars=chart_bars,
    )


# ==============================================================================
# Stock Market Academy View
# ==============================================================================
@app.route("/learn")
@app.route("/learn/<path:subpath>")
def learn_route(subpath=""):
    """
    Market Academy: Teaches what the stock market is, how to buy/sell,
    how to read candlesticks and charts, and why technical indicators are used.
    """
    if not app.config.get("TESTING") and not request.args.get("classic"):
        target = f"learn/{subpath}" if subpath else "learn"
        proxied = proxy_to_nextjs(target)
        if proxied and proxied.status_code == 200:
            return proxied
    return render_template("learn.html", active_page="learn")


# ==============================================================================
# 4. Virtual Portfolio View
# ==============================================================================
@app.route("/portfolio")
def portfolio_route():
    """
    Displays current virtual positions, unrealized/realized P&L,
    realistic transaction friction breakdown, and behavioral reflection gates.
    """
    if not app.config.get("TESTING") and not request.args.get("classic"):
        proxied = proxy_to_nextjs("portfolio")
        if proxied:
            return proxied
    user = get_current_user()
    if not user:
        return redirect(url_for("login_route"))
    portfolio = load_user_portfolio(user["id"])

    # Fetch live/cached prices for held positions
    current_prices = {}
    for sym_held in portfolio.positions.keys():
        quote = default_data_provider.get_latest_quote(sym_held)
        if quote and quote.get("price", 0.0) > 0:
            current_prices[sym_held] = quote["price"]

    summary = portfolio.get_summary(current_prices=current_prices)

    return render_template(
        "portfolio.html",
        active_page="portfolio",
        summary=summary,
        trades=portfolio.trade_history,
    )


# ==============================================================================
# 5. Performance & Risk Report View
# ==============================================================================
@app.route("/report")
def report_route():
    """
    Daily virtual performance report showing max drawdown, win/loss stats,
    fee friction audit, and the behavioral reflection journal.
    """
    user = get_current_user()
    if not user:
        return redirect(url_for("login_route"))
    portfolio = load_user_portfolio(user["id"])

    # Fetch live/cached prices for held positions to match portfolio valuation
    current_prices = {}
    for sym_held in portfolio.positions.keys():
        quote = default_data_provider.get_latest_quote(sym_held)
        if quote and quote.get("price", 0.0) > 0:
            current_prices[sym_held] = quote["price"]

    summary = portfolio.get_summary(current_prices=current_prices)

    # Calculate report statistics
    closed_trades = [t for t in portfolio.trade_history if t["type"] == "SELL"]
    wins = [t for t in closed_trades if t.get("net_pnl", 0.0) > 0]
    losses = [t for t in closed_trades if t.get("net_pnl", 0.0) <= 0]
    win_rate = (len(wins) / len(closed_trades) * 100.0) if closed_trades else 0.0

    # Calculate estimated max drawdown from equity progression
    running_balance = portfolio.initial_cash
    peak = running_balance
    max_dd = 0.0
    for t in portfolio.trade_history:
        if t["type"] == "SELL":
            running_balance += t.get("net_pnl", 0.0)
            if running_balance > peak:
                peak = running_balance
            dd = ((peak - running_balance) / peak) * 100.0 if peak > 0 else 0.0
            if dd > max_dd:
                max_dd = dd

    total_brokerage = sum(t.get("charges", {}).get("brokerage", 0.0) for t in portfolio.trade_history)
    total_stt = sum(t.get("charges", {}).get("stt", 0.0) for t in portfolio.trade_history)
    total_other = portfolio.total_charges_paid - (total_brokerage + total_stt)
    gross_pnl = sum(t.get("gross_pnl", 0.0) for t in closed_trades)

    report_stats = {
        "closed_trades": len(closed_trades),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": win_rate,
        "max_drawdown": max_dd,
        "gross_pnl": gross_pnl,
        "total_brokerage": total_brokerage,
        "total_stt": total_stt,
        "total_other_charges": max(0.0, total_other),
    }

    return render_template(
        "report.html",
        active_page="report",
        summary=summary,
        report_stats=report_stats,
        reflections=portfolio.reflections,
    )


# ==============================================================================
# 6. JSON API Endpoints for Trade Execution & Behavioral Guardrails
# ==============================================================================
@app.route("/api/trade", methods=["POST"])
def api_trade_route():
    """
    Executes simulated Buy or Sell order with full Indian fees and tax deductions.
    Enforces loss-streak cooldown and reflection locks.
    """
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json() or {}
    symbol = sanitize_ticker(data.get("symbol", ""))
    action = data.get("action", "BUY").upper()
    try:
        quantity = int(data.get("quantity", 0))
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid quantity specified."}), 400

    try:
        price = float(data.get("price", 0.0) or 0.0)
    except (ValueError, TypeError):
        price = 0.0

    if price <= 0.0 and symbol:
        quote = default_data_provider.get_latest_quote(symbol)
        if quote and quote.get("price", 0.0) > 0:
            price = float(quote["price"])
        else:
            return jsonify({"success": False, "error": f"Unable to retrieve live market quote for {symbol}."}), 400

    portfolio = load_user_portfolio(user["id"])

    if action == "BUY":
        result = portfolio.buy(symbol=symbol, quantity=quantity, price=price)
    elif action == "SELL":
        result = portfolio.sell(symbol=symbol, quantity=quantity, price=price)
    else:
        return jsonify({"success": False, "error": f"Unsupported action: {action}"}), 400

    # Persist changes to database
    if result.get("success"):
        sync_user_portfolio(user["id"], portfolio)

    return jsonify(result)


@app.route("/api/reflect", methods=["POST"])
def api_reflect_route():
    """
    Submits mandatory behavioral reflection after a losing trade, unlocking trading
    once any active cooldown timer has elapsed.
    """
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json() or {}
    thesis = data.get("thesis", "").strip()
    reason = data.get("reason_for_loss", "").strip()
    lesson = data.get("lesson_learned", "").strip()

    if not thesis or not reason or not lesson:
        return jsonify({"success": False, "error": "Please complete all three reflection prompts."}), 400

    portfolio = load_user_portfolio(user["id"])
    trade_id = len(portfolio.trade_history)

    result = portfolio.submit_reflection(
        trade_id=trade_id,
        thesis=thesis,
        reason_for_loss=reason,
        lesson_learned=lesson,
    )

    sync_user_portfolio(user["id"], portfolio)
    return jsonify(result)


@app.route("/api/portfolio/reset", methods=["POST"])
def api_portfolio_reset_route():
    """
    Resets the current user's virtual simulator portfolio:
    Restores starting cash (₹1,00,000), clears open positions, trades, reflections,
    and removes any behavioral cooldown or lock.
    """
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    new_portfolio = reset_user_portfolio(user["id"])
    return jsonify({
        "success": True,
        "message": "Virtual portfolio reset successfully! ₹1,00,000 cash restored.",
        "cash_balance": new_portfolio.cash_balance,
    })



# ==============================================================================
# Zerodha Kite Paper Trading & Live Broker Routes
# ==============================================================================
@app.route("/settings/broker", methods=["GET", "POST"])
def broker_settings_route():
    """
    Settings interface for the optional Zerodha Kite Connect broker bridge.
    Allows toggling between Simulated Sandbox (Free ₹0) and Live Kite Personal API.
    """
    user = get_current_user()
    if not user:
        return redirect(url_for("login_route"))

    if request.method == "POST":
        mode = request.form.get("broker_mode", "SIMULATED").strip()
        product = request.form.get("default_product", "CNC").strip()
        api_key = request.form.get("kite_api_key", "").strip()
        api_secret = request.form.get("kite_api_secret", "").strip()
        access_token = request.form.get("kite_access_token", "").strip()

        update_user_broker_settings(
            user_id=user["id"],
            broker_mode=mode,
            kite_api_key=api_key,
            kite_api_secret=api_secret,
            kite_access_token=access_token,
            default_product=product,
        )
        flash("Zerodha Kite Connect settings updated successfully.", "success")
        return redirect(url_for("broker_settings_route"))

    settings = get_user_broker_settings(user["id"])
    return render_template(
        "broker_settings.html",
        active_page="settings",
        settings=settings,
    )


@app.route("/api/broker/preview", methods=["POST"])
def api_broker_preview_route():
    """
    Returns order margin requirement and statutory fee breakdown for the Kite modal.
    """
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json() or {}
    raw_sym = data.get("tradingsymbol") or data.get("symbol", "")
    symbol = sanitize_ticker(raw_sym)
    action = (data.get("transaction_type") or data.get("action", "BUY")).upper()
    product = (data.get("product", "CNC")).upper()
    try:
        qty = int(data.get("quantity", 1))
        px = float(data.get("price", 0.0) or 0.0)
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Invalid quantity or price specified."}), 400

    if px <= 0.0 and symbol:
        quote = default_data_provider.get_latest_quote(symbol)
        if quote and quote.get("price", 0.0) > 0:
            px = float(quote["price"])

    broker = get_broker_for_user(user["id"])
    try:
        impact = broker.estimate_order_impact(
            symbol=symbol,
            transaction_type=action,
            quantity=qty,
            price=px,
            product=product,
        )
        return jsonify({"success": True, "preview": impact})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/broker/order", methods=["POST"])
def api_broker_order_route():
    """
    Submits order to Zerodha Kite Connect bridge with mandatory human confirmation.
    """
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json() or {}
    # Support aliases
    if "tradingsymbol" not in data and "symbol" in data:
        data["tradingsymbol"] = data["symbol"]
    if "transaction_type" not in data and "action" in data:
        data["transaction_type"] = data["action"]
    if not data.get("price") or float(data.get("price", 0.0)) <= 0:
        sym = sanitize_ticker(data.get("tradingsymbol", ""))
        if sym:
            quote = default_data_provider.get_latest_quote(sym)
            if quote and quote.get("price", 0.0) > 0:
                data["price"] = float(quote["price"])

    broker = get_broker_for_user(user["id"])
    try:
        result = broker.place_order(data, execute_in_portfolio=True)
        return jsonify(result)
    except KiteBrokerException as e:
        return jsonify({"status": "error", "error": str(e)}), 400
    except Exception as e:
        logger.error("Unexpected error placing broker order: %s", e)
        return jsonify({"status": "error", "error": str(e)}), 500


# ==============================================================================
# 7. Authentication Routes
# ==============================================================================
@app.route("/login", methods=["GET", "POST"])
def login_route():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = authenticate_user(username, password)
        if user:
            login_session(user)
            flash(f"Welcome back, {user['username']}! Virtual simulator active.", "info")
            next_url = request.args.get("next") or url_for("dashboard_route")
            return redirect(next_url)
        else:
            flash("Invalid username or password.", "error")

    return render_template("auth.html", mode="login")


@app.route("/register", methods=["GET", "POST"])
def register_route():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip() or None
        password = request.form.get("password", "")
        try:
            user = register_user(username, password, email)
            login_session(user)
            flash(f"Account created! ₹1,00,000 virtual cash has been credited to your simulator.", "success")
            return redirect(url_for("dashboard_route"))
        except ValueError as e:
            flash(str(e), "error")

    return render_template("auth.html", mode="register")


@app.route("/logout")
def logout_route():
    logout_session()
    flash("You have signed out of Invest IQ.", "info")
    return redirect(url_for("login_route"))


if __name__ == "__main__":
    import threading
    import webbrowser
    import subprocess
    import socket
    import flask.cli

    # Suppress Werkzeug's default port 5000 banner so terminal stays clean
    flask.cli.show_server_banner = lambda *args, **kwargs: None

    port = int(os.environ.get("PORT", 5000))
    frontend_url = "http://localhost:3000"

    def is_port_in_use(p):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                return s.connect_ex(("127.0.0.1", p)) == 0
        except Exception:
            return False

    def ensure_nextjs_frontend():
        if is_port_in_use(3000):
            return
        frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
        if os.path.exists(frontend_dir):
            try:
                npm_cmd = "npm.cmd" if sys.platform.startswith("win") else "npm"
                nextjs_env = os.environ.copy()
                nextjs_env["PORT"] = "3000"
                subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir, env=nextjs_env, shell=True)
            except Exception as e:
                logger.warning("Could not auto-start Next.js frontend: %s", e)

    def open_browser_when_ready(target_url):
        # Poll up to 10 seconds for Next.js on port 3000 before opening browser
        for _ in range(20):
            if is_port_in_use(3000):
                break
            time.sleep(0.5)
        webbrowser.open(target_url)

    # Automatically ensure frontend & launch browser once the server starts
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        threading.Thread(target=ensure_nextjs_frontend, daemon=True).start()
        threading.Thread(target=open_browser_when_ready, args=(frontend_url,), daemon=True).start()

    print(f"\n" + "=" * 65)
    print(f"🚀 INVEST IQ UNIFIED PLATFORM IS LIVE!")
    print(f"👉 Opening your web browser automatically at: {frontend_url}")
    print(f"   (Unified Next.js Fintech Hub + 2,298+ NSE Live Equities in ₹)")
    print(f"   Press CTRL+C to quit anytime.")
    print(f"=" * 65 + "\n")

    app.run(host="0.0.0.0", port=port, debug=True)

