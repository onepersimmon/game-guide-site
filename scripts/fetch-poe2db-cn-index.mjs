import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(DATA_DIR, "poe2db-cn-index.json");
const PAGES = [
  { type: "skill", page: "Skill_Gems" },
  { type: "support", page: "Support_Gems" },
];

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function decodeHtml(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseGemAnchors(html, lang) {
  const entries = new Map();
  const pattern = new RegExp(`<a class="gem_[^"]+"[^>]+href="/${lang}/([^"]+)"[^>]*>([^<]+)</a>`, "g");

  for (const match of html.matchAll(pattern)) {
    entries.set(match[1], decodeHtml(match[2]).trim());
  }

  return entries;
}

export async function syncPoe2dbChineseIndex() {
  const entries = [];

  for (const { type, page } of PAGES) {
    const [englishHtml, chineseHtml] = await Promise.all([
      fetchText(`https://poe2db.tw/us/${page}`),
      fetchText(`https://poe2db.tw/cn/${page}`),
    ]);
    const english = parseGemAnchors(englishHtml, "us");
    const chinese = parseGemAnchors(chineseHtml, "cn");

    for (const [slug, englishName] of english.entries()) {
      const chineseName = chinese.get(slug);
      if (!chineseName) {
        continue;
      }

      entries.push({
        type,
        slug,
        english: englishName,
        chinese: chineseName,
        poe2db: `https://poe2db.tw/cn/${slug}`,
      });
    }
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        source: PAGES.map(({ page }) => `https://poe2db.tw/cn/${page}`),
        entries,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncPoe2dbChineseIndex().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
