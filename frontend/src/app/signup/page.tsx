"use client";

import React, { Suspense } from "react";
import SignInPage from "../signin/page";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignInPage initialMode="signup" />
    </Suspense>
  );
}
