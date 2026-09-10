export interface TickerInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  marketCap: string;
  volume: string;
  logoBg: string;
  logoLetter: string;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL";
  shares: number;
  price: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
  timestamp: string;
  status: "Filled" | "Pending" | "Cancelled";
}

export interface AISignal {
  id: string;
  symbol: string;
  name: string;
  title: string;
  indicator: string;
  confidence: number;
  type: "BULLISH" | "BEARISH" | "NEUTRAL";
  timeframe: string;
  priceAtSignal: number;
  summary: string;
  whyItMatters: string;
  suggestedAction: string;
  riskNote: string;
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  sector: string;
  portfolioWeight: number;
  stopLoss?: number;
  takeProfit?: number;
}

export const TICKERS: Record<string, TickerInfo> = {
  "RELIANCE.NS": {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries",
    price: 1274.0,
    change: 12.4,
    changePercent: 0.98,
    sector: "Energy & Conglomerate",
    marketCap: "₹18.8L Cr",
    volume: "4.2M",
    logoBg: "bg-blue-600 text-white",
    logoLetter: "R",
  },
  "TCS.NS": {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    price: 2204.1,
    change: -14.2,
    changePercent: -0.64,
    sector: "Information Technology",
    marketCap: "₹14.2L Cr",
    volume: "2.1M",
    logoBg: "bg-indigo-600 text-white",
    logoLetter: "T",
  },
  "HDFCBANK.NS": {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    price: 693.8,
    change: 4.6,
    changePercent: 0.67,
    sector: "Banking & Financials",
    marketCap: "₹13.1L Cr",
    volume: "8.9M",
    logoBg: "bg-sky-600 text-white",
    logoLetter: "H",
  },
  "INFY.NS": {
    symbol: "INFY.NS",
    name: "Infosys Limited",
    price: 1036.5,
    change: 8.2,
    changePercent: 0.8,
    sector: "Information Technology",
    marketCap: "₹7.4L Cr",
    volume: "5.3M",
    logoBg: "bg-violet-600 text-white",
    logoLetter: "I",
  },
  "ICICIBANK.NS": {
    symbol: "ICICIBANK.NS",
    name: "ICICI Bank Limited",
    price: 1230.4,
    change: 14.2,
    changePercent: 1.17,
    sector: "Banking & Financials",
    marketCap: "₹8.6L Cr",
    volume: "6.9M",
    logoBg: "bg-orange-600 text-white",
    logoLetter: "IC",
  },
  "SBIN.NS": {
    symbol: "SBIN.NS",
    name: "State Bank of India",
    price: 1009.7,
    change: 11.3,
    changePercent: 1.13,
    sector: "PSU Banking",
    marketCap: "₹9.0L Cr",
    volume: "14.2M",
    logoBg: "bg-amber-600 text-white",
    logoLetter: "SB",
  },
  "TMPV.NS": {
    symbol: "TMPV.NS",
    name: "Tata Motors Pass. Vehicles",
    price: 984.6,
    change: 20.7,
    changePercent: 2.15,
    sector: "Automobile & EV",
    marketCap: "₹3.6L Cr",
    volume: "8.5M",
    logoBg: "bg-emerald-600 text-white",
    logoLetter: "TM",
  },
  "BHARTIARTL.NS": {
    symbol: "BHARTIARTL.NS",
    name: "Bharti Airtel Limited",
    price: 1839.0,
    change: 22.5,
    changePercent: 1.24,
    sector: "Telecommunications",
    marketCap: "₹10.5L Cr",
    volume: "4.1M",
    logoBg: "bg-red-600 text-white",
    logoLetter: "BA",
  },
  "ITC.NS": {
    symbol: "ITC.NS",
    name: "ITC Limited",
    price: 259.3,
    change: 1.8,
    changePercent: 0.7,
    sector: "FMCG & Consumer",
    marketCap: "₹5.8L Cr",
    volume: "11.2M",
    logoBg: "bg-yellow-600 text-white",
    logoLetter: "ITC",
  },
  "LT.NS": {
    symbol: "LT.NS",
    name: "Larsen & Toubro Limited",
    price: 3955.0,
    change: 42.0,
    changePercent: 1.07,
    sector: "Infrastructure & Engineering",
    marketCap: "₹5.4L Cr",
    volume: "1.8M",
    logoBg: "bg-yellow-700 text-white",
    logoLetter: "LT",
  },
  "HAL.NS": {
    symbol: "HAL.NS",
    name: "Hindustan Aeronautics (HAL)",
    price: 4950.0,
    change: 85.0,
    changePercent: 1.75,
    sector: "Defense & Aerospace (PSU)",
    marketCap: "₹3.3L Cr",
    volume: "2.4M",
    logoBg: "bg-blue-700 text-white",
    logoLetter: "HAL",
  },
  "BEL.NS": {
    symbol: "BEL.NS",
    name: "Bharat Electronics Limited",
    price: 405.0,
    change: 6.8,
    changePercent: 1.71,
    sector: "Defense & Aerospace (PSU)",
    marketCap: "₹2.9L Cr",
    volume: "6.8M",
    logoBg: "bg-teal-600 text-white",
    logoLetter: "BEL",
  },
  "IRFC.NS": {
    symbol: "IRFC.NS",
    name: "Indian Railway Finance Corp",
    price: 81.1,
    change: 1.4,
    changePercent: 1.76,
    sector: "Railways & Infra (PSU)",
    marketCap: "₹1.1L Cr",
    volume: "18.5M",
    logoBg: "bg-red-700 text-white",
    logoLetter: "IR",
  },
  "RVNL.NS": {
    symbol: "RVNL.NS",
    name: "Rail Vikas Nigam Limited",
    price: 205.6,
    change: 3.2,
    changePercent: 1.58,
    sector: "Railways & Infra (PSU)",
    marketCap: "₹42.8K Cr",
    volume: "9.2M",
    logoBg: "bg-amber-700 text-white",
    logoLetter: "RV",
  },
  "SUZLON.NS": {
    symbol: "SUZLON.NS",
    name: "Suzlon Energy Limited",
    price: 44.2,
    change: 0.9,
    changePercent: 2.08,
    sector: "Renewable Energy",
    marketCap: "₹60.2K Cr",
    volume: "35.2M",
    logoBg: "bg-emerald-500 text-white",
    logoLetter: "SZ",
  },
  "ETERNAL.NS": {
    symbol: "ETERNAL.NS",
    name: "Eternal Limited (Zomato/Blinkit)",
    price: 322.1,
    change: 5.4,
    changePercent: 1.7,
    sector: "Consumer Tech & Quick Commerce",
    marketCap: "₹2.8L Cr",
    volume: "14.8M",
    logoBg: "bg-rose-600 text-white",
    logoLetter: "Z",
  },
  "JIOFIN.NS": {
    symbol: "JIOFIN.NS",
    name: "Jio Financial Services",
    price: 230.2,
    change: 2.8,
    changePercent: 1.23,
    sector: "Fintech & Financials",
    marketCap: "₹1.4L Cr",
    volume: "12.1M",
    logoBg: "bg-blue-500 text-white",
    logoLetter: "JF",
  },
  "MARUTI.NS": {
    symbol: "MARUTI.NS",
    name: "Maruti Suzuki India",
    price: 12590.0,
    change: 140.0,
    changePercent: 1.12,
    sector: "Automobile & EV",
    marketCap: "₹3.9L Cr",
    volume: "450K",
    logoBg: "bg-blue-800 text-white",
    logoLetter: "MS",
  },
  "BAJFINANCE.NS": {
    symbol: "BAJFINANCE.NS",
    name: "Bajaj Finance Limited",
    price: 1043.5,
    change: -8.5,
    changePercent: -0.81,
    sector: "NBFC & Financials",
    marketCap: "₹6.4L Cr",
    volume: "1.9M",
    logoBg: "bg-indigo-700 text-white",
    logoLetter: "BF",
  },
  "SUNPHARMA.NS": {
    symbol: "SUNPHARMA.NS",
    name: "Sun Pharma Industries",
    price: 1861.0,
    change: 18.0,
    changePercent: 0.98,
    sector: "Healthcare & Pharma",
    marketCap: "₹4.4L Cr",
    volume: "1.6M",
    logoBg: "bg-orange-700 text-white",
    logoLetter: "SP",
  },
  "TITAN.NS": {
    symbol: "TITAN.NS",
    name: "Titan Company Limited",
    price: 5021.0,
    change: 62.0,
    changePercent: 1.25,
    sector: "Consumer & Jewelry",
    marketCap: "₹4.4L Cr",
    volume: "820K",
    logoBg: "bg-purple-700 text-white",
    logoLetter: "TI",
  },
  "TATASTEEL.NS": {
    symbol: "TATASTEEL.NS",
    name: "Tata Steel Limited",
    price: 186.8,
    change: 2.1,
    changePercent: 1.14,
    sector: "Metals & Mining",
    marketCap: "₹2.3L Cr",
    volume: "16.4M",
    logoBg: "bg-slate-700 text-white",
    logoLetter: "TS",
  },
  "ADANIENT.NS": {
    symbol: "ADANIENT.NS",
    name: "Adani Enterprises",
    price: 3077.2,
    change: 45.0,
    changePercent: 1.48,
    sector: "Infrastructure & Conglomerate",
    marketCap: "₹3.5L Cr",
    volume: "2.1M",
    logoBg: "bg-zinc-800 text-white",
    logoLetter: "AE",
  },
};

