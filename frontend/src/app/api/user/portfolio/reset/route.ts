import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { resetUserPortfolio } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user ? user.id : "usr_demo";

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount) || 100000;

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Reset capital must be greater than zero." },
        { status: 400 }
      );
    }

    const updatedPortfolio = await resetUserPortfolio(userId, amount);

    return NextResponse.json(
      {
        success: true,
        message: `Paper portfolio successfully reset to $${amount.toLocaleString()}.`,
        portfolio: updatedPortfolio,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in portfolio reset route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during portfolio reset." },
      { status: 500 }
    );
  }
}
