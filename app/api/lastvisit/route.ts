import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readLastVisit, writeLastVisit } from "@/lib/lastvisit";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ lastVisitAt: readLastVisit() });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date().toISOString();
  writeLastVisit(now);
  return NextResponse.json({ lastVisitAt: now });
}
