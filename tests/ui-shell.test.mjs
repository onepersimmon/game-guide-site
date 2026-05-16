import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("/Users/persimmon/project/game-guide-site/index.html", "utf8");

test("page includes segmented tabs and content panels", () => {
  assert.match(html, /data-tab-button="world"/);
  assert.match(html, /data-tab-button="maps"/);
  assert.match(html, /data-tab-button="builds"/);
  assert.match(html, /id="world-panel"/);
  assert.match(html, /id="maps-panel"/);
  assert.match(html, /id="builds-panel"/);
  assert.match(html, /id="world-map-tabs"/);
  assert.match(html, /id="world-map-view"/);
  assert.match(html, /id="map-filters"/);
  assert.match(html, /id="builds-grid"/);
});

test("page exposes a language switcher", () => {
  assert.match(html, /data-language-switcher/);
  assert.match(html, /data-i18n="tabs\.world"/);
  assert.match(html, /data-i18n="tabs\.maps"/);
  assert.match(html, /data-i18n="tabs\.builds"/);
});

test("page embeds local data for file protocol rendering", () => {
  assert.match(html, /<script id="world-maps-data" type="application\/json">/);
  assert.match(html, /<script id="maps-data" type="application\/json">/);
  assert.match(html, /<script id="builds-data" type="application\/json">/);
});

test("page includes inline fallback renderer for local file mode", () => {
  assert.match(html, /renderFallbackApp/);
  assert.match(html, /document\.querySelectorAll\("\.map-card"\)\.length > 0/);
});
