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

function normalizeKey(value = "") {
  return String(value).trim().toLowerCase();
}

function createLocalizationLookup(localizationIndex = {}) {
  return new Map(
    (localizationIndex.entries ?? []).flatMap((entry) => [
      [normalizeKey(entry.english), entry],
      [normalizeKey(entry.slug?.replaceAll("_", " ")), entry],
    ]),
  );
}

function translateKnownTerms(text = "") {
  return stripMarkup(text)
    .replaceAll("Critical Hit Chance", "暴击几率")
    .replaceAll("Critical Damage Bonus", "暴击伤害加成")
    .replaceAll("Spell Damage", "法术伤害")
    .replaceAll("Attack Damage", "攻击伤害")
    .replaceAll("Projectile Damage", "投射物伤害")
    .replaceAll("Physical Damage", "物理伤害")
    .replaceAll("Elemental Damage", "元素伤害")
    .replaceAll("Lightning Damage", "闪电伤害")
    .replaceAll("Fire Damage", "火焰伤害")
    .replaceAll("Cold Damage", "冰霜伤害")
    .replaceAll("Chaos Damage", "混沌伤害")
    .replaceAll("Damage", "伤害")
    .replaceAll("increased", "提高")
    .replaceAll("more", "更多")
    .replaceAll("reduced", "降低")
    .replaceAll("with", "使用")
    .replaceAll("for", "对")
    .replaceAll("against", "对抗")
    .replaceAll("Attacks", "攻击")
    .replaceAll("Spells", "法术");
}

export function localizeCatalogEntry(entry = {}, localizationIndex = {}) {
  const lookup = createLocalizationLookup(localizationIndex);
  const english = entry.text ?? entry.type ?? entry.name ?? "";
  const match = lookup.get(normalizeKey(english));
  const label = match?.chinese ?? english;

  return {
    ...entry,
    label,
    english,
    tradeText: english,
    chinese: match?.chinese ?? "",
    poe2db: match?.poe2db ?? "",
    searchText: normalizeKey([label, english, match?.slug?.replaceAll("_", " ")].filter(Boolean).join(" ")),
  };
}

function localizeCatalogList(entries = [], localizationIndex = {}) {
  return entries.map((entry) => localizeCatalogEntry(entry, localizationIndex));
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
      label: node.name ?? `Passive ${id}`,
      searchText: "",
      x,
      y,
      color: node.color ?? "#6c7e9d",
      isNotable: Boolean(node.isNotable),
      ascendancyName: node.ascendancyName ?? "",
      statsText: (node.stats ?? []).map((stat) => stripMarkup(stat.t ?? stat.text ?? "")).filter(Boolean).join(" | "),
      statsTextCn: (node.stats ?? []).map((stat) => translateKnownTerms(stat.t ?? stat.text ?? "")).filter(Boolean).join(" | "),
      out: (node.out ?? []).map(String),
      ...modifiers,
    };
    normalized.searchText = normalizeKey(`${normalized.label} ${normalized.name} ${normalized.statsText} ${normalized.statsTextCn} ${normalized.ascendancyName}`);

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
      if (Array.isArray(node.more)) {
        accumulator.more.push(...node.more.map((value) => toNumber(value)));
      } else {
        accumulator.more.push(toNumber(node.more));
      }
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

  const query = normalizeKey(search?.value ?? "");
  const activeIds = new Set(passiveNodes.map((node) => node.id));
  const matches = tree.nodes
    .filter((node) => {
      const searchable = node.searchText || normalizeKey(`${node.name} ${node.statsText} ${node.statsTextCn} ${node.ascendancyName}`);
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
    name.textContent = node.label ?? node.name;
    const summary = document.createElement("span");
    summary.textContent = node.statsTextCn || formatPassiveModifiers(node);
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
  svg.__baseViewBox = { x: tree.bounds.minX - padding, y: tree.bounds.minY - padding, width, height };
  svg.__currentViewBox = { ...svg.__baseViewBox };
  setPassiveViewBox(svg, svg.__currentViewBox);

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
    const hitTarget = createSvgElement("circle", {
      cx: node.x,
      cy: node.y,
      r: node.isNotable ? 180 : supported ? 150 : 96,
      "data-passive-id": node.id,
      tabindex: supported ? 0 : -1,
      class: [
        "passive-tree-hit-target",
        supported ? "is-supported" : "",
        activeIds.has(node.id) ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
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
    title.textContent = `${node.label ?? node.name} - ${node.statsTextCn || node.statsText}`;
    hitTarget.append(title);
    hitTarget.addEventListener("click", () => onToggle(node));
    hitTarget.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle(node);
      }
    });
    hitTarget.addEventListener("mouseenter", () => renderPassiveDetails(node, activeIds.has(node.id)));
    circle.setAttribute("fill", node.color ?? "#6c7e9d");
    circle.append(createSvgElement("title"));
    circle.querySelector("title").textContent = title.textContent;
    nodes.append(hitTarget);
    nodes.append(circle);
  });

  fragment.append(edges, nodes);
  svg.append(fragment);
}

