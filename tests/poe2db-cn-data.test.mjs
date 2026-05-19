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

test("poe2db Chinese cache includes passive tree names from PoE2DB", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];

  assert.ok(payload.source.some((source) => source.includes("/cn/passive-skill-tree")));
  assert.ok(entries.some((entry) => entry.type === "passive" && entry.english === "Traveller's Wisdom" && entry.chinese === "旅人的智慧"));
  assert.ok(entries.some((entry) => entry.type === "class" && entry.english === "Druid" && entry.chinese === "德鲁伊"));
  assert.ok(entries.some((entry) => entry.type === "ascendancy" && entry.english === "Pathfinder" && entry.chinese === "追猎者"));
});

test("poe2db Chinese cache includes equipment base names from PoE2DB", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];

  assert.ok(payload.source.some((source) => source.includes("/cn/Bows")));
  assert.ok(entries.some((entry) => entry.type === "item_base" && entry.english === "Shortbow" && entry.chinese === "短弓"));
  assert.ok(entries.some((entry) => entry.type === "item_base" && entry.english === "Heavy Belt" && entry.chinese === "重革腰带"));
});
