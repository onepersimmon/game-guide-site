const DEFAULT_LEAGUE = "Fate of the Vaal";
const TRADE_BASE_URL = "https://www.pathofexile.com/trade2/search/poe2";
const SVG_NS = "http://www.w3.org/2000/svg";

function toNumber(value, fallback = 0) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function stripMarkup(text = "") {
  return String(text)
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sumMatches(text, pattern) {
  return [...text.matchAll(pattern)].reduce((sum, match) => sum + toNumber(match[1]), 0);
}

function normalizeEntries(entries = []) {
  return entries
    .map((entry) => ({
      id: entry.id ?? entry.type ?? entry.text ?? entry.name ?? "",
      text: entry.text ?? entry.type ?? entry.name ?? "",
      type: entry.type ?? "",
      image: entry.image ?? "",
    }))
    .filter((entry) => entry.text);
}

function groupById(payload = {}) {
  return new Map((payload.result ?? []).map((group) => [group.id, group]));
}

export function inferPassiveNodeModifiers(node = {}) {
  return (node.stats ?? []).reduce(
    (modifiers, stat) => {
      const text = stripMarkup(stat.t ?? stat.text ?? "");
      const damageText = !/damage taken|against you|reduced damage/i.test(text);

      if (damageText && /increased .*damage|deal \d+(?:\.\d+)?% increased damage/i.test(text)) {
        modifiers.increased += sumMatches(text, /(\d+(?:\.\d+)?)%\s+increased\s+(?=.*damage)/gi);
      }

      if (damageText && /more .*damage|deal \d+(?:\.\d+)?% more damage/i.test(text)) {
        const more = sumMatches(text, /(\d+(?:\.\d+)?)%\s+more\s+(?=.*damage)/gi);
        if (more !== 0) {
          modifiers.more.push(more);
        }
      }

      if (/critical hit chance/i.test(text) && /increased/i.test(text)) {
        modifiers.critChance += sumMatches(text, /(\d+(?:\.\d+)?)%\s+increased\s+(?=.*critical hit chance)/gi);
      }

      if (/critical damage bonus/i.test(text) && !/against you|reduced/i.test(text)) {
        modifiers.critDamage += sumMatches(text, /(?:\+)?(\d+(?:\.\d+)?)%\s+(?:to|increased)\s+(?=.*critical damage bonus)/gi);
      }

      return modifiers;
    },
    { increased: 0, more: [], critChance: 0, critDamage: 0, flatHit: 0 },
  );
}

export function normalizePassiveTree(rawTree = {}) {
  const constants = rawTree.constants ?? {};
  const skillsPerOrbit = constants.skillsPerOrbit ?? [];
  const orbitRadii = constants.orbitRadii ?? [];
  const groups = rawTree.groups ?? {};
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  const nodes = Object.entries(rawTree.nodes ?? {}).map(([id, node]) => {
    const group = groups[node.group] ?? {};
    const orbit = toNumber(node.orbit);
    const orbitIndex = toNumber(node.orbitIndex);
    const radius = toNumber(orbitRadii[orbit]);
    const orbitSize = Math.max(1, toNumber(skillsPerOrbit[orbit], 1));
    const angle = (Math.PI * 2 * orbitIndex) / orbitSize - Math.PI / 2;
    const x = round(toNumber(group.x) + Math.cos(angle) * radius);
    const y = round(toNumber(group.y) + Math.sin(angle) * radius);
    const modifiers = inferPassiveNodeModifiers(node);
    const normalized = {
      id: String(id),
      skill: node.skill ?? toNumber(id),
      name: node.name ?? `Passive ${id}`,
      x,
      y,
      color: node.color ?? "#6c7e9d",
      isNotable: Boolean(node.isNotable),
      ascendancyName: node.ascendancyName ?? "",
      statsText: (node.stats ?? []).map((stat) => stripMarkup(stat.t ?? stat.text ?? "")).filter(Boolean).join(" | "),
      out: (node.out ?? []).map(String),
      ...modifiers,
    };

    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);

    return normalized;
  });

  if (nodes.length === 0) {
    bounds.minX = 0;
    bounds.minY = 0;
    bounds.maxX = 0;
    bounds.maxY = 0;
  }

  return {
    nodes,
    bounds,
    classes: rawTree.classes ?? [],
    jewelSlots: rawTree.jewelSlots ?? [],
  };
}

