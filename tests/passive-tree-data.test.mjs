// @author zwy
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = "/Users/persimmon/project/game-guide-site";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("passive tree cache exists and exposes drawable nodes", () => {
  const payload = readJson(`${root}/data/poe2-passive-tree.json`);

  assert.match(payload.source, /^https:\/\/assets\.poe\.ninja\//);
  assert.match(payload.version, /^PassiveTree-0\.[45]$/);
  assert.equal(payload.nodes.length > 1000, true);
  assert.equal(payload.classes.length > 5, true);
  assert.equal(typeof payload.bounds.minX, "number");
  assert.equal(typeof payload.nodes[0].x, "number");
  assert.equal(typeof payload.nodes[0].statsText, "string");
});