function setPassiveViewBox(svg, viewBox) {
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

function zoomPassiveTree(factor) {
  const svg = document.getElementById("passive-tree-svg");
  if (!svg?.__currentViewBox) {
    return;
  }

  const current = svg.__currentViewBox;
  const nextWidth = current.width * factor;
  const nextHeight = current.height * factor;
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;
  svg.__currentViewBox = {
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  };
  setPassiveViewBox(svg, svg.__currentViewBox);
}

function resetPassiveTreeView() {
  const svg = document.getElementById("passive-tree-svg");
  if (!svg?.__baseViewBox) {
    return;
  }

  svg.__currentViewBox = { ...svg.__baseViewBox };
  setPassiveViewBox(svg, svg.__currentViewBox);
}

const EQUIPMENT_SLOTS = [
  { id: "weapon", label: "武器" },
  { id: "offhand", label: "副手" },
  { id: "helmet", label: "头盔" },
  { id: "body", label: "胸甲" },
  { id: "gloves", label: "手套" },
  { id: "boots", label: "鞋子" },
  { id: "amulet", label: "项链" },
  { id: "ring-1", label: "戒指 1" },
  { id: "ring-2", label: "戒指 2" },
  { id: "belt", label: "腰带" },
  { id: "jewel", label: "天赋珠宝" },
];

function renderDatalist(id, entries = []) {
  const datalist = document.getElementById(id);
  if (!datalist) {
    return;
  }

  datalist.innerHTML = "";
  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.label ?? entry.text;
    option.label = entry.chinese && entry.english ? entry.english : "";
    datalist.append(option);
  });
}

function findEntryByInput(entries = [], value = "") {
  const query = normalizeKey(value);
  return entries.find((entry) => normalizeKey(entry.label) === query || normalizeKey(entry.english) === query || normalizeKey(entry.text) === query);
}

function createSkillCard(id, catalog, values = {}) {
  const card = document.createElement("article");
  card.className = "skill-card";
  card.dataset.skillRow = id;
  card.innerHTML = `
    <div class="skill-card__main">
      <div class="field-grid">
        <label class="calc-field">
          <span>主动技能宝石</span>
          <input class="skill-name" list="skill-options" value="${values.name ?? ""}" placeholder="输入中文或英文搜索技能" />
        </label>
        <label class="calc-field">
          <span>技能等级</span>
          <input class="skill-level" type="number" min="1" step="1" value="${values.level ?? 20}" />
        </label>
        <label class="calc-field">
          <span>辅助宝石</span>
          <input class="support-gem" list="support-options" value="${values.support ?? ""}" placeholder="输入中文或英文搜索辅助" />
        </label>
        <label class="calc-field">
          <span>辅助 more %</span>
          <input class="support-more" type="number" step="1" value="${values.supportMore ?? 30}" />
        </label>
      </div>
      <div class="field-grid">
        <label class="calc-field">
          <span>技能基础 hit</span>
          <input class="skill-base-hit" type="number" min="0" step="1" value="${values.baseHit ?? 1000}" />
        </label>
        <label class="calc-field">
          <span>每秒命中次数</span>
          <input class="skill-hps" type="number" min="0" step="0.05" value="${values.hitsPerSecond ?? 2}" />
        </label>
        <label class="calc-field">
          <span>技能 increased %</span>
          <input class="skill-increased" type="number" step="1" value="${values.skillIncreased ?? 0}" />
        </label>
        <label class="calc-field">
          <span>技能 more %</span>
          <input class="skill-more" type="number" step="1" value="${values.skillMore ?? 0}" />
        </label>
      </div>
      <div class="field-grid">
        <label class="calc-field">
          <span>暴击几率 %</span>
          <input class="skill-crit-chance" type="number" min="0" max="100" step="0.1" value="${values.critChance ?? 20}" />
        </label>
        <label class="calc-field">
          <span>暴击伤害 %</span>
          <input class="skill-crit-damage" type="number" min="100" step="1" value="${values.critDamage ?? 250}" />
        </label>
      </div>
    </div>
    <aside class="skill-card__damage">
      <strong data-skill-dps>0</strong>
      <span>DPS</span>
      <p>平均 hit <b data-skill-average>0</b></p>
      <p>非暴击 <b data-skill-noncrit>0</b></p>
      <p>暴击 <b data-skill-crit>0</b></p>
      <button type="button" class="remove-skill">移除</button>
    </aside>
  `;

  card.querySelector(".remove-skill")?.addEventListener("click", () => {
    if (document.querySelectorAll("[data-skill-row]").length <= 1) {
      return;
    }

    card.remove();
    document.dispatchEvent(new CustomEvent("planner:update"));
  });

  return card;
}

