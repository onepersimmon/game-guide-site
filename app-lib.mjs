const MAPS_URL = "./data/maps.json";
const BUILDS_URL = "./data/builds.json";
const DEFAULT_LANGUAGE = "zh";
const SUPPORTED_LANGUAGES = ["zh", "en"];

const UI_COPY = {
  zh: {
    documentTitle: "POE2 开荒攻略站",
    documentDescription: "流放之路 2 地图攻略与 poe.ninja 热门 BD 本地缓存。",
    hero: {
      eyebrow: "POE2 Guide",
      title: "地图攻略 + 最新 BD",
      copy: "适合开荒时顺手查图、看奖励、盯热门流派。地图与 BD 都在站内展示，来源由爬虫同步后本地缓存。",
      mapsLoading: "0 张地图",
      buildsLoading: "BD 数据加载中",
    },
    tabs: {
      label: "内容切换",
      maps: "地图攻略",
      builds: "最新 BD",
    },
    maps: {
      kicker: "精选地图",
      title: "地图攻略与掉落标注",
      copy: "收录公开可验证的地图、路线和奖励信息，方便开荒时按掉落类型筛选。",
      count: (count) => `${count} 张地图`,
      empty: "这个筛选下还没有地图，换一个标签试试。",
      route: "路线",
      checkpoints: "关键点",
      source: "爬取来源",
      cached: "本地缓存",
    },
    builds: {
      kicker: "Poe Ninja",
      title: "当前热门 BD 趋势",
      copy: "展示当前联赛最热升华与占比趋势，数据由爬虫同步到本地后直接展示。",
      top: "主联赛最热",
      tracked: "当前收录",
      trackedTitle: "热门 BD 卡片",
      updated: "最后同步",
      autoRefresh: "自动刷新",
      empty: "BD 数据还没同步到本地。",
      cached: "本地缓存",
    },
    filters: {
      all: "全部",
      quest: "任务物",
      currency: "通货",
      skill: "技能宝石",
      permanent: "永久奖励",
    },
    updated: {
      fallback: "BD 数据待同步",
      prefix: "BD 更新于 ",
    },
    error: "数据加载失败，请稍后再试。",
  },
  en: {
    documentTitle: "POE2 Campaign Guide",
    documentDescription: "Path of Exile 2 map notes and cached poe.ninja build trends.",
    hero: {
      eyebrow: "POE2 Guide",
      title: "Maps + Current Builds",
      copy: "A campaign companion for checking routes, rewards, and popular builds. Maps and build trends are crawled into local data instead of sending you away.",
      mapsLoading: "0 maps",
      buildsLoading: "Build data loading",
    },
    tabs: {
      label: "Content switcher",
      maps: "Maps",
      builds: "Builds",
    },
    maps: {
      kicker: "Selected Maps",
      title: "Map Notes and Drop Labels",
      copy: "Locally cached map routes, checkpoints, and rewards from verifiable public sources.",
      count: (count) => `${count} maps`,
      empty: "No maps match this filter yet. Try another tag.",
      route: "Route",
      checkpoints: "Checkpoints",
      source: "Crawled source",
      cached: "Local cache",
    },
    builds: {
      kicker: "Poe Ninja",
      title: "Current Build Trends",
      copy: "The site shows league ascendancy trends after the crawler syncs them into local data.",
      top: "Top league build",
      tracked: "Tracked cards",
      trackedTitle: "Popular build cards",
      updated: "Last sync",
      autoRefresh: "Auto refresh",
      empty: "Build data has not been synced locally yet.",
      cached: "Local cache",
    },
    filters: {
      all: "All",
      quest: "Quest Item",
      currency: "Currency",
      skill: "Skill Gem",
      permanent: "Permanent Reward",
    },
    updated: {
      fallback: "Build data pending sync",
      prefix: "Builds updated ",
    },
    error: "Failed to load local data. Please try again later.",
  },
};

function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
}

export function getUiCopy(language = DEFAULT_LANGUAGE) {
  return UI_COPY[normalizeLanguage(language)];
}

function localizeObject(entity, language, keys) {
  const normalizedLanguage = normalizeLanguage(language);
  const localized = entity.localized?.[normalizedLanguage] ?? entity.localized?.[DEFAULT_LANGUAGE] ?? {};
  const result = { ...entity };

  keys.forEach((key) => {
    if (localized[key] !== undefined) {
      result[key] = localized[key];
    }
  });

  return result;
}

export function getLocalizedMap(map, language = DEFAULT_LANGUAGE) {
  return localizeObject(map, language, [
    "name",
    "act",
    "region",
    "summary",
    "drops",
    "tags",
    "route",
    "checkpoints",
  ]);
}

