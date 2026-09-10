export interface GlobalStock {
  symbol: string;
  quoteSymbol: string;
  name: string;
  market: "GLOBAL" | "INDEX";
  currency: "USD";
  sector: string;
  category: "large-cap" | "tech" | "international" | "index";
  exchange: "NASDAQ" | "NYSE" | "INDEX";
}

export const GLOBAL_INDICES: GlobalStock[] = [
  {
    symbol: "^GSPC",
    quoteSymbol: "^GSPC",
    name: "S&P 500 Index",
    market: "INDEX",
    currency: "USD",
    sector: "US Benchmark Index",
    category: "index",
    exchange: "INDEX",
  },
  {
    symbol: "^IXIC",
    quoteSymbol: "^IXIC",
    name: "NASDAQ Composite",
    market: "INDEX",
    currency: "USD",
    sector: "Technology Benchmark Index",
    category: "index",
    exchange: "INDEX",
  },
  {
    symbol: "^DJI",
    quoteSymbol: "^DJI",
    name: "Dow Jones Industrial Average",
    market: "INDEX",
    currency: "USD",
    sector: "US Blue-Chip Index",
    category: "index",
    exchange: "INDEX",
  },
  {
    symbol: "^FTSE",
    quoteSymbol: "^FTSE",
    name: "FTSE 100 (London)",
    market: "INDEX",
    currency: "USD",
    sector: "UK Benchmark Index",
    category: "index",
    exchange: "INDEX",
  },
  {
    symbol: "^N225",
    quoteSymbol: "^N225",
    name: "Nikkei 225 (Tokyo)",
    market: "INDEX",
    currency: "USD",
    sector: "Japan Benchmark Index",
    category: "index",
    exchange: "INDEX",
  },
  {
    symbol: "^GDAXI",
    quoteSymbol: "^GDAXI",
    name: "DAX 40 (Frankfurt)",
    market: "INDEX",
    currency: "USD",
    sector: "German Benchmark Index",
    category: "index",
    exchange: "INDEX",
  },
];

