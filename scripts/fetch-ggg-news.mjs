import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data/ggg-news.json");
const OFFICIAL_HOME_API = "https://pathofexile2.com/internal-api/content/home";
const OFFICIAL_NEWS_URL = "https://pathofexile2.com/news";

const KNOWN_TRANSLATIONS = {
  "Breach Mechanics Recap": {
    title: "裂隙机制回顾",
    summary: "如果你错过了裂隙改动，这篇回顾会带你快速看一遍。",
  },
  "Balance Changes to Chronomancer and Gemling Legionnaire Ascendancies": {
    title: "时空术士与古灵使徒斗士升华平衡调整",
    summary: "在《先人回归》中，时空术士和古灵使徒斗士会迎来一些平衡改动，点开这篇新闻就能看见具体变化。",
  },
  "Expedition: Logbook Exploration": {
    title: "探险：日志簿探索",
    summary: "在《先人回归》中，日志簿会有大幅调整。准备好扬帆出海，像真正的探险家一样去发现新内容吧。",
  },
  "Path of Exile 2: Return of the Ancients Teasers": {
    title: "流放之路 2：先人回归预告汇总",
    summary: "GGG 会在这篇帖子中持续汇总《流放之路 2：先人回归》的预告内容。",
  },
  "Fate of the Vaal as Core Path of Exile 2 Mechanic": {
    title: "瓦尔命运将成为流放之路 2 核心机制",
    summary: "阿兹里的神殿会在 5 月 29 日先人回归上线后保留为核心机制，公告说明了具体改动。",
  },
  "Reworked Uniques - Reverie and Hollow Mask": {
    title: "重做传奇：Reverie 与 Hollow Mask",
    summary: "先人回归中，Reverie 与 Hollow Mask 两件传奇会被重做，围绕 Viridi 与恢复仪式提供新玩法。",
  },
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeUrl(href) {
  if (!href) {
    return OFFICIAL_NEWS_URL;
  }

  return new URL(href, "https://pathofexile2.com").toString();
}

export function normalizeGggNews(apiPayload) {
  const news = apiPayload?.context?.news;
  if (!Array.isArray(news)) {
    throw new Error("Official POE2 home payload does not include context.news");
  }

  return {
    updatedAt: new Date().toISOString(),
    source: {
      name: "Path of Exile 2 Official News",
      url: OFFICIAL_HOME_API,
      pageUrl: OFFICIAL_NEWS_URL,
    },
    items: news
      .filter((item) => item?.title && item?.href)
      .map((item) => {
        const known = KNOWN_TRANSLATIONS[item.title] ?? {};
        const href = normalizeUrl(item.href);
        return {
          id: slugify(item.title),
          title: item.title,
          date: item.date,
          summary: item.leadIn ?? "",
          href,
          thumb: item.thumb ? normalizeUrl(item.thumb) : "",
          category: href.includes("/forum/") ? "Blue Post" : "News",
          localized: {
            zh: {
              title: known.title ?? item.title,
              summary: known.summary ?? item.leadIn ?? "",
              category: href.includes("/forum/") ? "GGG 蓝贴" : "官方新闻",
            },
            en: {
              title: item.title,
              summary: item.leadIn ?? "",
              category: href.includes("/forum/") ? "Blue Post" : "News",
            },
          },
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3),
  };
}

async function readExistingPayload() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

export async function fetchGggNews() {
  const response = await fetch(OFFICIAL_HOME_API, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (compatible; POE2GuideBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`GGG news request failed: ${response.status}`);
  }

  return normalizeGggNews(await response.json());
}

export async function writeGggNews() {
  try {
    const payload = await fetchGggNews();
    await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return payload;
  } catch (error) {
    const existing = await readExistingPayload();
    if (existing?.items?.length) {
      console.warn(`Using existing GGG news cache after fetch failure: ${error.message}`);
      return existing;
    }
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeGggNews().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
