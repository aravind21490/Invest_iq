"""
scanner.py - Invest IQ Technical Signal Scanner

Scans watchlist data and detects key educational technical patterns:
- OVERSOLD_BOUNCE (RSI < 30 & Lower Bollinger Band contact)
- OVERBOUGHT_EXHAUSTION (RSI > 70 & Upper Bollinger Band contact)
- BULLISH_MACD_CROSSOVER (MACD crosses above Signal with volume support)
- BEARISH_MACD_CROSSOVER (MACD crosses below Signal)
- VOLATILITY_SQUEEZE (Bollinger Bandwidth contracted to 60-day low)
- VOLUME_BREAKOUT (Volume Ratio >= 2.0x with >1.5% price movement)
- TREND_CONTINUATION / NEUTRAL

All signals package exact computed figures for the explainer engine.
"""

from typing import Dict, List, Any, Optional
import pandas as pd
from indicators import calculate_all_indicators, get_indicator_snapshot
from data_provider import DataProvider, default_data_provider, CORE_NSE_STOCKS, resolve_stock_info


SIGNAL_METADATA: Dict[str, Dict[str, str]] = {
    "OVERSOLD_BOUNCE": {
        "title": "Potential Oversold Pullback",
        "badge_color": "emerald",
        "category": "Mean Reversion",
        "core_concept": "Relative Strength Index (RSI) < 30 & Lower Bollinger Band",
    },
    "OVERBOUGHT_EXHAUSTION": {
        "title": "Potential Overbought Exhaustion",
        "badge_color": "rose",
        "category": "Mean Reversion",
        "core_concept": "Relative Strength Index (RSI) > 70 & Upper Bollinger Band",
    },
    "BULLISH_MACD_CROSSOVER": {
        "title": "Bullish Momentum Crossover",
        "badge_color": "indigo",
        "category": "Trend Following",
        "core_concept": "12-day EMA crosses above 26-day EMA with Volume Confirmation",
    },
    "BEARISH_MACD_CROSSOVER": {
        "title": "Bearish Momentum Crossover",
        "badge_color": "amber",
        "category": "Trend Following",
        "core_concept": "12-day EMA crosses below 26-day EMA",
    },
    "VOLATILITY_SQUEEZE": {
        "title": "Volatility Compression Squeeze",
        "badge_color": "violet",
        "category": "Volatility",
        "core_concept": "Bollinger Bands Bandwidth Contraction (Low Volatility Preceding Expansion)",
    },
    "VOLUME_BREAKOUT": {
        "title": "High Volume Surge & Price Move",
        "badge_color": "sky",
        "category": "Volume Dynamics",
        "core_concept": "Volume Ratio > 2.0x with decisive directional price change",
    },
    "NEUTRAL_CONSOLIDATION": {
        "title": "Rangebound Consolidation",
        "badge_color": "slate",
        "category": "Market Equilibrium",
        "core_concept": "Indicators within typical historical equilibrium bands",
    },
}


