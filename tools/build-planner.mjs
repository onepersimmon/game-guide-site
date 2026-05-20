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
    image: match?.image ?? entry.image ?? "",
    page: match?.page ?? entry.page ?? "",
    slug: match?.slug ?? entry.slug ?? "",
    poe2db: match?.poe2db ?? "",
    searchText: normalizeKey([label, english, match?.slug?.replaceAll("_", " ")].filter(Boolean).join(" ")),
  };
}

function localizeCatalogList(entries = [], localizationIndex = {}) {
  return entries.map((entry) => localizeCatalogEntry(entry, localizationIndex));
}

function createPoe2dbGemCatalog(localizationIndex = {}, type = "skill") {
  return (localizationIndex.entries ?? [])
    .filter((entry) => entry.type === type)
    .map((entry) => localizeCatalogEntry({ text: entry.english, type: entry.english }, localizationIndex))
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.english === entry.english) === index);
}

function createPoe2dbLocalizationMaps(localizationIndex = {}) {
  const maps = {
    passiveBySkill: new Map(),
    classByEnglish: new Map(),
    ascendancyByEnglish: new Map(),
  };

  for (const entry of localizationIndex.entries ?? []) {
    if (entry.type === "passive" && entry.skill) {
      maps.passiveBySkill.set(String(entry.skill), entry);
    }

    if (entry.type === "class") {
      maps.classByEnglish.set(entry.english, entry);
    }

    if (entry.type === "ascendancy") {
      maps.ascendancyByEnglish.set(entry.english, entry);
    }
  }

  return maps;
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
  const jewelSlotSkills = new Set((rawTree.jewelSlots ?? []).map((skill) => String(skill)));
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
      isJewelSocket: jewelSlotSkills.has(String(node.skill ?? id)) || /\[?jewel\]?\s+socket/i.test(node.name ?? ""),
      ascendancyName: node.ascendancyName ?? "",
      statsText: (node.stats ?? []).map((stat) => stripMarkup(stat.t ?? stat.text ?? "")).filter(Boolean).join(" | "),
      statsTextCn: "",
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
    equipment: createInitialEquipmentState(),
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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getEntryLabel(entry = {}) {
  return entry.label ?? entry.text ?? entry.type ?? entry.english ?? "";
}

function getEntryTradeText(entry = {}) {
  return entry.tradeText ?? entry.english ?? entry.text ?? entry.type ?? getEntryLabel(entry);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return response.json();
}

function populateSelect(
  select,
  entries,
  placeholder,
  valueGetter = (entry) => entry.name ?? entry.text ?? "",
  labelGetter = (entry) => entry.name ?? entry.text ?? valueGetter(entry),
) {
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
    option.value = valueGetter(entry);
    option.textContent = labelGetter(entry);
    select.append(option);
  });
}

function matchSearchEntries(entries = [], query = "", limit = 32) {
  const normalizedQuery = normalizeKey(query);
  const normalizedEntries = entries.map((entry) => ({
    entry,
    label: getEntryLabel(entry),
    haystack: entry.searchText || normalizeKey(`${getEntryLabel(entry)} ${entry.english ?? ""} ${entry.text ?? ""}`),
  }));

  return normalizedEntries
    .filter(({ haystack }) => !normalizedQuery || haystack.includes(normalizedQuery))
    .sort((a, b) => {
      if (!normalizedQuery) {
        return a.label.localeCompare(b.label, "zh-Hans-CN");
      }

      const aStarts = a.haystack.startsWith(normalizedQuery);
      const bStarts = b.haystack.startsWith(normalizedQuery);
      if (aStarts !== bStarts) {
        return Number(bStarts) - Number(aStarts);
      }

      return a.label.length - b.label.length;
    })
    .slice(0, limit)
    .map(({ entry }) => entry);
}

function setInputEntry(input, entry) {
  input.value = getEntryLabel(entry);
  input.dataset.tradeText = getEntryTradeText(entry);
  input.dataset.entryId = entry.id ?? entry.type ?? entry.text ?? "";
  input.dataset.image = entry.image ?? "";
}

function positionSearchLayer(layer, input) {
  const rect = input.getBoundingClientRect();
  layer.style.left = `${rect.left}px`;
  layer.style.top = `${rect.bottom + 6}px`;
  layer.style.width = `${Math.min(Math.max(rect.width, 280), 640)}px`;
}

function hideSearchLayer(layer) {
  if (!layer) {
    return;
  }

  layer.hidden = true;
  layer.innerHTML = "";
}

function attachDynamicSearch(input, entries, layerId, onSelect, { emptyText = "没有匹配项" } = {}) {
  const layer = document.getElementById(layerId);
  if (!input || !layer) {
    return;
  }

  let frame = 0;
  const render = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const sourceEntries = typeof entries === "function" ? entries() : entries;
      const matches = matchSearchEntries(sourceEntries, input.value, 36);
      positionSearchLayer(layer, input);
      layer.innerHTML = "";
      layer.hidden = false;

      if (matches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "search-layer__empty";
        empty.textContent = emptyText;
        layer.append(empty);
        return;
      }

      matches.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-layer__item";
        const image = entry.image ? `<img src="${escapeHtml(entry.image)}" alt="" loading="lazy" />` : "";
        button.innerHTML = `
          ${image}
          <span class="search-layer__text">
            <strong>${escapeHtml(getEntryLabel(entry))}</strong>
            <span>${escapeHtml(entry.chinese ? "来自流放之路 2 编年史" : "来自国际服集市缓存")}</span>
          </span>
        `;
        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
          setInputEntry(input, entry);
          hideSearchLayer(layer);
          onSelect?.(entry);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        layer.append(button);
      });
    });
  };

  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSearchLayer(layer);
    }
  });
  window.addEventListener("resize", () => hideSearchLayer(layer));
  window.addEventListener("scroll", () => hideSearchLayer(layer), { capture: true });
  document.addEventListener("mousedown", (event) => {
    if (event.target !== input && !layer.contains(event.target)) {
      hideSearchLayer(layer);
    }
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
    parts.push(`提高 +${formatValue(toNumber(node.increased))}%`);
  }

  if ((node.more ?? []).length > 0) {
    parts.push(`更多 ${node.more.map((value) => `+${formatValue(toNumber(value))}%`).join(", ")}`);
  }

  if (toNumber(node.critChance) !== 0) {
    parts.push(`暴击几率 +${formatValue(toNumber(node.critChance))}%`);
  }

  if (toNumber(node.critDamage) !== 0) {
    parts.push(`暴击伤害 +${formatValue(toNumber(node.critDamage))}%`);
  }

  return parts.length > 0 ? parts.join(" / ") : "暂未纳入伤害公式";
}

