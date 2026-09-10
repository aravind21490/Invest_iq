# Invest IQ: Authentication Name Enforcement & 2,000+ Global Live Markets

This plan integrates two major enhancements:
1. **Mandatory Name Entry Before Sign-Up**: Enforce that any user signing up on `http://localhost:3000/signup` (via mobile number, Gmail/email, or Google) must enter their Full Name first.
2. **2,000+ Indian & Global Stock Catalog with Second-by-Second Live Data**: Expand market coverage from 35 default Indian stocks to the entire 2,298+ NSE catalog + 100+ premier Global / US market shares (Apple, Nvidia, Microsoft, Tesla, S&P 500, NASDAQ, etc.) with real-time streaming updated up to seconds.

---

## User Review Required

> [!IMPORTANT]
> - **Authentication**: Returning users on the "Sign In" tab can still log in with their phone/email without having to type their name again. New users on "Sign Up" **must** provide their Full Name before any OTP is dispatched or Google sign-in proceeds.
> - **Market Feeds**: Live market data is powered by direct real-time institutional quote streaming with a high-speed 2-second cache TTL and sub-second price-tick flash animations.
> - **Global Currencies**: Indian stocks will display in **₹ (INR)**; Global / US stocks will display in **$ (USD)** with clear badges.

---

## Proposed Changes

### Component 1: Mandatory Full Name on Sign-Up Flow

#### [MODIFY] [`frontend/src/app/signin/page.tsx`](file:///c:/Users/aravi/Invest_iq/frontend/src/app/signin/page.tsx)
- Add interactive tab switcher: **[ Create Account (Sign Up) ]** vs **[ Sign In ]**.
- Auto-detects URL: `/signup` defaults to "Sign Up" mode; `/signin` defaults to "Sign In" mode.
- In "Sign Up" mode:
  - Add styled, accessible **Full Name** input field with a `User` icon and required marker (`*`).
  - Validation: Block submission if `name.trim()` is empty or < 2 characters when attempting phone/email OTP or Google sign-up.
  - Show clear error: *"Please enter your full name before signing up."*
  - Pass the validated `name` to `/api/auth/otp/verify` and `/api/auth/google`.

#### [MODIFY] [`frontend/src/app/signup/page.tsx`](file:///c:/Users/aravi/Invest_iq/frontend/src/app/signup/page.tsx)
- Configure page to explicitly pass `initialMode="signup"` to ensure the Full Name field is immediately displayed.

---

### Component 2: 2,000+ Stocks & Global Market Catalog

#### [NEW] [`frontend/src/lib/global-catalog.ts`](file:///c:/Users/aravi/Invest_iq/frontend/src/lib/global-catalog.ts)
- Comprehensive catalog of **100+ premier Global & US Market Leaders & Benchmark Indices**:
  - **US Tech Giants & Mega-Caps**: `AAPL` (Apple), `NVDA` (Nvidia), `MSFT` (Microsoft), `GOOGL` (Alphabet), `AMZN` (Amazon), `META` (Meta), `TSLA` (Tesla), `BRK-B` (Berkshire Hathaway), `AVGO` (Broadcom), `LLY` (Eli Lilly), `JPM` (JPMorgan), `V` (Visa), `WMT` (Walmart), `MA` (Mastercard), `NFLX` (Netflix), `AMD`, `INTC`, `ORCL`, `CRM`, `PLTR`, `UBER`, `COIN`, `DIS`, `BABA`, `TSM`, `ASML`, `NVO`, `SAP`, `SONY`, etc.
  - **Global Benchmark Indices**: `^GSPC` (S&P 500), `^IXIC` (NASDAQ), `^DJI` (Dow Jones), `^FTSE` (FTSE 100), `^N225` (Nikkei 225), `^GDAXI` (DAX).
- Currency tags (`USD` vs `INR`), market tags (`GLOBAL` vs `NSE`), and sector categorizations.

#### [MODIFY] [`frontend/src/lib/nse-catalog.ts`](file:///c:/Users/aravi/Invest_iq/frontend/src/lib/nse-catalog.ts)
- Combine the **2,298 active Indian NSE equities** with the **Global catalog** into a unified multi-market search and retrieval engine.
- Provide unified search function `searchAllMarkets(query, { market: "all" | "nse" | "global", sector, limit, page })`.