export function normalizeTradeCatalog({ items = {}, staticData = {}, stats = {} } = {}) {
  const itemGroups = groupById(items);
  const staticGroups = groupById(staticData);
  const statGroups = groupById(stats);

  const weaponBases = normalizeEntries(itemGroups.get("weapon")?.entries);
  const armourBases = normalizeEntries(itemGroups.get("armour")?.entries);
  const accessoryBases = normalizeEntries(itemGroups.get("accessory")?.entries);
  const jewelBases = normalizeEntries(itemGroups.get("jewel")?.entries);
  const flaskBases = normalizeEntries(itemGroups.get("flask")?.entries);
  const skillGems = normalizeEntries([
    ...(itemGroups.get("gem")?.entries ?? []).filter((entry) => !/Support/i.test(entry.type ?? "")),
    ...(staticGroups.get("UncutGems")?.entries ?? []),
  ]);
  const supportGems = normalizeEntries([
    ...(staticGroups.get("LineageSupportGems")?.entries ?? []),
    ...(staticGroups.get("UncutGems")?.entries ?? []).filter((entry) => /Support/i.test(entry.text ?? "")),
  ]);
  const itemStats = normalizeEntries([
    ...(statGroups.get("explicit")?.entries ?? []),
    ...(statGroups.get("implicit")?.entries ?? []),
    ...(statGroups.get("skill")?.entries ?? []),
  ]);

  return {
    weaponBases,
    armourBases,
    accessoryBases,
    jewelBases,
    flaskBases,
    skillGems,
    supportGems,
    itemStats,
  };
}

function createSkillRow() {
  return {
    id: crypto.randomUUID(),
    name: "Lightning Bolt",
    level: 1,
    baseHit: 0,
    hitsPerSecond: 1,
    increased: {
      gear: 0,
      tree: 0,
      support: 0,
      skill: 0,
    },
    more: [],
    critChance: 0,
    critDamage: 100,
    supportGems: [],
    gear: [],
    passiveNodes: [],
  };
}

export function createInitialBuildState(catalog = {}) {
  return {
    league: DEFAULT_LEAGUE,
    catalog,
    skills: [createSkillRow()],
    passiveNodes: [],
    equipment: {
      weapon: null,
      armour: null,
      accessory: null,
      jewel: null,
    },
  };
}

export function updateSkillRow(state, rowId, patch) {
  return {
    ...state,
    skills: state.skills.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      return {
        ...row,
        ...patch,
        increased: {
          ...row.increased,
          ...(patch.increased ?? {}),
        },
        more: Array.isArray(patch.more) ? patch.more : row.more,
        supportGems: patch.supportGems ?? row.supportGems,
        gear: patch.gear ?? row.gear,
        passiveNodes: patch.passiveNodes ?? row.passiveNodes,
      };
    }),
  };
}

export function togglePassiveNode(state, node) {
  const exists = state.passiveNodes.some((current) => current.id === node.id);
  const passiveNodes = exists
    ? state.passiveNodes.filter((current) => current.id !== node.id)
    : [...state.passiveNodes, node];

  return {
    ...state,
    passiveNodes,
  };
}

function aggregatePassives(passiveNodes = []) {
  return passiveNodes.reduce(
    (accumulator, node) => {
      accumulator.increased += toNumber(node.increased);
      accumulator.more.push(toNumber(node.more));
      accumulator.critChance += toNumber(node.critChance);
      accumulator.critDamage += toNumber(node.critDamage);
      accumulator.flat += toNumber(node.flatHit);
      return accumulator;
    },
    { increased: 0, more: [], critChance: 0, critDamage: 0, flat: 0 },
  );
}

function calculateRow(row, passiveNodes = []) {
  const passive = aggregatePassives(passiveNodes);
  const totalIncreasedPercent = Object.values(row.increased).reduce((sum, value) => sum + toNumber(value), 0) + passive.increased;
  const increasedMultiplier = Math.max(0, 1 + totalIncreasedPercent / 100);
  const moreMultiplier = [...row.more, ...passive.more].reduce(
    (product, value) => product * Math.max(0, 1 + toNumber(value) / 100),
    1,
  );
  const critChance = clamp(toNumber(row.critChance) + passive.critChance, 0, 100) / 100;
  const critDamageMultiplier = Math.max(1, (toNumber(row.critDamage) + passive.critDamage) / 100);
  const baseHit = toNumber(row.baseHit) + passive.flat;
  const nonCritHit = baseHit * increasedMultiplier * moreMultiplier;
  const critHit = nonCritHit * critDamageMultiplier;
  const averageHit = nonCritHit * (1 - critChance) + critHit * critChance;

  return {
    id: row.id,
    name: row.name,
    level: row.level,
    baseHit: round(baseHit),
    totalIncreasedPercent: round(totalIncreasedPercent),
    increasedMultiplier: round(increasedMultiplier),
    moreMultiplier: round(moreMultiplier),
    critChanceMultiplier: round(critChance),
    critDamageMultiplier: round(critDamageMultiplier),
    nonCritHit: round(nonCritHit),
    critHit: round(critHit),
    averageHit: round(averageHit),
    dps: round(averageHit * Math.max(0, toNumber(row.hitsPerSecond))),
  };
}