function getPassiveTreePayload(payload = {}, localizationIndex = {}) {
  const tree = Array.isArray(payload.nodes) ? payload : normalizePassiveTree(payload);
  const localizationMaps = createPoe2dbLocalizationMaps(localizationIndex);
  const jewelSlotSkills = new Set((tree.jewelSlots ?? []).map((skill) => String(skill)));

  return {
    ...tree,
    nodes: tree.nodes.map((node) => {
      const passiveEntry = localizationMaps.passiveBySkill.get(String(node.skill ?? node.id));
      const ascendancyEntry = localizationMaps.ascendancyByEnglish.get(node.ascendancyName ?? "");
      const label = passiveEntry?.chinese ?? node.name ?? node.label ?? "";
      const ascendancyNameCn = ascendancyEntry?.chinese ?? node.ascendancyName ?? "";
      const statsTextCn = (passiveEntry?.chineseStats ?? []).join(" | ");
      const isJewelSocket = Boolean(node.isJewelSocket) || jewelSlotSkills.has(String(node.skill ?? node.id)) || /jewel.*socket|\[Jewel\|珠寶\]插槽/i.test(`${node.name ?? ""} ${label}`);
      return {
        ...node,
        label,
        isJewelSocket,
        ascendancyNameCn,
        statsTextCn,
        poe2dbChineseSource: passiveEntry?.poe2db ?? "",
        searchText: normalizeKey(`${label} ${node.name ?? ""} ${node.statsText ?? ""} ${statsTextCn} ${node.ascendancyName ?? ""} ${ascendancyNameCn}`),
      };
    }),
  };
}

function updatePassiveActiveState(passiveNodes) {
  const activeIds = new Set(passiveNodes.map((node) => node.id));
  const svg = document.getElementById("passive-tree-svg");
  const previousIds = svg?.__activePassiveIds ?? new Set();
  const changedIds = new Set([...activeIds, ...previousIds].filter((id) => activeIds.has(id) !== previousIds.has(id)));

  changedIds.forEach((id) => {
    document.querySelectorAll(`.passive-tree-node[data-passive-id="${id}"]`).forEach((element) => {
      element.classList.toggle("is-active", activeIds.has(id));
    });
  });

  updatePassiveActiveEdgePath(svg, activeIds);
  if (svg) {
    svg.__activePassiveIds = activeIds;
  }
}

