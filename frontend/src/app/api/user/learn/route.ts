import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { updateLearnProgress } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Permission denied. Sign in required." },
        { status: 401 }
      );
    }
    const userId = user.id;

    const body = await req.json();
    const { topicId, score } = body;

    if (!topicId || typeof topicId !== "string") {
      return NextResponse.json(
        { success: false, message: "topicId string parameter is required." },
        { status: 400 }
      );
    }

    const progress = await updateLearnProgress(userId, topicId, score);

    return NextResponse.json(
      {
        success: true,
        progress,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating learn progress:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
