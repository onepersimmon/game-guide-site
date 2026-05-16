import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SOURCE = "https://poe2db.tw";
const SOURCE_PATH = "/cn/Ascendancy_class";
const BASE_CLASS_SLUGS = new Set([
  "Ranger",
  "Huntress",
  "Shadow",
  "Monk",
  "Witch",
  "Sorceress",
  "Marauder",
  "Warrior",
  "Duelist",
  "Mercenary",
  "Templar",
  "Druid",
]);

function decodeHtml(value = "") {
  return value
    .replaceAll(/<br\s*\/?>/gi, " / ")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .replaceAll("_", "-")
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

async function fetchHtml(locale) {
  const response = await fetch(`${SOURCE}/${locale}/Ascendancy_class`, {
    headers: { "user-agent": "poe2-guide-site-sync/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch poe2db ${locale}: ${response.status}`);
  }

  return response.text();
}

function parseClassSection(html, locale) {
  const start = html.indexOf(locale === "cn" ? '<div id="升华试炼Classes"' : '<div id="AscendancyClasses"');
  const end = html.indexOf(locale === "cn" ? '<div id="升华试炼天赋"' : '<div id="Ascendancypassives"');
  if (start < 0 || end < 0 || end <= start) {
    return [];
  }

  const section = html.slice(start, end);
  const figurePattern = /<figure class="text-center mb-0">([\s\S]*?)<\/figure>/g;
  const entries = [];
  let currentClass = null;

  for (const match of section.matchAll(figurePattern)) {
    const figure = match[1];
    const link = figure.match(/<a class="([^"]+)"[^>]*href="\/(?:cn|us)\/([^"]+)"[^>]*>([^<]+)<\/a>/);
    const image = figure.match(/<img[^>]*src="([^"]+)"/);
    if (!link) {
      continue;
    }

    const [, classSlug, hrefSlug, rawName] = link;
    const name = decodeHtml(rawName);
    const item = {
      slug: hrefSlug,
      id: slugify(hrefSlug),
      name,
      sourceUrl: `${SOURCE}/${locale}/${hrefSlug}`,
      image: image?.[1] ?? "",
    };

    if (BASE_CLASS_SLUGS.has(hrefSlug)) {
      currentClass = {
        ...item,
        classSlug,
        ascendancies: [],
      };
      entries.push(currentClass);
      continue;
    }

    if (currentClass) {
      currentClass.ascendancies.push(item);
    }
  }

  return entries;
}

function parsePassiveSection(html, locale) {
  const label = locale === "cn" ? "升华:" : "Ascendancy:";
  const chunks = html.split('<div class="passive-icon-container passive-icon-type__ascendancy_notable ">');
  const grouped = new Map();

  chunks.forEach((chunk) => {
    const passive = chunk.match(/<a class="PassiveSkills"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const ascendancy = chunk.match(new RegExp(`${label}[\\s\\S]*?href="\\/(?:cn|us)\\/([^"]+)"[^>]*>([^<]+)<\\/a>`));
    if (!passive || !ascendancy) {
      return;
    }

    const implicitMods = [...chunk.matchAll(/<div class="implicitMod">([\s\S]*?)<\/div>/g)]
      .map((match) => decodeHtml(match[1]))
      .filter(Boolean);
    const key = ascendancy[1];
    const entry = {
      slug: passive[1],
      name: decodeHtml(passive[2]),
      effect: implicitMods.slice(0, 2).join(" / "),
      sourceUrl: `${SOURCE}/${locale}/${passive[1]}`,
    };

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    const list = grouped.get(key);
    if (list.length < 4 && !list.some((item) => item.slug === entry.slug)) {
      list.push(entry);
    }
  });

  return grouped;
}

function mergeLocales(cnClasses, usClasses, cnPassives, usPassives) {
  const usClassBySlug = new Map(usClasses.map((item) => [item.slug, item]));

  return cnClasses.map((cnClass) => {
    const usClass = usClassBySlug.get(cnClass.slug);
    const usAscBySlug = new Map((usClass?.ascendancies ?? []).map((item) => [item.slug, item]));

    return {
      id: cnClass.id,
      name: cnClass.name,
      englishName: usClass?.name ?? cnClass.slug.replaceAll("_", " "),
      sourceUrl: cnClass.sourceUrl,
      image: cnClass.image,
      ascendancies: cnClass.ascendancies.map((ascendancy) => {
        const en = usAscBySlug.get(ascendancy.slug);
        const notableCn = cnPassives.get(ascendancy.slug) ?? [];
        const notableEn = usPassives.get(ascendancy.slug) ?? [];
        const englishNotables = new Map(notableEn.map((item) => [item.slug, item]));

        return {
          id: ascendancy.id,
          name: ascendancy.name,
          englishName: en?.name ?? ascendancy.slug.replaceAll("_", " "),
          sourceUrl: ascendancy.sourceUrl,
          image: ascendancy.image,
          notables: notableCn.map((notable) => {
            const english = englishNotables.get(notable.slug);
            return {
              name: notable.name,
              effect: notable.effect,
              sourceUrl: notable.sourceUrl,
              localized: {
                en: {
                  name: english?.name ?? notable.slug.replaceAll("_", " "),
                  effect: english?.effect ?? "",
                },
              },
            };
          }),
          localized: {
            en: {
              name: en?.name ?? ascendancy.slug.replaceAll("_", " "),
            },
          },
        };
      }),
      localized: {
        en: {
          name: usClass?.name ?? cnClass.slug.replaceAll("_", " "),
        },
      },
    };
  });
}

export async function syncPoe2Ascendancies() {
  const [cnHtml, usHtml] = await Promise.all([fetchHtml("cn"), fetchHtml("us")]);
  const classes = mergeLocales(
    parseClassSection(cnHtml, "cn"),
    parseClassSection(usHtml, "us"),
    parsePassiveSection(cnHtml, "cn"),
    parsePassiveSection(usHtml, "us"),
  );

  const payload = {
    updatedAt: new Date().toISOString(),
    source: {
      name: "流亡2编年史 / PoE2DB",
      url: `${SOURCE}${SOURCE_PATH}`,
    },
    classes,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "ascendancies.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncPoe2Ascendancies().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