function updatePassiveSearchState(tree) {
  const query = normalizeKey(document.getElementById("passive-search")?.value ?? "");
  const matches = new Set(
    query
      ? tree.nodes
          .filter((node) => (node.searchText || normalizeKey(`${node.name} ${node.statsText} ${node.statsTextCn} ${node.ascendancyName}`)).includes(query))
          .map((node) => node.id)
      : [],
  );

  document.querySelectorAll(".passive-tree-node[data-passive-id]").forEach((element) => {
    element.classList.toggle("is-search-match", matches.has(element.dataset.passiveId));
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

function showPassiveTooltip(node, isActive, event) {
  const target = document.getElementById("passive-tooltip");
  if (!target || !node) {
    return;
  }

  target.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = node.label ?? node.name;
  const meta = document.createElement("span");
  meta.textContent = [node.ascendancyNameCn || node.ascendancyName, isActive ? "已点亮" : "未点亮", node.isJewelSocket ? "珠宝插槽" : ""].filter(Boolean).join(" / ");
  const modifiers = document.createElement("p");
  modifiers.textContent = formatPassiveModifiers(node);
  const stats = document.createElement("small");
  stats.textContent = node.statsTextCn || node.statsText || "无可展示词缀";
  target.append(title, meta, modifiers, stats);
  movePassiveTooltip(event);
  target.hidden = false;
}

function movePassiveTooltip(event) {
  const target = document.getElementById("passive-tooltip");
  if (!target || !event) {
    return;
  }

  const offset = 18;
  const width = 320;
  const left = Math.min(event.clientX + offset, window.innerWidth - width - 14);
  const top = Math.min(event.clientY + offset, window.innerHeight - 180);
  target.style.left = `${Math.max(14, left)}px`;
  target.style.top = `${Math.max(14, top)}px`;
}

function hidePassiveTooltip() {
  const target = document.getElementById("passive-tooltip");
  if (target) {
    target.hidden = true;
  }
}

function getPassiveEventNode(svg, event) {
  const element = event.target?.closest?.("[data-passive-id]");
  if (!element || !svg?.contains(element)) {
    return null;
  }

  return svg.__passiveNodeById?.get(element.dataset.passiveId) ?? null;
}

function updatePassiveActiveEdgePath(svg, activeIds = new Set()) {
  const activePath = svg?.querySelector?.("[data-passive-active-edges]");
  if (!activePath) {
    return;
  }

  const d = (svg.__passiveEdgeSegments ?? [])
    .filter((segment) => activeIds.has(segment.from) && activeIds.has(segment.to))
    .map((segment) => segment.d)
    .join(" ");
  activePath.setAttribute("d", d);
}

function wirePassiveTreeSvgDelegates(svg, onToggle) {
  if (!svg) {
    return;
  }

  svg.__onPassiveToggle = onToggle;
  if (svg.__passiveDelegatesWired) {
    return;
  }

  svg.__passiveDelegatesWired = true;
  svg.addEventListener("click", (event) => {
    if (svg.__skipNextPassiveClick) {
      svg.__skipNextPassiveClick = false;
      return;
    }

    const node = getPassiveEventNode(svg, event);
    if (!node) {
      return;
    }

    if (svg.__didDrag) {
      event.preventDefault();
      return;
    }

    svg.__onPassiveToggle?.(node);
  });
  svg.addEventListener("keydown", (event) => {
    const node = getPassiveEventNode(svg, event);
    if (!node || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    svg.__onPassiveToggle?.(node);
  });
  svg.addEventListener("mouseover", (event) => {
    const node = getPassiveEventNode(svg, event);
    if (!node) {
      return;
    }

    const relatedNode = getPassiveEventNode(svg, { target: event.relatedTarget });
    if (relatedNode?.id === node.id) {
      return;
    }

    showPassiveTooltip(node, svg.__activePassiveIds?.has(node.id), event);
  });
  svg.addEventListener("mousemove", (event) => {
    if (getPassiveEventNode(svg, event)) {
      movePassiveTooltip(event);
    }
  });
  svg.addEventListener("mouseout", (event) => {
    const node = getPassiveEventNode(svg, event);
    if (!node) {
      return;
    }

    const relatedNode = getPassiveEventNode(svg, { target: event.relatedTarget });
    if (relatedNode?.id !== node.id) {
      hidePassiveTooltip();
    }
  });
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
  const viewport = createSvgElement("g", {
    class: "passive-tree-viewport",
    "data-passive-viewport": "true",
  });
  const edges = createSvgElement("g", { class: "passive-tree-edges" });
  const nodes = createSvgElement("g", { class: "passive-tree-nodes" });
  const edgeSegments = [];

  svg.innerHTML = "";
  svg.__passiveNodeById = nodeById;
  svg.__passiveEdgeSegments = edgeSegments;
  svg.__activePassiveIds = new Set(activeIds);
  svg.__baseViewBox = { x: tree.bounds.minX - padding, y: tree.bounds.minY - padding, width, height };
  svg.__currentViewBox = { ...svg.__baseViewBox };
  setPassiveViewBox(svg, svg.__currentViewBox);

  tree.nodes.forEach((node) => {
    node.out.forEach((targetId) => {
      const target = nodeById.get(String(targetId));
      if (!target) {
        return;
      }

      edgeSegments.push({
        from: node.id,
        to: target.id,
        d: `M${node.x} ${node.y}L${target.x} ${target.y}`,
      });
    });
  });
  edges.append(
    createSvgElement("path", {
      d: edgeSegments.map((segment) => segment.d).join(" "),
      class: "passive-tree-edge-path",
    }),
    createSvgElement("path", {
      d: "",
      class: "passive-tree-edge-path is-active",
      "data-passive-active-edges": "true",
    }),
  );
  updatePassiveActiveEdgePath(svg, activeIds);

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
        node.isJewelSocket ? "is-jewel-socket" : "",
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
        node.isJewelSocket ? "is-jewel-socket" : "",
        activeIds.has(node.id) ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    circle.setAttribute("fill", node.color ?? "#6c7e9d");
    nodes.append(circle);
    nodes.append(hitTarget);
  });

  viewport.append(edges, nodes);
  fragment.append(viewport);
  svg.append(fragment);
  wirePassiveTreeSvgDelegates(svg, onToggle);
}

function setPassiveViewBox(svg, viewBox) {
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

function getPassivePanOffset(svg, viewBox, deltaX, deltaY) {
  const rect = svg?.getBoundingClientRect?.();
  if (!rect?.width || !rect?.height || !viewBox) {
    return { x: 0, y: 0 };
  }

  return {
    x: (deltaX / rect.width) * viewBox.width,
    y: (deltaY / rect.height) * viewBox.height,
  };
}

function clearPassiveTreePanPreview(svg) {
  const viewport = svg?.querySelector?.("[data-passive-viewport]");
  viewport?.removeAttribute("transform");
  svg?.classList?.remove("is-pan-previewing");
}

function previewPassiveTreePan(svg, startViewBox, deltaX, deltaY) {
  const viewport = svg?.querySelector?.("[data-passive-viewport]");
  if (!viewport) {
    return;
  }

  const offset = getPassivePanOffset(svg, startViewBox, deltaX, deltaY);
  viewport.setAttribute("transform", `translate(${offset.x} ${offset.y})`);
  svg.classList.add("is-pan-previewing");
}

function commitPassiveTreePan(svg, startViewBox, deltaX, deltaY) {
  if (!svg || !startViewBox) {
    return;
  }

  const offset = getPassivePanOffset(svg, startViewBox, deltaX, deltaY);
  clearPassiveTreePanPreview(svg);
  svg.__currentViewBox = {
    x: startViewBox.x - offset.x,
    y: startViewBox.y - offset.y,
    width: startViewBox.width,
    height: startViewBox.height,
  };
  setPassiveViewBox(svg, svg.__currentViewBox);
}

function clampPassiveViewBox(svg, width, height) {
  const base = svg.__baseViewBox;
  if (!base) {
    return { width, height };
  }

  return {
    width: clamp(width, base.width * 0.045, base.width * 2.2),
    height: clamp(height, base.height * 0.045, base.height * 2.2),
  };
}

function zoomPassiveTree(factor) {
  const svg = document.getElementById("passive-tree-svg");
  if (!svg?.__currentViewBox) {
    return;
  }

  clearPassiveTreePanPreview(svg);
  const current = svg.__currentViewBox;
  const { width: nextWidth, height: nextHeight } = clampPassiveViewBox(svg, current.width * factor, current.height * factor);
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

function zoomPassiveTreeAtPoint(svg, factor, clientX, clientY) {
  if (!svg?.__currentViewBox) {
    return;
  }

  clearPassiveTreePanPreview(svg);
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    zoomPassiveTree(factor);
    return;
  }

  const current = svg.__currentViewBox;
  const pointerX = current.x + ((clientX - rect.left) / rect.width) * current.width;
  const pointerY = current.y + ((clientY - rect.top) / rect.height) * current.height;
  const requestedWidth = current.width * factor;
  const requestedHeight = current.height * factor;
  const { width: nextWidth, height: nextHeight } = clampPassiveViewBox(svg, requestedWidth, requestedHeight);
  const appliedXFactor = nextWidth / current.width;
  const appliedYFactor = nextHeight / current.height;

  svg.__currentViewBox = {
    x: pointerX - (pointerX - current.x) * appliedXFactor,
    y: pointerY - (pointerY - current.y) * appliedYFactor,
    width: nextWidth,
    height: nextHeight,
  };
  setPassiveViewBox(svg, svg.__currentViewBox);
}

function wirePassiveTreePan(surface, svg) {
  if (!surface || !svg) {
    return;
  }

  let drag = null;
  surface.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !svg.__currentViewBox) {
      return;
    }

    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      totalX: 0,
      totalY: 0,
      distance: 0,
      frame: 0,
      node: getPassiveEventNode(svg, event),
      startViewBox: { ...svg.__currentViewBox },
    };
    svg.__didDrag = false;
    surface.classList.add("is-panning");
    surface.setPointerCapture?.(event.pointerId);
  });
  surface.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.totalX += deltaX;
    drag.totalY += deltaY;
    drag.distance += Math.abs(deltaX) + Math.abs(deltaY);
    if (drag.distance > 3) {
      svg.__didDrag = true;
      hidePassiveTooltip();
      if (!drag.frame) {
        drag.frame = window.requestAnimationFrame(() => {
          drag.frame = 0;
          previewPassiveTreePan(svg, drag.startViewBox, drag.totalX, drag.totalY);
        });
      }
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
  });

  const finishDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (drag.frame) {
      window.cancelAnimationFrame(drag.frame);
    }
    if (drag.distance > 3) {
      commitPassiveTreePan(svg, drag.startViewBox, drag.totalX, drag.totalY);
    } else {
      clearPassiveTreePanPreview(svg);
      if (drag.node) {
        svg.__onPassiveToggle?.(drag.node);
        svg.__skipNextPassiveClick = true;
      }
    }
    drag = null;
    surface.classList.remove("is-panning");
    surface.releasePointerCapture?.(event.pointerId);
    window.setTimeout(() => {
      svg.__didDrag = false;
    }, 0);
  };

  surface.addEventListener("pointerup", finishDrag);
  surface.addEventListener("pointercancel", finishDrag);
}

