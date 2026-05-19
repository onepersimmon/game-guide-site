import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "/Users/persimmon/project/game-guide-site/index.html",
  "/Users/persimmon/project/game-guide-site/styles.css",
  "/Users/persimmon/project/game-guide-site/app.js",
  "/Users/persimmon/project/game-guide-site/robots.txt",
  "/Users/persimmon/project/game-guide-site/sitemap.xml",
  "/Users/persimmon/project/game-guide-site/llms.txt",
  "/Users/persimmon/project/game-guide-site/tools/build-planner.html",
  "/Users/persimmon/project/game-guide-site/tools/build-planner.mjs",
  "/Users/persimmon/project/game-guide-site/data/trade2-items.json",
  "/Users/persimmon/project/game-guide-site/data/trade2-static.json",
  "/Users/persimmon/project/game-guide-site/data/trade2-stats.json",
  "/Users/persimmon/project/game-guide-site/data/maps.json",
  "/Users/persimmon/project/game-guide-site/data/builds.json",
  "/Users/persimmon/project/game-guide-site/data/ascendancies.json",
  "/Users/persimmon/project/game-guide-site/data/ggg-news.json",
];

const adsenseSnippet = "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2796426183102013";

test("site scaffold files exist", () => {
  requiredFiles.forEach((file) => {
    assert.equal(existsSync(file), true, `${file} should exist`);
  });
});

test("crawl discovery files point to the GitHub Pages project site", () => {
  const baseUrl = "https://aristpersimmon.top";
  const robots = readFileSync("/Users/persimmon/project/game-guide-site/robots.txt", "utf8");
  const sitemap = readFileSync("/Users/persimmon/project/game-guide-site/sitemap.xml", "utf8");
  const llms = readFileSync("/Users/persimmon/project/game-guide-site/llms.txt", "utf8");

  assert.match(robots, new RegExp(`${baseUrl}/sitemap\\.xml`));
  assert.match(sitemap, new RegExp(`${baseUrl}/`));
  assert.match(sitemap, new RegExp(`${baseUrl}/tools/build-planner\\.html`));
  assert.match(llms, new RegExp(`${baseUrl}/`));
  assert.match(llms, new RegExp(`${baseUrl}/tools/build-planner\\.html`));
});

test("site includes the AdSense verification snippet", () => {
  const index = readFileSync("/Users/persimmon/project/game-guide-site/index.html", "utf8");
  const about = readFileSync("/Users/persimmon/project/game-guide-site/about.html", "utf8");

  assert.equal(index.includes(adsenseSnippet), true);
  assert.equal(about.includes(adsenseSnippet), true);
});
