import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = "/Users/persimmon/project/game-guide-site";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("trade cache files exist", () => {
  [
    `${root}/data/trade2-items.json`,
    `${root}/data/trade2-static.json`,
    `${root}/data/trade2-stats.json`,
  ].forEach((file) => {
    assert.equal(true, file.length > 0);
    assert.equal(readFileSync(file, "utf8").length > 0, true, `${file} should exist`);
  });
});

test("trade item cache exposes the dropdown groups we need", () => {
  const payload = readJson(`${root}/data/trade2-items.json`);
  const groups = new Set(payload.result.map((group) => group.id));

  assert.ok(groups.has("weapon"));
  assert.ok(groups.has("armour"));
  assert.ok(groups.has("accessory"));
  assert.ok(groups.has("jewel"));
  assert.ok(groups.has("gem"));
});

test("trade static cache exposes skill and support gem groups", () => {
  const payload = readJson(`${root}/data/trade2-static.json`);
  const groups = new Set(payload.result.map((group) => group.id));

  assert.ok(groups.has("UncutGems"));
  assert.ok(groups.has("LineageSupportGems"));
});

test("trade stat cache exposes skill and explicit groups", () => {
  const payload = readJson(`${root}/data/trade2-stats.json`);
  const groups = new Set(payload.result.map((group) => group.id));

  assert.ok(groups.has("explicit"));
  assert.ok(groups.has("skill"));
});
