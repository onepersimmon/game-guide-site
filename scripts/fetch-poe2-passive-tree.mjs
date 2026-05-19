import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePassiveTree } from "../tools/build-planner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(DATA_DIR, "poe2-passive-tree.json");
const NINJA_ORIGIN = "https://poe.ninja";
const NINJA_ASSET_ORIGIN = "https://assets.poe.ninja";
const INDEX_STATE_URL = `${NINJA_ORIGIN}/poe2/api/data/index-state`;

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

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

function resolveAssetUrl(source) {
  if (/^https?:\/\//.test(source)) {
    return source;
  }

  const assetPath = source.replace(/^\.\//, "");
  return new URL(`/_astro/${assetPath}`, NINJA_ASSET_ORIGIN).toString();
}

function findPoe2League(indexState) {
  return (
    indexState.snapshotVersions?.find((snapshot) => snapshot.url === "vaal" && snapshot.type !== "depthsolo") ??
    indexState.snapshotVersions?.find((snapshot) => snapshot.passiveTree?.startsWith("PassiveTree-")) ??
    {}
  );
}

function findSearchComponentUrl(buildPageHtml) {
  const match = buildPageHtml.match(/component-url="([^"]+)"[^>]+component-export="Poe2SearchPageWrapper"/);
  if (!match) {
    throw new Error("Could not find poe.ninja PoE2 search component URL");
  }

  return match[1];
}

function findTreeManifestUrl(componentSource) {
  const match = componentSource.match(/import\("\.\/([^"]+\.mjs)"\)[^)]*\)[^,]*,[^}]*Dom|\.\/(a\.[^"]+\.mjs)/);
  const explicit = componentSource.match(/\.\/(a\.[^"]+\.mjs)/g)?.find((candidate) => candidate.includes("Dom"));

  if (explicit) {
    return resolveAssetUrl(explicit.replace("./", ""));
  }

  if (match?.[1] || match?.[2]) {
    return resolveAssetUrl(match[1] ?? match[2]);
  }

  const fallback = componentSource.match(/\.\/(a\.[A-Za-z0-9_-]+\.mjs)/g)?.find((candidate) => {
    return componentSource.slice(Math.max(0, componentSource.indexOf(candidate) - 120), componentSource.indexOf(candidate) + 120).includes("Tree");
  });

  if (!fallback) {
    throw new Error("Could not find poe.ninja tree manifest module");
  }

  return resolveAssetUrl(fallback.replace("./", ""));
}

function findPassiveTreeAssetUrl(manifestSource, passiveTreeName) {
  const fileName = `${passiveTreeName}.json`;
  const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = manifestSource.match(new RegExp(`/trees/${escapedFileName}":\\(\\)=>[^"]+"\\.\\/([^"]+\\.mjs)"`));

  if (match) {
    return resolveAssetUrl(match[1]);
  }

  const latestMatch = manifestSource.match(/type:"PassiveTree",latest:!0[\s\S]*?\/trees\/([^"]+\.json)":\(\)=>[^"]+"\.\/([^"]+\.mjs)"/);
  if (latestMatch) {
    return resolveAssetUrl(latestMatch[2]);
  }

  throw new Error(`Could not find poe.ninja asset for ${passiveTreeName}`);
}

async function importRemoteModule(source, sourceUrl) {
  const encoded = Buffer.from(`${source}\n//# sourceURL=${sourceUrl}`).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

export async function syncPoe2PassiveTree() {
  const indexState = await fetchJson(INDEX_STATE_URL);
  const league = findPoe2League(indexState);
  const passiveTreeName = league.passiveTree ?? "PassiveTree-0.4";
  const buildPage = await fetchText(`${NINJA_ORIGIN}/poe2/builds/${league.url ?? "vaal"}`);
  const searchComponentUrl = findSearchComponentUrl(buildPage);
  const searchComponent = await fetchText(searchComponentUrl);
  const manifestUrl = findTreeManifestUrl(searchComponent);
  const manifestSource = await fetchText(manifestUrl);
  const treeAssetUrl = findPassiveTreeAssetUrl(manifestSource, passiveTreeName);
  const treeSource = await fetchText(treeAssetUrl);
  const treeModule = await importRemoteModule(treeSource, treeAssetUrl);
  const rawTree = treeModule.default ?? treeModule;
  const normalized = normalizePassiveTree(rawTree);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        source: treeAssetUrl,
        manifestSource: manifestUrl,
        version: passiveTreeName,
        league: league.name ?? "Fate of the Vaal",
        snapshotVersion: league.version ?? "",
        ...normalized,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncPoe2PassiveTree().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
