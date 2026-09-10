import nseRawCatalog from "../../data/nse_catalog.json";

export interface NseStock {
  symbol: string;
  nseSymbol: string; // Ticker formatted for upstream quote engine, e.g. RELIANCE.NS
  name: string;
  series: string;
  isin: string;
  sector: string;
  category: "large-cap" | "mid-cap" | "small-cap" | "index";
}

// Known Sector overrides for Premier Indian Stocks
const SECTOR_OVERRIDES: Record<string, { sector: string; category: "large-cap" | "mid-cap" | "small-cap" }> = {
  RELIANCE: { sector: "Energy & Conglomerate", category: "large-cap" },
  TCS: { sector: "Information Technology", category: "large-cap" },
  HDFCBANK: { sector: "Banking & Financials", category: "large-cap" },
  INFY: { sector: "Information Technology", category: "large-cap" },
  ICICIBANK: { sector: "Banking & Financials", category: "large-cap" },
  BHARTIARTL: { sector: "Telecommunications", category: "large-cap" },
  SBIN: { sector: "PSU Banking", category: "large-cap" },
  ITC: { sector: "FMCG & Consumer", category: "large-cap" },
  HINDUNILVR: { sector: "FMCG & Consumer", category: "large-cap" },
  LT: { sector: "Infrastructure & Engineering", category: "large-cap" },
  KOTAKBANK: { sector: "Banking & Financials", category: "large-cap" },
  AXISBANK: { sector: "Banking & Financials", category: "large-cap" },
  BAJFINANCE: { sector: "NBFC & Financial Services", category: "large-cap" },
  BAJAJFINSV: { sector: "Financial Services", category: "large-cap" },
  SUNPHARMA: { sector: "Healthcare & Pharma", category: "large-cap" },
  TITAN: { sector: "Consumer & Jewelry", category: "large-cap" },
  MARUTI: { sector: "Automobile & EV", category: "large-cap" },
  TMPV: { sector: "Automobile & EV", category: "large-cap" },
  TMCV: { sector: "Automobile & Commercial", category: "large-cap" },
  TATAMOTORS: { sector: "Automobile & EV", category: "large-cap" },
  TATASTEEL: { sector: "Metals & Mining", category: "large-cap" },
  NTPC: { sector: "Power & Energy (PSU)", category: "large-cap" },
  ONGC: { sector: "Oil & Gas (PSU)", category: "large-cap" },
  POWERGRID: { sector: "Power Transmission (PSU)", category: "large-cap" },
  COALINDIA: { sector: "Mining & Energy (PSU)", category: "large-cap" },
  ULTRACEMCO: { sector: "Building Materials & Cement", category: "large-cap" },
  "M&M": { sector: "Automobile & Farm Equipment", category: "large-cap" },
  ADANIENT: { sector: "Conglomerate & Infrastructure", category: "large-cap" },
  ADANIPORTS: { sector: "Ports & Logistics", category: "large-cap" },
  HCLTECH: { sector: "Information Technology", category: "large-cap" },
  WIPRO: { sector: "Information Technology", category: "large-cap" },
  ASIANPAINT: { sector: "Paints & Home Decor", category: "large-cap" },
  TECHM: { sector: "Information Technology", category: "large-cap" },
  GRASIM: { sector: "Chemicals & Textiles", category: "large-cap" },
  HINDALCO: { sector: "Aluminium & Metals", category: "large-cap" },
  CIPLA: { sector: "Healthcare & Pharma", category: "large-cap" },
  DRREDDY: { sector: "Healthcare & Pharma", category: "large-cap" },
  JSWSTEEL: { sector: "Metals & Mining", category: "large-cap" },
  HEROMOTOCO: { sector: "Automobile & Two-Wheelers", category: "large-cap" },
  "BAJAJ-AUTO": { sector: "Automobile & Two-Wheelers", category: "large-cap" },
  EICHERMOT: { sector: "Automobile (Royal Enfield)", category: "large-cap" },
  DIVISLAB: { sector: "Healthcare & Pharma", category: "large-cap" },
  BRITANNIA: { sector: "FMCG & Foods", category: "large-cap" },
  NESTLEIND: { sector: "FMCG & Consumer", category: "large-cap" },
  INDUSINDBK: { sector: "Banking & Financials", category: "large-cap" },
  TATACONSUM: { sector: "FMCG & Consumer", category: "large-cap" },
  APOLLOHOSP: { sector: "Healthcare & Hospitals", category: "large-cap" },
  SHRIRAMFIN: { sector: "NBFC & Lending", category: "large-cap" },
  BPCL: { sector: "Oil & Gas (PSU)", category: "large-cap" },
  LTIM: { sector: "Information Technology", category: "large-cap" },
  TRENT: { sector: "Retail & Consumer (Zudio)", category: "large-cap" },
  BEL: { sector: "Defense & Aerospace (PSU)", category: "large-cap" },
  HAL: { sector: "Defense & Aerospace (PSU)", category: "large-cap" },
  MAZDOCK: { sector: "Defense & Shipbuilding (PSU)", category: "mid-cap" },
  COCHINSHIP: { sector: "Defense & Shipbuilding (PSU)", category: "mid-cap" },
  BDL: { sector: "Defense & Missiles (PSU)", category: "mid-cap" },
  IRFC: { sector: "Railways & Infrastructure (PSU)", category: "large-cap" },
  RVNL: { sector: "Railways & Infrastructure (PSU)", category: "mid-cap" },
  IRCTC: { sector: "Railways & Tourism (PSU)", category: "mid-cap" },
  RAILTEL: { sector: "Railways & Telecom (PSU)", category: "mid-cap" },
  SUZLON: { sector: "Renewable Energy & Wind", category: "mid-cap" },
  PAYTM: { sector: "Fintech & Payments", category: "mid-cap" },
  YESBANK: { sector: "Banking & Financials", category: "mid-cap" },
  ETERNAL: { sector: "Consumer Internet & Quick Commerce (Zomato/Blinkit)", category: "large-cap" },
  JIOFIN: { sector: "Fintech & Financials", category: "large-cap" },
  BSE: { sector: "Financial Market Infrastructure", category: "mid-cap" },
  CDSL: { sector: "Financial Market Infrastructure", category: "mid-cap" },
  TATAPOWER: { sector: "Energy & Power", category: "large-cap" },
  VEDL: { sector: "Metals & Mining", category: "large-cap" },
  POLYCAB: { sector: "Cables & Electricals", category: "large-cap" },
  DIXON: { sector: "Electronics Manufacturing", category: "mid-cap" },
  KPITTECH: { sector: "Automotive Software & EV Tech", category: "mid-cap" },
  PERSISTENT: { sector: "Information Technology", category: "mid-cap" },
  IDFCFIRSTB: { sector: "Banking & Financials", category: "mid-cap" },
  BANKBARODA: { sector: "PSU Banking", category: "large-cap" },
  PNB: { sector: "PSU Banking", category: "large-cap" },
};

