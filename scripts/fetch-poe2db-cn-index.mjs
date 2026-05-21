import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(DATA_DIR, "poe2db-cn-index.json");
const EN_LOCALE = "us";
const SOURCE_LOCALE = "tw";
const PAGES = [
  { type: "skill", page: "Skill_Gems" },
  { type: "support", page: "Support_Gems" },
];
const PASSIVE_TREE_PAGE = "passive-skill-tree";
const ITEM_INDEX_PAGE = "Items";
const REQUIRED_ITEM_CLASS_PAGES = [
  "Amulets",
  "Belts",
  "Body_Armours",
  "Boots",
  "Bows",
  "Bucklers",
  "Claws",
  "Crossbows",
  "Daggers",
  "Flails",
  "Foci",
  "Gloves",
  "Helmets",
  "Jewels",
  "One_Hand_Axes",
  "One_Hand_Maces",
  "One_Hand_Swords",
  "Quarterstaves",
  "Quivers",
  "Rings",
  "Sceptres",
  "Shields",
  "Spears",
  "Staves",
  "Two_Hand_Axes",
  "Two_Hand_Maces",
  "Two_Hand_Swords",
  "Wands",
];

async function fetchText(url, referer = "") {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
      ...(referer ? { referer } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchOptionalText(url, referer = "") {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
      ...(referer ? { referer } : {}),
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

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toAbsolutePoe2dbUrl(url = "") {
  const decoded = decodeHtml(url).trim();
  if (!decoded) {
    return "";
  }

  if (decoded.startsWith("//")) {
    return `https:${decoded}`;
  }

  if (decoded.startsWith("/")) {
    return `https://poe2db.tw${decoded}`;
  }

  return decoded;
}

function extractImage(fragment = "") {
  const match = fragment.match(/<img[^>]+src="([^"]+)"/);
  return match ? toAbsolutePoe2dbUrl(match[1]) : "";
}

function parseGemAnchors(html, lang) {
  const entries = new Map();
  const pattern = new RegExp(`<a class="gem_[^"]+"[^>]+href="/${lang}/([^"]+)"[^>]*>([\\s\\S]*?)</a>`, "g");

  for (const match of html.matchAll(pattern)) {
    const slug = match[1];
    const fragment = match[2];
    const current = entries.get(slug) ?? {};
    const name = stripTags(fragment);
    const image = extractImage(fragment);
    entries.set(slug, {
      name: name || current.name || "",
      image: image || current.image || "",
    });
  }

  return entries;
}

function normalizePageSlug(href = "") {
  return decodeHtml(href)
    .replace(/^https:\/\/poe2db\.tw\/(?:us|cn|tw)\//, "")
    .replace(/^\/(?:us|cn|tw)\//, "")
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
    const current = entries.get(slug) ?? {};
    const name = stripTags(match[2]);
    const image = extractImage(match[2]);
    if (slug && (name || image)) {
      entries.set(slug, {
        name: name || current.name || "",
        image: image || current.image || "",
      });
    }
  }

  return entries;
}

function collectModifierHoverRefs(html, sourceUrl, refs = new Map()) {
  for (const match of html.matchAll(/Poe_Data_Mods_hover\/([a-f0-9]{64})/g)) {
    const hash = match[1];
    const hoverUrl = `https://cdn.poe2db.tw/cache2/tw/Poe_Data_Mods_hover/${hash}`;
    if (!refs.has(hash)) {
      refs.set(hash, { hash, url: hoverUrl, referer: sourceUrl });
    }
  }

  return refs;
}

function extractTableCell(html, label) {
  const pattern = new RegExp(`<tr><th>${escapeRegExp(label)}<td>([\\s\\S]*?)(?=<tr><th>|</table>)`, "i");
  const match = html.match(pattern);
  return match ? match[1] : "";
}

function parseModifierStats(statsHtml = "") {
  return [...statsHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => {
    const raw = match[1];
    const text = stripTags(raw.replace(/<span class='badge bg-primary'>[\s\S]*?<\/span>/g, ""));
    const minMatch = raw.match(/Min:\s*([0-9]+(?:\.[0-9]+)?)/i);
    const maxMatch = raw.match(/Max:\s*([0-9]+(?:\.[0-9]+)?)/i);
    const scope = [...raw.matchAll(/<span class='badge bg-primary'>([^<]+)<\/span>/g)]
      .map((badge) => stripTags(badge[1]))
      .filter((badge) => !/^Min:/i.test(badge) && !/^Max:/i.test(badge))
      .join(" / ");

    return {
      text,
      min: minMatch ? Number.parseFloat(minMatch[1]) : null,
      max: maxMatch ? Number.parseFloat(maxMatch[1]) : null,
      scope,
    };
  });
}

export function parsePoe2dbModifierHoverPage(html, sourceUrl = "") {
  const title = stripTags(html.match(/<h5 class="card-header">([\s\S]*?)<\/h5>/i)?.[1] ?? "");
  const name = stripTags(extractTableCell(html, "Name"));
  const family = stripTags(extractTableCell(html, "Family"));
  const domains = stripTags(extractTableCell(html, "Domains"));
  const generationType = stripTags(extractTableCell(html, "GenerationType"));
  const reqLevel = Number.parseInt(stripTags(extractTableCell(html, "Req. level")) || "0", 10) || 0;
  const stats = parseModifierStats(extractTableCell(html, "Stats"));
  const itemClassesHtml = extractTableCell(html, "ItemClasses");
  const itemClasses = [...itemClassesHtml.matchAll(/<a class="ItemClasses[^"]*" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1],
    label: stripTags(match[2]),
  }));
  const hash = sourceUrl.split("/").filter(Boolean).pop() ?? "";

  return {
    type: "modifier",
    hash,
    sourceUrl,
    title,
    name,
    family,
    domains,
    generationType,
    reqLevel,
    stats,
    itemClasses,
    searchText: [title, name, family, generationType, domains, reqLevel ? `需求等級 ${reqLevel}` : "", ...stats.map((stat) => `${stat.text} ${stat.min ?? ""} ${stat.max ?? ""}`), ...itemClasses.map((item) => item.label)].map((value) => String(value).trim()).filter(Boolean).join(" "),
  };
}

function getItemBasePagePriority(page = "") {
  const index = REQUIRED_ITEM_CLASS_PAGES.indexOf(page);
  return index === -1 ? 1000 : index;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
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
      poe2db: `https://poe2db.tw/${SOURCE_LOCALE}/${PASSIVE_TREE_PAGE}`,
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
        poe2db: `https://poe2db.tw/${SOURCE_LOCALE}/${PASSIVE_TREE_PAGE}`,
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
        poe2db: `https://poe2db.tw/${SOURCE_LOCALE}/${PASSIVE_TREE_PAGE}`,
      });
    }
  }

  return entries;
}

