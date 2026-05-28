import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "watched.json");

export function readWatched(): Record<string, true> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

export function toggleWatched(videoId: string): boolean {
  const watched = readWatched();
  if (watched[videoId]) {
    delete watched[videoId];
    fs.writeFileSync(filePath, JSON.stringify(watched));
    return false;
  } else {
    watched[videoId] = true;
    fs.writeFileSync(filePath, JSON.stringify(watched));
    return true;
  }
}
