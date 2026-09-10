"""
indicators.py - Invest IQ Technical Indicator Engine

Provides mathematically rigorous, vectorized calculations for:
- RSI (Relative Strength Index, 14-period, Wilder's smoothing)
- MACD (Moving Average Convergence Divergence: 12 EMA, 26 EMA, 9 Signal)
- Bollinger Bands (20-period SMA, +/- 2 standard deviations, %B, Bandwidth)
- Volume Ratio (Current Volume / 20-period Volume SMA)

Every calculation operates on real pandas OHLCV series.
"""

from typing import Dict, Any, Optional
import numpy as np
import pandas as pd


def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate 14-period Relative Strength Index using Wilder's smoothed moving average.
    Values are bounded within [0, 100].
    """
    if len(series) < period + 1:
        return pd.Series(index=series.index, dtype=float)

    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    # Wilder's exponential smoothing: alpha = 1 / period
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi_series = pd.Series(100.0 - (100.0 / (1.0 + rs)), index=series.index)

    # If avg_loss is 0, RSI is 100; if avg_gain is 0, RSI is 0
    fill_vals = pd.Series(np.where((avg_loss == 0).to_numpy(), 100.0, 0.0), index=series.index)
    rsi_series = rsi_series.fillna(fill_vals)
    return rsi_series.round(2)


def calculate_macd(
    series: pd.Series,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> Dict[str, pd.Series]:
    """
    Calculate MACD Line, Signal Line, and MACD Histogram.
    """
    fast_ema = series.ewm(span=fast_period, adjust=False).mean()
    slow_ema = series.ewm(span=slow_period, adjust=False).mean()
    macd_line = fast_ema - slow_ema
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    histogram = macd_line - signal_line

    return {
        "macd_line": macd_line.round(2),
        "macd_signal": signal_line.round(2),
        "macd_hist": histogram.round(2),
    }


def calculate_bollinger_bands(
    series: pd.Series,
    period: int = 20,
    num_std: float = 2.0,
) -> Dict[str, pd.Series]:
    """
    Calculate 20-period Bollinger Bands, Bandwidth, and %B.
    """
    sma: pd.Series = pd.Series(series.rolling(window=period).mean())
    std: pd.Series = pd.Series(series.rolling(window=period).std())

    upper: pd.Series = pd.Series(sma + (num_std * std))
    lower: pd.Series = pd.Series(sma - (num_std * std))

    # Bandwidth %: (Upper - Lower) / Middle * 100
    bandwidth: pd.Series = pd.Series(((upper - lower) / sma.replace(0, np.nan)) * 100.0)

    # %B: (Price - Lower) / (Upper - Lower)
    band_range: pd.Series = pd.Series(upper - lower).replace(0, np.nan)
    percent_b: pd.Series = pd.Series((series - lower) / band_range)

    return {
        "bb_middle": sma.round(2),
        "bb_upper": upper.round(2),
        "bb_lower": lower.round(2),
        "bb_bandwidth": bandwidth.round(2),
        "bb_percent_b": percent_b.round(3),
    }


def calculate_volume_ratio(volume_series: pd.Series, period: int = 20) -> pd.Series:
    """
    Calculate Volume Ratio = Current Volume / 20-day Volume SMA.
    A ratio > 1.5 indicates notable volume surge.
    """
    vol_sma: pd.Series = pd.Series(volume_series.rolling(window=period).mean())
    ratio: pd.Series = pd.Series(volume_series / vol_sma.replace(0, np.nan))
    return ratio.round(2)


def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrich an OHLCV DataFrame with all technical indicators.
    Returns a copy with new indicator columns.
    """
    if df.empty or len(df) < 26:
        return df.copy()

    out = df.copy()
    close: pd.Series = pd.Series(out["Close"])
    volume: pd.Series = pd.Series(out["Volume"])

    # 1. RSI
    out["RSI"] = calculate_rsi(close, period=14)

    # 2. MACD
    macd_dict = calculate_macd(close, fast_period=12, slow_period=26, signal_period=9)
    out["MACD"] = macd_dict["macd_line"]
    out["MACD_Signal"] = macd_dict["macd_signal"]
    out["MACD_Hist"] = macd_dict["macd_hist"]

    # 3. Bollinger Bands
    bb_dict = calculate_bollinger_bands(close, period=20, num_std=2.0)
    out["BB_Middle"] = bb_dict["bb_middle"]
    out["BB_Upper"] = bb_dict["bb_upper"]
    out["BB_Lower"] = bb_dict["bb_lower"]
    out["BB_Bandwidth"] = bb_dict["bb_bandwidth"]
    out["BB_Percent_B"] = bb_dict["bb_percent_b"]

    # 4. Volume Ratio
    out["Volume_Ratio"] = calculate_volume_ratio(volume, period=20)

    return out