export function calculateBuildDamage(state) {
  const skills = state.skills.map((row) => calculateRow(row, state.passiveNodes));
  const totalAverageHit = skills.reduce((sum, row) => sum + row.averageHit, 0);
  const totalDps = skills.reduce((sum, row) => sum + row.dps, 0);

  return {
    skills,
    totalAverageHit: round(totalAverageHit),
    totalDps: round(totalDps),
    passiveNodeCount: state.passiveNodes.length,
  };
}

export function buildInternationalTradeUrl({ league = DEFAULT_LEAGUE, itemType = "", keywords = "" } = {}) {
  const normalizedKeywords = String(keywords)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
  const query = [itemType, normalizedKeywords]
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join(" ");
  const encodedLeague = encodeURIComponent(league || DEFAULT_LEAGUE);

  return `${TRADE_BASE_URL}/${encodedLeague}?q=${encodeURIComponent(query)}`;
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) : "0";
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return response.json();
}

function populateSelect(select, entries, placeholder) {
  if (!select) {
    return;
  }

  select.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = placeholder;
  select.append(emptyOption);

  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.text;
    option.textContent = entry.text;
    select.append(option);
  });
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function hasSupportedPassiveModifiers(node) {
  return toNumber(node.increased) !== 0 || toNumber(node.critChance) !== 0 || toNumber(node.critDamage) !== 0 || (node.more ?? []).length > 0;
}

function formatPassiveModifiers(node) {
  const parts = [];

  if (toNumber(node.increased) !== 0) {
    parts.push(`increased +${formatValue(toNumber(node.increased))}%`);
  }

  if ((node.more ?? []).length > 0) {
    parts.push(`more ${node.more.map((value) => `+${formatValue(toNumber(value))}%`).join(", ")}`);
  }

  if (toNumber(node.critChance) !== 0) {
    parts.push(`暴击几率 +${formatValue(toNumber(node.critChance))}%`);
  }

  if (toNumber(node.critDamage) !== 0) {
    parts.push(`暴击伤害 +${formatValue(toNumber(node.critDamage))}%`);
  }

  return parts.length > 0 ? parts.join(" / ") : "暂未纳入伤害公式";
}

function getPassiveTreePayload(payload = {}) {
  if (Array.isArray(payload.nodes)) {
    return payload;
  }

  return normalizePassiveTree(payload);
}

function renderPassiveDetails(node, isActive) {
  const target = document.getElementById("passive-details");
  if (!target || !node) {
    return;
  }

  target.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = node.name;
  const meta = document.createElement("span");
  meta.textContent = [node.ascendancyName, isActive ? "已点亮" : "未点亮"].filter(Boolean).join(" / ");
  const modifiers = document.createElement("p");
  modifiers.textContent = formatPassiveModifiers(node);
  const stats = document.createElement("small");
  stats.textContent = node.statsText || "无可展示词缀";
  target.append(title, meta, modifiers, stats);
}

function updatePassiveActiveState(passiveNodes) {
  const activeIds = new Set(passiveNodes.map((node) => node.id));

  document.querySelectorAll("[data-passive-id]").forEach((element) => {
    element.classList.toggle("is-active", activeIds.has(element.dataset.passiveId));
  });
}

