import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllSubscriptionVideos } from "@/lib/youtube";
import { writeCache } from "@/lib/cache";

export const maxDuration = 300; // 5 λεπτά timeout για το sync

export async function POST() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Αν το token refresh απέτυχε, ζητάμε νέο login
  if (session.error === "RefreshTokenError") {
    return NextResponse.json({ error: "TokenExpired" }, { status: 401 });
  }

  try {
    const { channels, videos } = await getAllSubscriptionVideos(session.accessToken);
    writeCache(channels, videos);
    return NextResponse.json({
      ok: true,
      channels: channels.length,
      videos: videos.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
