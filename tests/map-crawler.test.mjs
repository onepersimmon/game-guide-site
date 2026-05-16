import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const scriptPath = "/Users/persimmon/project/game-guide-site/scripts/fetch-map-guides.mjs";

test("map guide crawler exists and writes local cache data", () => {
  assert.equal(existsSync(scriptPath), true, "map crawler script should exist");

  const script = readFileSync(scriptPath, "utf8");
  assert.match(script, /fetchMapGuides/);
  assert.match(script, /map-guide-cache\.json/);
  assert.doesNotMatch(script, /window\.location|location\.href/);
});