function renderPassiveNodeList(tree, passiveNodes, onToggle) {
  const list = document.getElementById("passive-node-list");
  const search = document.getElementById("passive-search");
  if (!list) {
    return;
  }

  const query = (search?.value ?? "").trim().toLowerCase();
  const activeIds = new Set(passiveNodes.map((node) => node.id));
  const matches = tree.nodes
    .filter((node) => {
      const searchable = `${node.name} ${node.statsText} ${node.ascendancyName}`.toLowerCase();
      return query ? searchable.includes(query) : hasSupportedPassiveModifiers(node);
    })
    .sort((a, b) => {
      const activeDelta = Number(activeIds.has(b.id)) - Number(activeIds.has(a.id));
      if (activeDelta !== 0) {
        return activeDelta;
      }

      const supportedDelta = Number(hasSupportedPassiveModifiers(b)) - Number(hasSupportedPassiveModifiers(a));
      if (supportedDelta !== 0) {
        return supportedDelta;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, 80);

  list.innerHTML = "";

  matches.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.passiveId = node.id;
    button.className = activeIds.has(node.id) ? "is-active" : "";

    const name = document.createElement("strong");
    name.textContent = node.name;
    const summary = document.createElement("span");
    summary.textContent = formatPassiveModifiers(node);
    button.append(name, summary);
    button.addEventListener("click", () => onToggle(node));
    button.addEventListener("mouseenter", () => renderPassiveDetails(node, activeIds.has(node.id)));
    list.append(button);
  });

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "source-note";
    empty.textContent = "没有匹配的天赋节点。";
    list.append(empty);
  }
}

function renderPassiveTreeSvg(tree, passiveNodes, onToggle) {
  const svg = document.getElementById("passive-tree-svg");
  if (!svg) {
    return;
  }

  const padding = 800;
  const width = Math.max(1, tree.bounds.maxX - tree.bounds.minX + padding * 2);
  const height = Math.max(1, tree.bounds.maxY - tree.bounds.minY + padding * 2);
  const activeIds = new Set(passiveNodes.map((node) => node.id));
  const nodeById = new Map(tree.nodes.map((node) => [node.id, node]));
  const fragment = document.createDocumentFragment();
  const edges = createSvgElement("g", { class: "passive-tree-edges" });
  const nodes = createSvgElement("g", { class: "passive-tree-nodes" });

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `${tree.bounds.minX - padding} ${tree.bounds.minY - padding} ${width} ${height}`);

  tree.nodes.forEach((node) => {
    node.out.forEach((targetId) => {
      const target = nodeById.get(String(targetId));
      if (!target) {
        return;
      }

      edges.append(
        createSvgElement("line", {
          x1: node.x,
          y1: node.y,
          x2: target.x,
          y2: target.y,
        }),
      );
    });
  });

  tree.nodes.forEach((node) => {
    const supported = hasSupportedPassiveModifiers(node);
    const circle = createSvgElement("circle", {
      cx: node.x,
      cy: node.y,
      r: node.isNotable ? 70 : supported ? 50 : 34,
      "data-passive-id": node.id,
      tabindex: supported ? 0 : -1,
      class: [
        "passive-tree-node",
        node.isNotable ? "is-notable" : "",
        supported ? "is-supported" : "",
        activeIds.has(node.id) ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    const title = createSvgElement("title");
    title.textContent = `${node.name} - ${node.statsText}`;
    circle.append(title);
    circle.addEventListener("click", () => onToggle(node));
    circle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle(node);
      }
    });
    circle.addEventListener("mouseenter", () => renderPassiveDetails(node, activeIds.has(node.id)));
    nodes.append(circle);
  });

  fragment.append(edges, nodes);
  svg.append(fragment);
}

function readPlannerState(form, catalog, passiveNodes) {
  let state = createInitialBuildState(catalog);
  const skill = state.skills[0];
  const supportMore = toNumber(form.querySelector("#support-more")?.value);
  const extraMore = toNumber(form.querySelector("#planner-more")?.value);

  state = {
    ...state,
    league: form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE,
    passiveNodes,
  };

  return updateSkillRow(state, skill.id, {
    name: form.querySelector("#skill-gem")?.value || skill.name,
    level: toNumber(form.querySelector("#skill-level")?.value, 1),
    baseHit: toNumber(form.querySelector("#planner-base-hit")?.value),
    hitsPerSecond: toNumber(form.querySelector("#planner-hits-per-second")?.value, 1),
    increased: {
      gear: toNumber(form.querySelector("#planner-gear-increased")?.value),
      tree: toNumber(form.querySelector("#planner-tree-increased")?.value),
      support: toNumber(form.querySelector("#planner-support-increased")?.value),
      skill: toNumber(form.querySelector("#planner-skill-increased")?.value),
    },
    more: [supportMore, extraMore].filter((value) => value !== 0),
    critChance: toNumber(form.querySelector("#planner-crit-chance")?.value),
    critDamage: toNumber(form.querySelector("#planner-crit-damage")?.value, 100),
    supportGems: [form.querySelector("#support-gem")?.value].filter(Boolean),
  });
}

