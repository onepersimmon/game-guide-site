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
  "/Users/persimmon/project/game-guide-site/data/maps.json",
  "/Users/persimmon/project/game-guide-site/data/builds.json",
  "/Users/persimmon/project/game-guide-site/data/ascendancies.json",
  "/Users/persimmon/project/game-guide-site/data/ggg-news.json",
];

test("site scaffold files exist", () => {
  requiredFiles.forEach((file) => {
    assert.equal(existsSync(file), true, `${file} should exist`);
  });
});

test("crawl discovery files point to the GitHub Pages project site", () => {
  const baseUrl = "https://onepersimmon.github.io/game-guide-site";
  const robots = readFileSync("/Users/persimmon/project/game-guide-site/robots.txt", "utf8");
  const sitemap = readFileSync("/Users/persimmon/project/game-guide-site/sitemap.xml", "utf8");
  const llms = readFileSync("/Users/persimmon/project/game-guide-site/llms.txt", "utf8");

  assert.match(robots, new RegExp(`${baseUrl}/sitemap\\.xml`));
  assert.match(sitemap, new RegExp(`${baseUrl}/`));
  assert.match(llms, new RegExp(`${baseUrl}/`));
});
