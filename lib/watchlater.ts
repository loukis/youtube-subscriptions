import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "watchlater.json");

export function readWatchLater(): Record<string, true> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

export function toggleWatchLater(videoId: string): boolean {
  const data = readWatchLater();
  if (data[videoId]) {
    delete data[videoId];
    fs.writeFileSync(filePath, JSON.stringify(data));
    return false;
  } else {
    data[videoId] = true;
    fs.writeFileSync(filePath, JSON.stringify(data));
    return true;
  }
}
