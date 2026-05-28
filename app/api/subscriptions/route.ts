import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readCache } from "@/lib/cache";

const STALE_AFTER_HOURS = 24;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cache = readCache();

  // Ελέγχουμε αν ο cache είναι παλιότερος από 24 ώρες
  let stale = false;
  if (cache.syncedAt) {
    const age = Date.now() - new Date(cache.syncedAt).getTime();
    stale = age > STALE_AFTER_HOURS * 60 * 60 * 1000;
  }

  return NextResponse.json({ ...cache, stale });
}
