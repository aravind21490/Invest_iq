"""
explainer.py - Invest IQ Plain-English Educational Explanation Engine

Generates plain-English market explanations grounded strictly in computed numbers.
Features:
- Rigorous educational framing: never issues directives to 'buy' or 'sell'.
- Includes realistic market caveats (e.g. oversold continuation risk).
- Mandatory legal disclaimer on EVERY output.
- Groq Llama 3.1 LLM support when GROQ_API_KEY is configured.
- High-fidelity deterministic mathematical explanation engine when operating offline (₹0 cost).
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("InvestIQ.Explainer")

# Mandatory Safe Harbor & Educational Disclaimer
EDUCATIONAL_DISCLAIMER = (
    "SIMULATION ONLY — Educational Context, Not Investment Advice. "
    "All technical indicators and historical win rates represent past probabilistic patterns "
    "and are strictly for educational practice. Invest IQ is not a SEBI-registered investment advisor, "
    "and this is not an invitation to execute real financial trades."
)


def generate_deterministic_explanation(stock_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an in-depth, number-grounded plain-English explanation without external LLM calls.
    Uses the exact computed numbers from technical indicators.
    """
    sym = stock_analysis.get("symbol", "N/A")
    name = stock_analysis.get("name", sym)
    price = stock_analysis.get("price", 0.0)
    sector = stock_analysis.get("sector", "General")
    signals = stock_analysis.get("signals", [])
    snapshot = stock_analysis.get("snapshot", {})

    primary = (
        (signals[0] if (signals and isinstance(signals[0], dict)) else None)
        or stock_analysis.get("primary_signal")
        or {"signal_type": "NEUTRAL_CONSOLIDATION", "key_stats": {}}
    )
    sig_type = primary.get("signal_type", "NEUTRAL_CONSOLIDATION") if isinstance(primary, dict) else "NEUTRAL_CONSOLIDATION"
    raw_stats = primary.get("key_stats", {}) if isinstance(primary, dict) else {}
    stats: Dict[str, Any] = raw_stats if isinstance(raw_stats, dict) else {}

    rsi = snapshot.get("rsi", {}).get("value", 50.0)
    prev_rsi = snapshot.get("rsi", {}).get("prev", 50.0)
    macd_hist = snapshot.get("macd", {}).get("hist", 0.0)
    macd_line = snapshot.get("macd", {}).get("line", 0.0)
    macd_sig = snapshot.get("macd", {}).get("signal", 0.0)
    bb_upper = snapshot.get("bollinger", {}).get("upper", price)
    bb_lower = snapshot.get("bollinger", {}).get("lower", price)
    vol_ratio = snapshot.get("volume", {}).get("ratio", 1.0)

    title = ""
    summary = ""
    deep_dive = ""
    risk_lesson = ""

    if sig_type == "OVERSOLD_BOUNCE":
        title = f"Oversold Condition on {name} (RSI at {rsi})"
        summary = (
            f"{name} ({sym}) is currently trading at ₹{price:,.2f} in the {sector} sector. "
            f"Its 14-day Relative Strength Index (RSI) has dropped to {rsi}, below the standard 30-point benchmark, "
            f"while the price is hovering near the lower Bollinger Band (₹{bb_lower:,.2f})."
        )
        deep_dive = (
            f"The RSI measures the speed and magnitude of recent price changes. An RSI reading of {rsi} "
            f"(compared to {prev_rsi} yesterday) indicates that sellers have aggressively dominated the last 14 sessions. "
            f"The current volume is {vol_ratio}x the 20-day average. When price approaches the 2-standard-deviation "
            f"lower Bollinger Band (₹{bb_lower:,.2f}), mean-reversion traders watch for sellers becoming exhausted."
        )
        risk_lesson = (
            "Crucial Lesson: 'Oversold' does NOT mean an immediate bounce is guaranteed. In severe bear trends or "
            "negative company news, RSI can remain submerged below 30 for weeks while the price continues to drop. "
            "Disciplined investors wait for confirmed volume absorption and never risk capital without a predefined stop-loss."
        )

    elif sig_type == "OVERBOUGHT_EXHAUSTION":
        title = f"Overbought Momentum on {name} (RSI at {rsi})"
        summary = (
            f"{name} ({sym}) is trading at ₹{price:,.2f}. The 14-day RSI has extended to {rsi}, "
            f"crossing well into the overbought territory above 70, with price pressing the upper Bollinger Band (₹{bb_upper:,.2f})."
        )
        deep_dive = (
            f"RSI at {rsi} demonstrates strong buyer dominance, but momentum is statistically stretched "
            f"(Upper Bollinger Band sits at ₹{bb_upper:,.2f}). Volume is tracking at {vol_ratio}x its 20-day average. "
            f"When price hugs the +2 standard deviation envelope, the risk of short-term profit-taking increases."
        )
        risk_lesson = (
            "Crucial Lesson: Overbought does NOT mean you should immediately sell or short. In strong institutional "
            "bull rallies, high momentum can push RSI above 70 and keep it elevated as new buyers chase prices. "
            "The lesson is not to fight the trend, but to be vigilant against sudden pullbacks."
        )

    elif sig_type == "BULLISH_MACD_CROSSOVER":
        title = f"Bullish MACD Momentum Crossover on {name}"
        summary = (
            f"{name} has logged a bullish MACD crossover at ₹{price:,.2f}. The fast 12-day EMA "
            f"(MACD line at {macd_line}) has crossed above the 9-day signal line ({macd_sig}), "
            f"turning the MACD histogram positive to +{macd_hist}."
        )
        deep_dive = (
            f"The MACD evaluates the relationship between two moving averages. The recent positive crossover indicates "
            f"that short-term buying velocity has outpaced intermediate-term velocity. Today's volume ratio stands at "
            f"{vol_ratio}x average, which signals whether the momentum shift is accompanied by real market participation."
        )
        risk_lesson = (
            "Crucial Lesson: In sideways or rangebound markets, MACD generates frequent 'whipsaws' (false crossovers). "
            "Always inspect the higher timeframes and volume before interpreting an isolated crossover as a trend initiation."
        )

    elif sig_type == "BEARISH_MACD_CROSSOVER":
        title = f"Bearish MACD Momentum Crossover on {name}"
        summary = (
            f"{name} has experienced a bearish MACD crossover at ₹{price:,.2f}. The MACD line ({macd_line}) "
            f"has slipped below its signal line ({macd_sig}), with the histogram dropping to {macd_hist}."
        )
        deep_dive = (
            f"This shift indicates weakening buying momentum. Sellers have begun driving the recent exponential average "
            f"lower than the signal baseline. Current trading volume is at {vol_ratio}x the 20-day benchmark."
        )
        risk_lesson = (
            "Crucial Lesson: Momentum shifts can be temporary pullbacks or the beginning of a sustained trend reversal. "
            "Practicing with a simulator helps you evaluate how different exit strategies protect unrealized profits."
        )

    elif sig_type == "VOLATILITY_SQUEEZE":
        bandwidth = stats.get("bandwidth", 5.0)
        title = f"Volatility Squeeze Compression on {name} (Bandwidth: {bandwidth}%)"
        summary = (
            f"{name} ({sym}) is trading at ₹{price:,.2f} inside an unusually narrow price corridor. "
            f"Bollinger Bandwidth has compressed down to {bandwidth}%, indicating a volatility contraction."
        )
        deep_dive = (
            f"Markets alternate between periods of low volatility (consolidation) and high volatility (expansion). "
            f"The current Bollinger Band width ({bandwidth}%) indicates that price action is tightly wound between "
            f"support at ₹{bb_lower:,.2f} and resistance at ₹{bb_upper:,.2f}."
        )
        risk_lesson = (
            "Crucial Lesson: A volatility squeeze does not reveal direction in advance; it only signals that a significant "
            "expansion is imminent. Novice traders often get chopped up trying to anticipate the direction before the breakout confirms."
        )

    elif sig_type == "VOLUME_BREAKOUT":
        change_pct = stats.get("price_change_pct", 0.0)
        title = f"High Volume Expansion on {name} ({vol_ratio}x Normal Volume)"
        summary = (
            f"{name} experienced a decisive price move of {change_pct:+.2f}% to ₹{price:,.2f} on "
            f"unusual volume: {vol_ratio}x its 20-day average."
        )
        deep_dive = (
            f"Institutional market participants leave footprints through volume. A volume ratio of {vol_ratio}x "
            f"accompanying a {change_pct:+.2f}% move indicates aggressive participation rather than low-liquidity drift. "
            f"RSI currently stands at {rsi}."
        )
        risk_lesson = (
            "Crucial Lesson: Chasing high-volume green candles after they have already moved can lead to severe 'buying at the top'. "
            "Professional traders often wait for a lower-volume retest of support rather than buying into initial frenzy."
        )

    else:  # NEUTRAL_CONSOLIDATION
        title = f"Market Equilibrium & Steady Range for {name}"
        summary = (
            f"{name} ({sym}) is trading at ₹{price:,.2f}. Technical indicators reflect steady equilibrium: "
            f"RSI is at a balanced {rsi}, MACD histogram is {macd_hist:+.2f}, and volume is {vol_ratio}x average."
        )
        deep_dive = (
            f"The price is oscillating well between its lower band (₹{bb_lower:,.2f}) and upper band (₹{bb_upper:,.2f}). "
            f"Neither buyers nor sellers are demonstrating overwhelming dominance at current valuations."
        )
        risk_lesson = (
            "Crucial Lesson: Cash is an active position. In trading, learning when NOT to enter is as vital as picking setups. "
            "Over-trading in neutral markets generates friction costs in brokerage and taxes without clear probabilistic edge."
        )

    return {
        "symbol": sym,
        "title": title,
        "summary": summary,
        "deep_dive": deep_dive,
        "risk_lesson": risk_lesson,
        "disclaimer": EDUCATIONAL_DISCLAIMER,
        "provider": "Invest IQ Mathematical Engine",
        "grounded_numbers": {
            "price": price,
            "rsi": rsi,
            "macd_hist": macd_hist,
            "bb_lower": bb_lower,
            "bb_upper": bb_upper,
            "volume_ratio": vol_ratio,
        },
    }


