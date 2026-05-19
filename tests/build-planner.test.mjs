import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildInternationalTradeUrl,
  calculateBuildDamage,
  createInitialBuildState,
  inferPassiveNodeModifiers,
  localizeCatalogEntry,
  normalizePassiveTree,
  normalizeTradeCatalog,
  togglePassiveNode,
  updateSkillRow,
} from "../tools/build-planner.mjs";

const tradePayload = {
  result: [
    { id: "weapon", label: "Weapons", entries: [{ type: "Quarterstaff" }, { type: "Long Bow" }] },
    { id: "armour", label: "Armour", entries: [{ type: "Body Armour" }] },
    { id: "accessory", label: "Accessories", entries: [{ type: "Gold Ring" }] },
    { id: "jewel", label: "Jewels", entries: [{ type: "Diamond Jewel" }] },
    { id: "gem", label: "Gems", entries: [{ type: "Firebolt" }, { type: "Lightning Bolt" }, { type: "Uncut Support Gem (Level 1)" }] },
  ],
};

const staticPayload = {
  result: [
    { id: "UncutGems", label: "Uncut Gems", entries: [{ id: "uncut-skill-gem-1", text: "Uncut Skill Gem (Level 1)" }] },
    { id: "LineageSupportGems", label: "Lineage Support Gems", entries: [{ id: "ataluis-bloodletting", text: "Atalui's Bloodletting" }] },
  ],
};

const statsPayload = {
  result: [
    { id: "explicit", label: "Explicit", entries: [{ id: "explicit.stat_1", text: "+# to Strength" }] },
    { id: "skill", label: "Skill", entries: [{ id: "skill.lightning_bolt", text: "Grants Skill: Level # Lightning Bolt" }] },
  ],
};

test("normalizeTradeCatalog builds dropdown lists", () => {
  const catalog = normalizeTradeCatalog({
    items: tradePayload,
    staticData: staticPayload,
    stats: statsPayload,
  });

  assert.equal(catalog.weaponBases[0].text, "Quarterstaff");
  assert.equal(catalog.skillGems.some((item) => item.text === "Firebolt"), true);
  assert.equal(catalog.supportGems.some((item) => item.text === "Atalui's Bloodletting"), true);
  assert.equal(catalog.itemStats.some((item) => item.text === "+# to Strength"), true);
});

test("catalog entries can be localized and searched with poe2db Chinese names", () => {
  const entry = localizeCatalogEntry(
    { text: "Lightning Arrow", type: "Lightning Arrow" },
    {
      entries: [
        {
          type: "skill",
          slug: "Lightning_Arrow",
          english: "Lightning Arrow",
          chinese: "闪电箭矢",
        },
      ],
    },
  );

  assert.equal(entry.label, "闪电箭矢");
  assert.equal(entry.searchText.includes("lightning arrow"), true);
  assert.equal(entry.searchText.includes("闪电箭矢"), true);
  assert.equal(entry.tradeText, "Lightning Arrow");
});

test("build damage updates when skill and passive state changes", () => {
  const catalog = normalizeTradeCatalog({
    items: tradePayload,
    staticData: staticPayload,
    stats: statsPayload,
  });
  let state = createInitialBuildState(catalog);

  state = updateSkillRow(state, state.skills[0].id, {
    name: "Lightning Bolt",
    level: 20,
    baseHit: 100,
    hitsPerSecond: 2,
    increased: { gear: 30, tree: 40, support: 50, skill: 20 },
    more: [25],
    critChance: 20,
    critDamage: 250,
  });
  state = togglePassiveNode(state, { id: "node-1", name: "Elemental Mastery", increased: 20, more: 0 });

  const result = calculateBuildDamage(state);

  assert.equal(result.skills[0].averageHit > 0, true);
  assert.equal(result.totalAverageHit > result.skills[0].nonCritHit, true);
  assert.equal(result.totalDps > 0, true);
});

test("build damage returns one result for every configured skill", () => {
  const state = {
    ...createInitialBuildState(),
    skills: [
      {
        id: "skill-1",
        name: "闪电箭矢",
        level: 20,
        baseHit: 100,
        hitsPerSecond: 2,
        increased: { gear: 20, tree: 0, support: 0, skill: 0 },
        more: [10],
        critChance: 10,
        critDamage: 200,
      },
      {
        id: "skill-2",
        name: "毒爆箭",
        level: 18,
        baseHit: 200,
        hitsPerSecond: 1,
        increased: { gear: 0, tree: 0, support: 0, skill: 0 },
        more: [],
        critChance: 0,
        critDamage: 150,
      },
    ],
  };

  const result = calculateBuildDamage(state);

  assert.equal(result.skills.length, 2);
  assert.equal(result.skills[0].name, "闪电箭矢");
  assert.equal(result.skills[1].name, "毒爆箭");
  assert.equal(result.totalDps, result.skills[0].dps + result.skills[1].dps);
});

