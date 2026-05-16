import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CACHE_DIR = path.join(DATA_DIR, "crawled");
const MAPS_PATH = path.join(DATA_DIR, "maps.json");
const CACHE_PATH = path.join(DATA_DIR, "map-guide-cache.json");

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripHtml(value) {
  return decodeHtml(value.replaceAll(/<[^>]+>/g, " "))
    .replaceAll(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]) : "";
}

function extractImageUrls(html, sourceUrl) {
  const matches = html.matchAll(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi);
  const source = new URL(sourceUrl);

  const imageUrls = uniqueValues(
    [...matches].map((match) => {
      try {
        return new URL(decodeHtml(match[1]), source).toString();
      } catch {
        return "";
      }
    }),
  );

  return imageUrls.filter((url) => /\/uploads\/images\/poe-2\/A4-/i.test(url));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-map-crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function downloadBinary(url, destination) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-map-crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed for ${url}: ${response.status}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

export async function fetchMapGuides() {
  await mkdir(CACHE_DIR, { recursive: true });

  const maps = JSON.parse(await readFile(MAPS_PATH, "utf8"));
  const cacheEntries = [];
  const sourceHtmlByUrl = new Map();

  for (const map of maps) {
    if (!map.sourceUrl) {
      continue;
    }

    if (!sourceHtmlByUrl.has(map.sourceUrl)) {
      sourceHtmlByUrl.set(map.sourceUrl, await fetchText(map.sourceUrl));
    }

    const html = sourceHtmlByUrl.get(map.sourceUrl);
    const snapshotPath = path.join(CACHE_DIR, `${map.id}.html`);
    const localImagePath = map.image ? path.resolve(ROOT, map.image) : "";

    await writeFile(snapshotPath, html, "utf8");
    if (map.mapImageUrl && localImagePath) {
      await downloadBinary(map.mapImageUrl, localImagePath);
    }

    cacheEntries.push({
      id: map.id,
      sourceName: map.sourceName,
      sourceUrl: map.sourceUrl,
      mapImageUrl: map.mapImageUrl,
      title: extractTitle(html),
      crawledAt: new Date().toISOString(),
      snapshot: `./data/crawled/${map.id}.html`,
      localImage: map.image,
      imageCandidates: extractImageUrls(html, map.sourceUrl),
    });
  }

  await writeFile(CACHE_PATH, `${JSON.stringify(cacheEntries, null, 2)}\n`, "utf8");
  return cacheEntries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchMapGuides().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
