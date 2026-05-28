import fs from "fs";
import path from "path";
import { CATEGORIES } from "./category-config";
import type { Category } from "./category-config";

export { CATEGORIES };
export type { Category };

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