function resetPassiveTreeView() {
  const svg = document.getElementById("passive-tree-svg");
  if (!svg?.__baseViewBox) {
    return;
  }

  clearPassiveTreePanPreview(svg);
  svg.__currentViewBox = { ...svg.__baseViewBox };
  setPassiveViewBox(svg, svg.__currentViewBox);
}

function focusPassiveTreeNode(node, scale = 0.34) {
  const svg = document.getElementById("passive-tree-svg");
  if (!svg?.__baseViewBox || !node) {
    return;
  }

  clearPassiveTreePanPreview(svg);
  const base = svg.__baseViewBox;
  const width = Math.max(1400, base.width * scale);
  const height = Math.max(900, base.height * scale);
  svg.__currentViewBox = {
    x: node.x - width / 2,
    y: node.y - height / 2,
    width,
    height,
  };
  setPassiveViewBox(svg, svg.__currentViewBox);
}

function getAscendancyNames(tree, selectedClassName = "") {
  const classEntry = (tree.classes ?? []).find((entry) => entry.name === selectedClassName);
  const fromClass = (classEntry?.ascendancies ?? []).map((entry) => entry.name).filter(Boolean);
  const fromNodes = [...new Set(tree.nodes.map((node) => node.ascendancyName).filter(Boolean))];
  return fromClass.length > 0 ? fromClass : fromNodes;
}

const EQUIPMENT_SLOTS = [
  { id: "weapon", label: "武器", area: "weapon", pages: ["Bows", "Claws", "Crossbows", "Daggers", "Flails", "One_Hand_Axes", "One_Hand_Maces", "One_Hand_Swords", "Quarterstaves", "Sceptres", "Spears", "Staves", "Two_Hand_Axes", "Two_Hand_Maces", "Two_Hand_Swords", "Wands"] },
  { id: "offhand", label: "副手", area: "weapon", pages: ["Bucklers", "Foci", "Quivers", "Shields"] },
  { id: "helmet", label: "头盔", area: "armour", pages: ["Helmets"] },
  { id: "body", label: "胸甲", area: "armour", pages: ["Body_Armours"] },
  { id: "gloves", label: "手套", area: "armour", pages: ["Gloves"] },
  { id: "boots", label: "鞋子", area: "armour", pages: ["Boots"] },
  { id: "amulet", label: "项链", area: "accessory", pages: ["Amulets"] },
  { id: "ring-1", label: "戒指 1", area: "accessory", pages: ["Rings"] },
  { id: "ring-2", label: "戒指 2", area: "accessory", pages: ["Rings"] },
  { id: "belt", label: "腰带", area: "accessory", pages: ["Belts"] },
];

