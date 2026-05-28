import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readCategories, writeCategories, CATEGORIES, Category } from "@/lib/categories";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(readCategories());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Validate: μόνο γνωστές κατηγορίες γίνονται αποδεκτές
  const validated: Record<string, Category> = {};
  for (const [channelId, cat] of Object.entries(body)) {
    if (CATEGORIES.includes(cat as Category)) {
      validated[channelId] = cat as Category;
    }
  }

  writeCategories(validated);
  return NextResponse.json({ ok: true });
}