export const INITIAL_HOLDINGS_CARDS = [
  {
    id: "nifty-blue-chip",
    title: "NIFTY 50 Blue-Chip Core",
    badge: "Core Alpha",
    symbols: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"],
    value: 185327.0,
    change24h: 1.28,
    shareOfPortfolio: 38.6,
    accentColor: "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
  },
  {
    id: "defense-auto-psu",
    title: "Defense & Auto Growth",
    badge: "High Beta",
    symbols: ["HAL.NS", "TMPV.NS", "BEL.NS"],
    value: 133326.0,
    change24h: 1.95,
    shareOfPortfolio: 27.8,
    accentColor: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
  },
  {
    id: "tech-digital-future",
    title: "IT & Digital Leaders",
    badge: "Export & Tech",
    symbols: ["INFY.NS", "TCS.NS", "ETERNAL.NS"],
    value: 117948.0,
    change24h: 0.85,
    shareOfPortfolio: 24.5,
    accentColor: "from-amber-500/10 to-rose-500/10 border-amber-500/20",
  },
];

export const INITIAL_TRADES: TradeRecord[] = [
  {
    id: "ORD-94812",
    symbol: "RELIANCE.NS",
    name: "Reliance Industries Limited",
    type: "BUY",
    shares: 50,
    price: 1250.0,
    amount: 62500.0,
    pnl: 1200.0,
    pnlPercent: 1.92,
    timestamp: "2026-09-10 09:30 AM",
    status: "Filled",
  },
  {
    id: "ORD-94789",
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    type: "BUY",
    shares: 30,
    price: 2160.0,
    amount: 64800.0,
    pnl: 1323.0,
    pnlPercent: 2.04,
    timestamp: "2026-09-09 02:15 PM",
    status: "Filled",
  },
  {
    id: "ORD-94650",
    symbol: "TMPV.NS",
    name: "Tata Motors Pass. Vehicles",
    type: "BUY",
    shares: 60,
    price: 950.0,
    amount: 57000.0,
    pnl: 2076.0,
    pnlPercent: 3.64,
    timestamp: "2026-09-07 11:45 AM",
    status: "Filled",
  },
  {
    id: "ORD-94511",
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    type: "BUY",
    shares: 80,
    price: 680.0,
    amount: 54400.0,
    pnl: 1104.0,
    pnlPercent: 2.03,
    timestamp: "2026-09-05 10:10 AM",
    status: "Filled",
  },
  {
    id: "ORD-94420",
    symbol: "HAL.NS",
    name: "Hindustan Aeronautics Limited",
    type: "BUY",
    shares: 15,
    price: 4800.0,
    amount: 72000.0,
    pnl: 2250.0,
    pnlPercent: 3.13,
    timestamp: "2026-09-04 01:20 PM",
    status: "Filled",
  },
];

