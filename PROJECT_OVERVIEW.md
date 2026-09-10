# Finsim AI
### AI-Powered Investment Learning and Market Simulator
**Version 2**

**Author:** Aravind, B.Tech CSE (AI & ML), Siddhartha Institute of Technology & Sciences

---

## 1. What This Project Is

Finsim AI is a web platform where users **practice investing with virtual money** while an AI explains real market behavior in plain English. It is explicitly an **education and simulation tool** — not a real trading system, not investment advice, and not a SEBI-regulated advisory product.

**One-line description:**
> An AI that watches real stock market data, teaches concepts using real examples, and lets users practice buying/selling with virtual money — so they understand investing before ever risking real money.

---

## 2. Why This Name and Framing

| Old framing | Current framing |
|---|---|
| "AI broker agent" that recommends real trades | "Simulator" for learning |
| Legal gray zone (advice-adjacent, SEBI RIA concerns) | Clearly educational — no licensing required |
| Real trading focus | Practice + understanding focus |

Positioning as a **learning simulator** (not a trading bot) keeps this legally clean and makes it a strong academic project as well as a genuine product idea. The word "SIMULATION" or "Virtual" stays visible directly in the UI on every relevant screen — not buried in documentation — so the legal framing holds up in practice, not just on paper.

---

## 3. Core User Flow

1. **User signs up** → gets ₹1,00,000 / $100,000 virtual cash
2. **Platform pulls real historical and live market data** (yfinance) — never synthetic or randomly generated prices, so patterns learned actually reflect real market behavior
3. **AI analyzes each stock** and explains signals in plain English, grounded in that stock's actual computed numbers (never generic templates)
4. **User practices buying/selling with virtual money**, with real brokerage, STT, and capital-gains tax deducted on every trade — so the numbers feel real
5. **AI teaches the "why"** behind each concept as it comes up, optionally read aloud via voice narration
6. **User sees a report of virtual profit/loss**, mistakes, and lessons learned over time, alongside volatility/drawdown — not just a smoothed return figure

---

## 4. Feature List

### 4.1 Core Features
- **Virtual portfolio** (starting balance of ₹1,00,000 / $100,000, buy/sell paper simulation with live P&L)
- **Real market data** (yfinance, sub-2s streaming) — includes real market-regime periods (2020 crash, 2021 rally, 2022 dip, 2023-2025 bull run, 2026 live) so users experience genuine volatility, not averaged-out calm
- **Up-to-Date Financial Overview**: 69 months of institutional closing data (2021–2025) with dynamic real-time live streaming for 2026
- **Technical indicator engine** (RSI, MACD, Bollinger Bands, Volume ratio)
- **AI-generated plain English explanations** per signal, using real computed numbers
- **Daily virtual portfolio report** (mini "EOD summary") showing volatility/drawdown alongside returns

### 4.2 Education-Focused Features
- **Concept lessons tied to real signals** as they occur (e.g., explain RSI the moment a stock hits oversold)
- **Voice narration** via the browser's free built-in **SpeechSynthesis API** (no API key, no cost)
- **Historical win-rate** shown per signal type (e.g., *"RSI < 30 has preceded a bounce ~60% of the time in backtests"*) — keeps every AI explanation honest and never phrased as a confident directive to "buy" or "sell"
- **Realistic costs simulation**: brokerage + STT deducted on every virtual trade, short-term capital gains tax shown in reports
- **Diversification score/warning** if virtual portfolio is too concentrated in one stock/sector
- **"Market regime" replay mode** — real historical periods, not smoothed averages

### 4.3 Engagement / Behavior Features
- **Loss "streak" mechanic** — consecutive losses trigger a short mandatory cooldown before the next trade, giving virtual losses some real behavioral weight
- **Mandatory reflection prompt** after a losing trade before the next action is allowed
- **Progress tracking** — virtual P&L history, lessons completed, mistakes flagged over time

### 4.4 Data & Scale Approach
- **Starter watchlist** of ~20 liquid, well-known NSE stocks across sectors for the initial build
- **Scaled up to full market coverage**: 2,400+ securities (all 2,298+ active Indian NSE stocks in ₹ plus 100+ Global US market leaders in $)
- **AI explanations cached** per stock per day and served to all users watching that stock, rather than regenerated per user, to stay comfortably within free-tier LLM limits as usage grows

### 4.5 Implemented & Enhanced Architecture
- **Full NSE market screener & catalog** (2,400+ stocks) with pagination, instant search, sector tabs, and 2-second streaming ticks
- **Multi-user authentication** with mandatory Full Name validation on sign-up before OTP or Google verification
- **Interactive Alerts & Signals Drawer** with real unread count tracking, category badges (`AI SIGNAL`, `TRADE FILL`, `SYSTEM`), and filter tabs
- **Complete Dark / Light Mode** adaptation with Tailwind CSS v4 custom variant and dynamic chart strokes
- **Optional real-broker paper trading connection** (Zerodha Kite Personal API protocol — free tier) for advanced users, strictly human-approved only

---

## 5. Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| **Frontend Web Hub** | Next.js 16.3.4 (React 19), Tailwind CSS v4, Lucide React, Recharts | Free / Open Source |
| **Backend / Technical Engine** | Python 3.10+, Flask, Pandas, NumPy | Free / Open Source |
| **Database** | SQLite3 (`investiq.db`, `finsim.db`) → PostgreSQL (production) | Free |
| **Stock Data** | yfinance (sub-2s streaming in-memory cache) | Free |
| **Full NSE Stock List** | NSE official equity list CSV (2,298+ equities) + Global US catalog | Free |
| **AI Explanations** | Groq LLM (Llama 3.1) / OpenAI-compatible API | Free tier |
| **Voice Narration** | Browser SpeechSynthesis API | Free, built-in |
| **Auth** | Flask-Login & Next.js session cookies | Free |
| **Hosting** | Render / Railway (backend), Vercel (frontend) | Free tier |
| **Scheduler** | GitHub Actions / Background daemons | Free |

