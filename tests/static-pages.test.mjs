import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const root = "/Users/persimmon/project/game-guide-site";
const generator = `${root}/scripts/generate-static-pages.mjs`;
const act1Upper = `${root}/campaign/act1-upper.html`;
const act1Lower = `${root}/campaign/act1-lower.html`;
const classesIndex = `${root}/classes/index.html`;
const buildsPage = `${root}/builds/poe-ninja-ranking.html`;

test("static page generator exists", () => {
  assert.equal(existsSync(generator), true, "generator script should exist");
});

test("static page generator runs", () => {
  execFileSync("node", ["./scripts/generate-static-pages.mjs"], {
    cwd: root,
    stdio: "pipe",
  });
});

test("generated seo pages exist", () => {
  [act1Upper, act1Lower, classesIndex, buildsPage].forEach((file) => {
    assert.equal(existsSync(file), true, `${file} should exist`);
  });
});

test("act1 upper page contains seo essentials", () => {
  const html = readFileSync(act1Upper, "utf8");
  assert.match(html, /<html lang="zh-CN"[^>]*>/);
  assert.match(html, /<title>.*第一章.*上层.*<\/title>/);
  assert.match(html, /<meta name="description"/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /<h1[^>]*>.*第一章.*上层.*<\/h1>/s);
  assert.match(html, /<script type="application\/ld\+json">/);
});
