import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const requiredFiles = [
  "/Users/persimmon/project/game-guide-site/index.html",
  "/Users/persimmon/project/game-guide-site/styles.css",
  "/Users/persimmon/project/game-guide-site/app.js",
  "/Users/persimmon/project/game-guide-site/data/maps.json",
  "/Users/persimmon/project/game-guide-site/data/builds.json",
  "/Users/persimmon/project/game-guide-site/data/ascendancies.json",
];

test("site scaffold files exist", () => {
  requiredFiles.forEach((file) => {
    assert.equal(existsSync(file), true, `${file} should exist`);
  });
});
