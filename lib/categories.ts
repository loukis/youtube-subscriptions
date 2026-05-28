import fs from "fs";
import path from "path";

export const CATEGORIES = ["Code", "Economy", "Music", "Sports", "News", "Gaming", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

const filePath = path.join(process.cwd(), "data", "categories.json");

export function readCategories(): Record<string, Category> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

export function writeCategories(data: Record<string, Category>): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
