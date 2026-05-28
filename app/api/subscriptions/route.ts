import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllSubscriptionVideos } from "@/lib/youtube";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await getAllSubscriptionVideos(session.accessToken, 3);
    return NextResponse.json(data);
  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube data" },
      { status: 500 }
    );
  }
}
