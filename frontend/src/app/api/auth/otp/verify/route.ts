import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, SESSION_COOKIE_NAME } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.phone || body.email || "").toString().trim();
    const { code, name } = body;

    if (!identifier || !code) {
      return NextResponse.json(
        { success: false, message: "Email or phone number and verification code are required." },
        { status: 400 }
      );
    }

    const result = await verifyOtp(identifier, code, name);
    if (!result.success || !result.token) {
      return NextResponse.json(result, { status: 400 });
    }

    const response = NextResponse.json(
      {
        success: true,
        message: result.message,
        user: result.user,
      },
      { status: 200 }
    );

    // Set secure httpOnly session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Error in OTP verify route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
