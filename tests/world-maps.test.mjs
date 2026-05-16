import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const worldMapsPath = "/Users/persimmon/project/game-guide-site/data/world-maps.json";

test("world map data includes all campaign overview images and rewards", () => {
  assert.equal(existsSync(worldMapsPath), true, "world-maps.json should exist");

  const payload = JSON.parse(readFileSync(worldMapsPath, "utf8"));
  assert.equal(payload.source.name, "游民星空 / 巴哈姆特 seeso001");
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
  });
});
