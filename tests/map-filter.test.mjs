import test from "node:test";
import assert from "node:assert/strict";
import {
  filterMapsByTag,
  getLocalizedBuild,
  getLocalizedMap,
  getUiCopy,
  renderBuildCard,
  renderMapCard,
} from "../app-lib.mjs";

const maps = [
  { id: "1", tags: ["任务物"] },
  { id: "2", tags: ["通货"] },
  { id: "3", tags: ["任务物", "通货"] },
];

test("filter returns all maps for all tag", () => {
  assert.equal(filterMapsByTag(maps, "all").length, 3);
});

test("filter returns matching maps for specific tag", () => {
  assert.deepEqual(
    filterMapsByTag(maps, "任务物").map((map) => map.id),
    ["1", "3"],
  );
});

test("filter returns empty list for missing tag", () => {
  assert.equal(filterMapsByTag(maps, "技能宝石").length, 0);
});

test("ui copy switches between Chinese and English", () => {
  assert.equal(getUiCopy("zh").tabs.maps, "地图攻略");
  assert.equal(getUiCopy("en").tabs.maps, "Maps");
});

test("localized map content uses selected language", () => {
  const map = {
    name: "落锚湾",
    act: "第四章",
    region: "群岛海岸",
    summary: "中文摘要",
    drops: ["技能宝石"],
    tags: ["通货"],
    route: "中文路线",
    checkpoints: ["中文检查点"],
    localized: {
      zh: {
        name: "落锚湾",
        act: "第四章",
        region: "群岛海岸",
        summary: "中文摘要",
        drops: ["技能宝石"],
        tags: ["通货"],
        route: "中文路线",
        checkpoints: ["中文检查点"],
      },
      en: {
        name: "Kedge Bay",
        act: "Act Four",
        region: "Archipelago Coast",
        summary: "English summary",
        drops: ["Skill Gem"],
        tags: ["Currency"],
        route: "English route",
        checkpoints: ["English checkpoint"],
      },
    },
  };

  assert.equal(getLocalizedMap(map, "en").name, "Kedge Bay");
  assert.equal(getLocalizedMap(map, "en").drops[0], "Skill Gem");
  assert.equal(getLocalizedMap(map, "zh").name, "落锚湾");
});

test("localized build content uses selected language", () => {
  const build = {
    className: "Blood Mage",
    leagueName: "Fate of the Vaal",
    summary: "中文摘要",
    tags: ["主联赛头部"],
    localized: {
      zh: {
        className: "Blood Mage",
        leagueName: "瓦尔命运",
        summary: "中文摘要",
        tags: ["主联赛头部"],
      },
      en: {
        className: "Blood Mage",
        leagueName: "Fate of the Vaal",
        summary: "English summary",
        tags: ["Main league leader"],
      },
    },
  };

  assert.equal(getLocalizedBuild(build, "en").summary, "English summary");
  assert.equal(getLocalizedBuild(build, "zh").leagueName, "瓦尔命运");
});

test("cards render local cached detail instead of third-party transfer links", () => {
  const mapHtml = renderMapCard({
    id: "test-map",
    name: "落锚湾",
    act: "第四章",
    region: "群岛海岸",
    summary: "中文摘要",
    image: "./assets/images/maps/luo-mao-wan.svg",
    drops: ["技能宝石"],
    tags: ["通货"],
    sourceName: "踩蘑菇速通帖",
    sourceUrl: "https://www.caimogu.cc/post/2255503.html",
    route: "沿海岸推进。",
    checkpoints: ["任务物", "出口"],
    localized: {
      zh: {
        name: "落锚湾",
        act: "第四章",
        region: "群岛海岸",
        summary: "中文摘要",
        drops: ["技能宝石"],
        tags: ["通货"],
        route: "沿海岸推进。",
        checkpoints: ["任务物", "出口"],
      },
      en: {
        name: "Anchorage Bay",
        act: "Act Four",
        region: "Archipelago Coast",
        summary: "English summary",
        drops: ["Skill Gem"],
        tags: ["Currency"],
        route: "Follow the coast.",
        checkpoints: ["Quest item", "Exit"],
      },
    },
  }, "zh");

  const buildHtml = renderBuildCard({
    id: "vaal-blood-mage",
    className: "Blood Mage",
    leagueName: "Fate of the Vaal",
    summary: "中文摘要",
    popularity: 17.2,
    trend: 1,
    image: "./assets/images/builds/blood-mage.webp",
    tags: ["主联赛头部"],
    href: "https://poe.ninja/poe2/builds/vaal?class=Blood%20Mage",
    localized: {
      zh: {
        className: "Blood Mage",
        leagueName: "瓦尔命运",
        summary: "中文摘要",
        tags: ["主联赛头部"],
      },
      en: {
        className: "Blood Mage",
        leagueName: "Fate of the Vaal",
        summary: "English summary",
        tags: ["Main league leader"],
      },
    },
  }, "zh");

  assert.doesNotMatch(mapHtml, /target="_blank"|https:\/\/www\.caimogu\.cc/);
  assert.doesNotMatch(buildHtml, /target="_blank"|https:\/\/poe\.ninja/);
  assert.match(mapHtml, /沿海岸推进。/);
  assert.match(buildHtml, /本地缓存/);
});