function renderEquipmentSlots(equipmentBases = []) {
  const target = document.getElementById("equipment-slots");
  if (!target) {
    return;
  }

  target.innerHTML = "";
  EQUIPMENT_SLOTS.forEach((slot) => {
    const card = document.createElement("article");
    card.className = "equipment-card";
    card.dataset.equipmentSlot = slot.id;
    card.innerHTML = `
      <div class="equipment-card__header">
        <strong>${slot.label}</strong>
        <a class="equipment-trade-link" href="${buildInternationalTradeUrl()}" target="_blank" rel="noopener">集市</a>
      </div>
      <div class="field-grid">
        <label class="calc-field">
          <span>装备基底</span>
          <input class="equipment-base" list="equipment-options" placeholder="搜索基底" />
        </label>
        <label class="calc-field">
          <span>词缀筛选</span>
          <input class="equipment-stat" list="stat-options" placeholder="搜索词缀" />
        </label>
        <label class="calc-field">
          <span>装备 increased %</span>
          <input class="equipment-increased" type="number" step="1" value="${slot.id === "weapon" ? 80 : 0}" />
        </label>
        <label class="calc-field">
          <span>装备 more %</span>
          <input class="equipment-more" type="number" step="1" value="0" />
        </label>
      </div>
    `;
    target.append(card);
  });
}

function getEquipmentRows(form) {
  return [...form.querySelectorAll("[data-equipment-slot]")].map((card) => ({
    slot: card.dataset.equipmentSlot,
    base: card.querySelector(".equipment-base")?.value ?? "",
    stat: card.querySelector(".equipment-stat")?.value ?? "",
    increased: toNumber(card.querySelector(".equipment-increased")?.value),
    more: toNumber(card.querySelector(".equipment-more")?.value),
    link: card.querySelector(".equipment-trade-link"),
  }));
}

function renderEquipmentTradeLinks(form) {
  const league = form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE;

  getEquipmentRows(form).forEach((row) => {
    const url = buildInternationalTradeUrl({
      league,
      itemType: row.base,
      keywords: row.stat,
    });
    if (row.link) {
      row.link.href = url;
      row.link.title = url;
    }
  });
}

function readPlannerState(form, catalog, passiveNodes) {
  const gearRows = getEquipmentRows(form);
  const gearIncreased = gearRows.reduce((sum, row) => sum + row.increased, 0);
  const gearMore = gearRows.map((row) => row.more).filter((value) => value !== 0);
  const skills = [...form.querySelectorAll("[data-skill-row]")].map((card, index) => {
    const nameInput = card.querySelector(".skill-name")?.value ?? "";
    const skillEntry = findEntryByInput(catalog.skillGems, nameInput);
    const supportMore = toNumber(card.querySelector(".support-more")?.value);
    const skillMore = toNumber(card.querySelector(".skill-more")?.value);

    return {
      id: card.dataset.skillRow ?? `skill-${index + 1}`,
      name: skillEntry?.label || nameInput || `技能 ${index + 1}`,
      level: toNumber(card.querySelector(".skill-level")?.value, 1),
      baseHit: toNumber(card.querySelector(".skill-base-hit")?.value),
      hitsPerSecond: toNumber(card.querySelector(".skill-hps")?.value, 1),
      supportGems: [card.querySelector(".support-gem")?.value].filter(Boolean),
      gear: gearRows,
      passiveNodes: [],
      critChance: toNumber(card.querySelector(".skill-crit-chance")?.value),
      critDamage: toNumber(card.querySelector(".skill-crit-damage")?.value, 100),
      more: [supportMore, skillMore, ...gearMore].filter((value) => value !== 0),
      increased: {
        gear: gearIncreased,
        tree: toNumber(form.querySelector("#planner-tree-increased")?.value),
        support: 0,
        skill: toNumber(card.querySelector(".skill-increased")?.value),
      },
    };
  });

  return {
    ...createInitialBuildState(catalog),
    league: form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE,
    passiveNodes,
    skills,
    equipment: gearRows,
  };
}

