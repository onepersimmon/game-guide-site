import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const targets = [
  ["world-maps-data", "data/world-maps.json"],
  ["ascendancies-data", "data/ascendancies.json"],
  ["maps-data", "data/maps.json"],
  ["builds-data", "data/builds.json"],
  ["ggg-news-data", "data/ggg-news.json"],
];

function replaceEmbeddedJson(html, scriptId, json) {
  const pattern = new RegExp(
    `<script id="${scriptId}" type="application/json">[\\s\\S]*?<\\/script>`,
  );
  const replacement = `<script id="${scriptId}" type="application/json">${JSON.stringify(JSON.parse(json))}</script>`;

  if (!pattern.test(html)) {
    throw new Error(`Missing embedded script tag: ${scriptId}`);
  }

  return html.replace(pattern, replacement);
}

export async function embedLocalData() {
  const htmlPath = path.join(ROOT, "index.html");
  let html = await readFile(htmlPath, "utf8");

  for (const [scriptId, relativePath] of targets) {
    const json = await readFile(path.join(ROOT, relativePath), "utf8");
    html = replaceEmbeddedJson(html, scriptId, json);
  }

  await writeFile(htmlPath, html, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  embedLocalData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