class MarketScanner:
    """
    Scans single or multi-asset watchlists and identifies technical setups.
    """

    def __init__(self, data_provider: Optional[DataProvider] = None):
        self.data_provider = data_provider or default_data_provider

    def analyze_stock(self, symbol: str, df: Optional[pd.DataFrame] = None, regime: str = "current") -> Dict[str, Any]:
        """
        Analyze a single stock and detect all active educational signals.
        """
        if df is None or df.empty:
            df = self.data_provider.fetch_stock_history(symbol, regime=regime)

        if df.empty or len(df) < 30:
            return {
                "symbol": symbol,
                "error": "Insufficient historical data (minimum 30 bars required)",
                "signals": [],
            }

        enriched = calculate_all_indicators(df)
        snapshot = get_indicator_snapshot(enriched)
        if not snapshot:
            return {"symbol": symbol, "error": "Could not compute indicators", "signals": []}

        signals: List[Dict[str, Any]] = []

        close = snapshot["close"]
        rsi = snapshot["rsi"]
        macd = snapshot["macd"]
        bb = snapshot["bollinger"]
        vol = snapshot["volume"]

        # Calculate Bandwidth 60-day percentile for Squeeze detection
        bw_series = enriched["BB_Bandwidth"].dropna()
        recent_bw = bw_series.iloc[-60:] if len(bw_series) >= 60 else bw_series
        is_squeeze = bb["bandwidth"] <= recent_bw.quantile(0.15)

        # 1. Check Oversold Bounce
        if rsi["value"] < 30.0 or (rsi["prev"] < 30.0 and rsi["value"] >= 30.0):
            signals.append({
                "signal_type": "OVERSOLD_BOUNCE",
                "intensity": "Strong" if (rsi["value"] < 25.0 and bb["lower_touch"]) else "Moderate",
                "key_stats": {
                    "rsi": rsi["value"],
                    "prev_rsi": rsi["prev"],
                    "close": close,
                    "bb_lower": bb["lower"],
                    "volume_ratio": vol["ratio"],
                },
            })

        # 2. Check Overbought Exhaustion
        if rsi["value"] > 70.0:
            signals.append({
                "signal_type": "OVERBOUGHT_EXHAUSTION",
                "intensity": "Strong" if (rsi["value"] > 78.0 and bb["upper_touch"]) else "Moderate",
                "key_stats": {
                    "rsi": rsi["value"],
                    "close": close,
                    "bb_upper": bb["upper"],
                    "volume_ratio": vol["ratio"],
                },
            })

        # 3. Check Bullish MACD Crossover
        if macd["bullish_cross"]:
            signals.append({
                "signal_type": "BULLISH_MACD_CROSSOVER",
                "intensity": "High" if vol["ratio"] >= 1.2 else "Standard",
                "key_stats": {
                    "macd_line": macd["line"],
                    "macd_signal": macd["signal"],
                    "macd_hist": macd["hist"],
                    "volume_ratio": vol["ratio"],
                    "close": close,
                },
            })

        # 4. Check Bearish MACD Crossover
        if macd["bearish_cross"]:
            signals.append({
                "signal_type": "BEARISH_MACD_CROSSOVER",
                "intensity": "Standard",
                "key_stats": {
                    "macd_line": macd["line"],
                    "macd_signal": macd["signal"],
                    "macd_hist": macd["hist"],
                    "close": close,
                },
            })

        # 5. Volatility Squeeze
        if is_squeeze:
            signals.append({
                "signal_type": "VOLATILITY_SQUEEZE",
                "intensity": "Noteworthy",
                "key_stats": {
                    "bandwidth": bb["bandwidth"],
                    "percent_b": bb["percent_b"],
                    "close": close,
                },
            })

        # 6. Volume Breakout
        price_change_pct = ((close - float(df.iloc[-2]["Close"])) / float(df.iloc[-2]["Close"])) * 100.0
        if vol["ratio"] >= 2.0 and abs(price_change_pct) >= 1.5:
            signals.append({
                "signal_type": "VOLUME_BREAKOUT",
                "intensity": "High",
                "key_stats": {
                    "volume_ratio": vol["ratio"],
                    "price_change_pct": round(price_change_pct, 2),
                    "volume": vol["volume"],
                    "close": close,
                },
            })

        # Default if no specific condition triggered
        if not signals:
            signals.append({
                "signal_type": "NEUTRAL_CONSOLIDATION",
                "intensity": "Neutral",
                "key_stats": {
                    "close": close,
                    "rsi": rsi["value"],
                    "macd_hist": macd["hist"],
                    "percent_b": bb["percent_b"],
                    "volume_ratio": vol["ratio"],
                },
            })

        # Enrich all signals with metadata (title, badge_color, category, core_concept)
        for s in signals:
            st = s.get("signal_type", "NEUTRAL_CONSOLIDATION")
            meta_sig = SIGNAL_METADATA.get(st, {})
            s["title"] = meta_sig.get("title", st.replace("_", " ").title())
            s["badge_color"] = meta_sig.get("badge_color", "slate")
            s["category"] = meta_sig.get("category", "Market Equilibrium")
            s["core_concept"] = meta_sig.get("core_concept", "")

        meta = resolve_stock_info(symbol)
        prev_close = float(enriched["Close"].iloc[-2]) if len(enriched) >= 2 else close
        price_change_pct = round(((close - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0
        data_source = df.attrs.get("source", "cached" if not df.empty else "live")

        return {
            "symbol": symbol,
            "name": meta.get("name", symbol),
            "sector": meta.get("sector", "General"),
            "cap": meta.get("cap", "NSE Equity"),
            "price": close,
            "price_change_pct": price_change_pct,
            "date": snapshot["date"],
            "snapshot": snapshot,
            "signals": signals,
            "primary_signal": signals[0],
            "source": data_source,
            "data_source": data_source,
        }

    def scan_watchlist(self, symbols: Optional[List[str]] = None, regime: str = "current") -> List[Dict[str, Any]]:
        """
        Scans a list of symbols and returns analyzed results sorted by signal priority.
        """
        if symbols is None:
            symbols = list(CORE_NSE_STOCKS.keys())

        results: List[Dict[str, Any]] = []
        for sym in symbols:
            try:
                analysis = self.analyze_stock(sym, regime=regime)
                if "error" not in analysis:
                    results.append(analysis)
            except Exception as e:
                # Per-stock error isolation
                continue

        # Sort so stocks with active non-neutral signals appear first
        def sort_priority(item: Dict[str, Any]) -> int:
            sig = item.get("primary_signal", {}).get("signal_type", "")
            return 1 if sig == "NEUTRAL_CONSOLIDATION" else 0

        results.sort(key=sort_priority)
        return results


default_scanner = MarketScanner()