async function fetchPassiveTreeEntries() {
  const passivePage = await fetchText(`https://poe2db.tw/${SOURCE_LOCALE}/${PASSIVE_TREE_PAGE}`);
  const scriptUrl = findPassiveTreeScript(passivePage);
  const scriptText = await fetchText(scriptUrl);
  const version = findPoe2PassiveTreeVersion(scriptText);
  const [englishTree, chineseTree] = await Promise.all([
    fetchText(`https://poe2db.tw/data/${PASSIVE_TREE_PAGE}/${version}/data_${EN_LOCALE}.json?1`).then(JSON.parse),
    fetchText(`https://poe2db.tw/data/${PASSIVE_TREE_PAGE}/${version}/data_${SOURCE_LOCALE}.json?1`).then(JSON.parse),
  ]);

  return {
    version,
    entries: createPassiveTreeEntries(englishTree, chineseTree),
    sources: [
      `https://poe2db.tw/${SOURCE_LOCALE}/${PASSIVE_TREE_PAGE}`,
      `https://poe2db.tw/data/${PASSIVE_TREE_PAGE}/${version}/data_${SOURCE_LOCALE}.json?1`,
    ],
  };
}

async function fetchItemBaseEntries() {
  const [englishIndex, chineseIndex] = await Promise.all([
    fetchText(`https://poe2db.tw/${EN_LOCALE}/${ITEM_INDEX_PAGE}`),
    fetchText(`https://poe2db.tw/${SOURCE_LOCALE}/${ITEM_INDEX_PAGE}`),
  ]);
  const pageSlugs = [...new Set([...REQUIRED_ITEM_CLASS_PAGES, ...parseItemClassPages(englishIndex), ...parseItemClassPages(chineseIndex)])].sort();
  const entriesByEnglish = new Map();
  const modifierRefs = new Map();
  const sources = [`https://poe2db.tw/${SOURCE_LOCALE}/${ITEM_INDEX_PAGE}`];
  collectModifierHoverRefs(englishIndex, `https://poe2db.tw/${EN_LOCALE}/${ITEM_INDEX_PAGE}`, modifierRefs);
  collectModifierHoverRefs(chineseIndex, `https://poe2db.tw/${SOURCE_LOCALE}/${ITEM_INDEX_PAGE}`, modifierRefs);

  for (const slug of pageSlugs) {
    const [englishHtml, chineseHtml] = await Promise.all([
      fetchOptionalText(`https://poe2db.tw/${EN_LOCALE}/${slug}`),
      fetchOptionalText(`https://poe2db.tw/${SOURCE_LOCALE}/${slug}`),
    ]);
    if (!englishHtml || !chineseHtml) {
      continue;
    }

    sources.push(`https://poe2db.tw/${SOURCE_LOCALE}/${slug}`);
    collectModifierHoverRefs(englishHtml, `https://poe2db.tw/${EN_LOCALE}/${slug}`, modifierRefs);
    collectModifierHoverRefs(chineseHtml, `https://poe2db.tw/${SOURCE_LOCALE}/${slug}`, modifierRefs);
    const englishItems = parseBaseItems(englishHtml);
    const chineseItems = parseBaseItems(chineseHtml);

    for (const [itemSlug, englishItem] of englishItems.entries()) {
      const chineseItem = chineseItems.get(itemSlug);
      if (!chineseItem?.name) {
        continue;
      }

      const existing = entriesByEnglish.get(englishItem.name);
      if (existing && getItemBasePagePriority(existing.page) <= getItemBasePagePriority(slug)) {
        continue;
      }

      entriesByEnglish.set(englishItem.name, {
        type: "item_base",
        slug: itemSlug,
        page: slug,
        english: englishItem.name,
        chinese: chineseItem.name,
        image: chineseItem.image || englishItem.image || "",
        poe2db: `https://poe2db.tw/${SOURCE_LOCALE}/${itemSlug}`,
      });
    }
  }

  const modifierEntries = (await mapWithConcurrency([...modifierRefs.values()], 8, async (ref) => {
    try {
      const hoverHtml = await fetchOptionalText(ref.url, ref.referer);
      return hoverHtml ? parsePoe2dbModifierHoverPage(hoverHtml, ref.url) : null;
    } catch (error) {
      console.warn(`Skipping modifier ${ref.hash}: ${error.message}`);
      return null;
    }
  })).filter(Boolean);

  return {
    entries: [...entriesByEnglish.values()],
    sources,
    modifierEntries,
  };
}

