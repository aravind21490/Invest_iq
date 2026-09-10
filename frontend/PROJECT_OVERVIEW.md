# Invest IQ — Project Overview & Architecture Documentation

An educational stock-market paper-trading simulator featuring **real institutional market prices**, **simulated money ($100,000)**, **plain-English AI technical explanations**, and a **structured 6-tier learning curriculum**.

---

## 1. Executive Summary

- **Project Name**: Invest IQ
- **Core Purpose**: To provide a realistic, zero-risk bridge between financial market theory and practical trade execution.
- **Core Philosophy**: *"Real data, fake dollars"* — all quotes, candles, and metrics are powered by real-time institutional feeds; all trading balances, trades, and portfolios use virtual simulated capital. No fabricated or placeholder numbers are ever used.
- **Design Standard**: Modeled after the **shadcn-fintech** dashboard design system with full dark/light theme support, zinc color token architecture, dense card-based layouts, and responsive micro-animations.

---

## 2. System Architecture & Flow

```mermaid
flowchart TD
    subgraph Client ["Browser Client"]
        A[Visitor Request] --> B[Next.js Proxy Gate]
        UI[Invest IQ UI Shell]
        Dashboard[Dashboard & Widgets]
        Markets[Global Markets & Drawer]
        Academy[6-Tier Learn Academy]
        TradeTerm[Trade Execution Terminal]
    end

    subgraph Security ["Authentication Layer"]
        B -->|No investiq_session cookie| Signin[Redirect to /signin]
        Signin -->|Option 1: Phone + OTP| OtpRoute[/api/auth/otp/verify]
        Signin -->|Option 2: Google OAuth| GoogleRoute[/api/auth/google]
        OtpRoute -->|Issue httpOnly Cookie| UI
        GoogleRoute -->|Issue httpOnly Cookie| UI
        B -->|Valid investiq_session| UI
    end

    subgraph MarketData ["Live Institutional Market Data"]
        Markets --> QuotesAPI[/api/market/quotes]
        Markets --> ChartAPI[/api/market/chart]
        TradeTerm --> QuotesAPI
        QuotesAPI --> Cache[60s In-Memory Cache]
        Cache --> LiveFeed[Yahoo Finance Query Engine]
    end

    subgraph Persistence ["Per-User Database Engine"]
        TradeTerm -->|Execute Paper Order| TradeAPI[/api/user/trade]
        Academy -->|Complete Quiz Lesson| LearnAPI[/api/user/learn]
        Dashboard -->|Fetch Portfolio| PortAPI[/api/user/portfolio]
        
        TradeAPI --> Store[(data/investiq_store.json)]
        LearnAPI --> Store
        PortAPI --> Store
        
        Store --> UserPort[User Cash: $100k]
        Store --> UserPos[User Positions]
        Store --> UserTrades[Trade History]
        Store --> UserLearn[Streak & Quizzes]
    end
```

---

## 3. Directory & File Map ("What is What")

