import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const maps = JSON.parse(
  readFileSync("/Users/persimmon/project/game-guide-site/data/maps.json", "utf8"),
);
const builds = JSON.parse(
  readFileSync("/Users/persimmon/project/game-guide-site/data/builds.json", "utf8"),
);
const ascendancies = JSON.parse(
  readFileSync("/Users/persimmon/project/game-guide-site/data/ascendancies.json", "utf8"),
);

test("maps data follows expected contract", () => {
  assert.equal(Array.isArray(maps), true);
  assert.ok(maps.length > 0);

  maps.forEach((map) => {
    [
      "id",
      "name",
      "act",
      "region",
      "summary",
      "image",
      "mapImageUrl",
      "drops",
      "tags",
      "sourceName",
      "sourceUrl",
      "route",
      "checkpoints",
      "localized",
    ].forEach((key) => assert.ok(map[key], `missing map key: ${key}`));

    assert.ok(Array.isArray(map.checkpoints), "map checkpoints should be an array");
    assert.ok(map.checkpoints.length > 0, "map should include local checkpoints");
    ["name", "act", "region", "summary", "drops", "tags", "route", "checkpoints"].forEach((key) => {
      assert.ok(map.localized.zh[key], `missing zh map field: ${key}`);
      assert.ok(map.localized.en[key], `missing en map field: ${key}`);
    });
  });
});

test("builds data follows expected contract", () => {
  assert.ok(builds.updatedAt);
  assert.ok(Array.isArray(builds.builds));
  assert.ok(builds.builds.length > 0);

  builds.builds.forEach((build) => {
    [
      "id",
      "className",
      "leagueName",
      "summary",
      "popularity",
      "image",
      "tags",
      "href",
      "localized",
    ].forEach((key) => assert.ok(build[key] !== undefined, `missing build key: ${key}`));

    ["className", "leagueName", "summary", "tags"].forEach((key) => {
      assert.ok(build.localized.zh[key], `missing zh build field: ${key}`);
      assert.ok(build.localized.en[key], `missing en build field: ${key}`);
    });
  });
});

test("ascendancy data follows expected contract", () => {
  assert.ok(ascendancies.updatedAt);
  assert.ok(Array.isArray(ascendancies.classes));
  assert.equal(ascendancies.classes.length, 8);
  assert.deepEqual(
    ascendancies.classes.map((item) => item.name),
    ["游侠", "女猎手", "行者", "女巫", "魔巫", "战士", "佣兵", "德鲁伊"],
  );

  const openedAscendancies = ascendancies.classes.flatMap((item) => item.ascendancies);
  assert.ok(openedAscendancies.length > 20);

  ascendancies.classes.forEach((ascendancyClass) => {
    ["id", "name", "englishName", "sourceUrl", "image", "localized"].forEach((key) => {
      assert.ok(ascendancyClass[key] !== undefined, `missing ascendancy class key: ${key}`);
    });
    assert.ok(ascendancyClass.localized.en.name);

    ascendancyClass.ascendancies.forEach((ascendancy) => {
      ["id", "name", "englishName", "sourceUrl", "image", "notables", "localized"].forEach((key) => {
        assert.ok(ascendancy[key] !== undefined, `missing ascendancy key: ${key}`);
      });
      assert.ok(ascendancy.localized.en.name);
    });
  });
});
