import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const ENDPOINTS = [
  ["trade2-items.json", "https://www.pathofexile.com/api/trade2/data/items"],
  ["trade2-static.json", "https://www.pathofexile.com/api/trade2/data/static"],
  ["trade2-stats.json", "https://www.pathofexile.com/api/trade2/data/stats"],
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

export async function syncPoe2TradeData() {
  await mkdir(DATA_DIR, { recursive: true });

  for (const [filename, url] of ENDPOINTS) {
    const payload = await fetchJson(url);
    await writeFile(
      path.join(DATA_DIR, filename),
      `${JSON.stringify({ updatedAt: new Date().toISOString(), source: url, ...payload }, null, 2)}\n`,
      "utf8",
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncPoe2TradeData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