function inferSector(name: string, symbol: string): { sector: string; category: "large-cap" | "mid-cap" | "small-cap" } {
  const sym = symbol.toUpperCase().replace(/\.NS$/, "");
  if (SECTOR_OVERRIDES[sym]) {
    return SECTOR_OVERRIDES[sym];
  }

  const n = name.toLowerCase();

  if (n.includes("bank") || n.includes("finance") || n.includes("capital") || n.includes("credit") || n.includes("housing") || n.includes("leasing") || n.includes("securities")) {
    return { sector: "Banking & Financials", category: "mid-cap" };
  }
  if (n.includes("tech") || n.includes("software") || n.includes("infotech") || n.includes("digital") || n.includes("system") || n.includes("data") || n.includes("cyber")) {
    return { sector: "Information Technology", category: "mid-cap" };
  }
  if (n.includes("pharma") || n.includes("health") || n.includes("drug") || n.includes("lab") || n.includes("med") || n.includes("bio") || n.includes("hospital") || n.includes("care")) {
    return { sector: "Healthcare & Pharma", category: "mid-cap" };
  }
  if (n.includes("motor") || n.includes("auto") || n.includes("tyre") || n.includes("wheel") || n.includes("vehicle") || n.includes("engine") || n.includes("clutch")) {
    return { sector: "Automobile & EV", category: "mid-cap" };
  }
  if (n.includes("defense") || n.includes("defence") || n.includes("aero") || n.includes("ship") || n.includes("dynamic") || n.includes("armament")) {
    return { sector: "Defense & Aerospace", category: "mid-cap" };
  }
  if (n.includes("rail") || n.includes("infra") || n.includes("engineering") || n.includes("construct") || n.includes("build") || n.includes("cement") || n.includes("project")) {
    return { sector: "Railways & Infrastructure", category: "mid-cap" };
  }
  if (n.includes("power") || n.includes("energy") || n.includes("solar") || n.includes("wind") || n.includes("petrol") || n.includes("gas") || n.includes("oil") || n.includes("electric")) {
    return { sector: "Energy & Power", category: "mid-cap" };
  }
  if (n.includes("steel") || n.includes("metal") || n.includes("iron") || n.includes("zinc") || n.includes("copper") || n.includes("aluminium") || n.includes("alloy") || n.includes("mining")) {
    return { sector: "Metals & Mining", category: "mid-cap" };
  }
  if (n.includes("food") || n.includes("sugar") || n.includes("tea") || n.includes("coffee") || n.includes("dairy") || n.includes("beverag") || n.includes("agro") || n.includes("consumer") || n.includes("fmcg")) {
    return { sector: "FMCG & Consumer", category: "mid-cap" };
  }
  if (n.includes("chem") || n.includes("polymer") || n.includes("fertil") || n.includes("plastic") || n.includes("pigment") || n.includes("color")) {
    return { sector: "Chemicals & Materials", category: "mid-cap" };
  }
  if (n.includes("textile") || n.includes("cotton") || n.includes("silk") || n.includes("yarn") || n.includes("spin") || n.includes("garment") || n.includes("fashion") || n.includes("apparel")) {
    return { sector: "Textiles & Apparel", category: "small-cap" };
  }
  if (n.includes("telecom") || n.includes("cable") || n.includes("network") || n.includes("communication")) {
    return { sector: "Telecommunications", category: "mid-cap" };
  }

  return { sector: "Diversified Equities", category: "small-cap" };
}

