import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.identifier || body.phone || body.email || "").toString().trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "A valid email address or phone number is required." },
        { status: 400 }
      );
    }

    const result = await requestOtp(identifier);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in OTP send route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
