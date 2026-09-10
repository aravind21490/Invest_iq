import fs from "fs";
import path from "path";

export interface User {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  authProvider: "phone" | "google" | "email";
  avatar?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Portfolio {
  userId: string;
  cashBalance: number;
  initialBalance: number;
  updatedAt: string;
}

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  sector?: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL";
  shares: number;
  price: number;
  amount: number;
  pnl: number;
  status: "Filled" | "Pending" | "Cancelled";
  timestamp: string;
}

export interface LearnProgress {
  userId: string;
  completedTopics: string[];
  quizScores: Record<string, number>;
  streakDays: number;
  lastActiveDate: string;
}

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  portfolios: Portfolio[];
  positions: Position[];
  trades: Trade[];
  learnProgress: LearnProgress[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "investiq_store.json");

const INITIAL_DB: DatabaseSchema = {
  users: [
    {
      id: "usr_demo",
      phone: "+15550192834",
      email: "demo@investiq.ai",
      name: "Alex Vance",
      authProvider: "phone",
      createdAt: new Date().toISOString(),
    },
  ],
  sessions: [],
  portfolios: [
    {
      userId: "usr_demo",
      cashBalance: 325400.0,
      initialBalance: 500000.0,
      updatedAt: new Date().toISOString(),
    },
  ],
  positions: [
    {
      id: "pos_demo_1",
      userId: "usr_demo",
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Limited",
      shares: 50,
      avgBuyPrice: 1250.0,
      sector: "Energy & Conglomerate",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pos_demo_2",
      userId: "usr_demo",
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      shares: 30,
      avgBuyPrice: 2160.0,
      sector: "Information Technology",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pos_demo_3",
      userId: "usr_demo",
      symbol: "TMPV.NS",
      name: "Tata Motors Pass. Vehicles",
      shares: 50,
      avgBuyPrice: 950.0,
      sector: "Automobile & EV",
      updatedAt: new Date().toISOString(),
    },
  ],
  trades: [
    {
      id: "ORD-94281",
      userId: "usr_demo",
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Limited",
      type: "BUY",
      shares: 50,
      price: 1250.0,
      amount: 62500.0,
      pnl: 0,
      status: "Filled",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "ORD-87192",
      userId: "usr_demo",
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      type: "BUY",
      shares: 30,
      price: 2160.0,
      amount: 64800.0,
      pnl: 0,
      status: "Filled",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "ORD-73194",
      userId: "usr_demo",
      symbol: "TMPV.NS",
      name: "Tata Motors Pass. Vehicles",
      type: "BUY",
      shares: 50,
      price: 950.0,
      amount: 47500.0,
      pnl: 0,
      status: "Filled",
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ],
  learnProgress: [
    {
      userId: "usr_demo",
      completedTopics: ["t1-1", "t1-2", "t1-3"],
      quizScores: { "t1-1": 100, "t1-2": 100, "t1-3": 100 },
      streakDays: 3,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    },
  ],
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): DatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
    return INITIAL_DB;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error("Failed to parse DB file, resetting to initial", err);
    return INITIAL_DB;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDataDir();
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempFile, DB_FILE);
}

// Database helper functions
export function getUserById(userId: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === userId);
}

export function getUserByPhone(phone: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.phone === phone);
}