```
Invest_IQ/
├── frontend/
│   ├── data/
│   │   └── investiq_store.json            # Persistent ACID-style database for users, portfolios, trades, & learn progress
│   ├── src/
│   │   ├── proxy.ts                       # Next.js 16 Route Guard: Redirects unauthenticated users to /signin
│   │   ├── middleware.ts                  # Compatibility proxy export
│   │   ├── app/
│   │   │   ├── page.tsx                   # Overview Dashboard with all 8 widgets + AI signal + learning nudge
│   │   │   ├── signin/page.tsx            # Passwordless Phone OTP + Google sign-in
│   │   │   ├── signup/page.tsx            # Phone OTP sign-up with paper-trading disclaimer
│   │   │   ├── markets/page.tsx           # Global Markets catalog (search, sort, table/grid, sparklines)
│   │   │   ├── portfolio/page.tsx         # Holdings table, asset allocation donut, performance vs S&P 500
│   │   │   ├── trade/page.tsx             # Interactive trading terminal with real-time cost calculator
│   │   │   ├── orders/page.tsx            # Searchable order history ledger with status pills
│   │   │   ├── positions/page.tsx         # Active open positions with live calculated P&L
│   │   │   ├── analytics/page.tsx         # Performance analytics, sector donuts, trade flow charts
│   │   │   ├── accounts/page.tsx          # Simulated cash balances and funding accounts
│   │   │   ├── watchlist/page.tsx         # User-curated watchlist with live quote updates
│   │   │   ├── settings/page.tsx          # Simulator capital reset, currency toggle, preferences
│   │   │   ├── leaderboard/page.tsx       # Paper-trading leaderboard rankings
│   │   │   ├── learn/
│   │   │   │   ├── tutorials/page.tsx     # 6-Tier curriculum (30 lessons) with interactive quizzes
│   │   │   │   ├── signals/page.tsx       # AI Technical indicator library (RSI, MACD, etc.)
│   │   │   │   └── insights/page.tsx      # Automated algorithm market pattern scans
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   ├── otp/send/route.ts      # Phone OTP dispatch with 30s resend cooldown
│   │   │       │   ├── otp/verify/route.ts    # OTP verification & session cookie issuance
│   │   │       │   ├── google/route.ts        # Google OAuth callback & session creation
│   │   │       │   ├── session/route.ts       # Session validation endpoint
│   │   │       │   └── signout/route.ts       # Session deletion & cookie destruction
│   │   │       ├── market/
│   │   │       │   ├── quotes/route.ts        # Live quotes with 7-day sparklines
│   │   │       │   └── chart/route.ts         # Historical OHLCV series for timeframe charts
│   │   │       └── user/
│   │   │           ├── portfolio/route.ts     # Per-user cash, positions, & live equity calculation
│   │   │           ├── trade/route.ts         # Server-side paper trade execution against live prices
│   │   │           └── learn/route.ts         # Completed topics & learning streak persistence
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx            # Collapsible navigation with user profile & Sign Out
│   │   │   │   ├── topbar.tsx             # Breadcrumbs, paper badge, ⌘K trigger, theme toggle
│   │   │   │   └── command-palette.tsx    # ⌘K / Ctrl+K instant search & navigation palette
│   │   │   ├── markets/
│   │   │   │   └── market-detail-drawer.tsx # Slide-over panel with interactive charts & key stats
│   │   │   └── dashboard/
│   │   │       ├── portfolio-chart.tsx    # Multi-timeframe portfolio performance Rechart
│   │   │       ├── holdings-cards.tsx     # Simulated balance cards with masked privacy toggle
│   │   │       ├── quick-trade.tsx        # Fast-order execution widget with avatar chips
│   │   │       ├── risk-limit.tsx         # Sector exposure and risk budget meter
│   │   │       ├── health-score.tsx       # Gauge widget evaluating portfolio diversification
│   │   │       ├── portfolio-flow.tsx     # Bought vs Sold volume bar chart
│   │   │       ├── recent-trades.tsx      # Ledger of recent filled paper trades
│   │   │       ├── ai-signal-card.tsx     # Plain-English technical AI signal card
│   │   │       └── learning-nudge.tsx     # Dynamic next suggested lesson based on user progress
│   │   └── lib/
│   │       ├── auth-service.ts            # Core auth engine (OTP logic, cooldowns, tokens)
│   │       ├── db.ts                      # Persistent JSON file database with ACID-style writes
│   │       ├── market-api.ts              # Live institutional market query engine with 60s cache
│   │       ├── curriculum-data.ts         # 6-tier curriculum database (30 lessons + quizzes)
│   │       ├── store.tsx                  # Global React context for user state & trade actions
│   │       └── utils.ts                   # Currency, percent, and Tailwind class formatting
│   ├── package.json
│   └── tsconfig.json
└── PROJECT_OVERVIEW.md                    # This document
```

---

## 4. Key Features & Pillars

### Pillar 1: Mandatory Authentication Gate
- **Zero Unauthenticated Access**: Unauthenticated visitors cannot view any app route or API data. They are routed via `HTTP 307` directly to `/signin`.
- **Passwordless Authentication**:
  - **Phone OTP**: 2-step process with international country code selection $\rightarrow$ 6-digit code entry with auto-focusing inputs $\rightarrow$ 30-second countdown cooldown for resends $\rightarrow$ expired/invalid code error reporting.
  - **Google OAuth**: Instant single-click sign-in without passwords.
  - **Passwords & Apple Sign-In**: Completely removed as specified.
- **Session Management**: Backed by secure `httpOnly`, `SameSite=lax` cookies (`investiq_session`).
- **Working Sign-Out**: Pinned to the user profile menu in both the sidebar and topbar.

### Pillar 2: Global Markets Page (`/markets`)
- **Live Institutional Catalog**:
  - **Mega-Cap Tech**: Apple (AAPL), Microsoft (MSFT), Nvidia (NVDA), Alphabet (GOOGL), Amazon (AMZN), Meta (META), Tesla (TSLA).
  - **Global Indices**: S&P 500 (^GSPC), NASDAQ Composite (^IXIC), Dow Jones (^DJI), Nifty 50 (^NSEI), FTSE 100 (^FTSE).
  - **International Leaders**: TSMC (TSM), ASML (ASML), Reliance Industries (RELIANCE.NS).
- **Interactive Views**:
  - Instant search filtering by ticker or company name.
  - Category filters (`All Assets`, `Mega-Cap Tech`, `Global Indices`, `International`).
  - View toggle: **Dense Table** vs. **Card Grid**.
  - Dynamic 7-day SVG sparkline graphs colored green/red according to 24-hour performance.
- **Slide-Over Asset Detail Drawer**:
  - Multi-timeframe interactive Recharts price chart (`1D`, `5D`, `1MO`, `1Y`).
  - Key Statistics Grid: Day High, Day Low, 52-Week High, 52-Week Low, Previous Close, Volume, Sector.
  - Plain-English AI Technical Snapshot assessing momentum and RSI.
  - "Paper Trade This Stock" action button that pre-fills the trading terminal.

