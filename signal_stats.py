"""
signal_stats.py - Invest IQ Historical Win-Rate & Precedent Engine

Analyzes the historical empirical performance of technical signals
across 1-3 years of real daily bars.
Calculates:
- Total historical trigger occurrences (Sample Size)
- Win Rate % over 5, 10, and 20-day forward holding periods
- Average gain % on favorable outcomes
- Average loss % on unfavorable outcomes
- Maximum drawdown experienced during the forward window

Surfaces empirical reality to users: no indicator is infallible.
"""

from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd
from indicators import calculate_all_indicators
from data_provider import DataProvider, default_data_provider


class SignalStatsEngine:
    """
    Computes empirical win-rates and drawdown statistics for technical signals.
    """

    def __init__(self, data_provider: Optional[DataProvider] = None):
        self.data_provider = data_provider or default_data_provider
        self._cache: Dict[Tuple[str, int], Dict[str, Any]] = {}

    def compute_signal_history_stats(
        self,
        symbol: str,
        df: Optional[pd.DataFrame] = None,
        forward_days: int = 10,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Backtests all signal types on historical bars for a given stock.
        Returns a dictionary mapping signal_type -> empirical performance statistics.
        """
        cache_key = (symbol.upper(), forward_days)
        if df is None and cache_key in self._cache:
            return self._cache[cache_key]

        if df is None or df.empty:
            df = self.data_provider.fetch_stock_history(symbol, regime="current")

        if df.empty or len(df) < 50:
            return {}

        enriched = calculate_all_indicators(df)
        n_bars = len(enriched)

        # Signal event tracker
        signal_events: Dict[str, List[Dict[str, float]]] = {
            "OVERSOLD_BOUNCE": [],
            "OVERBOUGHT_EXHAUSTION": [],
            "BULLISH_MACD_CROSSOVER": [],
            "BEARISH_MACD_CROSSOVER": [],
            "VOLATILITY_SQUEEZE": [],
            "VOLUME_BREAKOUT": [],
        }

        # Need at least forward_days to evaluate outcome
        for i in range(30, n_bars - forward_days):
            curr_row = enriched.iloc[i]
            prev_row = enriched.iloc[i - 1]
            entry_price = float(curr_row["Close"])
            if entry_price <= 0:
                continue

            # Forward window
            forward_window = enriched.iloc[i + 1 : i + 1 + forward_days]
            exit_price = float(forward_window.iloc[-1]["Close"])
            forward_return_pct = ((exit_price - entry_price) / entry_price) * 100.0

            # Forward min price during window for max drawdown calculation
            min_price = float(forward_window["Low"].min())
            max_drawdown_pct = ((min_price - entry_price) / entry_price) * 100.0

            # Forward max price for upside tracking
            max_price = float(forward_window["High"].max())
            max_runup_pct = ((max_price - entry_price) / entry_price) * 100.0

            outcome = {
                "return_pct": forward_return_pct,
                "max_drawdown_pct": max_drawdown_pct,
                "max_runup_pct": max_runup_pct,
            }

            rsi = float(curr_row.get("RSI", 50.0))
            prev_rsi = float(prev_row.get("RSI", 50.0))
            macd = float(curr_row.get("MACD", 0.0))
            sig = float(curr_row.get("MACD_Signal", 0.0))
            prev_macd = float(prev_row.get("MACD", 0.0))
            prev_sig = float(prev_row.get("MACD_Signal", 0.0))
            bw = float(curr_row.get("BB_Bandwidth", 5.0))
            vol_ratio = float(curr_row.get("Volume_Ratio", 1.0))

            # 1. Oversold Bounce trigger
            if rsi < 30.0 or (prev_rsi < 30.0 and rsi >= 30.0):
                signal_events["OVERSOLD_BOUNCE"].append(outcome)

            # 2. Overbought Exhaustion trigger (for short/mean reversion, favorable = downward/negative return)
            if rsi > 70.0:
                # For overbought exhaustion, "win" means avoiding purchase or shorting (price went down or consolidated)
                inverted_outcome = {
                    "return_pct": -forward_return_pct,  # Positive if price fell
                    "max_drawdown_pct": -max_runup_pct,
                    "max_runup_pct": -max_drawdown_pct,
                }
                signal_events["OVERBOUGHT_EXHAUSTION"].append(inverted_outcome)

            # 3. Bullish MACD Crossover
            if (prev_macd <= prev_sig) and (macd > sig):
                signal_events["BULLISH_MACD_CROSSOVER"].append(outcome)

            # 4. Bearish MACD Crossover
            if (prev_macd >= prev_sig) and (macd < sig):
                signal_events["BEARISH_MACD_CROSSOVER"].append({
                    "return_pct": -forward_return_pct,
                    "max_drawdown_pct": -max_runup_pct,
                    "max_runup_pct": -max_drawdown_pct,
                })

            # 5. Volatility Squeeze (Bandwidth < 4.0%)
            if bw < 4.0:
                signal_events["VOLATILITY_SQUEEZE"].append(outcome)

            # 6. Volume Breakout
            price_change = ((entry_price - float(prev_row["Close"])) / float(prev_row["Close"])) * 100.0
            if vol_ratio >= 1.8 and price_change >= 1.0:
                signal_events["VOLUME_BREAKOUT"].append(outcome)

        # Aggregate empirical statistics
        stats_by_signal: Dict[str, Dict[str, Any]] = {}
        for sig_name, occurrences in signal_events.items():
            count = len(occurrences)
            if count == 0:
                stats_by_signal[sig_name] = {
                    "sample_size": 0,
                    "win_rate_pct": 50.0,  # Baseline
                    "avg_gain_pct": 0.0,
                    "avg_loss_pct": 0.0,
                    "avg_drawdown_pct": 0.0,
                    "summary_text": f"Insufficient historical triggers for {sig_name} in selected period.",
                }
                continue

            wins = [o for o in occurrences if o["return_pct"] > 0]
            losses = [o for o in occurrences if o["return_pct"] <= 0]

            win_rate = (len(wins) / count) * 100.0
            avg_gain = float(np.mean([w["return_pct"] for w in wins])) if wins else 0.0
            avg_loss = float(np.mean([l["return_pct"] for l in losses])) if losses else 0.0
            avg_drawdown = float(np.mean([o["max_drawdown_pct"] for o in occurrences]))

            stats_by_signal[sig_name] = {
                "sample_size": count,
                "forward_days": forward_days,
                "win_rate_pct": round(win_rate, 1),
                "avg_gain_pct": round(avg_gain, 2),
                "avg_loss_pct": round(avg_loss, 2),
                "avg_drawdown_pct": round(avg_drawdown, 2),
                "summary_text": (
                    f"Over {count} historical occurrences, this pattern preceded a positive {forward_days}-day "
                    f"return {round(win_rate, 1)}% of the time (Avg Gain: +{round(avg_gain, 1)}%, "
                    f"Avg Drawdown: {round(avg_drawdown, 1)}%)."
                ),
            }

        if df is None:
            self._cache[cache_key] = stats_by_signal

        return stats_by_signal


default_stats_engine = SignalStatsEngine()