export const INITIAL_POSITIONS: Position[] = [
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries Limited",
    shares: 50,
    avgBuyPrice: 1250.0,
    currentPrice: 1274.0,
    totalValue: 63700.0,
    unrealizedPnL: 1200.0,
    unrealizedPnLPercent: 1.92,
    sector: "Energy & Conglomerate",
    portfolioWeight: 21.3,
    stopLoss: 1220.0,
    takeProfit: 1350.0,
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    shares: 30,
    avgBuyPrice: 2160.0,
    currentPrice: 2204.1,
    totalValue: 66123.0,
    unrealizedPnL: 1323.0,
    unrealizedPnLPercent: 2.04,
    sector: "Information Technology",
    portfolioWeight: 22.1,
    stopLoss: 2100.0,
    takeProfit: 2350.0,
  },
  {
    symbol: "TMPV.NS",
    name: "Tata Motors Pass. Vehicles",
    shares: 60,
    avgBuyPrice: 950.0,
    currentPrice: 984.6,
    totalValue: 59076.0,
    unrealizedPnL: 2076.0,
    unrealizedPnLPercent: 3.64,
    sector: "Automobile & EV",
    portfolioWeight: 19.8,
    stopLoss: 920.0,
    takeProfit: 1080.0,
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    shares: 80,
    avgBuyPrice: 680.0,
    currentPrice: 693.8,
    totalValue: 55504.0,
    unrealizedPnL: 1104.0,
    unrealizedPnLPercent: 2.03,
    sector: "Banking & Financials",
    portfolioWeight: 18.6,
    stopLoss: 660.0,
    takeProfit: 740.0,
  },
  {
    symbol: "HAL.NS",
    name: "Hindustan Aeronautics Limited",
    shares: 15,
    avgBuyPrice: 4800.0,
    currentPrice: 4950.0,
    totalValue: 74250.0,
    unrealizedPnL: 2250.0,
    unrealizedPnLPercent: 3.13,
    sector: "Defense & Aerospace",
    portfolioWeight: 24.9,
    stopLoss: 4650.0,
    takeProfit: 5400.0,
  },
];