test("passive tree nodes are normalized into drawable damage nodes", () => {
  const tree = normalizePassiveTree({
    nodes: {
      100: {
        name: "Attack Damage",
        skill: 100,
        group: "g1",
        orbit: 0,
        orbitIndex: 0,
        color: "#5562C0",
        stats: [{ t: "20% increased [Attack] Damage", v: 20 }],
        out: ["101"],
      },
      101: {
        name: "Critical Damage",
        skill: 101,
        group: "g1",
        orbit: 1,
        orbitIndex: 3,
        stats: [{ t: "+25% to [CriticalDamageBonus|Critical Damage Bonus]", v: 25 }],
        out: [],
      },
    },
    groups: {
      g1: { x: 3200, y: 4500, nodes: ["100", "101"] },
    },
    constants: {
      skillsPerOrbit: [1, 12],
      orbitRadii: [0, 82],
    },
    classes: [{ name: "Monk", startingNode: "100" }],
  });

  assert.equal(tree.nodes.length, 2);
  assert.equal(tree.nodes[0].id, "100");
  assert.equal(tree.nodes[0].x, 3200);
  assert.equal(tree.nodes[0].y, 4500);
  assert.equal(tree.nodes[0].increased, 20);
  assert.equal(tree.nodes[1].critDamage, 25);
  assert.equal(tree.bounds.minX <= tree.bounds.maxX, true);
  assert.equal(tree.classes[0].name, "Monk");
});

test("passive node modifier parser extracts supported damage stats conservatively", () => {
  const modifiers = inferPassiveNodeModifiers({
    stats: [
      { t: "20% increased [Attack] Damage" },
      { t: "15% increased [Critical|Critical Hit Chance] for [Spell|Spells]" },
      { t: "+25% to [CriticalDamageBonus|Critical Damage Bonus]" },
      { t: "[Spell|Spells] deal 40% more Damage" },
      { t: "10% increased Mana Regeneration Rate" },
    ],
  });

  assert.equal(modifiers.increased, 20);
  assert.deepEqual(modifiers.more, [40]);
  assert.equal(modifiers.critChance, 15);
  assert.equal(modifiers.critDamage, 25);
});

test("a normalized passive tree node can be toggled into damage calculation", () => {
  const [passive] = normalizePassiveTree({
    nodes: {
      378: {
        name: "Critical Hit Chance",
        skill: 378,
        group: "crit",
        orbit: 0,
        orbitIndex: 0,
        stats: [{ t: "12% increased [Critical|Critical Hit Chance]", v: 12 }],
        out: [],
      },
    },
    groups: { crit: { x: 0, y: 0, nodes: ["378"] } },
    constants: { skillsPerOrbit: [1], orbitRadii: [0] },
  }).nodes;
  let state = createInitialBuildState();

  state = updateSkillRow(state, state.skills[0].id, {
    baseHit: 1000,
    hitsPerSecond: 1,
    critChance: 10,
    critDamage: 200,
  });
  const before = calculateBuildDamage(state);
  const after = calculateBuildDamage(togglePassiveNode(state, passive));

  assert.equal(after.passiveNodeCount, 1);
  assert.equal(after.totalAverageHit > before.totalAverageHit, true);
});

test("international trade url uses the official trade2 search path", () => {
  const url = buildInternationalTradeUrl({
    league: "Fate of the Vaal",
    itemType: "Quarterstaff",
    keywords: "critical hit chance, spell damage",
  });

  assert.match(url, /^https:\/\/www\.pathofexile\.com\/trade2\/search\/poe2\/Fate%20of%20the%20Vaal/);
  assert.match(url, /Quarterstaff/);
  assert.match(url, /critical%20hit%20chance/);
});

test("build planner page exposes searchable clickable passive tree controls", () => {
  const html = readFileSync("/Users/persimmon/project/game-guide-site/tools/build-planner.html", "utf8");

  assert.match(html, /id="skill-list"/);
  assert.match(html, /id="add-skill"/);
  assert.match(html, /id="equipment-slots"/);
  assert.match(html, /id="skill-options"/);
  assert.match(html, /id="support-options"/);
  assert.match(html, /id="passive-search"/);
  assert.match(html, /id="passive-tree-svg"/);
  assert.match(html, /id="passive-node-list"/);
  assert.match(html, /id="passive-details"/);
});