def get_indicator_snapshot(df_enriched: pd.DataFrame) -> Optional[Dict[str, Any]]:
    """
    Extract the latest calculated indicator values and key contextual flags.
    Provides current bar, previous bar, and momentum conditions.
    """
    if df_enriched.empty or len(df_enriched) < 2:
        return None

    curr = df_enriched.iloc[-1]
    prev = df_enriched.iloc[-2]

    close_val = float(curr["Close"])
    rsi_val = float(curr.get("RSI", 50.0))
    prev_rsi = float(prev.get("RSI", 50.0))

    macd_val = float(curr.get("MACD", 0.0))
    macd_sig = float(curr.get("MACD_Signal", 0.0))
    macd_hist = float(curr.get("MACD_Hist", 0.0))
    prev_macd = float(prev.get("MACD", 0.0))
    prev_sig = float(prev.get("MACD_Signal", 0.0))

    bb_u = float(curr.get("BB_Upper", close_val))
    bb_m = float(curr.get("BB_Middle", close_val))
    bb_l = float(curr.get("BB_Lower", close_val))
    pct_b = float(curr.get("BB_Percent_B", 0.5))
    bandwidth = float(curr.get("BB_Bandwidth", 5.0))

    vol_ratio = float(curr.get("Volume_Ratio", 1.0))

    # Crossover detection
    macd_bullish_cross = (prev_macd <= prev_sig) and (macd_val > macd_sig)
    macd_bearish_cross = (prev_macd >= prev_sig) and (macd_val < macd_sig)

    rsi_oversold = rsi_val < 30.0
    rsi_overbought = rsi_val > 70.0
    rsi_exiting_oversold = (prev_rsi < 30.0) and (rsi_val >= 30.0)

    bb_lower_touch = close_val <= (bb_l * 1.01)  # within 1% of lower band
    bb_upper_touch = close_val >= (bb_u * 0.99)  # within 1% of upper band

    volume_surge = vol_ratio >= 1.5

    return {
        "date": pd.to_datetime(df_enriched.index[-1]).strftime("%Y-%m-%d"),
        "close": round(close_val, 2),
        "rsi": {
            "value": round(rsi_val, 2),
            "prev": round(prev_rsi, 2),
            "is_oversold": rsi_oversold,
            "is_overbought": rsi_overbought,
            "exiting_oversold": rsi_exiting_oversold,
        },
        "macd": {
            "line": round(macd_val, 2),
            "signal": round(macd_sig, 2),
            "hist": round(macd_hist, 2),
            "bullish_cross": macd_bullish_cross,
            "bearish_cross": macd_bearish_cross,
        },
        "bollinger": {
            "upper": round(bb_u, 2),
            "middle": round(bb_m, 2),
            "lower": round(bb_l, 2),
            "percent_b": round(pct_b, 3),
            "bandwidth": round(bandwidth, 2),
            "lower_touch": bb_lower_touch,
            "upper_touch": bb_upper_touch,
        },
        "volume": {
            "volume": int(curr["Volume"]),
            "ratio": round(vol_ratio, 2),
            "surge": volume_surge,
        },
    }