export const PRIMARY_AI_SIGNAL: AISignal = {
  id: "SIG-REL-01",
  symbol: "RELIANCE.NS",
  name: "Reliance Industries Limited",
  title: "RSI Oversold Bounce + MACD Bullish Divergence",
  indicator: "14-Day RSI (31.2) & MACD (12, 26, 9)",
  confidence: 89,
  type: "BULLISH",
  timeframe: "Daily Chart (NSE)",
  priceAtSignal: 1274.0,
  summary:
    "RELIANCE's 14-day Relative Strength Index touched strong psychological support at ₹1,250 while the MACD histogram formed a bullish divergence on the NSE daily timeframe.",
  whyItMatters:
    "Heavyweight benchmark stocks with positive divergence often lead broad market rallies. This paper-trade setup tests entering with high statistical reward-to-risk.",
  suggestedAction:
    "Simulate Buy with stop-loss at ₹1,220.00 and primary target at ₹1,340.00 (2.5:1 Risk-Reward Ratio).",
  riskNote:
    "Global crude oil fluctuations and refining margin adjustments may impact near-term price swings.",
};

export const SECONDARY_AI_SIGNALS: AISignal[] = [
  {
    id: "SIG-TCS-02",
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    title: "Bollinger Band Squeeze Breakout",
    indicator: "Bollinger Bands (20, 2) & Volume Expansion",
    confidence: 84,
    type: "BULLISH",
    timeframe: "4-Hour Chart",
    priceAtSignal: 2204.1,
    summary:
      "TCS consolidated tightly near ₹2,180 with contracting volatility before printing a strong green candle piercing the upper band on above-average institutional volume.",
    whyItMatters:
      "A squeeze indicates agreement on fair value; the resulting expansion usually leads to multi-day continuation trends.",
    suggestedAction:
      "Practice trailing stop execution: advance stop-loss to the 20-period EMA as price advances.",
    riskNote: "Global tech spending reports may create sudden intraday volatility.",
  },
  {
    id: "SIG-TMPV-03",
    symbol: "TMPV.NS",
    name: "Tata Motors Pass. Vehicles",
    title: "EV Market Volume Expansion Breakout",
    indicator: "Pattern Recognition & 50-Day EMA",
    confidence: 82,
    type: "BULLISH",
    timeframe: "Daily Chart",
    priceAtSignal: 984.6,
    summary:
      "Price crossed firmly above the ₹975 resistance barrier backed by record monthly domestic EV delivery figures.",
    whyItMatters:
      "Fundamental delivery milestones backing technical breakouts historically produce clean trend continuation in Indian equities.",
    suggestedAction:
      "Simulate Long position with initial stop-loss at ₹945.00 and trailing target of ₹1,060.00.",
    riskNote: "Semiconductor supply chain shifts can temporarily stall momentum.",
  },
];

export const CHART_DATA_SERIES: Record<
  string,
  { label: string; portfolio: number; benchmark: number }[]
