const MAPS_URL = "./data/maps.json";
const BUILDS_URL = "./data/builds.json";
const WORLD_MAPS_URL = "./data/world-maps.json";
const ASCENDANCIES_URL = "./data/ascendancies.json";
const DEFAULT_LANGUAGE = "zh";
const SUPPORTED_LANGUAGES = ["zh", "en"];

const UI_COPY = {
  zh: {
    documentTitle: "POE2 开荒攻略站",
    documentDescription: "流放之路 2 开荒地图、升华职业预览与 poe.ninja 热门 BD 本地缓存。",
    hero: {
      eyebrow: "POE2 Guide",
      title: "开荒攻略 + 职业预览 + 最新 BD",
      copy: "适合开荒时顺手查章节地图、奖励掉落、升华差异和忍者网热门职业排行。核心数据由爬虫同步后本地缓存。",
      mapsLoading: "0 张地图",
      buildsLoading: "BD 数据加载中",
    },
    tabs: {
      label: "内容切换",
      world: "开荒攻略",
      classes: "职业预览",
      builds: "最新 BD",
    },
    world: {
      kicker: "章节总览",
      title: "开荒地图与编号掉落",
      copy: "按章节/上下层查看完整世界地图，右侧对应图中编号列出奖励、掉落和永久能力。",
      count: (worldCount, classCount) => `${worldCount} 张世界图 / ${classCount} 个升华`,
      rewards: "对应掉落",
      source: "来源",
      nodes: "编号",
    },
    classes: {
      kicker: "PoE2DB 编年史",
      title: "职业升华差异预览",
      copy: "按基础职业查看已开放升华，卡片内列出编年史爬取到的关键升华天赋效果。",
      empty: "这个职业暂时没有开放升华。",
      source: "爬取来源",
      notables: "关键升华天赋",
      open: "打开编年史",
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
      title: "当前职业热度排行",
      copy: "展示当前联赛 poe.ninja 职业占比排行，卡片可直接跳转到忍者网对应职业筛选。",
      top: "主联赛最热",
      tracked: "当前收录",
      trackedTitle: "职业排行",
      updated: "最后同步",
      autoRefresh: "自动刷新",
      empty: "BD 数据还没同步到本地。",
      cached: "本地缓存",
      open: "查看忍者网",
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
    documentDescription: "Path of Exile 2 campaign maps, ascendancy previews, and cached poe.ninja build trends.",
    hero: {
      eyebrow: "POE2 Guide",
      title: "Campaign Guide + Classes + Current Builds",
      copy: "A campaign companion for checking chapter maps, rewards, ascendancy differences, and poe.ninja class rankings from locally cached crawler data.",
      mapsLoading: "0 maps",
      buildsLoading: "Build data loading",
    },
    tabs: {
      label: "Content switcher",
      world: "Campaign Guide",
      classes: "Class Preview",
      builds: "Builds",
    },
    world: {
      kicker: "Campaign Atlas",
      title: "World Maps and Numbered Rewards",
      copy: "Switch by chapter and layer. The reward list mirrors the numbered markers on each overview map.",
      count: (worldCount, classCount) => `${worldCount} world maps / ${classCount} ascendancies`,
      rewards: "Rewards",
      source: "Source",
      nodes: "Nodes",
    },
    classes: {
      kicker: "PoE2DB Chronicle",
      title: "Ascendancy Class Preview",
      copy: "Browse each base class and its unlocked ascendancies. Key notable effects are crawled from PoE2DB.",
      empty: "No ascendancy is currently listed for this class.",
      source: "Crawled source",
      notables: "Key ascendancy notables",
      open: "Open PoE2DB",
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
      title: "Current Class Ranking",
      copy: "Current poe.ninja class share ranking, with each card linking to that class filter on poe.ninja.",
      top: "Top league build",
      tracked: "Tracked cards",
      trackedTitle: "Class ranking",
      updated: "Last sync",
      autoRefresh: "Auto refresh",
      empty: "Build data has not been synced locally yet.",
      cached: "Local cache",
      open: "Open poe.ninja",
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

function getUiCopy(language = DEFAULT_LANGUAGE) {
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

function getLocalizedMap(map, language = DEFAULT_LANGUAGE) {
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

function getLocalizedBuild(build, language = DEFAULT_LANGUAGE) {
  return localizeObject(build, language, [
    "className",
    "leagueName",
    "summary",
    "tags",
  ]);
}

function getLocalizedAscendancyClass(ascendancyClass, language = DEFAULT_LANGUAGE) {
  return localizeObject(ascendancyClass, language, ["name"]);
}

function getLocalizedAscendancy(ascendancy, language = DEFAULT_LANGUAGE) {
  return localizeObject(ascendancy, language, ["name"]);
}

function getLocalizedNotable(notable, language = DEFAULT_LANGUAGE) {
  return localizeObject(notable, language, ["name", "effect"]);
}

function countAscendancies(payload) {
  return payload.classes.reduce(
    (total, ascendancyClass) => total + ascendancyClass.ascendancies.length,
    0,
  );
}

function filterMapsByTag(maps, tag) {
  if (tag === "all") {
    return maps;
  }

  return maps.filter((map) => map.tags.includes(tag));
}

function formatUpdatedLabel(updatedAt, language = DEFAULT_LANGUAGE) {
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

function renderMapCard(map, language = DEFAULT_LANGUAGE) {
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

function renderBuildCard(build, language = DEFAULT_LANGUAGE) {
  const copy = getUiCopy(language).builds;
  const localizedBuild = getLocalizedBuild(build, language);
  const meta = localizedBuild.tags
    .map((tag) => `<span class="build-tag">${tag}</span>`)
    .join("");

  return `
    <a class="build-card build-card--link" href="${build.href}" target="_blank" rel="noopener">
      <div class="build-card__image">
        <img src="${build.image}" alt="${localizedBuild.className}" loading="lazy" />
      </div>
      <div class="build-card__header">
        <div>
          <span class="rank-label">#${build.rank ?? "-"}</span>
          <h3>${localizedBuild.className}</h3>
          <p>${localizedBuild.leagueName} · ${build.className}</p>
        </div>
        <div class="build-tag">${build.popularity}%</div>
      </div>
      <p>${localizedBuild.summary}</p>
      <div class="build-meta">${meta}</div>
      <div class="source-note">${copy.open}: poe.ninja</div>
    </a>
  `;
}

function renderAscendancyCard(ascendancy, language) {
  const copy = getUiCopy(language).classes;
  const localizedAscendancy = getLocalizedAscendancy(ascendancy, language);
  const notables = ascendancy.notables.length
    ? ascendancy.notables
      .map((notable) => {
        const localizedNotable = getLocalizedNotable(notable, language);
        return `
          <li>
            <strong>${localizedNotable.name}</strong>
            <span>${localizedNotable.effect}</span>
          </li>
        `;
      })
      .join("")
    : `<li><span>${copy.empty}</span></li>`;

  return `
    <article class="ascendancy-card">
      <div class="ascendancy-card__head">
        <img src="${ascendancy.image}" alt="${localizedAscendancy.name}" loading="lazy" />
        <div>
          <h3>${localizedAscendancy.name}</h3>
          <p>${ascendancy.englishName}</p>
        </div>
      </div>
      <div class="detail-block">
        <strong>${copy.notables}</strong>
        <ul class="ascendancy-notables">${notables}</ul>
      </div>
      <a class="source-note source-note--link" href="${ascendancy.sourceUrl}" target="_blank" rel="noopener">${copy.open}</a>
    </article>
  `;
}

function renderAscendancyClassCard(ascendancyClass, language) {
  const copy = getUiCopy(language).classes;
  const localizedClass = getLocalizedAscendancyClass(ascendancyClass, language);
  const ascendancies = ascendancyClass.ascendancies.length
    ? ascendancyClass.ascendancies
      .map((ascendancy) => renderAscendancyCard(ascendancy, language))
      .join("")
    : `<div class="empty-state">${copy.empty}</div>`;

  return `
    <section class="class-preview-card">
      <div class="class-preview-card__header">
        <img src="${ascendancyClass.image}" alt="${localizedClass.name}" loading="lazy" />
        <div>
          <p>${ascendancyClass.englishName}</p>
          <h3>${localizedClass.name}</h3>
        </div>
      </div>
      <div class="ascendancy-grid">${ascendancies}</div>
    </section>
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

function renderClasses(state) {
  const classesGrid = document.querySelector("#classes-grid");
  if (!classesGrid) {
    return;
  }

  classesGrid.innerHTML = state.ascendancies.classes
    .map((ascendancyClass) => renderAscendancyClassCard(ascendancyClass, state.language))
    .join("");
}

function renderBuilds(buildsPayload, language) {
  const buildsGrid = document.querySelector("#builds-grid");
  const copy = getUiCopy(language).builds;
  renderSummaryCards(buildsPayload, language);
  buildsGrid.innerHTML = buildsPayload.builds.length
    ? buildsPayload.builds.map((build) => renderBuildCard(build, language)).join("")
    : `<div class="empty-state">${copy.empty}</div>`;
}

function renderWorldMapTabs(state) {
  const tabsRoot = document.querySelector("#world-map-tabs");
  tabsRoot.innerHTML = state.worldMaps.maps
    .map((map, index) => `
      <button
        type="button"
        class="world-map-tab ${index === state.activeWorldMapIndex ? "is-active" : ""}"
        data-world-map-index="${index}"
      >
        <strong>${map.chapter}</strong>
        <span>${map.layer}</span>
      </button>
    `)
    .join("");
}

function renderWorldMapView(state) {
  const viewRoot = document.querySelector("#world-map-view");
  const copy = getUiCopy(state.language).world;
  const map = state.worldMaps.maps[state.activeWorldMapIndex] ?? state.worldMaps.maps[0];
  if (!map) {
    viewRoot.innerHTML = `<div class="empty-state">${getUiCopy(state.language).error}</div>`;
    return;
  }

  const rewards = map.rewards
    .map((reward) => `
      <li class="world-reward">
        <span class="world-reward__node">${reward.node}</span>
        <div>
          <strong>${reward.area}</strong>
          <p>${reward.reward}</p>
          <small>${reward.detail}</small>
        </div>
      </li>
    `)
    .join("");

  viewRoot.innerHTML = `
    <div class="world-map-viewer">
      <figure class="world-map-figure">
        <img src="${map.image}" alt="${map.title}" loading="eager" />
        <figcaption>${map.title} · ${copy.nodes} ${map.nodeRange}</figcaption>
      </figure>
      <aside class="world-rewards-panel">
        <div class="world-rewards-panel__header">
          <p>${copy.rewards}</p>
          <h3>${map.chapter} · ${map.layer}</h3>
        </div>
        <ol class="world-reward-list">${rewards}</ol>
        <div class="source-note">${copy.source}: ${state.worldMaps.source.name}</div>
      </aside>
    </div>
  `;
}

function renderWorldMaps(state) {
  renderWorldMapTabs(state);
  renderWorldMapView(state);
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
  renderWorldMaps(state);
  renderClasses(state);
  renderBuilds(state.buildsPayload, state.language);

  document.querySelector("#maps-count").textContent = getUiCopy(state.language).world.count(
    state.worldMaps.maps.length,
    countAscendancies(state.ascendancies),
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

function readEmbeddedJson(scriptId) {
  const element = document.querySelector(`#${scriptId}`);
  if (!element?.textContent) {
    throw new Error(`Missing embedded JSON: ${scriptId}`);
  }

  return JSON.parse(element.textContent);
}

async function loadAppData() {
  if (window.location.protocol === "file:") {
    return {
      worldMaps: readEmbeddedJson("world-maps-data"),
      ascendancies: readEmbeddedJson("ascendancies-data"),
      buildsPayload: readEmbeddedJson("builds-data"),
    };
  }

  const [worldMaps, ascendancies, buildsPayload] = await Promise.all([
    loadJson(WORLD_MAPS_URL),
    loadJson(ASCENDANCIES_URL),
    loadJson(BUILDS_URL),
  ]);

  return { worldMaps, ascendancies, buildsPayload };
}

async function initApp() {
  setupTabs();

  const state = {
    activeTag: "all",
    activeWorldMapIndex: 0,
    language: normalizeLanguage(localStorage.getItem("poe2-guide-language") ?? DEFAULT_LANGUAGE),
    worldMaps: { source: { name: "" }, maps: [] },
    ascendancies: { source: { name: "" }, classes: [] },
    buildsPayload: { updatedAt: null, builds: [] },
  };

  setupLanguageSwitcher(state);

  try {
    const { worldMaps, ascendancies, buildsPayload } = await loadAppData();
    state.worldMaps = worldMaps;
    state.ascendancies = ascendancies;
    state.buildsPayload = buildsPayload;
    renderApp(state);

    document.querySelector("#world-map-tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-world-map-index]");
      if (!button) {
        return;
      }

      state.activeWorldMapIndex = Number(button.dataset.worldMapIndex);
      renderWorldMaps(state);
    });

  } catch (error) {
    const message = `<div class="empty-state">${getUiCopy(state.language).error}</div>`;
    document.querySelector("#world-map-view").innerHTML = message;
    document.querySelector("#classes-grid").innerHTML = message;
    document.querySelector("#builds-grid").innerHTML = message;
    document.querySelector("#builds-summary").innerHTML = message;
    console.error(error);
  }
}

if (typeof document !== "undefined") {
  initApp();
}
