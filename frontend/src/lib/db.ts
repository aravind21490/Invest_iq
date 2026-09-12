import { supabase } from "./supabase";

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

export interface OtpEntry {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

// ==============================================================================
// Mappers: Postgres snake_case <-> TypeScript camelCase
// ==============================================================================
function mapUser(row: any): User {
  return {
    id: row.id,
    phone: row.phone || undefined,
    email: row.email || undefined,
    name: row.name,
    authProvider: row.auth_provider as "phone" | "google" | "email",
    avatar: row.avatar || undefined,
    createdAt: row.created_at,
  };
}

function mapSession(row: any): Session {
  return {
    token: row.token,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function mapPortfolio(row: any): Portfolio {
  return {
    userId: row.user_id,
    cashBalance: Number(row.cash_balance),
    initialBalance: Number(row.initial_balance),
    updatedAt: row.updated_at,
  };
}

function mapPosition(row: any): Position {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    name: row.name,
    shares: Number(row.shares),
    avgBuyPrice: Number(row.avg_buy_price),
    sector: row.sector || undefined,
    updatedAt: row.updated_at,
  };
}

function mapTrade(row: any): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    name: row.name,
    type: row.type as "BUY" | "SELL",
    shares: Number(row.shares),
    price: Number(row.price),
    amount: Number(row.amount),
    pnl: Number(row.pnl),
    status: row.status as "Filled" | "Pending" | "Cancelled",
    timestamp: row.timestamp,
  };
}

function mapLearnProgress(row: any): LearnProgress {
  return {
    userId: row.user_id,
    completedTopics: Array.isArray(row.completed_topics) ? row.completed_topics : [],
    quizScores: (typeof row.quiz_scores === "object" && row.quiz_scores !== null) ? row.quiz_scores : {},
    streakDays: Number(row.streak_days) || 1,
    lastActiveDate: row.last_active_date || new Date().toISOString().slice(0, 10),
  };
}

// ==============================================================================
// Database Operations (Supabase Serverless)
// ==============================================================================

export async function getUserById(userId: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapUser(data);
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapUser(data);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return undefined;
  return mapUser(data);
}

