import { NextResponse } from "next/server";
import { clearCurrentSession, SESSION_COOKIE_NAME } from "@/lib/auth-service";

export async function POST() {
  await clearCurrentSession();
  const response = NextResponse.json(
    { success: true, message: "Signed out successfully." },
    { status: 200 }
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}
