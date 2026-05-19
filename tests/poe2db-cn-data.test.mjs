import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = "/Users/persimmon/project/game-guide-site";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("poe2db Chinese cache includes skill and support gem names", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];

  assert.equal(entries.length > 100, true);
  assert.ok(entries.some((entry) => entry.english === "Lightning Arrow" && entry.chinese === "闪电箭矢"));
  assert.ok(entries.some((entry) => entry.english === "Concentrated Area" && entry.chinese === "范围集中"));
});