export async function createOrUpdateUser(userData: {
  phone?: string;
  email?: string;
  name: string;
  authProvider: "phone" | "google" | "email";
  avatar?: string;
}): Promise<User> {
  let existingUser: User | undefined;

  if (userData.phone) {
    existingUser = await getUserByPhone(userData.phone);
  } else if (userData.email) {
    existingUser = await getUserByEmail(userData.email);
  }

  if (existingUser) {
    const updates: any = {};
    if (userData.name) updates.name = userData.name;
    if (userData.avatar) updates.avatar = userData.avatar;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", existingUser.id)
        .select()
        .single();

      if (!error && data) {
        return mapUser(data);
      }
    }
    return existingUser;
  }

  const newId = `usr_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date().toISOString();

  const { data: newUserRow, error: userError } = await supabase
    .from("users")
    .insert({
      id: newId,
      phone: userData.phone || null,
      email: userData.email ? userData.email.toLowerCase() : null,
      name: userData.name,
      auth_provider: userData.authProvider,
      avatar: userData.avatar || null,
      created_at: now,
    })
    .select()
    .single();

  if (userError || !newUserRow) {
    throw new Error(`Failed to create user: ${userError?.message}`);
  }

  // Initialize paper portfolio with ₹100,000 capital
  await supabase.from("portfolios").insert({
    user_id: newId,
    cash_balance: 100000.0,
    initial_balance: 100000.0,
    updated_at: now,
  });

  // Initialize learn progress
  await supabase.from("learn_progress").insert({
    user_id: newId,
    completed_topics: [],
    quiz_scores: {},
    streak_days: 1,
    last_active_date: now.slice(0, 10),
  });

  return mapUser(newUserRow);
}

export async function createSession(userId: string): Promise<Session> {
  const token = `iqs_${Math.random().toString(36).substring(2, 15)}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  // Insert session
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message}`);
  }

  // Clean up expired sessions asynchronously
  void supabase
    .from("sessions")
    .delete()
    .lt("expires_at", now.toISOString())
    .then(() => {}, () => {});

  return mapSession(data);
}

export async function getSession(token: string): Promise<Session | undefined> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .gt("expires_at", now)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapSession(data);
}

export async function deleteSession(token: string): Promise<void> {
  await supabase.from("sessions").delete().eq("token", token);
}

export async function getUserPortfolio(userId: string): Promise<{
  portfolio: Portfolio;
  positions: Position[];
  trades: Trade[];
  learn: LearnProgress;
}> {
  // 1. Fetch or initialize Portfolio
  const { data: portData } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let portfolio: Portfolio;
  if (!portData) {
    const now = new Date().toISOString();
    const { data: newPort } = await supabase
      .from("portfolios")
      .insert({
        user_id: userId,
        cash_balance: 100000.0,
        initial_balance: 100000.0,
        updated_at: now,
      })
      .select()
      .single();
    portfolio = newPort
      ? mapPortfolio(newPort)
      : { userId, cashBalance: 100000.0, initialBalance: 100000.0, updatedAt: now };
  } else {
    portfolio = mapPortfolio(portData);
  }

  // 2. Fetch Positions
  const { data: posData } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", userId);

  const positions = (posData || []).map(mapPosition);

  // 3. Fetch Trades
  const { data: tradeData } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false });

  const trades = (tradeData || []).map(mapTrade);

  // 4. Fetch or initialize Learn Progress
  const { data: learnData } = await supabase
    .from("learn_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let learn: LearnProgress;
  if (!learnData) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: newLearn } = await supabase
      .from("learn_progress")
      .insert({
        user_id: userId,
        completed_topics: [],
        quiz_scores: {},
        streak_days: 1,
        last_active_date: today,
      })
      .select()
      .single();

    learn = newLearn
      ? mapLearnProgress(newLearn)
      : { userId, completedTopics: [], quizScores: {}, streakDays: 1, lastActiveDate: today };
  } else {
    learn = mapLearnProgress(learnData);
  }

  return { portfolio, positions, trades, learn };
}

export async function recordTrade(
  userId: string,
  tradeData: {
    symbol: string;
    name: string;
    type: "BUY" | "SELL";
    shares: number;
    price: number;
    sector?: string;
  }
): Promise<{ success: boolean; message: string; trade?: Trade }> {
  // Call atomic PostgreSQL RPC stored procedure with row-level locks
  const { data, error } = await supabase.rpc("execute_paper_trade", {
    p_user_id: userId,
    p_symbol: tradeData.symbol.toUpperCase(),
    p_name: tradeData.name,
    p_type: tradeData.type,
    p_shares: tradeData.shares,
    p_price: tradeData.price,
    p_sector: tradeData.sector || "General",
  });

  if (error) {
    console.error("Supabase execute_paper_trade RPC error:", error);
    return {
      success: false,
      message: `Database execution error: ${error.message}`,
    };
  }

  if (!data || !data.success) {
    return {
      success: false,
      message: data?.message || "Trade rejected by risk and balance rules.",
    };
  }

  return {
    success: true,
    message: data.message,
    trade: data.trade as Trade,
  };
}

export async function updateLearnProgress(
  userId: string,
  topicId: string,
  score?: number
): Promise<LearnProgress> {
  const { data: existing } = await supabase
    .from("learn_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  let completedTopics: string[] = [];
  let quizScores: Record<string, number> = {};
  let streakDays = 1;
  let lastActiveDate = today;

  if (existing) {
    completedTopics = Array.isArray(existing.completed_topics) ? [...existing.completed_topics] : [];
    quizScores = typeof existing.quiz_scores === "object" && existing.quiz_scores ? { ...existing.quiz_scores } : {};
    streakDays = existing.streak_days || 1;
    lastActiveDate = existing.last_active_date;
  }

  if (!completedTopics.includes(topicId)) {
    completedTopics.push(topicId);
  }

  if (score !== undefined) {
    quizScores[topicId] = score;
  }

  if (lastActiveDate !== today) {
    streakDays += 1;
    lastActiveDate = today;
  }

  const { data: updated, error } = await supabase
    .from("learn_progress")
    .upsert({
      user_id: userId,
      completed_topics: completedTopics,
      quiz_scores: quizScores,
      streak_days: streakDays,
      last_active_date: lastActiveDate,
    })
    .select()
    .single();

  if (error || !updated) {
    throw new Error(`Failed to update learn progress: ${error?.message}`);
  }

  return mapLearnProgress(updated);
}

export async function resetUserPortfolio(
  userId: string,
  targetBalance: number = 100000
): Promise<Portfolio> {
  const now = new Date().toISOString();

  // 1. Reset portfolio balance
  const { data: portData, error: portErr } = await supabase
    .from("portfolios")
    .upsert({
      user_id: userId,
      cash_balance: targetBalance,
      initial_balance: targetBalance,
      updated_at: now,
    })
    .select()
    .single();

  if (portErr || !portData) {
    throw new Error(`Failed to reset portfolio: ${portErr?.message}`);
  }

  // 2. Clear positions and trades for this user
  await supabase.from("positions").delete().eq("user_id", userId);
  await supabase.from("trades").delete().eq("user_id", userId);

  return mapPortfolio(portData);
}

// ==============================================================================
// OTP Verification Store (Durable & Serverless)
// ==============================================================================

export async function getOtp(identifier: string): Promise<OtpEntry | undefined> {
  const { data, error } = await supabase
    .from("otps")
    .select("*")
    .eq("identifier", identifier)
    .maybeSingle();

  if (error || !data) return undefined;

  return {
    code: data.code,
    expiresAt: Number(data.expires_at),
    lastSentAt: Number(data.last_sent_at),
    attempts: Number(data.attempts),
  };
}

export async function setOtp(
  identifier: string,
  data: {
    code: string;
    expiresAt: number;
    lastSentAt: number;
    attempts: number;
  }
): Promise<void> {
  const { error } = await supabase.from("otps").upsert({
    identifier,
    code: data.code,
    expires_at: data.expiresAt,
    last_sent_at: data.lastSentAt,
    attempts: data.attempts,
  });

  if (error) {
    throw new Error(`Failed to save OTP: ${error.message}`);
  }
}

export async function deleteOtp(identifier: string): Promise<void> {
  await supabase.from("otps").delete().eq("identifier", identifier);
}

export async function incrementOtpAttempts(identifier: string): Promise<number> {
  // Execute atomic SQL stored procedure to eliminate read-modify-write race conditions
  const { data, error } = await supabase.rpc("increment_otp_attempts", {
    p_identifier: identifier,
  });

  if (error) {
    console.error("increment_otp_attempts error:", error);
    // Fallback: fetch and increment
    const existing = await getOtp(identifier);
    if (!existing) return 1;
    const nextAttempts = existing.attempts + 1;
    await supabase.from("otps").update({ attempts: nextAttempts }).eq("identifier", identifier);
    return nextAttempts;
  }

  return Number(data) || 1;
}