> = {
  "1D": [
    { label: "09:15", portfolio: 500000, benchmark: 500000 },
    { label: "10:30", portfolio: 504200, benchmark: 501800 },
    { label: "11:30", portfolio: 508600, benchmark: 503400 },
    { label: "12:30", portfolio: 506900, benchmark: 502800 },
    { label: "13:30", portfolio: 512400, benchmark: 505200 },
    { label: "14:30", portfolio: 516800, benchmark: 507400 },
    { label: "15:15", portfolio: 518600, benchmark: 508200 },
    { label: "15:30", portfolio: 519250, benchmark: 508900 },
  ],
  "1W": [
    { label: "Mon", portfolio: 495000, benchmark: 494000 },
    { label: "Tue", portfolio: 502000, benchmark: 498500 },
    { label: "Wed", portfolio: 508400, benchmark: 503200 },
    { label: "Thu", portfolio: 514200, benchmark: 506800 },
    { label: "Fri", portfolio: 519250, benchmark: 508900 },
  ],
  "1M": [
    { label: "Aug 10", portfolio: 468000, benchmark: 472000 },
    { label: "Aug 18", portfolio: 481000, benchmark: 483500 },
    { label: "Aug 26", portfolio: 494000, benchmark: 492800 },
    { label: "Sep 03", portfolio: 506500, benchmark: 501400 },
    { label: "Sep 10", portfolio: 519250, benchmark: 508900 },
  ],
  "3M": [
    { label: "Jun", portfolio: 432000, benchmark: 440000 },
    { label: "Jul", portfolio: 462000, benchmark: 465000 },
    { label: "Aug", portfolio: 491000, benchmark: 488000 },
    { label: "Sep", portfolio: 519250, benchmark: 508900 },
  ],
  "1Y": [
    { label: "Oct", portfolio: 395000, benchmark: 410000 },
    { label: "Dec", portfolio: 425000, benchmark: 432000 },
    { label: "Feb", portfolio: 452000, benchmark: 455000 },
    { label: "Apr", portfolio: 478000, benchmark: 472000 },
    { label: "Jun", portfolio: 498000, benchmark: 490000 },
    { label: "Sep", portfolio: 519250, benchmark: 508900 },
  ],
  ALL: [
    { label: "2024 Q1", portfolio: 400000, benchmark: 400000 },
    { label: "2024 Q3", portfolio: 438000, benchmark: 432000 },
    { label: "2025 Q1", portfolio: 469000, benchmark: 460000 },
    { label: "2025 Q3", portfolio: 495000, benchmark: 486000 },
    { label: "2026 Q3", portfolio: 519250, benchmark: 508900 },
  ],
};

export const TUTORIAL_MODULES = [
  {
    id: "tut-1",
    title: "Understanding Indian Paper Trading vs Real Capital",
    desc: "Learn how simulated paper trading on the National Stock Exchange (NSE) tests strategies without capital risk.",
    duration: "3 mins",
    completed: true,
  },
  {
    id: "tut-2",
    title: "How to Read NSE Candlestick Charts & Price Action",
    desc: "Understand open, high, low, close (OHLC) candles and recognizing Indian equity support & resistance zones.",
    duration: "5 mins",
    completed: true,
  },
  {
    id: "tut-3",
    title: "RSI & MACD Momentum Indicators for Indian Equities",
    desc: "Plain-English guide to identifying overbought/oversold extremes in Nifty 50 and Midcap shares.",
    duration: "6 mins",
    completed: true,
  },
  {
    id: "tut-4",
    title: "Mastering Stop-Loss Orders & Risk-Reward in Rupees (₹)",
    desc: "Why position sizing and calculating 2:1 reward/risk in ₹ matters more than win rate alone.",
    duration: "4 mins",
    completed: false,
    active: true,
  },
  {
    id: "tut-5",
    title: "Portfolio Diversification Across NSE Sectors",
    desc: "Balancing exposure across Banking, IT, Defense, Automobile, Energy, and cash reserves in ₹.",
    duration: "7 mins",
    completed: false,
  },
  {
    id: "tut-6",
    title: "Interpreting AI Market Signals Without FOMO",
    desc: "How to validate automated algorithmic flags using multi-timeframe analysis on Indian market hours (09:15 - 15:30 IST).",
    duration: "5 mins",
    completed: false,
  },
];