### Pillar 3: 6-Tier Structured Learn Curriculum (`/learn/tutorials`)
- **30 Bite-Sized Lessons Across 6 Progressive Tiers**:
  1. **Tier 1: Absolute Basics**: What is a Stock, What is the Stock Market, How Shares Represent Ownership, What is a Stock Exchange, What Moves Prices.
  2. **Tier 2: Getting Started**: Market vs. Limit Orders, Bid-Ask Spread, Brokerage Accounts, Diversification, Risk vs. Reward.
  3. **Tier 3: Reading the Market**: Reading a Stock Chart, Candlestick Anatomy, Trading Volume, Market Capitalization, P/E Ratio & Basic Valuation.
  4. **Tier 4: Technical & Fundamental Analysis**: RSI Indicator Explained, Moving Averages (50D & 200D Golden/Death Cross), MACD Trend Momentum, Reading Earnings Reports & Guidance, Sectors & Correlations.
  5. **Tier 5: Strategy & Risk Management**: 1-2% Position Sizing Rule, Stop-Loss & Take-Profit Discipline, Dollar-Cost Averaging (DCA), Psychological Biases (FOMO & Revenge Trading), Asymmetric Risk-Reward Ratio.
  6. **Tier 6: Advanced Concepts**: Options Basics (Calls & Puts), Short Selling Mechanics & Unlimited Risk Warnings, Margin Leverage & Margin Calls.
- **Concept Check Quizzes**: Each lesson includes an interactive 4-choice quiz with immediate pedagogical feedback.
- **Per-User Progress Tracking**: Completed lessons, quiz scores, and daily streaks are recorded in the user's database record.
- **Dashboard Learning Nudge Card**: Dynamically calculates and displays the user's next suggested lesson, total completion percentage, and active streak.

### Pillar 4: Real Live Market Data & Per-User Database (No Placeholders)
- **Zero Fabricated Prices**: Every price shown on the dashboard, markets page, or trade terminal is fetched from live institutional market feeds server-side.
- **60-Second In-Memory Cache**: Respects upstream rate limits while providing fresh quotes and 7-day sparklines.
- **Independent $100,000 Paper Balances**: Every user gets their own persistent virtual account with $100,000 starting cash.
- **Server-Side Order Execution**: Orders are validated against live prices fetched at the exact moment of execution (`POST /api/user/trade`), ensuring realistic order fills and accurate portfolio equity.

---

## 5. Technology Stack

| Layer | Technology | Version / Specification |
|---|---|---|
| **Framework** | Next.js | 16.3.4 (App Router) |
| **Runtime & Language** | Node.js / TypeScript | Node v22, TypeScript 5 |
| **Bundler & Compiler** | Turbopack | Next.js Turbo Engine |
| **Styling & Design** | Tailwind CSS / CSS Variables | Tailwind v4 with shadcn-fintech zinc theme |
| **Icons** | Lucide React | Modern SVG icons (`Globe2`, `Sparkles`, etc.) |
| **Visualizations** | Recharts | Responsive Area, Bar, and SVG sparkline charts |
| **Micro-Interactions** | Canvas Confetti | Celebration effects on successful paper order fills |
| **Theme Management** | next-themes | Instant Dark / Light mode switching |
| **Persistence Engine** | Atomic File Database | JSON store (`investiq_store.json`) with ACID-style atomic writes |
| **Market Data Feed** | Institutional Query Engine | Real-time Yahoo Finance institutional feed with server-side caching |

---

## 6. Verification Results

The full application was verified through an automated 13-point test suite (`scratch/verify_all.js`):

| Test # | Verified Item | Result |
|:---:|---|:---:|
| 1 | Unauthenticated access to `/` redirects to `/signin` | **PASSED** (HTTP 307) |
| 2 | Unauthenticated access to `/markets` redirects to `/signin?redirect=%2Fmarkets` | **PASSED** (HTTP 307) |
| 3 | Mobile OTP dispatch with 5-minute expiry | **PASSED** (Code issued) |
| 4 | 30-Second OTP resend cooldown rate limit | **PASSED** (HTTP 429) |
| 5 | Invalid OTP rejection with attempt count | **PASSED** (HTTP 400) |
| 6 | Valid OTP verification and `investiq_session` cookie creation | **PASSED** (Cookie set) |
| 7 | Session Verification | **PASSED** (HTTP 200) |
| 8 | Live Market Data API | **PASSED** (AAPL $315.34, NVDA $223.67) |
| 9 | Per-User Starting Balance | **PASSED** ($100,000.00) |
| 10 | Real Paper Trade Execution | **PASSED** (Bought @ $315.34) |
| 11 | Post-Trade Balance & Holdings | **PASSED** (5 AAPL held) |
| 12 | Curriculum Progress Tracking | **PASSED** |
| 13 | Sign Out | **PASSED** |
| 14 | Next.js Production Build (`npm run build`) | **PASSED** (29 routes, 0 errors) |

---

## 7. How to Run Locally

1. Open your terminal in `frontend`:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
3. Sign in using either:
   - **Phone OTP**: Enter any mobile number (e.g. `+1 555-019-2834`) $\rightarrow$ Click **Send Verification Code** $\rightarrow$ Enter dev code `732109` $\rightarrow$ Enter simulator.
   - **Google OAuth**: Click **Continue with Google (Gmail)** for instant access.
