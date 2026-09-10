import { cookies } from "next/headers";
import {
  createOrUpdateUser,
  createSession,
  getSession,
  deleteSession,
  getUserById,
  User,
} from "./db";

export const SESSION_COOKIE_NAME = "investiq_session";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

interface OtpEntry {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

// In-memory OTP storage
const otpStore = new Map<string, OtpEntry>();

export function normalizePhone(rawPhone: string): string {
  // Remove spaces, hyphens, parentheses
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

export function requestOtp(rawIdentifier: string): {
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  devCode?: string;
  identifierType?: "email" | "phone";
} {
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

  const existing = otpStore.get(identifier);
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

  // Generate 6-digit OTP code (standard secure numeric string)
  // For easy dev testing without paid SMS/email gateway, 732109 is supported
  const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const code = process.env.NODE_ENV === "production" ? randomCode : "732109";

  otpStore.set(identifier, {
    code,
    expiresAt: now + OTP_EXPIRY_MS,
    lastSentAt: now,
    attempts: 0,
  });

  const displayTarget = type === "email" ? identifier : identifier;

  return {
    success: true,
    message: `Verification code sent to ${displayTarget}. (Expires in 5 minutes)`,
    cooldownRemaining: 30,
    devCode: code,
    identifierType: type,
  };
}

export function requestPhoneOtp(rawPhone: string) {
  return requestOtp(rawPhone);
}

export function verifyOtp(
  rawIdentifier: string,
  inputCode: string,
  name?: string
): {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
} {
  const { type, value: identifier } = normalizeIdentifier(rawIdentifier);
  const entry = otpStore.get(identifier);
  const now = Date.now();

  // Allow standard dev OTP '732109' in dev or generated code
  const isDevBypass = process.env.NODE_ENV !== "production" && inputCode.trim() === "732109";

  if (!entry && !isDevBypass) {
    return {
      success: false,
      message: "No verification code requested or code has expired. Please request a new one.",
    };
  }

  if (entry) {
    if (now > entry.expiresAt) {
      otpStore.delete(identifier);
      return {
        success: false,
        message: "Verification code has expired. Please request a new one.",
      };
    }

    if (entry.attempts >= 5) {
      otpStore.delete(identifier);
      return {
        success: false,
        message: "Too many incorrect attempts. Please request a new verification code.",
      };
    }

    if (entry.code !== inputCode.trim() && !isDevBypass) {
      entry.attempts += 1;
      return {
        success: false,
        message: `Invalid code. ${5 - entry.attempts} attempts remaining.`,
      };
    }
  }

  // OTP verified successfully!
  otpStore.delete(identifier);

  const defaultName =
    type === "email"
      ? identifier.split("@")[0]
      : `Trader ${identifier.slice(-4)}`;
  const formattedName = name?.trim() || defaultName;

  const user = createOrUpdateUser({
    email: type === "email" ? identifier : undefined,
    phone: type === "phone" ? identifier : undefined,
    name: formattedName,
    authProvider: type === "email" ? "email" : "phone",
  });

  const session = createSession(user.id);

  return {
    success: true,
    message: `${type === "email" ? "Email" : "Phone"} verified successfully.`,
    user,
    token: session.token,
  };
}

export function verifyPhoneOtp(rawPhone: string, inputCode: string, name?: string) {
  return verifyOtp(rawPhone, inputCode, name);
}

export function handleGoogleOAuth(
  email: string,
  name?: string,
  avatar?: string
): {
  success: boolean;
  user: User;
  token: string;
} {
  const user = createOrUpdateUser({
    email,
    name: name || email.split("@")[0],
    avatar,
    authProvider: "google",
  });

  const session = createSession(user.id);

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

    const session = getSession(token);
    if (!session) return null;

    const user = getUserById(session.userId);
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
      deleteSession(token);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}
