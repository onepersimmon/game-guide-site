// @author zwy
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data/social-guides.json");
const BILIBILI_SEARCH_URL = "https://api.bilibili.com/x/web-interface/search/type";
const SEARCH_TERMS = ["POE2 开荒", "流放之路2 开荒"];
const MAX_ITEMS_PER_PLATFORM = 6;

function stripHtml(value = "") {
  return String(value)
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function absoluteUrl(value, origin) {
  if (!value) return "";
  try {
    return new URL(value, origin).toString();
  } catch {
    return "";
  }
}

function searchUrl(platform, term = SEARCH_TERMS[0]) {
  const encoded = encodeURIComponent(term);
  return `https://search.bilibili.com/all?keyword=${encoded}`;
}

function buildHeaders(platform) {
  const cookie = process.env.BILIBILI_COOKIE;
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9",
    referer: searchUrl(platform),
    "user-agent": "Mozilla/5.0 (compatible; POE2GuideBot/1.0)",
    ...(cookie ? { cookie } : {}),
  };
}

async function fetchJson(url, options = {}, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function normalizeBilibiliResults(payload, term) {
  const rows = payload?.data?.result;
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((item) => item?.type === "video" && (item.bvid || item.arcurl) && item.title)
    .filter((item) => {
      const text = stripHtml(`${item.title} ${item.description}`);
      const title = stripHtml(item.title);
      return /(?:poe\s*2|poe2|流放\s*2|流放之路\s*2)/i.test(text)
        && !/(?:流放\s*1|流放之路\s*3|\b3\.29\b)/i.test(title);
    })
    .map((item) => ({
      id: `bilibili-${item.bvid ?? item.arcurl}`,
      platform: "bilibili",
      platformLabel: "B 站",
      title: stripHtml(item.title),
      summary: stripHtml(item.description),
      author: stripHtml(item.author),
      publishedAt: item.pubdate ? new Date(item.pubdate * 1000).toISOString() : null,
      href: (item.arcurl || `https://www.bilibili.com/video/${item.bvid}`).replace(/^http:/, "https:"),
      cover: absoluteUrl(item.pic?.startsWith("//") ? `https:${item.pic}` : item.pic, "https://www.bilibili.com"),
      query: term,
      source: "B 站公开搜索",
    }));
}

function dedupeAndLimit(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, MAX_ITEMS_PER_PLATFORM);
}

async function crawlBilibili() {
  const results = [];
  for (const term of SEARCH_TERMS) {
    const url = new URL(BILIBILI_SEARCH_URL);
    url.search = new URLSearchParams({ search_type: "video", keyword: term, order: "pubdate", page: "1" });
    const payload = await fetchJson(url, { headers: buildHeaders("bilibili") });
    if (payload.code !== 0) throw new Error(`B 站 API ${payload.code}: ${payload.message}`);
    results.push(...normalizeBilibiliResults(payload, term));
  }
  return dedupeAndLimit(results);
}

async function readExistingPayload() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return { updatedAt: null, items: [], errors: [] };
  }
}

export async function syncSocialGuides() {
  const existing = await readExistingPayload();
  const errors = [];
  const platformResults = [];
  try {
    platformResults.push(["bilibili", await crawlBilibili()]);
  } catch (error) {
    errors.push({ platform: "bilibili", message: error.message, at: new Date().toISOString() });
    platformResults.push(["bilibili", (existing.items || []).filter((item) => item.platform === "bilibili")]);
  }

  const items = platformResults.flatMap(([, value]) => value);
  const payload = {
    updatedAt: new Date().toISOString(),
    source: {
      name: "B 站公开搜索",
      queries: SEARCH_TERMS,
      bilibiliSearchUrl: searchUrl("bilibili"),
    },
    items,
    errors,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  errors.forEach((error) => console.warn(`[social-guides] ${error.platform}: ${error.message}`));
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncSocialGuides().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