export function getLocalizedBuild(build, language = DEFAULT_LANGUAGE) {
  return localizeObject(build, language, [
    "className",
    "leagueName",
    "summary",
    "tags",
  ]);
}

export function filterMapsByTag(maps, tag) {
  if (tag === "all") {
    return maps;
  }

  return maps.filter((map) => map.tags.includes(tag));
}

export function formatUpdatedLabel(updatedAt, language = DEFAULT_LANGUAGE) {
  const copy = getUiCopy(language).updated;
  if (!updatedAt) {
    return copy.fallback;
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return copy.fallback;
  }

  const locale = normalizeLanguage(language) === "en" ? "en-US" : "zh-CN";
  return `${copy.prefix}${date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function createFilterButton(tag, activeTag) {
  return `
    <button
      type="button"
      class="filter-chip ${tag.value === activeTag ? "is-active" : ""}"
      data-filter-tag="${tag.value}"
    >
      ${tag.label}
    </button>
  `;
}

export function renderMapCard(map, language = DEFAULT_LANGUAGE) {
  const copy = getUiCopy(language).maps;
  const localizedMap = getLocalizedMap(map, language);
  const dropList = localizedMap.drops
    .map((drop) => `<span class="drop-pill">${drop}</span>`)
    .join("");
  const tags = localizedMap.tags.map((tag) => `<span class="badge">${tag}</span>`).join("");
  const checkpoints = localizedMap.checkpoints
    .map((checkpoint) => `<li>${checkpoint}</li>`)
    .join("");

  return `
    <article class="map-card">
      <div class="map-card__image">
        <img src="${map.image}" alt="${localizedMap.name}" loading="lazy" />
      </div>
      <div class="map-card__header">
        <div>
          <h3>${localizedMap.name}</h3>
          <p>${localizedMap.act} · ${localizedMap.region}</p>
        </div>
        <div class="badge-stack">${tags}</div>
      </div>
      <p>${localizedMap.summary}</p>
      <div class="drop-list">${dropList}</div>
      <div class="detail-block">
        <strong>${copy.route}</strong>
        <p>${localizedMap.route}</p>
      </div>
      <div class="detail-block">
        <strong>${copy.checkpoints}</strong>
        <ul class="checkpoint-list">${checkpoints}</ul>
      </div>
      <div class="source-note">
        ${copy.source}: ${map.sourceName} · ${copy.cached}
      </div>
    </article>
  `;
}

export function renderBuildCard(build, language = DEFAULT_LANGUAGE) {
  const copy = getUiCopy(language).builds;
  const localizedBuild = getLocalizedBuild(build, language);
  const meta = localizedBuild.tags
    .map((tag) => `<span class="build-tag">${tag}</span>`)
    .join("");

  return `
    <article class="build-card">
      <div class="build-card__image">
        <img src="${build.image}" alt="${localizedBuild.className}" loading="lazy" />
      </div>
      <div class="build-card__header">
        <div>
          <h3>${localizedBuild.className}</h3>
          <p>${localizedBuild.leagueName}</p>
        </div>
        <div class="build-tag">${build.popularity}%</div>
      </div>
      <p>${localizedBuild.summary}</p>
      <div class="build-meta">${meta}</div>
      <div class="source-note">${copy.cached}: poe.ninja</div>
    </article>
  `;
}

function filterOptionsFor(language) {
  const filters = getUiCopy(language).filters;
  return [
    { value: "all", label: filters.all },
    { value: "任务物", label: filters.quest },
    { value: "通货", label: filters.currency },
    { value: "技能宝石", label: filters.skill },
    { value: "永久奖励", label: filters.permanent },
  ];
}

function renderSummaryCards(buildsPayload, language) {
  const copy = getUiCopy(language).builds;
  const summaryRoot = document.querySelector("#builds-summary");
  const topBuild = buildsPayload.builds[0]
    ? getLocalizedBuild(buildsPayload.builds[0], language)
    : null;
  const totalTracked = buildsPayload.builds.length;
  const updated = formatUpdatedLabel(buildsPayload.updatedAt, language)
    .replace(getUiCopy(language).updated.prefix, "");

  summaryRoot.innerHTML = `
    <article class="summary-card">
      <p>${copy.top}</p>
      <h3>${topBuild ? topBuild.className : copy.empty}</h3>
      <strong>${topBuild ? `${buildsPayload.builds[0].popularity}%` : "--"}</strong>
    </article>
    <article class="summary-card">
      <p>${copy.tracked}</p>
      <h3>${copy.trackedTitle}</h3>
      <strong>${totalTracked}</strong>
    </article>
    <article class="summary-card">
      <p>${copy.updated}</p>
      <h3>${copy.autoRefresh}</h3>
      <strong>${updated}</strong>
    </article>
  `;
}

function renderMaps(state) {
  const mapsGrid = document.querySelector("#maps-grid");
  const filtersRoot = document.querySelector("#map-filters");
  const copy = getUiCopy(state.language).maps;
  const filteredMaps = filterMapsByTag(state.maps, state.activeTag);

  filtersRoot.innerHTML = filterOptionsFor(state.language)
    .map((tag) => createFilterButton(tag, state.activeTag))
    .join("");

  mapsGrid.innerHTML = filteredMaps.length
    ? filteredMaps.map((map) => renderMapCard(map, state.language)).join("")
    : `<div class="empty-state">${copy.empty}</div>`;
}

function renderBuilds(buildsPayload, language) {
  const buildsGrid = document.querySelector("#builds-grid");
  const copy = getUiCopy(language).builds;
  renderSummaryCards(buildsPayload, language);
  buildsGrid.innerHTML = buildsPayload.builds.length
    ? buildsPayload.builds.map((build) => renderBuildCard(build, language)).join("")
    : `<div class="empty-state">${copy.empty}</div>`;
}

function translateShell(language) {
  const copy = getUiCopy(language);
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  document.title = copy.documentTitle;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", copy.documentDescription);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = element.dataset.i18n
      .split(".")
      .reduce((current, key) => current?.[key], copy);
    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  const tabbar = document.querySelector(".tabbar");
  if (tabbar) {
    tabbar.setAttribute("aria-label", copy.tabs.label);
  }
}

function renderApp(state) {
  translateShell(state.language);
  renderMaps(state);
  renderBuilds(state.buildsPayload, state.language);

  document.querySelector("#maps-count").textContent = getUiCopy(state.language).maps.count(
    state.maps.length,
  );
  document.querySelector("#builds-updated").textContent = formatUpdatedLabel(
    state.buildsPayload.updatedAt,
    state.language,
  );
}

function setupTabs() {
  const buttons = document.querySelectorAll("[data-tab-button]");
  const panels = document.querySelectorAll("[data-tab-panel]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tabButton;

      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      panels.forEach((panel) => {
        const active = panel.dataset.tabPanel === target;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    });
  });
}

function setupLanguageSwitcher(state) {
  const switcher = document.querySelector("[data-language-switcher]");
  if (!switcher) {
    return;
  }

  switcher.querySelectorAll("[data-language]").forEach((item) => {
    const active = item.dataset.language === state.language;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });

  switcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language]");
    if (!button) {
      return;
    }

    state.language = normalizeLanguage(button.dataset.language);
    localStorage.setItem("poe2-guide-language", state.language);
    switcher.querySelectorAll("[data-language]").forEach((item) => {
      const active = item.dataset.language === state.language;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderApp(state);
  });
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

export function readEmbeddedJson(scriptId) {
  const element = document.querySelector(`#${scriptId}`);
  if (!element?.textContent) {
    throw new Error(`Missing embedded JSON: ${scriptId}`);
  }

  return JSON.parse(element.textContent);
}