// Build processed indexed catalog
interface RawEntry {
  SYMBOL: string;
  "NAME OF COMPANY": string;
  SERIES: string;
  "ISIN NUMBER"?: string;
}

const nseStocksList: NseStock[] = (nseRawCatalog as RawEntry[]).map((row) => {
  const symbol = row.SYMBOL.trim();
  const name = row["NAME OF COMPANY"]?.trim() || symbol;
  const inferred = inferSector(name, symbol);
  return {
    symbol,
    nseSymbol: `${symbol}.NS`,
    name,
    series: row.SERIES?.trim() || "EQ",
    isin: row["ISIN NUMBER"]?.trim() || "",
    sector: inferred.sector,
    category: inferred.category,
  };
});

// Fast lookup map
const nseStocksBySymbol = new Map<string, NseStock>();
for (const stock of nseStocksList) {
  nseStocksBySymbol.set(stock.symbol.toUpperCase(), stock);
  nseStocksBySymbol.set(stock.nseSymbol.toUpperCase(), stock);
}

// Aliases for seamless search
const ALIASES: Record<string, string> = {
  ZOMATO: "ETERNAL",
  BLINKIT: "ETERNAL",
  TATAMOTORS: "TMPV",
  "TATA MOTORS": "TMPV",
};

export function getAllNseStocks(): NseStock[] {
  return nseStocksList;
}

export function getNseStock(symbolOrNse: string): NseStock | undefined {
  const clean = symbolOrNse.trim().toUpperCase();
  const direct = nseStocksBySymbol.get(clean);
  if (direct) return direct;

  const aliased = ALIASES[clean];
  if (aliased) {
    return nseStocksBySymbol.get(aliased) || nseStocksBySymbol.get(`${aliased}.NS`);
  }

  const withoutNs = clean.replace(/\.NS$/, "");
  return nseStocksBySymbol.get(withoutNs);
}

