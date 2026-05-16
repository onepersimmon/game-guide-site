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

  const builds = leagueSummary.statistics.slice(0, 10).map((entry, index) => {
    const slug = slugify(entry.class);
    const localizedClassName = localizedClassNames.get(entry.class) ?? entry.class;
    const summary = buildSummary(leagueSummary.leagueName, index, localizedClassName);
    const rankLabel = index < 3
      ? { zh: "主联赛头部", en: "Main league leader" }
      : { zh: "热门升华", en: "Popular ascendancy" };
    const movementLabel = trendLabel(entry.trend);

    return {
      id: `${leagueSummary.leagueUrl}-${slug}`,
      className: entry.class,
      leagueName: leagueSummary.leagueName,
      summary: summary.zh,
      popularity: Number(entry.percentage.toFixed(1)),
      trend: entry.trend,
      rank: index + 1,
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

  const payload = normalizeBuildIndexState(indexState, buildIndexState, localizedClassNames);

  await Promise.all([
    ...payload.builds.map((build) => {
      const filename = path.basename(build.image);
      return downloadBinary(build.sourceIcon, path.join(BUILD_ICON_DIR, filename));
    }),
    downloadBinary(HERO_IMAGE_URL, path.join(HERO_DIR, "poe2-bg.webp")),
  ]);

  await writeBuildsJson(payload);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  preservePreviousDataOnFailure(syncPoe2Builds).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