async function loadAppData() {
  if (window.location.protocol === "file:") {
    return {
      maps: readEmbeddedJson("maps-data"),
      buildsPayload: readEmbeddedJson("builds-data"),
    };
  }

  const [maps, buildsPayload] = await Promise.all([
    loadJson(MAPS_URL),
    loadJson(BUILDS_URL),
  ]);

  return { maps, buildsPayload };
}

async function initApp() {
  setupTabs();

  const state = {
    activeTag: "all",
    language: normalizeLanguage(localStorage.getItem("poe2-guide-language") ?? DEFAULT_LANGUAGE),
    maps: [],
    buildsPayload: { updatedAt: null, builds: [] },
  };

  setupLanguageSwitcher(state);

  try {
    const { maps, buildsPayload } = await loadAppData();
    state.maps = maps;
    state.buildsPayload = buildsPayload;
    renderApp(state);

    document.querySelector("#map-filters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter-tag]");
      if (!button) {
        return;
      }

      state.activeTag = button.dataset.filterTag;
      renderMaps(state);
    });
  } catch (error) {
    const message = `<div class="empty-state">${getUiCopy(state.language).error}</div>`;
    document.querySelector("#maps-grid").innerHTML = message;
    document.querySelector("#builds-grid").innerHTML = message;
    document.querySelector("#builds-summary").innerHTML = message;
    console.error(error);
  }
}

if (typeof document !== "undefined") {
  initApp();
}
