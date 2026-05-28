import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "lastvisit.json");

export function readLastVisit(): string | null {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data.lastVisitAt ?? null;
  } catch {
    return null;
  }
}

export function writeLastVisit(iso: string): void {
  fs.writeFileSync(filePath, JSON.stringify({ lastVisitAt: iso }));
}
