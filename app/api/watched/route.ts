import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readWatched, toggleWatched } from "@/lib/watched";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(readWatched());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoId } = await req.json();
  if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

  const isWatched = toggleWatched(videoId);
  return NextResponse.json({ videoId, watched: isWatched });
}
