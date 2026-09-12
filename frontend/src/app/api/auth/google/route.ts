import { NextRequest, NextResponse } from "next/server";
import { handleGoogleOAuth, SESSION_COOKIE_NAME } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || "alex.vance.trader@gmail.com";
    const name = body.name || "Alex Vance";
    const avatar = body.avatar || "";

    const result = await handleGoogleOAuth(email, name, avatar);

    const response = NextResponse.json(
      {
        success: true,
        message: "Google authentication successful.",
        user: result.user,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Error in Google OAuth route:", error);
    return NextResponse.json(
      { success: false, message: "Google authentication failed." },
      { status: 500 }
    );
  }
}
