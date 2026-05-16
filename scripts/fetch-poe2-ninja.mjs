import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const ASCENDANCIES_PATH = path.join(DATA_DIR, "ascendancies.json");
const ASSET_DIR = path.join(ROOT, "assets", "images");
const BUILD_ICON_DIR = path.join(ASSET_DIR, "builds");
const HERO_DIR = path.join(ASSET_DIR, "hero");
const BUILD_INDEX_URL = "https://poe.ninja/poe2/api/data/build-index-state";
const INDEX_STATE_URL = "https://poe.ninja/poe2/api/data/index-state";
const HERO_IMAGE_URL = "https://poe.ninja/poe2-assets/images/bg.webp";
const POE2_ASSET_ROOT = "https://assets.poe.ninja/poe2";

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function classIconUrl(className) {
  return `${POE2_ASSET_ROOT}/classes/${slugify(className)}.webp`;
}

function trendLabel(trend) {
  if (trend > 0) {
    return { zh: "热度上升", en: "Rising" };
  }

  if (trend < 0) {
    return { zh: "热度回落", en: "Falling" };
  }

  return { zh: "热度持平", en: "Stable" };
}

function buildSummary(leagueName, index, className) {
  if (index === null) {
    return {
      zh: `${className} 是 poe.ninja 可筛选职业，目前未进入 ${leagueName} 占比前 10，适合点进忍者网继续看具体角色。`,
      en: `${className} is available in poe.ninja filters but is outside the top 10 share snapshot for ${leagueName}.`,
    };
  }

  return {
    zh: `${className} 在 ${leagueName} 当前排行靠前，可点进 poe.ninja 查看具体技能、装备和天赋组合。`,
    en: index < 3
      ? `A high-share ascendancy in ${leagueName}, worth watching as the league meta keeps shifting.`
      : `A popular ascendancy in ${leagueName}, kept locally for quick trend scanning.`,
  };
}

async function readAscendancyNameMap() {
  if (!existsSync(ASCENDANCIES_PATH)) {
    return new Map();
  }

  const payload = JSON.parse(await readFile(ASCENDANCIES_PATH, "utf8"));
  const names = new Map();

  payload.classes?.forEach((baseClass) => {
    names.set(baseClass.englishName, baseClass.name);
    baseClass.ascendancies?.forEach((ascendancy) => {
      names.set(ascendancy.englishName, ascendancy.name);
    });
  });

  return names;
}

async function readPoe2ClassCatalog() {
  if (!existsSync(ASCENDANCIES_PATH)) {
    return [];
  }

  const payload = JSON.parse(await readFile(ASCENDANCIES_PATH, "utf8"));
  return payload.classes.flatMap((baseClass) => [
    {
      className: baseClass.englishName,
      localizedClassName: baseClass.name,
      kind: "base",
    },
    ...(baseClass.ascendancies ?? []).map((ascendancy) => ({
      className: ascendancy.englishName,
      localizedClassName: ascendancy.name,
      kind: "ascendancy",
    })),
  ]);
}

