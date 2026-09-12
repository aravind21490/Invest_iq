import { cookies } from "next/headers";
import {
  createOrUpdateUser,
  createSession,
  getSession,
  deleteSession,
  getUserById,
  getOtp,
  setOtp,
  deleteOtp,
  incrementOtpAttempts,
  User,
} from "./db";

export const SESSION_COOKIE_NAME = "investiq_session";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[\s\-\(\)]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

export function normalizeIdentifier(raw: string): { type: "email" | "phone"; value: string } {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) {
    return { type: "email", value: trimmed.toLowerCase() };
  }
  return { type: "phone", value: normalizePhone(trimmed) };
}

export async function requestOtp(rawIdentifier: string): Promise<{
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  devCode?: string;
  identifierType?: "email" | "phone";
}> {
  const { type, value: identifier } = normalizeIdentifier(rawIdentifier);

  if (type === "phone" && identifier.length < 8) {
    return {
      success: false,
      message: "Please enter a valid phone number with country code (e.g. +91 98765-43210).",
    };
  }

  if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const existing = await getOtp(identifier);
  const now = Date.now();

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const cooldownRemaining = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000
    );
    return {
      success: false,
      message: `Please wait ${cooldownRemaining}s before requesting a new code.`,
      cooldownRemaining,
      identifierType: type,
    };
  }

  // Generate 6-digit OTP code
  // In development/test mode, 732109 is supported for fast developer testing
  const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const code = process.env.NODE_ENV === "production" ? randomCode : "732109";

  await setOtp(identifier, {
    code,
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
  });

  const displayTarget = identifier;

  return {
    success: true,
    message: `Verification code sent to ${displayTarget}. (Expires in 5 minutes)`,
    cooldownRemaining: 30,
    devCode: code,
    identifierType: type,
  };
}

export async function requestPhoneOtp(rawPhone: string) {
  return await requestOtp(rawPhone);
}

export async function verifyOtp(
  rawIdentifier: string,
  inputCode: string,
  name?: string
): Promise<{
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}> {
  const { type, value: identifier } = normalizeIdentifier(rawIdentifier);
  const entry = await getOtp(identifier);
  const now = Date.now();

  // Allow standard dev OTP '732109' in development
  const isDevBypass = process.env.NODE_ENV !== "production" && inputCode.trim() === "732109";

  if (!entry && !isDevBypass) {
    return {
      success: false,
      message: "No verification code requested or code has expired. Please request a new one.",
    };
  }

  if (entry) {
    if (now > entry.expiresAt) {
      await deleteOtp(identifier);
      return {
        success: false,
        message: "Verification code has expired. Please request a new one.",
      };
    }

    if (entry.attempts >= 5) {
      await deleteOtp(identifier);
      return {
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code.",
      };
    }

    if (entry.code !== inputCode.trim() && !isDevBypass) {
      const attempts = await incrementOtpAttempts(identifier);
      return {
        success: false,
        message: `Invalid code. ${Math.max(0, 5 - attempts)} attempts remaining.`,
      };
    }
  }

  // OTP verified successfully
  await deleteOtp(identifier);

  const defaultName =
    type === "email"
      ? identifier.split("@")[0]
      : `Trader ${identifier.slice(-4)}`;
  const formattedName = name?.trim() || defaultName;

  const user = await createOrUpdateUser({
    email: type === "email" ? identifier : undefined,
    phone: type === "phone" ? identifier : undefined,
    name: formattedName,
    authProvider: type === "email" ? "email" : "phone",
  });

  const session = await createSession(user.id);

  return {
    success: true,
    message: `${type === "email" ? "Email" : "Phone"} verified successfully.`,
    user,
    token: session.token,
  };
}

export async function verifyPhoneOtp(rawPhone: string, inputCode: string, name?: string) {
  return await verifyOtp(rawPhone, inputCode, name);
}

export async function handleGoogleOAuth(
  email: string,
  name?: string,
  avatar?: string
): Promise<{
  success: boolean;
  user: User;
  token: string;
}> {
  const user = await createOrUpdateUser({
    email,
    name: name || email.split("@")[0],
    avatar,
    authProvider: "google",
  });

  const session = await createSession(user.id);

  return {
    success: true,
    user,
    token: session.token,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await getSession(token);
    if (!session) return null;

    const user = await getUserById(session.userId);
    return user || null;
  } catch {
    return null;
  }
}

export async function clearCurrentSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await deleteSession(token);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}
