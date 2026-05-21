import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = "/Users/persimmon/project/game-guide-site";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("poe2db Chinese cache includes Traditional Chinese skill and support gem names with icons", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];

  assert.equal(entries.length > 100, true);
  assert.equal(payload.locale, "tw");
  assert.ok(payload.source.some((source) => source.includes("/tw/Skill_Gems")));
  assert.ok(entries.some((entry) => entry.english === "Lightning Arrow" && entry.chinese === "閃電箭矢" && /SkillIcons/.test(entry.image ?? "")));
  assert.ok(entries.some((entry) => entry.english === "Concentrated Area" && entry.chinese === "集中光環" && /skillicons/i.test(entry.image ?? "")));
});

test("poe2db Chinese cache includes Traditional Chinese passive tree names from PoE2DB", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];

  assert.ok(payload.source.some((source) => source.includes("/tw/passive-skill-tree")));
  assert.ok(entries.some((entry) => entry.type === "passive" && entry.english === "Traveller's Wisdom" && entry.chinese === "旅者的智慧"));
  assert.ok(entries.some((entry) => entry.type === "class" && entry.english === "Druid" && entry.chinese === "德魯伊"));
  assert.ok(entries.some((entry) => entry.type === "ascendancy" && entry.english === "Pathfinder" && entry.chinese === "追獵者"));
});

test("poe2db Chinese cache includes Traditional Chinese equipment base names with slot metadata", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];

  assert.ok(payload.source.some((source) => source.includes("/tw/Bows")));
  assert.ok(entries.some((entry) => entry.type === "item_base" && entry.english === "Shortbow" && entry.chinese === "短弓" && entry.page === "Bows"));
  assert.ok(entries.some((entry) => entry.type === "item_base" && entry.english === "Heavy Belt" && entry.chinese === "重革腰帶" && entry.page === "Belts"));
  assert.ok(entries.some((entry) => entry.type === "item_base" && entry.page === "Helmets" && /image\//.test(entry.image ?? "")));
});

test("poe2db Chinese cache includes Traditional Chinese modifier entries with range metadata", () => {
  const payload = readJson(`${root}/data/poe2db-cn-index.json`);
  const entries = payload.entries ?? [];
  const modifiers = entries.filter((entry) => entry.type === "modifier");

  assert.ok(modifiers.length > 0);
  assert.ok(modifiers.some((entry) => entry.name || entry.title));
  assert.ok(modifiers.some((entry) => Array.isArray(entry.stats) && entry.stats.length > 0));
});