function renderPlannerResult(result) {
  const firstSkill = result.skills[0] ?? {};
  const entries = {
    "planner-average-hit": result.totalAverageHit,
    "planner-dps": result.totalDps,
    "planner-non-crit": firstSkill.nonCritHit,
    "planner-crit-hit": firstSkill.critHit,
    "planner-more-multiplier": `${formatValue(firstSkill.moreMultiplier ?? 1)}x`,
    "planner-increased-multiplier": `${formatValue(firstSkill.increasedMultiplier ?? 1)}x`,
    "planner-passives": result.passiveNodeCount,
  };

  Object.entries(entries).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = typeof value === "number" ? formatValue(value) : value;
    }
  });
}

function renderTradeLink(form) {
  const base = form.querySelector("#equipment-base")?.value ?? "";
  const stat = form.querySelector("#equipment-stat")?.value ?? "";
  const manual = form.querySelector("#planner-trade-keywords")?.value ?? "";
  const league = form.querySelector("#planner-league")?.value ?? DEFAULT_LEAGUE;
  const url = buildInternationalTradeUrl({
    league,
    itemType: base,
    keywords: [stat, manual].filter(Boolean).join(", "),
  });
  const link = document.getElementById("planner-trade-link");
  const query = document.getElementById("planner-trade-query");

  if (link) {
    link.href = url;
  }

  if (query) {
    query.textContent = url;
  }
}

async function initBuildPlanner() {
  const form = document.querySelector("[data-build-planner]");
  if (!form) {
    return;
  }

  const [items, staticData, stats, passiveTreePayload] = await Promise.all([
    loadJson("../data/trade2-items.json"),
    loadJson("../data/trade2-static.json"),
    loadJson("../data/trade2-stats.json"),
    loadJson("../data/poe2-passive-tree.json"),
  ]);
  const catalog = normalizeTradeCatalog({ items, staticData, stats });
  const passiveTree = getPassiveTreePayload(passiveTreePayload);
  const equipmentBases = [
    ...catalog.weaponBases,
    ...catalog.armourBases,
    ...catalog.accessoryBases,
    ...catalog.jewelBases,
  ];
  let passiveNodes = [];
  let selectedPassiveNode = passiveTree.nodes.find(hasSupportedPassiveModifiers) ?? passiveTree.nodes[0];

  populateSelect(document.getElementById("skill-gem"), catalog.skillGems, "选择技能宝石");
  populateSelect(document.getElementById("support-gem"), catalog.supportGems, "选择辅助宝石");
  populateSelect(document.getElementById("equipment-base"), equipmentBases, "选择装备基底");
  populateSelect(document.getElementById("equipment-stat"), catalog.itemStats.slice(0, 900), "选择装备词缀");

  const status = document.getElementById("planner-status");
  if (status) {
    status.textContent = `已加载官方 trade2 缓存：${catalog.skillGems.length} 个技能/宝石项、${catalog.supportGems.length} 个辅助项、${equipmentBases.length} 个装备基底；天赋树 ${passiveTree.nodes.length} 个节点。`;
  }

  const treeSource = document.getElementById("passive-tree-source");
  if (treeSource) {
    treeSource.textContent = `${passiveTreePayload.version ?? "PassiveTree"} / ${passiveTreePayload.league ?? DEFAULT_LEAGUE} / ${passiveTree.nodes.length} nodes`;
  }

  const update = () => {
    const state = readPlannerState(form, catalog, passiveNodes);
    renderPlannerResult(calculateBuildDamage(state));
    renderTradeLink(form);
    updatePassiveActiveState(passiveNodes);
    if (selectedPassiveNode) {
      renderPassiveDetails(
        selectedPassiveNode,
        passiveNodes.some((node) => node.id === selectedPassiveNode.id),
      );
    }
  };

  const toggleTreeNode = (node) => {
    selectedPassiveNode = node;
    const state = togglePassiveNode({ passiveNodes }, node);
    passiveNodes = state.passiveNodes;
    renderPassiveNodeList(passiveTree, passiveNodes, toggleTreeNode);
    update();
  };

  renderPassiveTreeSvg(passiveTree, passiveNodes, toggleTreeNode);
  renderPassiveNodeList(passiveTree, passiveNodes, toggleTreeNode);
  renderPassiveDetails(selectedPassiveNode, false);

  document.getElementById("passive-search")?.addEventListener("input", () => {
    renderPassiveNodeList(passiveTree, passiveNodes, toggleTreeNode);
  });

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
}

if (typeof document !== "undefined") {
  initBuildPlanner().catch((error) => {
    const target = document.getElementById("planner-status");
    if (target) {
      target.textContent = `数据加载失败：${error.message}`;
    }
    console.error(error);
  });
}
