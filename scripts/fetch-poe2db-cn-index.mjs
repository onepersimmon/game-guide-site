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
const PASSIVE_TREE_PAGE = "passive-skill-tree";
const ITEM_INDEX_PAGE = "Items";

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

async function fetchOptionalText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
    },
  });

  if (response.status === 404) {
    return "";
  }

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

function stripTags(text = "") {
  return decodeHtml(String(text).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseGemAnchors(html, lang) {
  const entries = new Map();
  const pattern = new RegExp(`<a class="gem_[^"]+"[^>]+href="/${lang}/([^"]+)"[^>]*>([^<]+)</a>`, "g");

  for (const match of html.matchAll(pattern)) {
    entries.set(match[1], decodeHtml(match[2]).trim());
  }

  return entries;
}

function normalizePageSlug(href = "") {
  return decodeHtml(href)
    .replace(/^https:\/\/poe2db\.tw\/(?:us|cn)\//, "")
    .replace(/^\/(?:us|cn)\//, "")
    .replace(/^\//, "")
    .split("#")[0]
    .split("?")[0]
    .trim();
}

function parseItemClassPages(html) {
  const slugs = new Set();
  const pattern = /<a class="ItemClasses[^"]*"[^>]+href="([^"]+)"/g;

  for (const match of html.matchAll(pattern)) {
    const slug = normalizePageSlug(match[1]);
    if (slug) {
      slugs.add(slug);
    }
  }

  return [...slugs];
}

function parseBaseItems(html) {
  const entries = new Map();
  const pattern = /<a class="[^"]*\bwhiteitem\b[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

  for (const match of html.matchAll(pattern)) {
    const slug = normalizePageSlug(match[1]);
    const name = stripTags(match[2]);
    if (slug && name) {
      entries.set(slug, name);
    }
  }

  return entries;
}

function findPassiveTreeScript(html) {
  const match = html.match(/<script src="(https:\/\/cdn\.poe2db\.tw\/js\/passive-skill-tree\.[^"]+\.js)"><\/script>/);
  if (!match) {
    throw new Error("Could not find PoE2DB passive tree script");
  }

  return match[1];
}

function findPoe2PassiveTreeVersion(scriptText) {
  const match = scriptText.match(/poe2version:"([^"]+)"/);
  if (!match) {
    throw new Error("Could not find PoE2DB passive tree version");
  }

  return match[1];
}

function createPassiveTreeEntries(englishTree, chineseTree) {
  const entries = [];

  for (const [id, englishNode] of Object.entries(englishTree.nodes ?? {})) {
    if (id === "root" || !englishNode?.name) {
      continue;
    }

    const chineseNode = chineseTree.nodes?.[id];
    if (!chineseNode?.name) {
      continue;
    }

    entries.push({
      type: "passive",
      skill: String(englishNode.skill ?? id),
      code: englishNode.code ?? "",
      english: englishNode.name,
      chinese: chineseNode.name,
      englishStats: englishNode.stats ?? [],
      chineseStats: chineseNode.stats ?? [],
      poe2db: `https://poe2db.tw/cn/${PASSIVE_TREE_PAGE}`,
    });
  }

  for (const [index, englishClass] of (englishTree.classes ?? []).entries()) {
    const chineseClass = chineseTree.classes?.[index];
    if (englishClass?.name && chineseClass?.name) {
      entries.push({
        type: "class",
        index,
        english: englishClass.name,
        chinese: chineseClass.name,
        poe2db: `https://poe2db.tw/cn/${PASSIVE_TREE_PAGE}`,
      });
    }

    for (const [ascendancyIndex, englishAscendancy] of (englishClass.ascendancies ?? []).entries()) {
      const chineseAscendancy = chineseClass?.ascendancies?.[ascendancyIndex];
      if (!englishAscendancy?.name || !chineseAscendancy?.name) {
        continue;
      }

      entries.push({
        type: "ascendancy",
        classIndex: index,
        index: ascendancyIndex,
        id: englishAscendancy.id ?? "",
        english: englishAscendancy.name,
        chinese: chineseAscendancy.name,
        poe2db: `https://poe2db.tw/cn/${PASSIVE_TREE_PAGE}`,
      });
    }
  }

  return entries;
}

async function fetchPassiveTreeEntries() {
  const passivePage = await fetchText(`https://poe2db.tw/cn/${PASSIVE_TREE_PAGE}`);
  const scriptUrl = findPassiveTreeScript(passivePage);
  const scriptText = await fetchText(scriptUrl);
  const version = findPoe2PassiveTreeVersion(scriptText);
  const [englishTree, chineseTree] = await Promise.all([
    fetchText(`https://poe2db.tw/data/${PASSIVE_TREE_PAGE}/${version}/data_us.json?1`).then(JSON.parse),
    fetchText(`https://poe2db.tw/data/${PASSIVE_TREE_PAGE}/${version}/data_cn.json?1`).then(JSON.parse),
  ]);

  return {
    version,
    entries: createPassiveTreeEntries(englishTree, chineseTree),
    sources: [
      `https://poe2db.tw/cn/${PASSIVE_TREE_PAGE}`,
      `https://poe2db.tw/data/${PASSIVE_TREE_PAGE}/${version}/data_cn.json?1`,
    ],
  };
}

async function fetchItemBaseEntries() {
  const [englishIndex, chineseIndex] = await Promise.all([
    fetchText(`https://poe2db.tw/us/${ITEM_INDEX_PAGE}`),
    fetchText(`https://poe2db.tw/cn/${ITEM_INDEX_PAGE}`),
  ]);
  const pageSlugs = [...new Set([...parseItemClassPages(englishIndex), ...parseItemClassPages(chineseIndex)])].sort();
  const entriesByEnglish = new Map();
  const sources = [`https://poe2db.tw/cn/${ITEM_INDEX_PAGE}`];

  for (const slug of pageSlugs) {
    const [englishHtml, chineseHtml] = await Promise.all([
      fetchOptionalText(`https://poe2db.tw/us/${slug}`),
      fetchOptionalText(`https://poe2db.tw/cn/${slug}`),
    ]);
    if (!englishHtml || !chineseHtml) {
      continue;
    }

    sources.push(`https://poe2db.tw/cn/${slug}`);
    const englishItems = parseBaseItems(englishHtml);
    const chineseItems = parseBaseItems(chineseHtml);

    for (const [itemSlug, englishName] of englishItems.entries()) {
      const chineseName = chineseItems.get(itemSlug);
      if (!chineseName) {
        continue;
      }

      entriesByEnglish.set(englishName, {
        type: "item_base",
        slug: itemSlug,
        page: slug,
        english: englishName,
        chinese: chineseName,
        poe2db: `https://poe2db.tw/cn/${itemSlug}`,
      });
    }
  }

  return {
    entries: [...entriesByEnglish.values()],
    sources,
  };
}

export async function syncPoe2dbChineseIndex() {
  const entries = [];
  const source = [];

  for (const { type, page } of PAGES) {
    const [englishHtml, chineseHtml] = await Promise.all([
      fetchText(`https://poe2db.tw/us/${page}`),
      fetchText(`https://poe2db.tw/cn/${page}`),
    ]);
    source.push(`https://poe2db.tw/cn/${page}`);
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

  const passiveTree = await fetchPassiveTreeEntries();
  source.push(...passiveTree.sources);
  entries.push(...passiveTree.entries);

  const itemBases = await fetchItemBaseEntries();
  source.push(...itemBases.sources);
  entries.push(...itemBases.entries);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        source,
        passiveTreeVersion: passiveTree.version,
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
