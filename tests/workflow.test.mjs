// @author zwy
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
  assert.match(workflow, /cron:/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+write/);
  assert.match(workflow, /node .*scripts\/fetch-poe2-ninja\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-poe2-trade-data\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-poe2db-cn-index\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-poe2-passive-tree\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-map-guides\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-ggg-news\.mjs/);
  assert.match(workflow, /node .*scripts\/fetch-social-guides\.mjs/);
  assert.match(workflow, /continue-on-error:\s+true/);
  assert.match(workflow, /node .*scripts\/generate-static-pages\.mjs/);
  assert.match(workflow, /git add .*sitemap\.xml .*campaign .*classes .*builds .*tools/s);
  assert.match(workflow, /git add .*data\/trade2-items\.json .*data\/trade2-static\.json .*data\/trade2-stats\.json/s);
  assert.match(workflow, /git add .*data\/poe2db-cn-index\.json/s);
  assert.match(workflow, /git add .*data\/poe2-passive-tree\.json/s);
  assert.match(workflow, /git add .*data\/social-guides\.json .*data\/social-links\.json/s);
});