def explain_stock_signal(stock_analysis: Dict[str, Any], date_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Generates plain-English explanation grounded in real computed numbers.
    Phase 10: Checks database cache (per stock per day) first.
    If not cached: queries Groq Llama 3.1 (if configured) or falls back to
    deterministic mathematical explanation engine, then caches result in DB.
    """
    from datetime import datetime
    today_key = date_str or datetime.now().strftime("%Y-%m-%d")
    symbol = stock_analysis.get("symbol", "").upper()

    # 1. Check daily cache
    try:
        from models import get_cached_explanation, save_cached_explanation
        cached_result = get_cached_explanation(symbol, today_key)
        if cached_result:
            cached_result["is_cached"] = True
            cached_result["disclaimer"] = EDUCATIONAL_DISCLAIMER
            return cached_result
    except Exception as e:
        logger.debug("Cache lookup failed (%s). Proceeding to generation.", e)

    explanation = None
    groq_key = os.environ.get("GROQ_API_KEY")

    # 2. Try Groq LLM if API key is provided
    if groq_key:
        try:
            from groq import Groq

            client = Groq(api_key=groq_key)
            prompt = f"""You are an expert fintech educator teaching Indian stock market mechanics.
Explain the technical setup for this stock to a student practicing on a virtual simulator.
NEVER give investment advice. NEVER say 'Buy' or 'Sell'. Use educational, probabilistic language.
Ground your explanation in these exact numbers:
Stock: {stock_analysis.get('name')} ({stock_analysis.get('symbol')})
Price: INR {stock_analysis.get('price')}
Signal Type: {stock_analysis.get('primary_signal', {}).get('signal_type')}
Key Metrics: {json.dumps(stock_analysis.get('primary_signal', {}).get('key_stats'))}
Snapshot: {json.dumps(stock_analysis.get('snapshot'))}

Return a JSON object with:
"title": short descriptive title,
"summary": 2-sentence summary with exact numbers,
"deep_dive": explanation of the indicator and numbers,
"risk_lesson": behavioral/risk lesson on why this is not a guaranteed outcome.
"""
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            content_str = completion.choices[0].message.content or "{}"
            parsed = json.loads(content_str)
            parsed["disclaimer"] = EDUCATIONAL_DISCLAIMER
            parsed["provider"] = "Groq Llama-3.1 (AI-Grounded)"
            parsed["symbol"] = symbol
            parsed["grounded_numbers"] = stock_analysis.get("snapshot")
            explanation = parsed
        except Exception as e:
            logger.warning("Groq API call failed (%s). Using deterministic engine.", e)

    # 3. Fall back to deterministic mathematical engine
    if not explanation:
        explanation = generate_deterministic_explanation(stock_analysis)

    explanation["is_cached"] = False

    # 4. Save to daily cache
    try:
        from models import save_cached_explanation
        sig_type = stock_analysis.get("primary_signal", {}).get("signal_type", "NEUTRAL_CONSOLIDATION")
        save_cached_explanation(symbol, today_key, sig_type, explanation)
    except Exception as e:
        logger.debug("Failed to write to explanation cache: %s", e)

    return explanation
