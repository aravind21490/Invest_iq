# Invest IQ — Project Folder Structure Overview

This document provides a comprehensive map of all files, directories, and modules in the **Invest IQ** platform located at `c:\Users\aravi\Invest_iq`.

---

## High-Level Platform Architecture

Invest IQ is architected as a **dual-engine fintech platform**:
1. **Next.js 16 Web Application Hub** (`frontend/`): Modern React 19 UI with Tailwind CSS v4, real-time quote streaming for 2,400+ Indian & Global securities, notifications drawer, and dark/light mode engine running on `http://localhost:3000/`.
2. **Python Technical Engine & Scanner** (Root files): High-performance calculation server providing technical indicators (RSI, MACD, Bollinger Bands), market regime simulation, and Zerodha Kite broker paper-trading bridge.

---

## Detailed Directory Tree

```
c:\Users\aravi\Invest_iq\
│
├── 📁 Project Folder Structure Overview/       # Project structural map and inventory documentation
│   ├── 📄 PROJECT_FOLDER_STRUCTURE_OVERVIEW.md# Full platform file tree and directory map
│   └── 📄 README.md                           # Quick index of the directory structure
│
├── 📁 docs/                                   # Architectural Design & Verification Documents
│   ├── 📄 WALKTHROUGH.md                      # Detailed verification results, screenshots & completed features
│   └── 📄 IMPLEMENTATION_PLAN.md              # Technical design plan & feature specs
│
├── 📁 frontend/                               # Next.js 16 (React 19) Full-Stack Web Application (http://localhost:3000/)
│   ├── 📁 src/
│   │   ├── 📁 app/                            # App Router Pages & API Endpoints
│   │   │   ├── 📄 globals.css                 # Tailwind v4 dark/light mode engine (@custom-variant dark) & design tokens
│   │   │   ├── 📄 layout.tsx                  # Root HTML layout with ThemeProvider and SimulatorProvider
│   │   │   ├── 📄 page.tsx                    # Main Executive Dashboard
│   │   │   ├── 📁 signin/                     # Sign In page with interactive tab toggle
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 signup/                     # Sign Up page with mandatory Full Name validation
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 markets/                    # 2,400+ Indian & Global Live Markets with 2s live streaming ticks
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 trade/                      # Live Trade Terminal with order book, depth & USD/INR support
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 portfolio/                  # Detailed portfolio allocations & breakdown
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 positions/                  # Open positions with live unrealized PnL
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 watchlist/                  # Real-time multi-asset watchlist
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 orders/                     # Order history, fills, and audit logs
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 accounts/                   # Simulated capital & cash balance management
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 analytics/                  # Trader metrics (win-rate, Sharpe ratio, max drawdown)
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 leaderboard/                # Trader rankings & simulated performance tiers
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 settings/                   # User profile, theme settings & risk parameters
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 learn/                      # Technical academy, plain-English tutorials & AI signals
│   │   │   │   ├── 📁 signals/page.tsx        # Real-time AI signals with confidence scores
│   │   │   │   ├── 📁 tutorials/page.tsx      # Step-by-step interactive lessons
│   │   │   │   └── 📁 insights/page.tsx       # Market analysis & macro regime insights
│   │   │   └── 📁 api/                        # Next.js Serverless API Route Handlers
│   │   │       ├── 📁 market/                 # /api/market/quotes, /api/market/search, /api/market/chart
│   │   │       ├── 📁 auth/                   # /api/auth/otp/send, /api/auth/otp/verify, /api/auth/google
│   │   │       └── 📁 user/                   # /api/user/portfolio, /api/user/trade, /api/user/learn
│   │   │
│   │   ├── 📁 components/                     # Modular Reusable React UI Components
│   │   │   ├── 📁 layout/
│   │   │   │   ├── 📄 notifications-drawer.tsx # Slide-over Alerts & Signals Drawer with filters and actions
│   │   │   │   ├── 📄 topbar.tsx              # Sticky header with Bell icon (unread badge) + Sun/Moon toggle
│   │   │   │   ├── 📄 sidebar.tsx             # Collapsible navigation with interactive Alerts & Signals button
│   │   │   │   ├── 📄 app-shell.tsx           # Main application frame mounting drawer & command palette
│   │   │   │   └── 📄 command-palette.tsx     # Global ⌘K search modal
│   │   │   ├── 📁 dashboard/
│   │   │   │   ├── 📄 portfolio-chart.tsx     # Financial Overview chart with 2026 live streaming & 2021-2025 real historical data
│   │   │   │   ├── 📄 account-mini-cards.tsx  # High-contrast obsidian/titanium virtual Demat card
│   │   │   │   ├── 📄 quick-trade.tsx         # Fast paper trade widget with Buy/Sell execution buttons
│   │   │   │   ├── 📄 recent-trades.tsx       # Live trade execution table
│   │   │   │   ├── 📄 risk-meter.tsx          # Portfolio risk & diversification score gauge
│   │   │   │   └── 📄 portfolio-flow.tsx      # Capital flow & monthly performance visualization
│   │   │   ├── 📁 markets/
│   │   │   │   └── 📄 market-detail-drawer.tsx# Detailed stock quote inspector with dynamic USD/INR tags
│   │   │   ├── 📁 auth/
│   │   │   │   └── 📄 auth-layout.tsx         # Authentication split-panel layout
│   │   │   └── 📄 theme-provider.tsx          # next-themes dark/light provider
│   │   │
│   │   └── 📁 lib/                            # Business Logic, Data Catalogs & State Management
│   │       ├── 📄 financial-history.ts        # 69 months real institutional close data (Nifty 50 & S&P 500) for 2021-2026
│   │       ├── 📄 global-catalog.ts           # 100+ premier Global / US Market Leaders & Benchmark Indices
│   │       ├── 📄 nse-catalog.ts              # Unified index of all 2,298+ active Indian NSE stocks
│   │       ├── 📄 market-api.ts               # Streaming quote engine with 2-second cache TTL
│   │       ├── 📄 store.tsx                   # Central simulation store (notifications, trades, cash)
│   │       ├── 📄 utils.ts                    # Formatters for currency ($ USD / ₹ INR) and percentages
│   │       ├── 📄 mock-data.ts                # Simulation seeds & fallback market structures
│   │       ├── 📄 db.ts                       # Client-side persistence and cache engine
│   │       ├── 📄 auth-service.ts             # Session & token authentication handlers
│   │       └── 📄 curriculum-data.ts          # Structured technical indicator learning courses
│   │
│   ├── 📄 package.json                        # Node dependencies & run scripts
│   ├── 📄 tsconfig.json                       # TypeScript compiler options
│   └── 📄 next.config.ts                      # Next.js build & proxy configuration
│
├── 📁 templates/                              # Python Flask Jinja2 HTML Templates
│   ├── 📄 base.html                           # Base layout with sidebar, topbar & Kite bridge
│   ├── 📄 dashboard.html                      # Flask dashboard view
│   ├── 📄 portfolio.html                      # Flask portfolio view
│   ├── 📄 screener.html                       # 50+ NSE technical indicator screener
│   ├── 📄 stock_detail.html                   # Individual stock deep-dive with RSI/MACD
│   ├── 📄 broker_settings.html                # Zerodha Kite Connect credentials configuration
│   ├── 📄 learn.html                          # Indicator academy view
│   ├── 📄 report.html                         # Downloadable audit & tax report
│   ├── 📄 login.html                          # Flask login page
│   └── 📄 register.html                       # Flask registration page
│
├── 📁 static/                                 # Static Assets for Flask Engine
│   └── 📄 style.css                           # shadcn-fintech CSS design system for Flask
│
├── 📁 tests/                                  # Automated Test Suite
│   └── 📄 test_end_to_end_verification.py     # End-to-end verification tests
│
├── 📄 app.py                                  # Core Python Backend Server & API routes
├── 📄 scanner.py                              # Technical indicator market scanner (RSI, MACD, BB)
├── 📄 data_provider.py                        # Live market data fetcher & historical replay
├── 📄 portfolio.py                            # PnL, brokerage, taxes & portfolio calculations
├── 📄 indicators.py                           # Technical indicator algorithms (RSI, MACD, Bollinger Bands)
├── 📄 explainer.py                            # Plain-English AI signal explanations
├── 📄 broker_kite.py                          # Zerodha Kite Connect API paper bridge
├── 📄 models.py                               # SQLite database ORM & data access models
├── 📄 nse_catalog.py                          # Python NSE catalog helper
├── 📄 signal_stats.py                         # Win-rate & historical indicator backtest engine
├── 📄 build_history.py                        # Multi-year historical benchmark extractor (YFinance)
├── 📄 all_monthly_history.json                # 2021-2026 Nifty 50 and S&P 500 monthly closing prices
├── 📄 generate_pdf.py                         # Project Overview & audit journal PDF generator
│
├── 📄 Invest_IQ_Project_Overview.pdf          # Full Project Overview in PDF format
├── 📄 investiq.db                             # Primary SQLite Database (users, trades, signals)
├── 📄 finsim.db                               # Simulation Database (holdings, cash ledger)
│
├── 📄 requirements.txt                        # Python package dependencies
├── 📄 start.bat                               # Windows Batch start script (launches both servers)
├── 📄 start.ps1                               # PowerShell start script
├── 📄 DEPLOYMENT.md                           # Cloud deployment guide (Render, Vercel, Railway)
└── 📄 PROJECT_OVERVIEW.md                     # Platform architecture & feature summary
```

---

## Key Modules & Component Responsibilities

### 1. Unified Frontend Hub (`frontend/`)
* **Technology**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts.
* **Server Address**: `http://localhost:3000/`.
* **State Management**: React Context (`store.tsx`) handling real-time trade execution, cash balance deductions, live positions tracking, and notifications.
* **Theme System**: Full light/dark mode support with `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`.
* **Catalog Coverage**:
  * All 2,298+ Indian NSE equities in Indian Rupees (`₹`).
  * 100+ Global / US market securities and benchmark indices in US Dollars (`$`).

### 2. Python Backend & Screener Engine (`root`)
* **Technology**: Python 3.10+, Flask, SQLite3, Pandas, NumPy, YFinance.
* **Server Address**: `http://127.0.0.1:5000/`.
* **Calculations**: Ground-truth mathematical indicators (14-period Wilder RSI, EMA-12/26 MACD, 20-period 2-std dev Bollinger Bands).
* **Broker Bridge**: Mock Zerodha Kite Connect API credentials authentication and paper trade routing.