export function searchNseStocks(
  query: string,
  options?: { sector?: string; category?: string; limit?: number }
): NseStock[] {
  const q = query.trim().toUpperCase();
  const limit = options?.limit || 50;
  const sectorFilter = options?.sector;
  const categoryFilter = options?.category;
  const aliasMatch = ALIASES[q] || (q.includes("ZOMATO") ? "ETERNAL" : q.includes("TATA MOTOR") ? "TMPV" : null);

  if (!q && !sectorFilter && !categoryFilter) {
    return nseStocksList.slice(0, limit);
  }

  const results: NseStock[] = [];

  for (const stock of nseStocksList) {
    if (sectorFilter && stock.sector !== sectorFilter) continue;
    if (categoryFilter && stock.category !== categoryFilter) continue;

    if (!q) {
      results.push(stock);
      if (results.length >= limit) break;
      continue;
    }

    const sym = stock.symbol.toUpperCase();
    const name = stock.name.toUpperCase();
    const sector = stock.sector.toUpperCase();

    // Prioritize alias matches and exact/prefix matches
    if (aliasMatch && sym === aliasMatch) {
      results.unshift(stock);
    } else if (sym === q || sym.startsWith(q)) {
      results.unshift(stock);
    } else if (sym.includes(q) || name.includes(q) || sector.includes(q)) {
      results.push(stock);
    }

    if (results.length >= limit * 2) break;
  }

  return results.slice(0, limit);
}

// Benchmark indices
export const NSE_BENCHMARKS = [
  { symbol: "^NSEI", nseSymbol: "^NSEI", name: "NIFTY 50", sector: "Indian Benchmark Index", category: "index" as const },
  { symbol: "^BSESN", nseSymbol: "^BSESN", name: "BSE SENSEX", sector: "Indian Benchmark Index", category: "index" as const },
  { symbol: "^NSEBANK", nseSymbol: "^NSEBANK", name: "BANK NIFTY", sector: "Banking Index", category: "index" as const },
  { symbol: "^CNXIT", nseSymbol: "^CNXIT", name: "NIFTY IT", sector: "IT Index", category: "index" as const },
];

// Top 50 Premier Indian Equities for instant loading & live feeds
export const TOP_INDIAN_STOCKS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "ICICIBANK.NS",
  "BHARTIARTL.NS",
  "SBIN.NS",
  "ITC.NS",
  "HINDUNILVR.NS",
  "LT.NS",
  "KOTAKBANK.NS",
  "AXISBANK.NS",
  "BAJFINANCE.NS",
  "MARUTI.NS",
  "SUNPHARMA.NS",
  "TITAN.NS",
  "TMPV.NS",
  "TATASTEEL.NS",
  "NTPC.NS",
  "ONGC.NS",
  "POWERGRID.NS",
  "COALINDIA.NS",
  "ULTRACEMCO.NS",
  "M&M.NS",
  "ADANIENT.NS",
  "ADANIPORTS.NS",
  "HCLTECH.NS",
  "WIPRO.NS",
  "ASIANPAINT.NS",
  "HAL.NS",
  "BEL.NS",
  "IRFC.NS",
  "RVNL.NS",
  "SUZLON.NS",
  "ETERNAL.NS", // Zomato/Blinkit parent
  "JIOFIN.NS",
  "BSE.NS",
  "CDSL.NS",
  "TATAPOWER.NS",
  "VEDL.NS",
  "COCHINSHIP.NS",
  "MAZDOCK.NS",
  "DIXON.NS",
  "POLYCAB.NS",
  "PERSISTENT.NS",
  "KPITTECH.NS",
  "IDFCFIRSTB.NS",
  "BANKBARODA.NS",
  "PAYTM.NS",
  "YESBANK.NS",
];

// Import Global Catalog for Multi-Market Support
import {
  TOP_GLOBAL_STOCKS,
  GLOBAL_INDICES,
  GLOBAL_STOCKS_MAP,
  isGlobalSymbol,
  GlobalStock,
} from "./global-catalog";

export { TOP_GLOBAL_STOCKS, GLOBAL_INDICES, GLOBAL_STOCKS_MAP, isGlobalSymbol };
export type { GlobalStock };

export interface UnifiedStock {
  symbol: string;
  quoteSymbol: string;
  name: string;
  market: "NSE" | "GLOBAL" | "INDEX";
  currency: "INR" | "USD";
  series?: string;
  isin?: string;
  sector: string;
  category: "large-cap" | "mid-cap" | "small-cap" | "tech" | "international" | "index";
  exchange?: string;
}