**Total cost to build and run at small scale: ₹0**

---

## 6. Project File Structure

```
Invest_iq/
├── app.py                  # Flask app & API reverse-proxy gateway
├── data_provider.py        # yfinance data fetching, live/mock toggle
├── scanner.py              # Runs technical analysis across watchlist/market
├── indicators.py           # RSI, MACD, Bollinger, volume ratio calculations
├── explainer.py            # Builds plain-English explanations from real numbers
├── signal_stats.py          # Tracks and returns historical win-rate per signal type
├── portfolio.py            # Virtual portfolio logic — buy/sell, P&L, fees, tax
├── auth.py                 # User accounts and sessions
├── models.py               # Database schema (users, trades, watchlists, signal history)
├── broker_kite.py          # Zerodha Kite Connect API paper bridge
├── build_history.py        # 2021-2026 multi-year benchmark history extractor
├── all_monthly_history.json# 69-month institutional closing data (Nifty 50 & S&P 500)
├── generate_pdf.py         # Automated Project Overview PDF generator
├── Invest_IQ_Project_Overview.pdf # Generated PDF Project Overview
│
├── frontend/               # Next.js 16 (React 19) Full-Stack Web Application
│   ├── src/
│   │   ├── app/            # App Router (Dashboard, Markets, Trade, Learn, Auth)
│   │   │   ├── globals.css # Tailwind v4 dark/light mode engine (@custom-variant dark)
│   │   │   ├── layout.tsx  # Root Layout with ThemeProvider & SimulatorProvider
│   │   │   ├── page.tsx    # Executive Dashboard
│   │   │   ├── signin/     # Sign In with tab toggle
│   │   │   ├── signup/     # Sign Up with mandatory Full Name validation
│   │   │   ├── markets/    # 2,400+ Indian & Global live streaming stocks
│   │   │   ├── trade/      # Paper Trading Execution Terminal with Level-2 depth
│   │   │   ├── portfolio/  # Asset allocation & historical holdings
│   │   │   ├── positions/  # Active open positions with live P&L
│   │   │   └── learn/      # 6-tier academy curriculum & AI signals
│   │   ├── components/
│   │   │   ├── layout/     # Topbar (Bell + Theme Toggle), Sidebar, NotificationsDrawer
│   │   │   └── dashboard/  # PortfolioChart (2021-2026 real data), AccountMiniCards, QuickTrade
│   │   └── lib/
│   │       ├── financial-history.ts # 69 months real monthly close dataset (2021-2026)
│   │       ├── global-catalog.ts    # 100+ Global US market leaders
│   │       ├── nse-catalog.ts       # 2,298+ Indian NSE equities
│   │       ├── market-api.ts        # 2s streaming market quote engine
│   │       └── store.tsx            # Global simulation store (cash, portfolio, alerts)
│   └── package.json
│
├── templates/              # Flask Jinja2 templates (dashboard, screener, portfolio, report)
├── static/                 # CSS & static assets for Flask engine
├── tests/                  # Automated verification test suite
└── requirements.txt        # Python package dependencies
```

---

## 7. Build Roadmap & Status

| Phase | Goal | Status |
|---|---|---|
| **1** | Data pipeline — fetch real historical stock data via yfinance with retry handling | ✅ **Completed** |
| **2** | Technical indicators — RSI, MACD, Bollinger Bands, volume ratio computed and stored | ✅ **Completed** |
| **3** | Signal detection + plain English explainer grounded in real numbers with visible disclaimer | ✅ **Completed** |
| **4** | Virtual portfolio — buy/sell simulation with real brokerage, STT, and capital-gains tax deducted per trade | ✅ **Completed** |
| **5** | Historical win-rate tracking per signal type, surfaced transparently next to every AI explanation | ✅ **Completed** |
| **6** | Behavioral guardrails — loss-streak cooldown and mandatory reflection prompt after a losing trade | ✅ **Completed** |
| **7** | Voice narration (browser SpeechSynthesis API) on explanations and reports | ✅ **Completed** |
| **8** | Authentication — real user accounts with mandatory Full Name validation on sign-up | ✅ **Completed** |
| **9** | Scale stock list to full market — 2,400+ securities (2,298+ NSE + 100+ Global mega-caps) with 2s live streaming | ✅ **Completed** |
| **10** | Up-to-date Financial Overview — 69 months real institutional close data (2021–2025) and dynamic live 2026 streaming | ✅ **Completed** |
| **11** | Interactive alerts & dark/light mode — slide-over drawer with unread tracking and Tailwind v4 theme sync | ✅ **Completed** |
| **12** | Cloud deployment configuration (Docker, Render, Vercel, Railway) ready for staging & production | ✅ **Completed** |

---

## 8. Legal Positioning

Finsim AI is always framed as:
- A **learning and simulation tool**, not investment advice
- Virtual money only in the core product — any future real-money connection remains fully human-approved, with no autonomous trading
- Every AI-generated signal explanation carries a clear disclaimer and its real historical win-rate — never a confident directive to "buy" or "sell"
- The word **"SIMULATION"** or **"Virtual"** visible directly in the UI on every relevant screen

This framing keeps the project outside SEBI Registered Investment Adviser (RIA) requirements, which apply to personalized real-money investment advice, not education/simulation tools.
