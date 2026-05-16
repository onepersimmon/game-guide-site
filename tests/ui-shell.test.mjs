import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("/Users/persimmon/project/game-guide-site/index.html", "utf8");

test("page includes segmented tabs and content panels", () => {
  assert.match(html, /data-tab-button="world"/);
  assert.match(html, /data-tab-button="classes"/);
  assert.match(html, /data-tab-button="builds"/);
  assert.match(html, /id="world-panel"/);
  assert.match(html, /id="classes-panel"/);
  assert.match(html, /id="builds-panel"/);
  assert.match(html, /id="world-map-tabs"/);
  assert.match(html, /id="world-map-view"/);
  assert.match(html, /id="classes-grid"/);
  assert.match(html, /id="builds-grid"/);
});

test("page exposes a language switcher", () => {
  assert.match(html, /data-language-switcher/);
  assert.match(html, /data-i18n="tabs\.world"/);
  assert.match(html, /data-i18n="tabs\.classes"/);
  assert.match(html, /data-i18n="tabs\.builds"/);
});

test("page embeds local data for file protocol rendering", () => {
  assert.match(html, /<script id="world-maps-data" type="application\/json">/);
  assert.match(html, /<script id="ascendancies-data" type="application\/json">/);
  assert.match(html, /<script id="maps-data" type="application\/json">/);
  assert.match(html, /<script id="builds-data" type="application\/json">/);
});

test("page includes inline fallback renderer for local file mode", () => {
  assert.match(html, /renderFallbackApp/);
  assert.match(html, /document\.querySelectorAll\("\.world-map-viewer, \.class-preview-card, \.build-card"\)\.length > 0/);
});
