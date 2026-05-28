import fs from "fs";
import path from "path";
import { Channel, Video } from "./youtube";

interface Cache {
  channels: Channel[];
  videos: Video[];
  syncedAt: string | null;
}

const filePath = path.join(process.cwd(), "data", "cache.json");

const empty: Cache = { channels: [], videos: [], syncedAt: null };

export function readCache(): Cache {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Cache;
  } catch {
    return { ...empty };
  }
}

export function writeCache(channels: Channel[], videos: Video[]): void {
  const cache: Cache = { channels, videos, syncedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(cache));
}

export function isCacheEmpty(): boolean {
  const c = readCache();
  return c.videos.length === 0;
}
