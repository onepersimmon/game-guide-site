// @author zwy
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = "/Users/persimmon/project/game-guide-site";

test("social guide cache contains platform metadata and safe source links", () => {
  const payload = JSON.parse(readFileSync(`${root}/data/social-guides.json`, "utf8"));
  assert.equal(typeof payload.updatedAt, "string");
  assert.deepEqual(payload.source.queries, ["POE2 开荒", "流放之路2 开荒"]);
  assert.equal(Array.isArray(payload.items), true);
  assert.equal(Array.isArray(payload.errors), true);
  for (const item of payload.items) {
    assert.equal(item.platform, "bilibili");
    assert.match(item.href, /^https:\/\//);
    assert.equal(typeof item.title, "string");
  }
});

test("social link config includes platform search entry points", () => {
  const payload = JSON.parse(readFileSync(`${root}/data/social-links.json`, "utf8"));
  assert.deepEqual(payload.links.map((link) => link.platform), ["bilibili", "weibo"]);
  payload.links.forEach((link) => assert.match(link.href, /^https:\/\//));
});
