"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Phone,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Lock,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";

interface SignInFormProps {
  initialMode?: "signin" | "signup";
}

function SignInForm({ initialMode = "signin" }: SignInFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  // Mode: "signup" or "signin"
  const defaultMode = pathname === "/signup" || searchParams.get("mode") === "signup" ? "signup" : initialMode;
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);

  // Step 1: "input" (phone or email), Step 2: "otp"
  const [step, setStep] = useState<"input" | "otp">("input");
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Detect whether identifier is email or phone
  const isEmail = identifier.includes("@");

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    // Enforce name entry before signup with number or gmail
    if (mode === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErrorMessage("Please enter your full name before signing up.");
        return;
      }
      if (trimmedName.length < 2) {
        setErrorMessage("Full name must be at least 2 characters long.");
        return;
      }
    }

    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage(
        mode === "signup"
          ? "Please enter your mobile phone number or Gmail/email to receive verification code."
          : "Please enter your registered email or mobile phone number."
      );
      return;
    }

    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage("Please enter a valid email address (e.g. yourname@gmail.com).");
      return;
    }

    if (!isEmail && trimmed.replace(/\D/g, "").length < 7) {
      setErrorMessage("Please enter a valid mobile number with country code (e.g. +91 98765-43210).");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        setErrorMessage("Server error: unexpected response format.");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to send verification code.");
      } else {
        setStep("otp");
        setCooldown(data.cooldownRemaining || 30);
        if (data.devCode) {
          setDevCode(data.devCode);
        }
        // Focus first OTP digit input
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit change
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Pasted full code
      const pasted = cleaned.slice(0, 6).split("");
      pasted.forEach((char, i) => {
        newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const code = otpDigits.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code, name: name.trim() }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        setErrorMessage("Server error: unexpected response format.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Invalid or expired verification code.");
        setIsLoading(false);
      } else {
        // Successful login / signup
        router.push(redirectUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error during verification. Please retry.");
      setIsLoading(false);
    }
  };

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    setErrorMessage("");

    // Enforce name entry before signup with Google / Gmail
    if (mode === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErrorMessage("Please enter your full name above before signing up with Google/Gmail.");
        return;
      }
    }

    setIsGoogleLoading(true);
    try {
      const emailToUse =
        isEmail && identifier.trim().includes("@")
          ? identifier.trim()
          : name.trim()
          ? `${name.trim().toLowerCase().replace(/\s+/g, ".")}@gmail.com`
          : "alex.investor@gmail.com";

      const nameToUse = name.trim() || "Alex Vance";

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          name: nameToUse,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(redirectUrl);
        router.refresh();
      } else {
        setErrorMessage(data.message || "Google authentication failed.");
        setIsGoogleLoading(false);
      }
    } catch {
      setErrorMessage("Network error during Google sign in.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Tab Switcher: Sign Up vs Sign In */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl border border-border text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setErrorMessage("");
          }}
          className={`py-2 px-3 rounded-lg transition-all ${
            mode === "signup"
              ? "bg-primary text-primary-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Create Account (Sign Up)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setErrorMessage("");
          }}
          className={`py-2 px-3 rounded-lg transition-all ${
            mode === "signin"
              ? "bg-primary text-primary-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign In
        </button>
      </div>

      {/* Header */}
      <div className="space-y-1.5 text-center md:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {mode === "signup" ? "Create Your Trading Account" : "Welcome to Invest IQ"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "signup"
            ? "Enter your name to register with ₹1,00,000 in virtual capital for Indian & Global markets."
            : "Sign in to access your virtual portfolio, AI signals, and live market quotes."}
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {step === "input" ? (
        <div className="space-y-5">
          {/* Form */}
          <form onSubmit={handleSendOtp} className="space-y-4">
            {/* Full Name Input - MANDATORY ON SIGNUP */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>
                    Full Name <span className="text-destructive font-bold">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal lowercase">required</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-muted-foreground pointer-events-none">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="Enter your full name (e.g. Aravind Kumar)"
                    required
                    autoComplete="name"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-input/50 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  You must enter your name before signing up with mobile number or Gmail.
                </p>
              </div>
            )}

            {/* Unified Phone or Email Input Form */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                {mode === "signup" ? "Mobile Number or Gmail / Email" : "Phone or Email Address"}
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-muted-foreground pointer-events-none">
                  {isEmail ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder={mode === "signup" ? "name@gmail.com or +91 98765-43210" : "name@example.com or +91 98765-43210"}
                  required
                  autoComplete="username"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-input/50 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                We will send a 6-digit OTP code to verify your identity. No password required.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim() || (mode === "signup" && !name.trim())}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>{mode === "signup" ? "Sign Up & Send Code" : "Continue"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">
              or continue with
            </span>
            <div className="border-t border-border w-full" />
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-border bg-card hover:bg-muted font-medium text-sm text-foreground transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          >
            {isGoogleLoading ? (
              <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{mode === "signup" ? "Sign Up with Google / Gmail" : "Continue with Google"}</span>
          </button>

          {/* Mode toggle footer */}
          <div className="text-center pt-2 text-xs text-muted-foreground">
            {mode === "signup" ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage("");
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage("");
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Step 2: 6-Digit OTP Entry */
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Verification Code
              </label>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="text-xs text-primary hover:underline font-medium"
              >
                Change {isEmail ? "Email" : "Phone"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to <strong className="text-foreground">{identifier}</strong>
              {name && (
                <span className="block text-[11px] text-primary/90 mt-0.5">
                  Registering as: <strong>{name}</strong>
                </span>
              )}
            </p>
          </div>

          {/* Dev bypass code callout in non-prod */}
          {devCode && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between font-mono">
              <span>Dev Testing Code:</span>
              <span className="font-bold text-sm tracking-widest bg-amber-500/20 px-2 py-0.5 rounded">
                {devCode}
              </span>
            </div>
          )}

          {/* 6 Digit Input Boxes */}
          <div className="flex items-center justify-between gap-2">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-13 text-center text-xl font-bold font-mono rounded-lg border border-border bg-input/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
              />
            ))}
          </div>

          {/* Resend Cooldown */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {cooldown > 0 ? (
              <span>Resend code in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isLoading}
                className="text-primary hover:underline font-medium flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Resend verification code</span>
              </button>
            )}
            <span className="text-[11px] text-zinc-500">Valid for 5 mins</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join("").length !== 6}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Verify & Enter Simulator</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Security & Regulatory Footer Notice */}
      <div className="pt-2 text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>256-bit SSL encrypted • Educational simulator only</span>
        </div>
        <p className="text-[11px] text-zinc-500">
          Invest IQ is an educational market paper-trading platform. Virtual currency only. No real funds or broker credentials required.
        </p>
      </div>
    </div>
  );
}

interface SignInPageProps {
  initialMode?: "signin" | "signup";
}

export default function SignInPage({ initialMode = "signin" }: SignInPageProps) {
  return (
    <AuthLayout
      quote={{
        text: "The goal of a successful trader is to make the best trades. Money is secondary.",
        author: "Alexander Elder",
      }}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SignInForm initialMode={initialMode} />
      </Suspense>
    </AuthLayout>
  );
}