// Build unified list of 2,400+ stocks (2,298 NSE + 100+ Global & Indices)
const unifiedStocksList: UnifiedStock[] = [
  ...GLOBAL_INDICES.map((idx): UnifiedStock => ({
    symbol: idx.symbol,
    quoteSymbol: idx.quoteSymbol,
    name: idx.name,
    market: "INDEX",
    currency: "USD",
    sector: idx.sector,
    category: idx.category,
    exchange: idx.exchange,
  })),
  ...TOP_GLOBAL_STOCKS.map((g): UnifiedStock => ({
    symbol: g.symbol,
    quoteSymbol: g.quoteSymbol,
    name: g.name,
    market: "GLOBAL",
    currency: "USD",
    sector: g.sector,
    category: g.category,
    exchange: g.exchange,
  })),
  ...nseStocksList.map((n): UnifiedStock => ({
    symbol: n.symbol,
    quoteSymbol: n.nseSymbol,
    name: n.name,
    market: "NSE",
    currency: "INR",
    series: n.series,
    isin: n.isin,
    sector: n.sector,
    category: n.category,
    exchange: "NSE",
  })),
];

const unifiedMap = new Map<string, UnifiedStock>();
for (const s of unifiedStocksList) {
  unifiedMap.set(s.symbol.toUpperCase(), s);
  unifiedMap.set(s.quoteSymbol.toUpperCase(), s);
}

export function getAllUnifiedStocks(): UnifiedStock[] {
  return unifiedStocksList;
}

export function getUnifiedStock(sym: string): UnifiedStock | undefined {
  const clean = sym.trim().toUpperCase();
  const direct = unifiedMap.get(clean);
  if (direct) return direct;

  const withoutNs = clean.replace(/\.NS$/, "").replace(/\.BO$/, "");
  const directWithoutNs = unifiedMap.get(withoutNs);
  if (directWithoutNs) return directWithoutNs;

  const aliased = ALIASES[clean] || ALIASES[withoutNs];
  if (aliased) {
    return unifiedMap.get(aliased) || unifiedMap.get(`${aliased}.NS`);
  }

  return undefined;
}

export function searchAllMarkets(
  query: string,
  options?: {
    market?: "all" | "nse" | "global" | "index";
    sector?: string;
    category?: string;
    page?: number;
    limit?: number;
  }
): {
  items: UnifiedStock[];
  total: number;
  page: number;
  totalPages: number;
} {
  const q = (query || "").trim().toUpperCase();
  const marketFilter = options?.market || "all";
  const sectorFilter = options?.sector;
  const categoryFilter = options?.category;
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(100, options?.limit || 30));

  let filtered = unifiedStocksList;

  // Filter by market
  if (marketFilter === "nse") {
    filtered = filtered.filter((s) => s.market === "NSE");
  } else if (marketFilter === "global") {
    filtered = filtered.filter((s) => s.market === "GLOBAL" || s.market === "INDEX");
  } else if (marketFilter === "index") {
    filtered = filtered.filter((s) => s.market === "INDEX");
  }

  // Filter by sector
  if (sectorFilter && sectorFilter !== "all") {
    filtered = filtered.filter(
      (s) => s.sector.toLowerCase().includes(sectorFilter.toLowerCase())
    );
  }

  // Filter by category
  if (categoryFilter && categoryFilter !== "all") {
    filtered = filtered.filter((s) => s.category === categoryFilter);
  }

  // Search query
  if (q) {
    const aliasMatch = ALIASES[q] || (q.includes("ZOMATO") ? "ETERNAL" : q.includes("TATA MOTOR") ? "TMPV" : null);

    const exact: UnifiedStock[] = [];
    const prefix: UnifiedStock[] = [];
    const substring: UnifiedStock[] = [];

    for (const s of filtered) {
      const sym = s.symbol.toUpperCase();
      const name = s.name.toUpperCase();
      const sector = s.sector.toUpperCase();

      if (aliasMatch && sym === aliasMatch) {
        exact.push(s);
      } else if (sym === q) {
        exact.push(s);
      } else if (sym.startsWith(q) || name.startsWith(q)) {
        prefix.push(s);
      } else if (sym.includes(q) || name.includes(q) || sector.includes(q)) {
        substring.push(s);
      }
    }

    filtered = [...exact, ...prefix, ...substring];
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return {
    items,
    total,
    page,
    totalPages,
  };
}