export function getUserByEmail(email: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

export function createOrUpdateUser(userData: {
  phone?: string;
  email?: string;
  name: string;
  authProvider: "phone" | "google" | "email";
  avatar?: string;
}): User {
  const db = readDb();
  let existingUser: User | undefined;

  if (userData.phone) {
    existingUser = db.users.find((u) => u.phone === userData.phone);
  } else if (userData.email) {
    existingUser = db.users.find(
      (u) => u.email?.toLowerCase() === userData.email?.toLowerCase()
    );
  }

  if (existingUser) {
    existingUser.name = userData.name || existingUser.name;
    if (userData.avatar) {
      existingUser.avatar = userData.avatar;
    }
    writeDb(db);
    return existingUser;
  }

  const newUser: User = {
    id: `usr_${Math.random().toString(36).substring(2, 10)}`,
    phone: userData.phone,
    email: userData.email,
    name: userData.name,
    authProvider: userData.authProvider,
    avatar: userData.avatar,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  // Initialize new user with $100,000 paper cash
  db.portfolios.push({
    userId: newUser.id,
    cashBalance: 100000.0,
    initialBalance: 100000.0,
    updatedAt: new Date().toISOString(),
  });

  // Initialize learn progress
  db.learnProgress.push({
    userId: newUser.id,
    completedTopics: [],
    quizScores: {},
    streakDays: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
  });

  writeDb(db);
  return newUser;
}

export function createSession(userId: string): Session {
  const db = readDb();
  const token = `iqs_${Math.random().toString(36).substring(2, 15)}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const session: Session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  // Remove expired sessions
  const now = new Date().toISOString();
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  db.sessions.push(session);

  writeDb(db);
  return session;
}

export function getSession(token: string): Session | undefined {
  const db = readDb();
  const now = new Date().toISOString();
  return db.sessions.find((s) => s.token === token && s.expiresAt > now);
}

export function deleteSession(token: string): void {
  const db = readDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  writeDb(db);
}

export function getUserPortfolio(userId: string): {
  portfolio: Portfolio;
  positions: Position[];
  trades: Trade[];
  learn: LearnProgress;
} {
  const db = readDb();
  let portfolio = db.portfolios.find((p) => p.userId === userId);
  if (!portfolio) {
    portfolio = {
      userId,
      cashBalance: 100000.0,
      initialBalance: 100000.0,
      updatedAt: new Date().toISOString(),
    };
    db.portfolios.push(portfolio);
    writeDb(db);
  }

  const positions = db.positions.filter((p) => p.userId === userId);
  const trades = db.trades
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let learn = db.learnProgress.find((l) => l.userId === userId);
  if (!learn) {
    learn = {
      userId,
      completedTopics: [],
      quizScores: {},
      streakDays: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    };
    db.learnProgress.push(learn);
    writeDb(db);
  }

  return { portfolio, positions, trades, learn };
}

export function recordTrade(
  userId: string,
  tradeData: {
    symbol: string;
    name: string;
    type: "BUY" | "SELL";
    shares: number;
    price: number;
    sector?: string;
  }
): { success: boolean; message: string; trade?: Trade } {
  const db = readDb();
  let portfolio = db.portfolios.find((p) => p.userId === userId);
  if (!portfolio) {
    portfolio = {
      userId,
      cashBalance: 100000.0,
      initialBalance: 100000.0,
      updatedAt: new Date().toISOString(),
    };
    db.portfolios.push(portfolio);
  }

  const totalCost = tradeData.shares * tradeData.price;

  let sellCostBasis = 0;

  if (tradeData.type === "BUY") {
    if (portfolio.cashBalance < totalCost) {
      return {
        success: false,
        message: `Insufficient paper cash. Required: $${totalCost.toFixed(2)}, Available: $${portfolio.cashBalance.toFixed(2)}.`,
      };
    }

    portfolio.cashBalance -= totalCost;
    portfolio.updatedAt = new Date().toISOString();

    const existingPos = db.positions.find(
      (p) => p.userId === userId && p.symbol === tradeData.symbol
    );
    if (existingPos) {
      const newShares = existingPos.shares + tradeData.shares;
      existingPos.avgBuyPrice =
        (existingPos.shares * existingPos.avgBuyPrice + totalCost) / newShares;
      existingPos.shares = newShares;
      existingPos.updatedAt = new Date().toISOString();
    } else {
      db.positions.push({
        id: `pos_${Math.random().toString(36).substring(2, 10)}`,
        userId,
        symbol: tradeData.symbol,
        name: tradeData.name,
        shares: tradeData.shares,
        avgBuyPrice: tradeData.price,
        sector: tradeData.sector || "General",
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    // SELL
    const existingPos = db.positions.find(
      (p) => p.userId === userId && p.symbol === tradeData.symbol
    );
    if (!existingPos || existingPos.shares < tradeData.shares) {
      return {
        success: false,
        message: `Cannot sell ${tradeData.shares} shares of ${tradeData.symbol}. Currently holding ${existingPos?.shares || 0} shares.`,
      };
    }

    sellCostBasis = existingPos.avgBuyPrice;

    portfolio.cashBalance += totalCost;
    portfolio.updatedAt = new Date().toISOString();

    existingPos.shares -= tradeData.shares;
    existingPos.updatedAt = new Date().toISOString();

    if (existingPos.shares <= 0) {
      db.positions = db.positions.filter(
        (p) => !(p.userId === userId && p.symbol === tradeData.symbol)
      );
    }
  }

  const tradeRecord: Trade = {
    id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    userId,
    symbol: tradeData.symbol,
    name: tradeData.name,
    type: tradeData.type,
    shares: tradeData.shares,
    price: tradeData.price,
    amount: totalCost,
    pnl:
      tradeData.type === "BUY"
        ? 0
        : Number((tradeData.shares * (tradeData.price - sellCostBasis)).toFixed(2)),
    status: "Filled",
    timestamp: new Date().toISOString(),
  };

  db.trades.push(tradeRecord);
  writeDb(db);

  return {
    success: true,
    message: `Paper trade executed: ${tradeData.type} ${tradeData.shares} shares of ${tradeData.symbol} @ ₹${tradeData.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    trade: tradeRecord,
  };
}

export function updateLearnProgress(
  userId: string,
  topicId: string,
  score?: number
): LearnProgress {
  const db = readDb();
  let learn = db.learnProgress.find((l) => l.userId === userId);
  if (!learn) {
    learn = {
      userId,
      completedTopics: [],
      quizScores: {},
      streakDays: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    };
    db.learnProgress.push(learn);
  }

  if (!learn.completedTopics.includes(topicId)) {
    learn.completedTopics.push(topicId);
  }

  if (score !== undefined) {
    learn.quizScores[topicId] = score;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (learn.lastActiveDate !== today) {
    learn.streakDays += 1;
    learn.lastActiveDate = today;
  }

  writeDb(db);
  return learn;
}

export function resetUserPortfolio(
  userId: string,
  targetBalance: number = 100000
): Portfolio {
  const db = readDb();
  let portfolio = db.portfolios.find((p) => p.userId === userId);
  if (!portfolio) {
    portfolio = {
      userId,
      cashBalance: targetBalance,
      initialBalance: targetBalance,
      updatedAt: new Date().toISOString(),
    };
    db.portfolios.push(portfolio);
  } else {
    portfolio.cashBalance = targetBalance;
    portfolio.initialBalance = targetBalance;
    portfolio.updatedAt = new Date().toISOString();
  }

  // Clear positions and trades for this user
  db.positions = db.positions.filter((p) => p.userId !== userId);
  db.trades = db.trades.filter((t) => t.userId !== userId);

  writeDb(db);
  return portfolio;
}