#### [MODIFY] [`frontend/src/lib/market-api.ts`](file:///c:/Users/aravi/Invest_iq/frontend/src/lib/market-api.ts)
- **Smart Symbol Normalization**:
  - Do NOT blindly append `.NS` to global symbols (`AAPL`, `MSFT`, `NVDA`, `^GSPC`, etc.).
  - Distinguish NSE symbols (`RELIANCE.NS`, `TCS.NS`) from US/Global tickers and indices.
- **Sub-Second Live Data Pipeline**:
  - Lower server-side cache TTL from 15,000ms to **2,000ms (2 seconds)** for rapid fresh ticks.
  - Fetch live prices from real-time chart feed with zero latency.

---

### Component 3: Live Real-Time Markets UI with Second-by-Second Updates

#### [MODIFY] [`frontend/src/app/markets/page.tsx`](file:///c:/Users/aravi/Invest_iq/frontend/src/app/markets/page.tsx)
- **Market Switcher Tabs**:
  - 🌐 **All Markets (2,400+ Stocks & Indices)**
  - 🇮🇳 **NSE India (2,298+ Equities)**
  - 🇺🇸 🌍 **Global & US Markets (Top 100+ Mega-Caps & Indices)**
- **Pagination & Infinite Browse**:
  - Allow users to browse through all 2,000+ stocks (e.g. 30 per page with Next/Prev pagination and jump-to-page).
- **Update Frequency Controls**:
  - Selector: ⚡ **2s (Ultra Live)**, **5s (Real-Time)**, **10s**, or **Paused**.
- **Visual Up-To-The-Second Animations**:
  - Live pulsing radar indicator with latency badge (`● LIVE • 2s stream`).
  - **Price Flash Effect**: Highlight stock prices with an instant green flash on uptick (`+`) or red flash on downtick (`-`) when quotes refresh.
- **Currency Awareness**:
  - Correctly render ₹ for Indian stocks and $ for US / Global stocks.

#### [MODIFY] [`frontend/src/app/api/market/search/route.ts`](file:///c:/Users/aravi/Invest_iq/frontend/src/app/api/market/search/route.ts)
- Update search API to search across both Indian (2,298+) and Global (100+) stocks simultaneously, supporting pagination and market filters.

#### [MODIFY] [`frontend/src/app/api/market/quotes/route.ts`](file:///c:/Users/aravi/Invest_iq/frontend/src/app/api/market/quotes/route.ts)
- Lower upstream caching and support arbitrary combinations of NSE and Global tickers.

---

## Verification Plan

### Automated / Browser Verification
1. **Sign-Up Verification**:
   - Navigate to `http://localhost:3000/signup`.
   - Verify that the **Full Name** field is present and marked required.
   - Attempt to click "Continue" or "Continue with Google" without typing a name -> confirm error message blocks submission.
   - Type name `"Aravind Kumar"`, enter phone/email, verify with OTP (`732109`) -> verify dashboard loads and sidebar shows `"Aravind Kumar"` with avatar `"AK"`.
2. **2,000+ Stock Catalog & Pagination Verification**:
   - Navigate to `http://localhost:3000/markets`.
   - Verify the catalog count displays **2,400+ Stocks**.
   - Browse across multiple pages (Page 1, 2, 3...) to confirm all 2,298+ NSE stocks are accessible.
3. **Global Stocks Verification**:
   - Click the **Global & US Markets** filter tab.
   - Verify `AAPL`, `NVDA`, `MSFT`, `TSLA`, `GOOGL`, `AMZN`, `S&P 500 (^GSPC)`, `NASDAQ (^IXIC)` display with live real-time USD prices.
   - Search for `"Apple"` or `"NVDA"` in the search bar -> confirm instant match with live quote.
4. **Second-by-Second Updates & Live Price Flash**:
   - Set refresh rate to **⚡ 2s (Ultra Live)**.
   - Verify prices update every 2 seconds with the visual tick pulse and live time indicator.
