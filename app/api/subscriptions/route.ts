import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readCache } from "@/lib/cache";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cache = readCache();
  return NextResponse.json(cache);
}