function renderPlannerResult(result, form) {
  const firstSkill = result.skills[0] ?? {};
  const entries = {
    "planner-average-hit": result.totalAverageHit,
    "planner-dps": result.totalDps,
    "planner-skill-count": result.skills.length,
    "planner-more-multiplier": `${formatValue(firstSkill.moreMultiplier ?? 1)}x`,
    "planner-increased-multiplier": `${formatValue(firstSkill.increasedMultiplier ?? 1)}x`,
    "planner-passives": result.passiveNodeCount,
    "planner-equipment-count": getEquipmentRows(form).filter((row) => row.base || row.stat || row.increased || row.more).length,
  };

  Object.entries(entries).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = typeof value === "number" ? formatValue(value) : value;
    }
  });

  result.skills.forEach((skill) => {
    const card = form.querySelector(`[data-skill-row="${skill.id}"]`);
    if (!card) {
      return;
    }

    card.querySelector("[data-skill-dps]").textContent = formatValue(skill.dps);
    card.querySelector("[data-skill-average]").textContent = formatValue(skill.averageHit);
    card.querySelector("[data-skill-noncrit]").textContent = formatValue(skill.nonCritHit);
    card.querySelector("[data-skill-crit]").textContent = formatValue(skill.critHit);
  });
}

function renderPassiveDetails(node, isActive) {
  const target = document.getElementById("passive-details");
  if (!target || !node) {
    return;
  }

  target.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = node.label ?? node.name;
  const meta = document.createElement("span");
  meta.textContent = [node.ascendancyName, isActive ? "已点亮" : "未点亮"].filter(Boolean).join(" / ");
  const modifiers = document.createElement("p");
  modifiers.textContent = formatPassiveModifiers(node);
  const stats = document.createElement("small");
  stats.textContent = node.statsTextCn || node.statsText || "无可展示词缀";
  target.append(title, meta, modifiers, stats);
}

async function initBuildPlanner() {
  const form = document.querySelector("[data-build-planner]");
  if (!form) {
    return;
  }

  const [items, staticData, stats, localizationIndex, passiveTreePayload] = await Promise.all([
    loadJson("../data/trade2-items.json"),
    loadJson("../data/trade2-static.json"),
    loadJson("../data/trade2-stats.json"),
    loadJson("../data/poe2db-cn-index.json"),
    loadJson("../data/poe2-passive-tree.json"),
  ]);
  const catalog = normalizeTradeCatalog({ items, staticData, stats });
  catalog.skillGems = localizeCatalogList(catalog.skillGems, localizationIndex);
  catalog.supportGems = [
    ...localizeCatalogList(catalog.supportGems, localizationIndex),
    ...(localizationIndex.entries ?? [])
      .filter((entry) => entry.type === "support")
      .map((entry) => localizeCatalogEntry({ text: entry.english, type: entry.english }, localizationIndex)),
  ].filter((entry, index, entries) => {
    return entries.findIndex((candidate) => candidate.label === entry.label) === index;
  });
  catalog.itemStats = catalog.itemStats.map((entry) => ({
    ...entry,
    label: translateKnownTerms(entry.text),
    english: entry.text,
    tradeText: entry.text,
    searchText: normalizeKey(`${entry.text} ${translateKnownTerms(entry.text)}`),
  }));
  const passiveTree = getPassiveTreePayload(passiveTreePayload);
  const equipmentBases = [
    ...catalog.weaponBases,
    ...catalog.armourBases,
    ...catalog.accessoryBases,
    ...catalog.jewelBases,
  ];
  let passiveNodes = [];
  let selectedPassiveNode = passiveTree.nodes.find(hasSupportedPassiveModifiers) ?? passiveTree.nodes[0];

  renderDatalist("skill-options", catalog.skillGems);
  renderDatalist("support-options", catalog.supportGems);
  renderDatalist("equipment-options", equipmentBases.map((entry) => ({ ...entry, label: entry.text, english: entry.text })));
  renderDatalist("stat-options", catalog.itemStats.slice(0, 900));
  renderEquipmentSlots(equipmentBases);

  const skillList = document.getElementById("skill-list");
  const firstSkill = catalog.skillGems.find((entry) => entry.english === "Lightning Arrow") ?? catalog.skillGems[0];
  if (skillList) {
    skillList.append(
      createSkillCard("skill-1", catalog, {
        name: firstSkill?.label ?? "",
        level: 20,
        baseHit: 1000,
        hitsPerSecond: 2,
      }),
    );
  }

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
    renderPlannerResult(calculateBuildDamage(state), form);
    renderEquipmentTradeLinks(form);
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
  document.getElementById("passive-zoom-in")?.addEventListener("click", () => zoomPassiveTree(0.72));
  document.getElementById("passive-zoom-out")?.addEventListener("click", () => zoomPassiveTree(1.28));
  document.getElementById("passive-reset-view")?.addEventListener("click", resetPassiveTreeView);
  document.getElementById("add-skill")?.addEventListener("click", () => {
    const count = document.querySelectorAll("[data-skill-row]").length + 1;
    skillList?.append(createSkillCard(`skill-${count}`, catalog, { name: catalog.skillGems[count - 1]?.label ?? "" }));
    update();
  });
  document.addEventListener("planner:update", update);

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
