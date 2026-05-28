import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readWatchLater, toggleWatchLater } from "@/lib/watchlater";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(readWatchLater());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { videoId } = await req.json();
  if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  const saved = toggleWatchLater(videoId);
  return NextResponse.json({ videoId, saved });
}