function createJewelEquipmentSlot(index) {
  return { id: `jewel-${index}`, label: `天赋珠宝 ${index}`, area: "jewel", pages: ["Jewels"] };
}

function getEquipmentSlotDefinition(slotId = "") {
  if (/^jewel-\d+$/.test(slotId)) {
    return createJewelEquipmentSlot(toNumber(slotId.split("-")[1], 1));
  }

  return EQUIPMENT_SLOTS.find((entry) => entry.id === slotId);
}

export function getEquipmentBaseEntriesForSlot(catalog = {}, slotId = "") {
  const slot = getEquipmentSlotDefinition(slotId);
  if (!slot) {
    return [];
  }

  const basePools = {
    weapon: catalog.weaponBases ?? [],
    armour: catalog.armourBases ?? [],
    accessory: catalog.accessoryBases ?? [],
    jewel: catalog.jewelBases ?? [],
  };
  const allowedPages = new Set(slot.pages ?? []);

  return (basePools[slot.area] ?? []).filter((entry) => allowedPages.has(entry.page));
}

export function getSelectedJewelSocketCount(passiveNodes = []) {
  return passiveNodes.filter((node) => node?.isJewelSocket || /jewel.*socket|\[Jewel\|珠寶\]插槽/i.test(`${node?.name ?? ""} ${node?.label ?? ""}`)).length;
}

export function syncEquipmentStateJewelSlots(equipmentState = [], jewelSlotCount = 0) {
  const baseSlots = equipmentState.filter((slot) => slot.area !== "jewel");
  const existingJewels = equipmentState.filter((slot) => slot.area === "jewel");
  const nextJewels = Array.from({ length: Math.max(0, jewelSlotCount) }, (_, index) => {
    const definition = createJewelEquipmentSlot(index + 1);
    const existing = existingJewels[index] ?? {};
    return {
      ...definition,
      base: existing.base ?? "",
      baseTradeText: existing.baseTradeText ?? "",
      affixes: existing.affixes ?? [],
      increased: toNumber(existing.increased),
      more: toNumber(existing.more),
    };
  });

  return [...baseSlots, ...nextJewels];
}

function findEntryByInput(entries = [], value = "") {
  const query = normalizeKey(value);
  return entries.find((entry) => normalizeKey(entry.label) === query || normalizeKey(entry.english) === query || normalizeKey(entry.text) === query);
}

function getGemImage(entry = {}) {
  return entry.image || "";
}

function createGemIcon(image = "", className = "gem-icon") {
  const source = escapeHtml(image);
  return `<span class="${className}">${source ? `<img src="${source}" alt="" loading="lazy" />` : ""}</span>`;
}