export function normalizeBuildIndexState(indexState, buildIndexState, localizedClassNames = new Map()) {
  const mainLeague = indexState.buildLeagues.find((league) => league.url === "vaal")
    ?? indexState.buildLeagues.find((league) => league.indexed)
    ?? indexState.buildLeagues[0];

  const leagueSummary = buildIndexState.leagueBuilds.find(
    (league) => league.leagueUrl === mainLeague.url,
  );

  if (!leagueSummary) {
    return {
      updatedAt: new Date().toISOString(),
      source: "poe.ninja",
      leagueName: mainLeague.displayName,
      builds: [],
    };
  }

  const statisticsByClass = new Map(leagueSummary.statistics.map((entry) => [entry.class, entry]));
  const catalog = Array.isArray(localizedClassNames.catalog) ? localizedClassNames.catalog : [];
  const visibleClasses = catalog.length
    ? catalog
    : leagueSummary.statistics.map((entry) => ({
      className: entry.class,
      localizedClassName: localizedClassNames.get(entry.class) ?? entry.class,
      kind: "ascendancy",
    }));

  const builds = visibleClasses
    .map((item) => {
      const entry = statisticsByClass.get(item.className);
      const rank = entry
        ? leagueSummary.statistics.findIndex((candidate) => candidate.class === item.className) + 1
        : null;
      const popularity = entry ? Number(entry.percentage.toFixed(1)) : null;
      const trend = entry?.trend ?? 0;
      return {
        ...item,
        popularity,
        trend,
        rank,
      };
    })
    .sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      if (a.kind !== b.kind) return a.kind === "ascendancy" ? -1 : 1;
      return a.className.localeCompare(b.className);
    })
    .map((item, index) => {
    const entry = {
      class: item.className,
      percentage: item.popularity,
      trend: item.trend,
    };
    const slug = slugify(entry.class);
    const localizedClassName = item.localizedClassName ?? localizedClassNames.get(entry.class) ?? entry.class;
    const summary = buildSummary(leagueSummary.leagueName, item.rank ? index : null, localizedClassName);
    const rankLabel = item.rank && index < 3
      ? { zh: "主联赛头部", en: "Main league leader" }
      : item.rank
        ? { zh: "热门职业", en: "Popular class" }
        : { zh: "忍者网筛选项", en: "poe.ninja filter" };
    const movementLabel = trendLabel(entry.trend);

    return {
      id: `${leagueSummary.leagueUrl}-${slug}`,
      className: entry.class,
      leagueName: leagueSummary.leagueName,
      summary: summary.zh,
      popularity: item.popularity,
      trend: entry.trend,
      rank: item.rank,
      image: `./assets/images/builds/${slug}.webp`,
      tags: [rankLabel.zh, movementLabel.zh],
      href: `https://poe.ninja/poe2/builds/${leagueSummary.leagueUrl}?class=${encodeURIComponent(entry.class)}`,
      localized: {
        zh: {
          className: localizedClassName,
          leagueName: leagueSummary.leagueName,
          summary: summary.zh,
          tags: [rankLabel.zh, movementLabel.zh],
        },
        en: {
          className: entry.class,
          leagueName: leagueSummary.leagueName,
          summary: summary.en,
          tags: [rankLabel.en, movementLabel.en],
        },
      },
      sourceIcon: classIconUrl(entry.class),
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    source: "poe.ninja",
    leagueName: leagueSummary.leagueName,
    builds,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.json();
}

async function downloadBinary(url, destination) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "poe2-guide-site-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destination, Buffer.from(arrayBuffer));
}

async function tryDownloadBinary(url, destination) {
  try {
    await downloadBinary(url, destination);
    return true;
  } catch (error) {
    console.warn(`Skipped unavailable icon: ${url}`);
    return false;
  }
}

async function ensureDirs() {
  await mkdir(BUILD_ICON_DIR, { recursive: true });
  await mkdir(HERO_DIR, { recursive: true });
}

async function writeBuildsJson(payload) {
  const output = {
    ...payload,
    builds: payload.builds.map(({ sourceIcon, ...build }) => build),
  };

  await writeFile(
    path.join(DATA_DIR, "builds.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
}

async function preservePreviousDataOnFailure(task) {
  try {
    await task();
  } catch (error) {
    const existingPath = path.join(DATA_DIR, "builds.json");
    if (!existsSync(existingPath)) {
      throw error;
    }

    const previous = await readFile(existingPath, "utf8");
    await writeFile(existingPath, previous, "utf8");
    console.warn("Sync failed, preserved previous builds.json");
    console.warn(error);
  }
}

export async function syncPoe2Builds() {
  await ensureDirs();

  const [indexState, buildIndexState] = await Promise.all([
    fetchJson(INDEX_STATE_URL),
    fetchJson(BUILD_INDEX_URL),
  ]);
  const localizedClassNames = await readAscendancyNameMap();
  localizedClassNames.catalog = await readPoe2ClassCatalog();

  const payload = normalizeBuildIndexState(indexState, buildIndexState, localizedClassNames);

  const iconResults = await Promise.all(
    payload.builds.map(async (build) => {
      const filename = path.basename(build.image);
      const downloaded = await tryDownloadBinary(build.sourceIcon, path.join(BUILD_ICON_DIR, filename));
      return { build, downloaded };
    }),
  );

  payload.builds = iconResults
    .filter((result) => result.downloaded)
    .map((result, index) => ({
      ...result.build,
      displayOrder: index + 1,
    }));

  await downloadBinary(HERO_IMAGE_URL, path.join(HERO_DIR, "poe2-bg.webp"));

  await writeBuildsJson(payload);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  preservePreviousDataOnFailure(syncPoe2Builds).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