export async function syncPoe2dbChineseIndex() {
  const entries = [];
  const source = [];

  for (const { type, page } of PAGES) {
    const [englishHtml, chineseHtml] = await Promise.all([
      fetchText(`https://poe2db.tw/${EN_LOCALE}/${page}`),
      fetchText(`https://poe2db.tw/${SOURCE_LOCALE}/${page}`),
    ]);
    source.push(`https://poe2db.tw/${SOURCE_LOCALE}/${page}`);
    const english = parseGemAnchors(englishHtml, EN_LOCALE);
    const chinese = parseGemAnchors(chineseHtml, SOURCE_LOCALE);

    for (const [slug, englishEntry] of english.entries()) {
      const chineseEntry = chinese.get(slug);
      if (!chineseEntry?.name) {
        continue;
      }

      entries.push({
        type,
        slug,
        english: englishEntry.name,
        chinese: chineseEntry.name,
        image: chineseEntry.image || englishEntry.image || "",
        poe2db: `https://poe2db.tw/${SOURCE_LOCALE}/${slug}`,
      });
    }
  }

  const passiveTree = await fetchPassiveTreeEntries();
  source.push(...passiveTree.sources);
  entries.push(...passiveTree.entries);

  const itemBases = await fetchItemBaseEntries();
  source.push(...itemBases.sources);
  entries.push(...itemBases.entries);
  entries.push(...itemBases.modifierEntries);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        locale: SOURCE_LOCALE,
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