export const TOP_GLOBAL_STOCKS: GlobalStock[] = [
  // US Mega-Cap Tech & AI
  { symbol: "NVDA", quoteSymbol: "NVDA", name: "NVIDIA Corporation", market: "GLOBAL", currency: "USD", sector: "Semiconductors & AI", category: "tech", exchange: "NASDAQ" },
  { symbol: "AAPL", quoteSymbol: "AAPL", name: "Apple Inc.", market: "GLOBAL", currency: "USD", sector: "Consumer Technology", category: "tech", exchange: "NASDAQ" },
  { symbol: "MSFT", quoteSymbol: "MSFT", name: "Microsoft Corporation", market: "GLOBAL", currency: "USD", sector: "Software & Cloud", category: "tech", exchange: "NASDAQ" },
  { symbol: "GOOGL", quoteSymbol: "GOOGL", name: "Alphabet Inc. (Google)", market: "GLOBAL", currency: "USD", sector: "Internet & Search", category: "tech", exchange: "NASDAQ" },
  { symbol: "AMZN", quoteSymbol: "AMZN", name: "Amazon.com Inc.", market: "GLOBAL", currency: "USD", sector: "E-Commerce & Cloud", category: "tech", exchange: "NASDAQ" },
  { symbol: "META", quoteSymbol: "META", name: "Meta Platforms Inc.", market: "GLOBAL", currency: "USD", sector: "Social Media & AI", category: "tech", exchange: "NASDAQ" },
  { symbol: "TSLA", quoteSymbol: "TSLA", name: "Tesla Inc.", market: "GLOBAL", currency: "USD", sector: "Automobile & Clean Tech", category: "tech", exchange: "NASDAQ" },
  { symbol: "AVGO", quoteSymbol: "AVGO", name: "Broadcom Inc.", market: "GLOBAL", currency: "USD", sector: "Semiconductors", category: "tech", exchange: "NASDAQ" },
  { symbol: "AMD", quoteSymbol: "AMD", name: "Advanced Micro Devices Inc.", market: "GLOBAL", currency: "USD", sector: "Semiconductors", category: "tech", exchange: "NASDAQ" },
  { symbol: "ORCL", quoteSymbol: "ORCL", name: "Oracle Corporation", market: "GLOBAL", currency: "USD", sector: "Enterprise Cloud & DB", category: "tech", exchange: "NYSE" },
  { symbol: "CRM", quoteSymbol: "CRM", name: "Salesforce Inc.", market: "GLOBAL", currency: "USD", sector: "Cloud Software & CRM", category: "tech", exchange: "NYSE" },
  { symbol: "PLTR", quoteSymbol: "PLTR", name: "Palantir Technologies Inc.", market: "GLOBAL", currency: "USD", sector: "Enterprise AI & Defense", category: "tech", exchange: "NYSE" },
  { symbol: "INTC", quoteSymbol: "INTC", name: "Intel Corporation", market: "GLOBAL", currency: "USD", sector: "Semiconductors", category: "tech", exchange: "NASDAQ" },
  { symbol: "QCOM", quoteSymbol: "QCOM", name: "Qualcomm Inc.", market: "GLOBAL", currency: "USD", sector: "Wireless & Chips", category: "tech", exchange: "NASDAQ" },
  { symbol: "CSCO", quoteSymbol: "CSCO", name: "Cisco Systems Inc.", market: "GLOBAL", currency: "USD", sector: "Networking & Security", category: "tech", exchange: "NASDAQ" },
  { symbol: "ADBE", quoteSymbol: "ADBE", name: "Adobe Inc.", market: "GLOBAL", currency: "USD", sector: "Creative Software & AI", category: "tech", exchange: "NASDAQ" },
  { symbol: "IBM", quoteSymbol: "IBM", name: "International Business Machines", market: "GLOBAL", currency: "USD", sector: "Enterprise IT & Hybrid Cloud", category: "tech", exchange: "NYSE" },
  { symbol: "TXN", quoteSymbol: "TXN", name: "Texas Instruments Inc.", market: "GLOBAL", currency: "USD", sector: "Analog Semiconductors", category: "tech", exchange: "NASDAQ" },
  { symbol: "NOW", quoteSymbol: "NOW", name: "ServiceNow Inc.", market: "GLOBAL", currency: "USD", sector: "Enterprise Workflow", category: "tech", exchange: "NYSE" },
  { symbol: "AMAT", quoteSymbol: "AMAT", name: "Applied Materials Inc.", market: "GLOBAL", currency: "USD", sector: "Semiconductor Equipment", category: "tech", exchange: "NASDAQ" },
  { symbol: "MU", quoteSymbol: "MU", name: "Micron Technology Inc.", market: "GLOBAL", currency: "USD", sector: "Memory & Storage", category: "tech", exchange: "NASDAQ" },
  { symbol: "UBER", quoteSymbol: "UBER", name: "Uber Technologies Inc.", market: "GLOBAL", currency: "USD", sector: "Mobility & Delivery", category: "tech", exchange: "NYSE" },
  { symbol: "ABNB", quoteSymbol: "ABNB", name: "Airbnb Inc.", market: "GLOBAL", currency: "USD", sector: "Online Travel & Hospitality", category: "tech", exchange: "NASDAQ" },
  { symbol: "COIN", quoteSymbol: "COIN", name: "Coinbase Global Inc.", market: "GLOBAL", currency: "USD", sector: "Crypto & Web3 Platform", category: "tech", exchange: "NASDAQ" },
  { symbol: "PYPL", quoteSymbol: "PYPL", name: "PayPal Holdings Inc.", market: "GLOBAL", currency: "USD", sector: "Digital Payments & Fintech", category: "tech", exchange: "NASDAQ" },
  { symbol: "CRWD", quoteSymbol: "CRWD", name: "CrowdStrike Holdings Inc.", market: "GLOBAL", currency: "USD", sector: "Cybersecurity", category: "tech", exchange: "NASDAQ" },
  { symbol: "ARM", quoteSymbol: "ARM", name: "Arm Holdings plc", market: "GLOBAL", currency: "USD", sector: "Chip Architecture", category: "tech", exchange: "NASDAQ" },
  { symbol: "SMCI", quoteSymbol: "SMCI", name: "Super Micro Computer Inc.", market: "GLOBAL", currency: "USD", sector: "AI Server Infrastructure", category: "tech", exchange: "NASDAQ" },

  // US Healthcare & Pharmaceuticals
  { symbol: "LLY", quoteSymbol: "LLY", name: "Eli Lilly and Company", market: "GLOBAL", currency: "USD", sector: "Pharmaceuticals & Biotech", category: "large-cap", exchange: "NYSE" },
  { symbol: "UNH", quoteSymbol: "UNH", name: "UnitedHealth Group Inc.", market: "GLOBAL", currency: "USD", sector: "Managed Healthcare", category: "large-cap", exchange: "NYSE" },
  { symbol: "JNJ", quoteSymbol: "JNJ", name: "Johnson & Johnson", market: "GLOBAL", currency: "USD", sector: "Medical Tech & Pharma", category: "large-cap", exchange: "NYSE" },
  { symbol: "ABBV", quoteSymbol: "ABBV", name: "AbbVie Inc.", market: "GLOBAL", currency: "USD", sector: "Biopharmaceuticals", category: "large-cap", exchange: "NYSE" },
  { symbol: "MRK", quoteSymbol: "MRK", name: "Merck & Co. Inc.", market: "GLOBAL", currency: "USD", sector: "Pharmaceuticals", category: "large-cap", exchange: "NYSE" },
  { symbol: "PFE", quoteSymbol: "PFE", name: "Pfizer Inc.", market: "GLOBAL", currency: "USD", sector: "Biopharmaceuticals", category: "large-cap", exchange: "NYSE" },
  { symbol: "TMO", quoteSymbol: "TMO", name: "Thermo Fisher Scientific Inc.", market: "GLOBAL", currency: "USD", sector: "Life Sciences & Diagnostics", category: "large-cap", exchange: "NYSE" },
  { symbol: "ISRG", quoteSymbol: "ISRG", name: "Intuitive Surgical Inc.", market: "GLOBAL", currency: "USD", sector: "Robotic Surgery", category: "tech", exchange: "NASDAQ" },

  // US Financials & Conglomerates
  { symbol: "BRK-B", quoteSymbol: "BRK-B", name: "Berkshire Hathaway Inc.", market: "GLOBAL", currency: "USD", sector: "Diversified Holdings & Insurance", category: "large-cap", exchange: "NYSE" },
  { symbol: "JPM", quoteSymbol: "JPM", name: "JPMorgan Chase & Co.", market: "GLOBAL", currency: "USD", sector: "Investment & Retail Banking", category: "large-cap", exchange: "NYSE" },
  { symbol: "V", quoteSymbol: "V", name: "Visa Inc.", market: "GLOBAL", currency: "USD", sector: "Payments & Financial Networks", category: "large-cap", exchange: "NYSE" },
  { symbol: "MA", quoteSymbol: "MA", name: "Mastercard Inc.", market: "GLOBAL", currency: "USD", sector: "Payments Technology", category: "large-cap", exchange: "NYSE" },
  { symbol: "BAC", quoteSymbol: "BAC", name: "Bank of America Corporation", market: "GLOBAL", currency: "USD", sector: "Banking & Financials", category: "large-cap", exchange: "NYSE" },
  { symbol: "WFC", quoteSymbol: "WFC", name: "Wells Fargo & Company", market: "GLOBAL", currency: "USD", sector: "Commercial Banking", category: "large-cap", exchange: "NYSE" },
  { symbol: "MS", quoteSymbol: "MS", name: "Morgan Stanley", market: "GLOBAL", currency: "USD", sector: "Investment Banking & Wealth", category: "large-cap", exchange: "NYSE" },
  { symbol: "GS", quoteSymbol: "GS", name: "The Goldman Sachs Group", market: "GLOBAL", currency: "USD", sector: "Investment Banking & Securities", category: "large-cap", exchange: "NYSE" },
  { symbol: "BLK", quoteSymbol: "BLK", name: "BlackRock Inc.", market: "GLOBAL", currency: "USD", sector: "Asset Management & ETFs", category: "large-cap", exchange: "NYSE" },

  // US Consumer, Retail & Entertainment
  { symbol: "WMT", quoteSymbol: "WMT", name: "Walmart Inc.", market: "GLOBAL", currency: "USD", sector: "Retail & Hypermarkets", category: "large-cap", exchange: "NYSE" },
  { symbol: "COST", quoteSymbol: "COST", name: "Costco Wholesale Corporation", market: "GLOBAL", currency: "USD", sector: "Wholesale & Warehouse Clubs", category: "large-cap", exchange: "NASDAQ" },
  { symbol: "HD", quoteSymbol: "HD", name: "The Home Depot Inc.", market: "GLOBAL", currency: "USD", sector: "Home Improvement Retail", category: "large-cap", exchange: "NYSE" },
  { symbol: "PG", quoteSymbol: "PG", name: "Procter & Gamble Company", market: "GLOBAL", currency: "USD", sector: "Consumer Staples & FMCG", category: "large-cap", exchange: "NYSE" },
  { symbol: "KO", quoteSymbol: "KO", name: "The Coca-Cola Company", market: "GLOBAL", currency: "USD", sector: "Beverages & Refreshment", category: "large-cap", exchange: "NYSE" },
  { symbol: "PEP", quoteSymbol: "PEP", name: "PepsiCo Inc.", market: "GLOBAL", currency: "USD", sector: "Beverages & Snacks", category: "large-cap", exchange: "NASDAQ" },
  { symbol: "MCD", quoteSymbol: "MCD", name: "McDonald's Corporation", market: "GLOBAL", currency: "USD", sector: "Fast Food & Franchise", category: "large-cap", exchange: "NYSE" },
  { symbol: "DIS", quoteSymbol: "DIS", name: "The Walt Disney Company", market: "GLOBAL", currency: "USD", sector: "Entertainment, Parks & Media", category: "large-cap", exchange: "NYSE" },
  { symbol: "NFLX", quoteSymbol: "NFLX", name: "Netflix Inc.", market: "GLOBAL", currency: "USD", sector: "Streaming Entertainment", category: "tech", exchange: "NASDAQ" },
  { symbol: "NKE", quoteSymbol: "NKE", name: "Nike Inc.", market: "GLOBAL", currency: "USD", sector: "Footwear & Athletic Apparel", category: "large-cap", exchange: "NYSE" },
  { symbol: "SBUX", quoteSymbol: "SBUX", name: "Starbucks Corporation", market: "GLOBAL", currency: "USD", sector: "Coffee & Food Service", category: "large-cap", exchange: "NASDAQ" },

  // US Energy, Defense & Industrials
  { symbol: "XOM", quoteSymbol: "XOM", name: "Exxon Mobil Corporation", market: "GLOBAL", currency: "USD", sector: "Energy & Oil Supermajor", category: "large-cap", exchange: "NYSE" },
  { symbol: "CVX", quoteSymbol: "CVX", name: "Chevron Corporation", market: "GLOBAL", currency: "USD", sector: "Oil & Gas Supermajor", category: "large-cap", exchange: "NYSE" },
  { symbol: "CAT", quoteSymbol: "CAT", name: "Caterpillar Inc.", market: "GLOBAL", currency: "USD", sector: "Heavy Machinery & Construction", category: "large-cap", exchange: "NYSE" },
  { symbol: "GE", quoteSymbol: "GE", name: "GE Aerospace", market: "GLOBAL", currency: "USD", sector: "Aerospace & Jet Engines", category: "large-cap", exchange: "NYSE" },
  { symbol: "BA", quoteSymbol: "BA", name: "The Boeing Company", market: "GLOBAL", currency: "USD", sector: "Commercial Jets & Defense", category: "large-cap", exchange: "NYSE" },
  { symbol: "LMT", quoteSymbol: "LMT", name: "Lockheed Martin Corporation", market: "GLOBAL", currency: "USD", sector: "Aerospace & Defense Systems", category: "large-cap", exchange: "NYSE" },
  { symbol: "RTX", quoteSymbol: "RTX", name: "RTX Corporation (Raytheon)", market: "GLOBAL", currency: "USD", sector: "Defense & Aviation Tech", category: "large-cap", exchange: "NYSE" },

  // International ADR Leaders
  { symbol: "TSM", quoteSymbol: "TSM", name: "Taiwan Semiconductor Mfg. Co.", market: "GLOBAL", currency: "USD", sector: "Foundry & Advanced Chips", category: "international", exchange: "NYSE" },
  { symbol: "ASML", quoteSymbol: "ASML", name: "ASML Holding N.V.", market: "GLOBAL", currency: "USD", sector: "EUV Photolithography", category: "international", exchange: "NASDAQ" },
  { symbol: "BABA", quoteSymbol: "BABA", name: "Alibaba Group Holding Ltd.", market: "GLOBAL", currency: "USD", sector: "E-Commerce & Cloud", category: "international", exchange: "NYSE" },
  { symbol: "NVO", quoteSymbol: "NVO", name: "Novo Nordisk A/S", market: "GLOBAL", currency: "USD", sector: "Diabetes & Obesity Care", category: "international", exchange: "NYSE" },
  { symbol: "SAP", quoteSymbol: "SAP", name: "SAP SE", market: "GLOBAL", currency: "USD", sector: "Enterprise Resource Software", category: "international", exchange: "NYSE" },
  { symbol: "SONY", quoteSymbol: "SONY", name: "Sony Group Corporation", market: "GLOBAL", currency: "USD", sector: "Gaming, Entertainment & Sensors", category: "international", exchange: "NYSE" },
  { symbol: "TM", quoteSymbol: "TM", name: "Toyota Motor Corporation", market: "GLOBAL", currency: "USD", sector: "Automobile & Hybrid EV", category: "international", exchange: "NYSE" },
  { symbol: "AZN", quoteSymbol: "AZN", name: "AstraZeneca PLC", market: "GLOBAL", currency: "USD", sector: "Biopharmaceuticals & Oncology", category: "international", exchange: "NASDAQ" },
  { symbol: "SHEL", quoteSymbol: "SHEL", name: "Shell plc", market: "GLOBAL", currency: "USD", sector: "Integrated Energy & LNG", category: "international", exchange: "NYSE" },
];

// Unified quick lookup map
export const GLOBAL_STOCKS_MAP = new Map<string, GlobalStock>();
[...GLOBAL_INDICES, ...TOP_GLOBAL_STOCKS].forEach((s) => {
  GLOBAL_STOCKS_MAP.set(s.symbol.toUpperCase(), s);
  GLOBAL_STOCKS_MAP.set(s.quoteSymbol.toUpperCase(), s);
});

export function isGlobalSymbol(sym: string): boolean {
  const clean = sym.trim().toUpperCase().replace(/\.NS$/, "").replace(/\.BO$/, "");
  return GLOBAL_STOCKS_MAP.has(clean) || clean.startsWith("^");
}
