import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  "/Users/persimmon/project/game-guide-site/.github/workflows/update-builds.yml",
  "utf8",
);

test("workflow calls the build sync script", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /node .*scripts\/fetch-poe2-ninja\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-map-guides\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-ggg-news\.mjs/);
  assert.match(workflow, /node .*scripts\/generate-static-pages\.mjs/);
  assert.match(workflow, /git add .*sitemap\.xml .*campaign .*classes .*builds/s);
});
