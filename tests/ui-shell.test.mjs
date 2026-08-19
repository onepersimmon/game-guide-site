// @author zwy
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("/Users/persimmon/project/game-guide-site/index.html", "utf8");
const buildPlanner = readFileSync(
  "/Users/persimmon/project/game-guide-site/tools/build-planner.html",
  "utf8",
);

test("page includes segmented tabs and content panels", () => {
  assert.match(html, /data-tab-button="world"/);
  assert.match(html, /data-tab-button="classes"/);
  assert.match(html, /data-tab-button="builds"/);
  assert.match(html, /data-tab-button="community"/);
  assert.match(html, /id="world-panel"/);
  assert.match(html, /id="classes-panel"/);
  assert.match(html, /id="builds-panel"/);
  assert.match(html, /id="world-map-tabs"/);
  assert.match(html, /id="world-map-view"/);
  assert.match(html, /id="ggg-news-list"/);
  assert.match(html, /id="classes-grid"/);
  assert.match(html, /id="builds-grid"/);
  assert.match(html, /id="social-guide-grid"/);
});

test("page exposes a language switcher", () => {
  assert.match(html, /data-language-switcher/);
  assert.match(html, /data-i18n="site\.title"/);
  assert.match(html, /data-i18n="news\.title"/);
  assert.match(html, /data-i18n="tabs\.world"/);
  assert.match(html, /data-i18n="tabs\.classes"/);
  assert.match(html, /data-i18n="tabs\.builds"/);
  assert.match(html, /data-i18n="tabs\.community"/);
});

test("page embeds local data for file protocol rendering", () => {
  assert.match(html, /<script id="world-maps-data" type="application\/json">/);
  assert.match(html, /<script id="ascendancies-data" type="application\/json">/);
  assert.match(html, /<script id="maps-data" type="application\/json">/);
  assert.match(html, /<script id="builds-data" type="application\/json">/);
  assert.match(html, /<script id="ggg-news-data" type="application\/json">/);
  assert.match(html, /<script id="social-guides-data" type="application\/json">/);
  assert.match(html, /<script id="social-links-data" type="application\/json">/);
});

test("page links to static seo pages", () => {
  assert.match(html, /href="\.\/campaign\/act1-upper\.html"/);
  assert.match(html, /href="\.\/classes\/index\.html"/);
  assert.match(html, /href="\.\/builds\/poe-ninja-ranking\.html"/);
  assert.match(html, /href="\.\/tools\/build-planner\.html"/);
});

test("page exposes starter build guide links", () => {
  assert.match(html, /id="starter-build-guides"/);
  assert.match(html, /BD 开荒汇总/);
  assert.match(html, /href="https:\/\/docs\.qq\.com\/doc\/DUnRmaGhjTVFIT1NO"[\s\S]*?target="_blank"[\s\S]*?rel="noopener"/);
  assert.match(html, /href="https:\/\/docs\.qq\.com\/doc\/DRk5ITORGTOVJdOdn"[\s\S]*?target="_blank"[\s\S]*?rel="noopener"/);
  assert.match(html, /href="https:\/\/h5\.caimogu\.cc\/post\/detail\?postId=2367801&amp;type=0"[\s\S]*?target="_blank"[\s\S]*?rel="noopener"/);
});

test("page exposes Bilibili and Weibo social entry points", () => {
  assert.match(html, /class="social-links"/);
  assert.match(html, /search\.bilibili\.com\/all\?keyword=/);
  assert.doesNotMatch(html, /www\.douyin\.com\/search\//);
  assert.match(html, /s\.weibo\.com\/weibo\?q=/);
});

test("build planner page exposes PoE2 planner controls and results", () => {
  assert.match(buildPlanner, /构筑伤害计算器/);
  assert.match(buildPlanner, /id="skill-search-layer"/);
  assert.match(buildPlanner, /id="support-search-layer"/);
  assert.match(buildPlanner, /id="skill-list"/);
  assert.match(buildPlanner, /id="character-equipment"/);
  assert.match(buildPlanner, /id="equipment-modal"/);
  assert.match(buildPlanner, /id="passive-class"/);
  assert.match(buildPlanner, /id="passive-ascendancy"/);
  assert.match(buildPlanner, /id="passive-search"/);
  assert.match(buildPlanner, /id="passive-tree-svg"/);
  assert.match(buildPlanner, /id="planner-average-hit"/);
  assert.match(buildPlanner, /id="equipment-slots"/);
  assert.match(buildPlanner, /type="module" src="\.\/build-planner\.mjs\?v=11"/);
});

test("page replaces the large hero with a compact GGG news list", () => {
  assert.doesNotMatch(html, /class="hero"/);
  assert.doesNotMatch(html, /hero__glass/);
  assert.match(html, /class="site-top"/);
  assert.match(html, /class="ggg-news"/);
});

test("page includes inline fallback renderer for local file mode", () => {
  assert.match(html, /renderFallbackApp/);
  assert.match(html, /document\.querySelectorAll\("\.world-map-viewer, \.class-preview-card, \.build-card"\)\.length > 0/);
});

test("page includes a correction contact statement in the footer", () => {
  assert.match(html, /class="site-footer"/);
  assert.match(html, /纠错或优化建议请联系/);
  assert.match(html, /mailto:onepersimmon@163\.com/);
});
