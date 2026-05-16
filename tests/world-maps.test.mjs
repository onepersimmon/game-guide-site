import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getLocalizedWorldMap, getLocalizedWorldMapSource } from "../app-lib.mjs";

const worldMapsPath = "/Users/persimmon/project/game-guide-site/data/world-maps.json";

test("world map data includes all campaign overview images and rewards", () => {
  assert.equal(existsSync(worldMapsPath), true, "world-maps.json should exist");

  const payload = JSON.parse(readFileSync(worldMapsPath, "utf8"));
  assert.equal(payload.source.name, "游民星空 / 巴哈姆特 seeso001");
  assert.equal(getLocalizedWorldMapSource(payload.source, "en").name, "Gamersky / Bahamut seeso001");
  assert.equal(payload.maps.length, 10);

  payload.maps.forEach((map) => {
    [
      "id",
      "chapter",
      "layer",
      "title",
      "image",
      "sourceImageUrl",
      "sourcePageUrl",
      "rewards",
    ].forEach((key) => assert.ok(map[key], `missing world map key: ${key}`));

    assert.equal(existsSync(`/Users/persimmon/project/game-guide-site/${map.image.replace("./", "")}`), true);
    assert.ok(map.rewards.length > 0, `${map.id} should include rewards`);
    assert.ok(map.localized.en.chapter, `${map.id} should include English chapter`);
    assert.ok(map.localized.en.layer, `${map.id} should include English layer`);
    assert.ok(map.localized.en.title, `${map.id} should include English title`);
    assert.equal(
      map.localized.en.rewards.length,
      map.rewards.length,
      `${map.id} should include English rewards`,
    );
  });
});

test("world map data localizes map labels and numbered rewards", () => {
  const payload = JSON.parse(readFileSync(worldMapsPath, "utf8"));
  const localizedMap = getLocalizedWorldMap(payload.maps[0], "en");

  assert.equal(localizedMap.chapter, "Act 1");
  assert.equal(localizedMap.layer, "Upper Layer");
  assert.equal(localizedMap.title, "Act 1 World Map - Upper Layer");
  assert.equal(localizedMap.rewards[0].area, "Clearfell");
  assert.equal(localizedMap.rewards[0].reward, "Level 1 Skill Gem");
  assert.equal(localizedMap.rewards[0].detail, "Mysterious encampment chest");
});

test("English world map rewards do not keep Chinese text", () => {
  const payload = JSON.parse(readFileSync(worldMapsPath, "utf8"));

  payload.maps.forEach((map) => {
    const localizedMap = getLocalizedWorldMap(map, "en");
    assert.doesNotMatch(localizedMap.chapter, /\p{Script=Han}/u);
    assert.doesNotMatch(localizedMap.layer, /\p{Script=Han}/u);
    assert.doesNotMatch(localizedMap.title, /\p{Script=Han}/u);
    localizedMap.rewards.forEach((reward) => {
      assert.doesNotMatch(reward.area, /\p{Script=Han}/u);
      assert.doesNotMatch(reward.reward, /\p{Script=Han}/u);
      assert.doesNotMatch(reward.detail, /\p{Script=Han}/u);
    });
  });
});