function createSkillCard(id, catalog, values = {}) {
  const card = document.createElement("article");
  card.className = "skill-card";
  card.dataset.skillRow = id;
  const selectedSkill = findEntryByInput(catalog.skillGems, values.name ?? "") ?? {};
  const supports = Array.isArray(values.supports) ? values.supports : [values.support].filter(Boolean);
  const supportInputs = Array.from({ length: 5 }, (_, index) => {
    const supportValue = supports[index] ?? "";
    const supportEntry = findEntryByInput(catalog.supportGems, supportValue) ?? {};
    return `
      <label class="support-gem-slot">
        <span>辅助 ${index + 1}</span>
        <span class="gem-search-control">
          ${createGemIcon(getGemImage(supportEntry), "gem-icon gem-icon--small")}
          <input class="support-gem" data-support-index="${index + 1}" type="search" value="${escapeHtml(supportValue)}" placeholder="搜索辅助宝石" autocomplete="off" />
        </span>
      </label>
    `;
  }).join("");
  card.innerHTML = `
    <div class="skill-card__main">
      <div class="skill-card__topline">
        <label class="calc-field skill-card__skill-field">
          <span>主动技能宝石</span>
          <span class="gem-search-control">
            ${createGemIcon(getGemImage(selectedSkill))}
            <input class="skill-name" type="search" value="${escapeHtml(values.name ?? "")}" placeholder="输入中文或英文搜索技能" autocomplete="off" />
          </span>
        </label>
        <label class="calc-field skill-card__level-field">
          <span>技能等级</span>
          <input class="skill-level" type="number" min="1" step="1" value="${values.level ?? 20}" />
        </label>
      </div>
      <div class="support-gem-list">
        ${supportInputs}
      </div>
      <input class="skill-base-hit" type="hidden" value="${values.baseHit ?? ""}" />
      <input class="skill-hps" type="hidden" value="${values.hitsPerSecond ?? 2}" />
      <input class="skill-increased" type="hidden" value="${values.skillIncreased ?? 0}" />
      <input class="skill-more" type="hidden" value="${values.skillMore ?? 0}" />
      <input class="skill-crit-chance" type="hidden" value="${values.critChance ?? 20}" />
      <input class="skill-crit-damage" type="hidden" value="${values.critDamage ?? 250}" />
    </div>
    <aside class="skill-card__damage">
      <strong data-skill-dps>0</strong>
      <span>每秒伤害</span>
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

function updateGemIcon(input, entry = {}) {
  const icon = input?.closest(".gem-search-control")?.querySelector(".gem-icon");
  if (!icon) {
    return;
  }

  const image = entry.image || input?.dataset.image || "";
  icon.innerHTML = image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : "";
}

function wireSkillCardSearch(card, catalog) {
  const skillInput = card.querySelector(".skill-name");
  attachDynamicSearch(skillInput, catalog.skillGems, "skill-search-layer", (entry) => updateGemIcon(skillInput, entry));
  updateGemIcon(skillInput, findEntryByInput(catalog.skillGems, skillInput?.value ?? ""));

  card.querySelectorAll(".support-gem").forEach((input) => {
    attachDynamicSearch(input, catalog.supportGems, "support-search-layer", (entry) => updateGemIcon(input, entry));
    updateGemIcon(input, findEntryByInput(catalog.supportGems, input.value));
  });
}

function createInitialEquipmentState(jewelSlotCount = 0) {
  return syncEquipmentStateJewelSlots(EQUIPMENT_SLOTS.map((slot) => ({
    ...slot,
    base: "",
    baseTradeText: "",
    affixes: [],
    increased: slot.id === "weapon" ? 80 : 0,
    more: 0,
  })), jewelSlotCount);
}

function getEquipmentRows(equipmentState = []) {
  return equipmentState.map((item) => ({
    slot: item.id,
    label: item.label,
    base: item.base,
    itemType: item.baseTradeText || item.base,
    stat: item.affixes.map((affix) => affix.tradeText || affix.text).filter(Boolean).join(", "),
    affixes: item.affixes,
    increased: toNumber(item.increased),
    more: toNumber(item.more),
  }));
}

function buildEquipmentTradeUrl(item, league = DEFAULT_LEAGUE) {
  return buildInternationalTradeUrl({
    league,
    itemType: item.baseTradeText || item.base,
    keywords: item.affixes.map((affix) => affix.tradeText || affix.text).filter(Boolean).join(", "),
  });
}

function renderCharacterEquipment(equipmentState, league, onOpenSlot) {
  const target = document.getElementById("character-equipment");
  if (!target) {
    return;
  }

  target.innerHTML = "";
  equipmentState.forEach((slot) => {
    const card = document.createElement("article");
    card.className = ["equipment-card", slot.base || slot.affixes.length > 0 ? "is-filled" : ""].filter(Boolean).join(" ");
    card.dataset.equipmentSlot = slot.id;
    const affixSummary = slot.affixes.length > 0 ? `${slot.affixes.length} 条词缀` : "点击编辑";
    card.innerHTML = `
      <button class="equipment-slot-button" type="button">
        <span>${escapeHtml(slot.label)}</span>
        <strong>${escapeHtml(slot.base || "未选择基底")}</strong>
        <small>${escapeHtml(affixSummary)}</small>
      </button>
      <a class="equipment-trade-link" href="${buildEquipmentTradeUrl(slot, league)}" target="_blank" rel="noopener">集市</a>
    `;
    card.querySelector(".equipment-slot-button")?.addEventListener("click", () => onOpenSlot(slot.id));
    target.append(card);
  });
}

function createAffixRow(affix = {}) {
  const row = document.createElement("div");
  row.className = "equipment-affix-row";
  row.dataset.affixId = affix.id ?? crypto.randomUUID();
  row.innerHTML = `
    <input class="equipment-affix-input" type="search" value="${escapeHtml(affix.text ?? "")}" placeholder="搜索装备词缀" autocomplete="off" />
    <button class="planner-icon-button remove-equipment-affix" type="button" aria-label="删除词缀">×</button>
  `;
  row.querySelector(".equipment-affix-input").dataset.tradeText = affix.tradeText ?? "";
  return row;
}

function readEquipmentModalAffixes() {
  return [...document.querySelectorAll(".equipment-affix-row")].map((row) => {
    const input = row.querySelector(".equipment-affix-input");
    return {
      id: row.dataset.affixId,
      text: input?.value ?? "",
      tradeText: input?.dataset.tradeText || input?.value || "",
    };
  }).filter((affix) => affix.text);
}

function updateEquipmentModalTrade(slot, league) {
  const link = document.getElementById("equipment-modal-trade");
  const baseInput = document.getElementById("equipment-base-search");
  if (!link || !slot) {
    return;
  }

  const preview = {
    ...slot,
    base: baseInput?.value ?? slot.base,
    baseTradeText: baseInput?.dataset.tradeText || baseInput?.value || slot.baseTradeText,
    affixes: readEquipmentModalAffixes(),
  };
  const url = buildEquipmentTradeUrl(preview, league);
  link.href = url;
  link.title = url;
}

function readPlannerState(form, catalog, passiveNodes, equipmentState) {
  const gearRows = getEquipmentRows(equipmentState);
  const gearIncreased = gearRows.reduce((sum, row) => sum + row.increased, 0);
  const gearMore = gearRows.map((row) => row.more).filter((value) => value !== 0);
  const skills = [...form.querySelectorAll("[data-skill-row]")].map((card, index) => {
    const nameInput = card.querySelector(".skill-name")?.value ?? "";
    const skillEntry = findEntryByInput(catalog.skillGems, nameInput);
    const supportGems = [...card.querySelectorAll(".support-gem")]
      .map((input) => input.value.trim())
      .filter(Boolean);
    const supportMore = supportGems.map(() => 10);
    const skillMore = toNumber(card.querySelector(".skill-more")?.value);
    const level = toNumber(card.querySelector(".skill-level")?.value, 1);
    const baseHitValue = card.querySelector(".skill-base-hit")?.value ?? "";

    return {
      id: card.dataset.skillRow ?? `skill-${index + 1}`,
      name: skillEntry?.label || nameInput || `技能 ${index + 1}`,
      level,
      baseHit: baseHitValue === "" ? level * 50 : toNumber(baseHitValue),
      hitsPerSecond: toNumber(card.querySelector(".skill-hps")?.value, 1),
      supportGems,
      gear: gearRows,
      passiveNodes: [],
      critChance: toNumber(card.querySelector(".skill-crit-chance")?.value),
      critDamage: toNumber(card.querySelector(".skill-crit-damage")?.value, 100),
      more: [...supportMore, skillMore, ...gearMore].filter((value) => value !== 0),
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

function renderPlannerResult(result, form, equipmentState) {
  const firstSkill = result.skills[0] ?? {};
  const entries = {
    "planner-average-hit": result.totalAverageHit,
    "planner-dps": result.totalDps,
    "planner-skill-count": result.skills.length,
    "planner-more-multiplier": `${formatValue(firstSkill.moreMultiplier ?? 1)}x`,
    "planner-increased-multiplier": `${formatValue(firstSkill.increasedMultiplier ?? 1)}x`,
    "planner-passives": result.passiveNodeCount,
    "planner-equipment-count": getEquipmentRows(equipmentState).filter((row) => row.base || row.stat || row.increased || row.more).length,
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
  meta.textContent = [node.ascendancyNameCn || node.ascendancyName, isActive ? "已点亮" : "未点亮"].filter(Boolean).join(" / ");
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
  catalog.skillGems = createPoe2dbGemCatalog(localizationIndex, "skill");
  catalog.weaponBases = localizeCatalogList(catalog.weaponBases, localizationIndex);
  catalog.armourBases = localizeCatalogList(catalog.armourBases, localizationIndex);
  catalog.accessoryBases = localizeCatalogList(catalog.accessoryBases, localizationIndex);
  catalog.jewelBases = localizeCatalogList(catalog.jewelBases, localizationIndex);
  catalog.flaskBases = localizeCatalogList(catalog.flaskBases, localizationIndex);
  catalog.supportGems = createPoe2dbGemCatalog(localizationIndex, "support");
  catalog.itemStats = catalog.itemStats.map((entry) => ({
    ...entry,
    label: entry.text,
    english: entry.text,
    tradeText: entry.text,
    searchText: normalizeKey(entry.text),
  }));
  const passiveTree = getPassiveTreePayload(passiveTreePayload, localizationIndex);
  const localizationMaps = createPoe2dbLocalizationMaps(localizationIndex);
  const equipmentBases = [
    ...catalog.weaponBases,
    ...catalog.armourBases,
    ...catalog.accessoryBases,
    ...catalog.jewelBases,
  ];
  let passiveNodes = [];
  let selectedPassiveNode = passiveTree.nodes.find(hasSupportedPassiveModifiers) ?? passiveTree.nodes[0];
  let equipmentState = createInitialEquipmentState();
  let editingEquipmentSlot = equipmentState[0]?.id ?? "";

  const skillList = document.getElementById("skill-list");
  const firstSkill = catalog.skillGems.find((entry) => entry.english === "Lightning Arrow") ?? catalog.skillGems[0];
  if (skillList) {
    const firstCard = createSkillCard("skill-1", catalog, {
      name: firstSkill?.label ?? "",
      level: 20,
      hitsPerSecond: 2,
    });
    skillList.append(firstCard);
    wireSkillCardSearch(firstCard, catalog);
  }

  const status = document.getElementById("planner-status");
  if (status) {
    status.textContent = `已加载国际服集市缓存：${catalog.skillGems.length} 个技能/宝石项、${catalog.supportGems.length} 个辅助项、${equipmentBases.length} 个装备基底；编年史繁體中文缓存：${localizationIndex.entries?.length ?? 0} 条；天赋树 ${passiveTree.nodes.length} 个节点。`;
  }

  const treeSource = document.getElementById("passive-tree-source");
  if (treeSource) {
    treeSource.textContent = `${passiveTreePayload.version ?? "天赋树"} / ${passiveTreePayload.league ?? DEFAULT_LEAGUE} / ${passiveTree.nodes.length} 个节点 / 繁體中文来自流放之路 2 编年史`;
  }

  const classSelect = document.getElementById("passive-class");
  const ascendancySelect = document.getElementById("passive-ascendancy");
  populateSelect(
    classSelect,
    passiveTree.classes ?? [],
    "选择职业",
    (entry) => entry.name,
    (entry) => localizationMaps.classByEnglish.get(entry.name)?.chinese ?? entry.name,
  );

  const refreshAscendancies = () => {
    populateSelect(
      ascendancySelect,
      getAscendancyNames(passiveTree, classSelect?.value ?? "").map((name) => ({ name })),
      "选择升华",
      (entry) => entry.name,
      (entry) => localizationMaps.ascendancyByEnglish.get(entry.name)?.chinese ?? entry.name,
    );
  };
  refreshAscendancies();

  const update = () => {
    const league = form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE;
    equipmentState = syncEquipmentStateJewelSlots(equipmentState, getSelectedJewelSocketCount(passiveNodes));
    if (!equipmentState.some((slot) => slot.id === editingEquipmentSlot)) {
      editingEquipmentSlot = equipmentState[0]?.id ?? "";
    }
    const state = readPlannerState(form, catalog, passiveNodes, equipmentState);
    renderPlannerResult(calculateBuildDamage(state), form, equipmentState);
    renderCharacterEquipment(equipmentState, league, openEquipmentModal);
    updatePassiveActiveState(passiveNodes);
    updatePassiveSearchState(passiveTree);
  };

  function wireAffixRow(row) {
    const input = row.querySelector(".equipment-affix-input");
    attachDynamicSearch(input, catalog.itemStats, "affix-search-layer", () => {
      const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
      updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
    });
    input?.addEventListener("input", () => {
      if (input.value !== input.dataset.lastValue) {
        input.dataset.tradeText = input.dataset.tradeText || input.value;
      }
      const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
      updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
    });
    row.querySelector(".remove-equipment-affix")?.addEventListener("click", () => {
      row.remove();
      const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
      updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
    });
  }

  function addAffixRow(affix = {}) {
    const list = document.getElementById("equipment-affix-list");
    if (!list) {
      return;
    }

    const row = createAffixRow(affix);
    list.append(row);
    wireAffixRow(row);
  }

  function openEquipmentModal(slotId) {
    const modal = document.getElementById("equipment-modal");
    const title = document.getElementById("equipment-modal-title");
    const baseInput = document.getElementById("equipment-base-search");
    const increasedInput = document.getElementById("equipment-increased-input");
    const moreInput = document.getElementById("equipment-more-input");
    const affixList = document.getElementById("equipment-affix-list");
    const slot = equipmentState.find((item) => item.id === slotId);
    if (!modal || !slot || !baseInput || !affixList) {
      return;
    }

    editingEquipmentSlot = slotId;
    title.textContent = `编辑${slot.label}`;
    baseInput.__searchEntries = getEquipmentBaseEntriesForSlot(catalog, slotId);
    baseInput.value = slot.base;
    baseInput.dataset.tradeText = slot.baseTradeText;
    increasedInput.value = slot.increased;
    moreInput.value = slot.more;
    affixList.innerHTML = "";
    (slot.affixes.length > 0 ? slot.affixes : [{ id: crypto.randomUUID(), text: "", tradeText: "" }]).forEach(addAffixRow);
    updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
    modal.hidden = false;
    baseInput.focus();
  }

  function closeEquipmentModal() {
    const modal = document.getElementById("equipment-modal");
    if (modal) {
      modal.hidden = true;
    }
  }

  function saveEquipmentModal() {
    const baseInput = document.getElementById("equipment-base-search");
    const increasedInput = document.getElementById("equipment-increased-input");
    const moreInput = document.getElementById("equipment-more-input");
    equipmentState = equipmentState.map((item) => {
      if (item.id !== editingEquipmentSlot) {
        return item;
      }

      return {
        ...item,
        base: baseInput?.value ?? "",
        baseTradeText: baseInput?.dataset.tradeText || baseInput?.value || "",
        increased: toNumber(increasedInput?.value),
        more: toNumber(moreInput?.value),
        affixes: readEquipmentModalAffixes(),
      };
    });
    closeEquipmentModal();
    update();
  }

  const toggleTreeNode = (node) => {
    selectedPassiveNode = node;
    const state = togglePassiveNode({ passiveNodes }, node);
    passiveNodes = state.passiveNodes;
    renderPassiveNodeList(passiveTree, passiveNodes, toggleTreeNode);
    update();
  };

  renderPassiveTreeSvg(passiveTree, passiveNodes, toggleTreeNode);
  renderPassiveNodeList(passiveTree, passiveNodes, toggleTreeNode);
  renderCharacterEquipment(equipmentState, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE, openEquipmentModal);
  wirePassiveTreePan(document.querySelector(".passive-tree-surface"), document.getElementById("passive-tree-svg"));

  document.getElementById("passive-search")?.addEventListener("input", () => {
    renderPassiveNodeList(passiveTree, passiveNodes, toggleTreeNode);
    updatePassiveSearchState(passiveTree);
  });
  classSelect?.addEventListener("change", () => {
    refreshAscendancies();
    const classEntry = passiveTree.classes.find((entry) => entry.name === classSelect.value);
    const startNode = passiveTree.nodes.find((node) => node.id === String(classEntry?.startingNode));
    if (startNode) {
      selectedPassiveNode = startNode;
      focusPassiveTreeNode(startNode, 0.24);
    }
  });
  ascendancySelect?.addEventListener("change", () => {
    const match = passiveTree.nodes.find((node) => node.ascendancyName === ascendancySelect.value);
    if (match) {
      selectedPassiveNode = match;
      focusPassiveTreeNode(match, 0.18);
    }
  });
  document.getElementById("passive-zoom-in")?.addEventListener("click", () => zoomPassiveTree(0.72));
  document.getElementById("passive-zoom-out")?.addEventListener("click", () => zoomPassiveTree(1.28));
  document.querySelector(".passive-tree-surface")?.addEventListener("wheel", (event) => {
    event.preventDefault();
    const factor = Math.exp(event.deltaY * 0.0012);
    zoomPassiveTreeAtPoint(document.getElementById("passive-tree-svg"), factor, event.clientX, event.clientY);
  }, { passive: false });
  document.getElementById("passive-reset-view")?.addEventListener("click", resetPassiveTreeView);
  document.getElementById("add-skill")?.addEventListener("click", () => {
    const count = document.querySelectorAll("[data-skill-row]").length + 1;
    const card = createSkillCard(`skill-${count}`, catalog, { name: catalog.skillGems[count - 1]?.label ?? "" });
    skillList?.append(card);
    wireSkillCardSearch(card, catalog);
    update();
  });
  attachDynamicSearch(document.getElementById("equipment-base-search"), () => {
    return getEquipmentBaseEntriesForSlot(catalog, editingEquipmentSlot);
  }, "equipment-search-layer", () => {
    const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
    updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
  });
  document.getElementById("equipment-base-search")?.addEventListener("input", () => {
    const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
    updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
  });
  document.getElementById("equipment-increased-input")?.addEventListener("input", () => {
    const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
    updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
  });
  document.getElementById("equipment-more-input")?.addEventListener("input", () => {
    const slot = equipmentState.find((item) => item.id === editingEquipmentSlot);
    updateEquipmentModalTrade(slot, form.querySelector("#planner-league")?.value || DEFAULT_LEAGUE);
  });
  document.getElementById("add-equipment-affix")?.addEventListener("click", () => addAffixRow());
  document.getElementById("equipment-modal-save")?.addEventListener("click", saveEquipmentModal);
  document.getElementById("equipment-modal-close")?.addEventListener("click", closeEquipmentModal);
  document.querySelector("[data-close-equipment]")?.addEventListener("click", closeEquipmentModal);
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
