#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getUiCopy,
  getLocalizedBuild,
  getLocalizedWorldMap,
  getLocalizedWorldMapSource,
  renderBuildCard,
} from "../app-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "https://poe2.ve-city.com";
const CONTACT_EMAIL = "onepersimmon@163.com";
const DATA_PATHS = {
  worldMaps: path.join(ROOT, "data", "world-maps.json"),
  ascendancies: path.join(ROOT, "data", "ascendancies.json"),
  builds: path.join(ROOT, "data", "builds.json"),
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function localizeObject(entity, language, keys) {
  const localized = entity.localized?.[language] ?? entity.localized?.zh ?? {};
  const result = { ...entity };

  keys.forEach((key) => {
    if (localized[key] !== undefined) {
      result[key] = localized[key];
    }
  });

  return result;
}

function getLocalizedAscendancyClass(ascendancyClass, language) {
  return localizeObject(ascendancyClass, language, ["name"]);
}

function getLocalizedAscendancy(ascendancy, language) {
  return localizeObject(ascendancy, language, ["name"]);
}

function getLocalizedNotable(notable, language) {
  return localizeObject(notable, language, ["name", "effect"]);
}

function assetHref(assetPath, relativeRoot) {
  if (!assetPath || /^https?:\/\//.test(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith("./")) {
    return `${relativeRoot}${assetPath.slice(2)}`;
  }

  return assetPath;
}

function assetAbsoluteUrl(assetPath) {
  if (!assetPath || /^https?:\/\//.test(assetPath)) {
    return assetPath;
  }

  return `${BASE_URL}/${assetPath.replace(/^\.\//, "")}`;
}

function outputForUrl(urlPath) {
  const normalized = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  return path.join(ROOT, normalized);
}

function relativeRootFor(urlPath) {
  return urlPath.startsWith("/campaign/") || urlPath.startsWith("/classes/") || urlPath.startsWith("/builds/")
    ? "../"
    : "./";
}

function dateLabel(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(language === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderLanguageSwitcher() {
  return `
    <div class="language-switcher" data-page-language-switcher aria-label="Language">
      <button class="is-active" type="button" data-page-language="zh" aria-pressed="true">中</button>
      <button type="button" data-page-language="en" aria-pressed="false">EN</button>
    </div>
  `;
}

function renderPageShell({
  urlPath,
  titleZh,
  titleEn,
  descriptionZh,
  descriptionEn,
  bodyZh,
  bodyEn,
  jsonLdZh,
  jsonLdEn,
  homeHref,
}) {
  const relativeRoot = relativeRootFor(urlPath);
  const stylesheetHref = `${relativeRoot}styles.css`;
  const htmlLang = "zh-CN";
  const canonicalUrl = `${BASE_URL}${urlPath}`;
  const headTitle = escapeHtml(titleZh);
  const headDescription = escapeHtml(descriptionZh);
  const footerLinks = [
    { href: `${relativeRoot}about.html`, label: "关于 / About" },
    { href: `${relativeRoot}contact.html`, label: "联系 / Contact" },
    { href: `${relativeRoot}privacy.html`, label: "隐私 / Privacy" },
    { href: `${relativeRoot}disclaimer.html`, label: "声明 / Disclaimer" },
  ];

  return `<!doctype html>
<html lang="${htmlLang}" data-page-language="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${headTitle}</title>
    <meta name="description" content="${headDescription}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="stylesheet" href="${stylesheetHref}" />
    <style>
      .static-page {
        display: grid;
        gap: 22px;
      }
      .static-top {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }
      .static-top__meta {
        display: grid;
        gap: 8px;
      }
      .static-top__meta p {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
      }
      .static-page-main {
        display: grid;
        gap: 22px;
      }
      .static-lang-block {
        display: grid;
        gap: 18px;
      }
      .static-lang-block[hidden] {
        display: none;
      }
      .static-lang-head {
        display: grid;
        gap: 8px;
      }
      .static-lang-head h1 {
        margin: 0;
        line-height: 1.05;
        font-size: clamp(28px, 3vw, 42px);
      }
      .static-lang-head p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .static-breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--muted);
        font-size: 13px;
      }
      .static-breadcrumbs a {
        color: var(--blue);
        text-decoration: none;
      }
      .static-breadcrumbs span {
        color: var(--muted);
      }
      .static-section {
        display: grid;
        gap: 16px;
      }
      .static-section__title {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 10px;
        align-items: baseline;
      }
      .static-section__title h2 {
        margin: 0;
      }
      .static-section__title p {
        margin: 0;
        color: var(--muted);
      }
      .static-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .static-footer-links {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <div class="app-shell static-page">
      <header class="static-top">
        <div class="static-top__meta">
          <p class="eyebrow">POE2 Guide</p>
          <div class="static-links">
            <a class="source-note source-note--link" href="${homeHref}">返回首页 / Home</a>
          </div>
        </div>
        ${renderLanguageSwitcher()}
      </header>

      <main class="static-page-main">
        <section class="static-lang-block" data-lang-block="zh">
          ${bodyZh}
        </section>
        <section class="static-lang-block" data-lang-block="en" hidden>
          ${bodyEn}
        </section>
      </main>

      <footer class="site-footer">
        <p>声明：纠错或优化建议请联系 <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
        <div class="static-footer-links">
          ${footerLinks.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
        </div>
      </footer>
    </div>

    <script type="application/ld+json">${escapeJson(jsonLdZh)}</script>
    <script type="application/ld+json">${escapeJson(jsonLdEn)}</script>
    <script>
      (() => {
        const key = "poe2-guide-language";
        const buttons = document.querySelectorAll("[data-page-language]");
        const blocks = document.querySelectorAll("[data-lang-block]");

        const applyLanguage = (language) => {
          const active = language === "en" ? "en" : "zh";
          document.documentElement.lang = active === "en" ? "en" : "zh-CN";
          localStorage.setItem(key, active);
          buttons.forEach((button) => {
            const selected = button.dataset.pageLanguage === active;
            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
          });
          blocks.forEach((block) => {
            block.hidden = block.dataset.langBlock !== active;
          });
        };

        applyLanguage(localStorage.getItem(key) === "en" ? "en" : "zh");

        document.querySelector("[data-page-language-switcher]")?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-page-language]");
          if (!button) {
            return;
          }

          applyLanguage(button.dataset.pageLanguage);
        });
      })();
    </script>
  </body>
</html>`;
}

function renderBreadcrumbs(language, items) {
  return `
    <nav class="static-breadcrumbs" aria-label="${language === "en" ? "Breadcrumbs" : "面包屑"}">
      ${items
        .map((item, index) => {
          const label = language === "en" ? item.labelEn : item.labelZh;
          if (item.href) {
            return `<a href="${item.href}">${escapeHtml(label)}</a>${index < items.length - 1 ? "<span>/</span>" : ""}`;
          }

          return `<span>${escapeHtml(label)}</span>${index < items.length - 1 ? "<span>/</span>" : ""}`;
        })
        .join("")}
    </nav>
  `;
}

function renderWorldMapBody(map, language, worldMapsPayload) {
  const localizedMap = getLocalizedWorldMap(map, language);
  const localizedSource = getLocalizedWorldMapSource(worldMapsPayload.source, language);
  const copy = getUiCopy(language).world;
  const rewardItems = localizedMap.rewards
    .map((reward) => `
      <li class="world-reward">
        <span class="world-reward__node">${escapeHtml(reward.node)}</span>
        <div>
          <strong>${escapeHtml(reward.area)}</strong>
          <p>${escapeHtml(reward.reward)}</p>
          <small>${escapeHtml(reward.detail)}</small>
        </div>
      </li>
    `)
    .join("");

  return `
    ${renderBreadcrumbs(language, [
      { labelZh: "首页", labelEn: "Home", href: "../index.html" },
      { labelZh: "开荒攻略", labelEn: "Campaign Guide" },
      { labelZh: map.chapter, labelEn: localizedMap.chapter },
      { labelZh: map.layer, labelEn: localizedMap.layer },
    ])}
    <article class="static-section">
      <div class="static-lang-head">
        <p class="section-kicker">${escapeHtml(copy.kicker)}</p>
        <h1>${escapeHtml(localizedMap.title)}</h1>
        <p>${escapeHtml(copy.copy)}</p>
      </div>

      <div class="world-map-viewer">
        <figure class="world-map-figure">
          <img src="${escapeHtml(assetHref(map.image, "../"))}" alt="${escapeHtml(localizedMap.title)}" />
          <figcaption>${escapeHtml(localizedMap.title)} · ${escapeHtml(copy.nodes)} ${escapeHtml(map.nodeRange)}</figcaption>
        </figure>
        <aside class="world-rewards-panel">
          <div class="world-rewards-panel__header">
            <p>${escapeHtml(copy.rewards)}</p>
            <h3>${escapeHtml(localizedMap.chapter)} · ${escapeHtml(localizedMap.layer)}</h3>
          </div>
          <ol class="world-reward-list">${rewardItems}</ol>
          <div class="detail-block">
            <strong>${escapeHtml(copy.source)}</strong>
            <p>${escapeHtml(localizedSource.name)}</p>
            <a class="source-note source-note--link" href="${escapeHtml(map.sourcePageUrl)}" target="_blank" rel="noopener">${language === "en" ? "Open source page" : "打开来源页面"}</a>
          </div>
        </aside>
      </div>
    </article>
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
            <strong>${escapeHtml(localizedNotable.name)}</strong>
            <span>${escapeHtml(localizedNotable.effect)}</span>
          </li>
        `;
      })
      .join("")
    : `<li><span>${escapeHtml(copy.empty)}</span></li>`;

  return `
    <article class="ascendancy-card">
      <div class="ascendancy-card__head">
        <img src="${escapeHtml(ascendancy.image)}" alt="${escapeHtml(localizedAscendancy.name)}" loading="lazy" />
        <div>
          <h3>${escapeHtml(localizedAscendancy.name)}</h3>
          <p>${escapeHtml(ascendancy.englishName)}</p>
        </div>
      </div>
      <div class="detail-block">
        <strong>${escapeHtml(copy.notables)}</strong>
        <ul class="ascendancy-notables">${notables}</ul>
      </div>
      <a class="source-note source-note--link" href="${escapeHtml(ascendancy.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(copy.open)}</a>
    </article>
  `;
}

function renderClassCard(ascendancyClass, language) {
  const copy = getUiCopy(language).classes;
  const localizedClass = getLocalizedAscendancyClass(ascendancyClass, language);
  const ascendancies = ascendancyClass.ascendancies.length
    ? ascendancyClass.ascendancies.map((ascendancy) => renderAscendancyCard(ascendancy, language)).join("")
    : `<div class="empty-state">${escapeHtml(copy.empty)}</div>`;

  return `
    <section class="class-preview-card">
      <div class="class-preview-card__header">
        <img src="${escapeHtml(ascendancyClass.image)}" alt="${escapeHtml(localizedClass.name)}" loading="lazy" />
        <div>
          <p>${escapeHtml(ascendancyClass.englishName)}</p>
          <h3>${escapeHtml(localizedClass.name)}</h3>
        </div>
      </div>
      <div class="ascendancy-grid">${ascendancies}</div>
      <a class="source-note source-note--link" href="${escapeHtml(ascendancyClass.sourceUrl)}" target="_blank" rel="noopener">${language === "en" ? "Open PoE2DB" : "打开编年史"}</a>
    </section>
  `;
}

function renderClassesBody(ascendanciesPayload, language) {
  const copy = getUiCopy(language).classes;
  const classes = ascendanciesPayload.classes
    .map((ascendancyClass) => renderClassCard(ascendancyClass, language))
    .join("");

  return `
    ${renderBreadcrumbs(language, [
      { labelZh: "首页", labelEn: "Home", href: "../index.html" },
      { labelZh: "职业预览", labelEn: "Class Preview" },
    ])}
    <article class="static-section">
      <div class="static-lang-head">
        <p class="section-kicker">${escapeHtml(copy.kicker)}</p>
        <h1>${escapeHtml(copy.title)}</h1>
        <p>${escapeHtml(copy.copy)}</p>
      </div>
      <div class="classes-grid">${classes}</div>
    </article>
  `;
}

function renderBuildsBody(buildsPayload, language) {
  const copy = getUiCopy(language).builds;
  const topBuild = buildsPayload.builds[0] ? getLocalizedBuild(buildsPayload.builds[0], language) : null;
  const updatedLabel = buildsPayload.updatedAt ? dateLabel(buildsPayload.updatedAt, language) : copy.empty;
  const summaryCards = [
    `
      <article class="summary-card">
        <p>${escapeHtml(copy.top)}</p>
        <h3>${escapeHtml(topBuild ? topBuild.className : copy.empty)}</h3>
        <strong>${escapeHtml(topBuild ? `${buildsPayload.builds[0].popularity}%` : "--")}</strong>
      </article>
    `,
    `
      <article class="summary-card">
        <p>${escapeHtml(copy.tracked)}</p>
        <h3>${escapeHtml(copy.trackedTitle)}</h3>
        <strong>${escapeHtml(buildsPayload.builds.length)}</strong>
      </article>
    `,
    `
      <article class="summary-card">
        <p>${escapeHtml(copy.updated)}</p>
        <h3>${escapeHtml(copy.autoRefresh)}</h3>
        <strong>${escapeHtml(updatedLabel)}</strong>
      </article>
    `,
  ].join("");

  const builds = [...buildsPayload.builds]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((build) => renderBuildCard({ ...build, image: assetHref(build.image, "../") }, language))
    .join("");

  return `
    ${renderBreadcrumbs(language, [
      { labelZh: "首页", labelEn: "Home", href: "../index.html" },
      { labelZh: "最新 BD", labelEn: "Build Rankings" },
    ])}
    <article class="static-section">
      <div class="static-lang-head">
        <p class="section-kicker">${escapeHtml(copy.kicker)}</p>
        <h1>${escapeHtml(copy.title)}</h1>
        <p>${escapeHtml(copy.copy)}</p>
      </div>
      <div class="builds-summary">${summaryCards}</div>
      <div class="build-grid">${builds}</div>
    </article>
  `;
}

function renderInfoBody(language, headingZh, headingEn, title, copy, paragraphs, bullets = []) {
  const renderedParagraphs = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const renderedBullets = bullets.length
    ? `<ul class="checkpoint-list">${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
    : "";

  return `
    ${renderBreadcrumbs(language, [
      { labelZh: "首页", labelEn: "Home", href: "./index.html" },
      { labelZh: title, labelEn: headingEn },
    ])}
    <article class="static-section">
      <div class="static-lang-head">
        <p class="section-kicker">${language === "en" ? headingEn : headingZh}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(copy)}</p>
      </div>
      <div class="detail-block">
        ${renderedParagraphs}
        ${renderedBullets}
      </div>
    </article>
  `;
}

function renderJsonLd({ title, description, urlPath, breadcrumbItems, image = null, datePublished = null, dateModified = null }) {
  const url = `${BASE_URL}${urlPath}`;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    mainEntityOfPage: url,
    url,
  };

  if (image) {
    article.image = [image];
  }

  if (datePublished) {
    article.datePublished = datePublished;
  }

  if (dateModified) {
    article.dateModified = dateModified;
  }

  return {
    zh: {
      "@context": "https://schema.org",
      "@graph": [
        article,
        {
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.labelZh,
            item: item.href ? `${BASE_URL}${item.href}` : url,
          })),
        },
      ],
    },
    en: {
      "@context": "https://schema.org",
      "@graph": [
        {
          ...article,
          headline: itemLabel(title, "en"),
          description: itemLabel(description, "en"),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.labelEn,
            item: item.href ? `${BASE_URL}${item.href}` : url,
          })),
        },
      ],
    },
  };
}

function itemLabel(text, language) {
  return language === "en" ? String(text).replace(/POE2 开荒攻略站/g, "POE2 Campaign Guide") : text;
}

async function writePage(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function buildPages({ worldMaps, ascendancies, buildsPayload }) {
  const pages = [];

  worldMaps.maps.forEach((map) => {
    const localizedMap = getLocalizedWorldMap(map, "zh");
    const localizedMapEn = getLocalizedWorldMap(map, "en");
    const urlPath = `/campaign/${map.id}.html`;
    const descriptions = {
      zh: `${localizedMap.title}，展示编号掉落、路线与来源信息。`,
      en: `${localizedMapEn.title}, with numbered rewards, route notes, and source links.`,
    };
    const breadcrumbs = [
      { labelZh: "首页", labelEn: "Home", href: "/" },
      { labelZh: "开荒攻略", labelEn: "Campaign Guide" },
      { labelZh: localizedMap.chapter, labelEn: localizedMapEn.chapter },
      { labelZh: localizedMap.layer, labelEn: localizedMapEn.layer },
    ];

    pages.push({
      urlPath,
      homeHref: "../index.html",
      titleZh: `${localizedMap.title} | POE2 开荒攻略站`,
      titleEn: `${localizedMapEn.title} | POE2 Campaign Guide`,
      descriptionZh: descriptions.zh,
      descriptionEn: descriptions.en,
      bodyZh: renderWorldMapBody(map, "zh", worldMaps),
      bodyEn: renderWorldMapBody(map, "en", worldMaps),
      jsonLdZh: renderJsonLd({
        title: `${localizedMap.title} | POE2 开荒攻略站`,
        description: descriptions.zh,
        urlPath,
        breadcrumbItems: breadcrumbs,
        image: assetAbsoluteUrl(map.image),
        datePublished: worldMaps.source?.capturedAt ?? null,
        dateModified: worldMaps.source?.capturedAt ?? null,
      }).zh,
      jsonLdEn: renderJsonLd({
        title: `${localizedMapEn.title} | POE2 Campaign Guide`,
        description: descriptions.en,
        urlPath,
        breadcrumbItems: breadcrumbs,
        image: assetAbsoluteUrl(map.image),
        datePublished: worldMaps.source?.capturedAt ?? null,
        dateModified: worldMaps.source?.capturedAt ?? null,
      }).en,
    });
  });

  pages.push({
    urlPath: "/classes/index.html",
    homeHref: "../index.html",
    titleZh: "职业预览 | POE2 开荒攻略站",
    titleEn: "Class Preview | POE2 Campaign Guide",
    descriptionZh: "流放之路 2 基础职业与升华差异预览，汇总 PoE2DB 编年史的关键升华效果。",
    descriptionEn: "Path of Exile 2 base class and ascendancy preview, compiled from PoE2DB Chronicle notes.",
    bodyZh: renderClassesBody(ascendancies, "zh"),
    bodyEn: renderClassesBody(ascendancies, "en"),
    jsonLdZh: renderJsonLd({
      title: "职业预览 | POE2 开荒攻略站",
      description: "流放之路 2 基础职业与升华差异预览，汇总 PoE2DB 编年史的关键升华效果。",
      urlPath: "/classes/index.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "职业预览", labelEn: "Class Preview" },
      ],
      datePublished: ascendancies.updatedAt ?? null,
      dateModified: ascendancies.updatedAt ?? null,
    }).zh,
    jsonLdEn: renderJsonLd({
      title: "Class Preview | POE2 Campaign Guide",
      description: "Path of Exile 2 base class and ascendancy preview, compiled from PoE2DB Chronicle notes.",
      urlPath: "/classes/index.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "职业预览", labelEn: "Class Preview" },
      ],
      datePublished: ascendancies.updatedAt ?? null,
      dateModified: ascendancies.updatedAt ?? null,
    }).en,
  });

  pages.push({
    urlPath: "/builds/poe-ninja-ranking.html",
    homeHref: "../index.html",
    titleZh: "最新 BD 排行 | POE2 开荒攻略站",
    titleEn: "Poe Ninja Build Ranking | POE2 Campaign Guide",
    descriptionZh: "当前联赛 poe.ninja 职业热度排行，按热门职业、热度变化和外链筛选整理。",
    descriptionEn: "Current poe.ninja class-share ranking, organized by popularity, trend, and outbound filter links.",
    bodyZh: renderBuildsBody(buildsPayload, "zh"),
    bodyEn: renderBuildsBody(buildsPayload, "en"),
    jsonLdZh: renderJsonLd({
      title: "最新 BD 排行 | POE2 开荒攻略站",
      description: "当前联赛 poe.ninja 职业热度排行，按热门职业、热度变化和外链筛选整理。",
      urlPath: "/builds/poe-ninja-ranking.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "最新 BD", labelEn: "Build Rankings" },
      ],
      datePublished: buildsPayload.updatedAt ?? null,
      dateModified: buildsPayload.updatedAt ?? null,
    }).zh,
    jsonLdEn: renderJsonLd({
      title: "Poe Ninja Build Ranking | POE2 Campaign Guide",
      description: "Current poe.ninja class-share ranking, organized by popularity, trend, and outbound filter links.",
      urlPath: "/builds/poe-ninja-ranking.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "最新 BD", labelEn: "Build Rankings" },
      ],
      datePublished: buildsPayload.updatedAt ?? null,
      dateModified: buildsPayload.updatedAt ?? null,
    }).en,
  });

  const aboutParagraphsZh = [
    "这是一个为 Path of Exile 2 玩家整理的静态攻略站，首页保留交互式单页体验，另外生成可抓取的独立页面，方便搜索引擎和 AI 索引。",
    "内容覆盖开荒世界地图、职业升华预览、poe.ninja 职业排行与 GGG 官方公告，所有静态页面都可以中英文切换。",
  ];
  const aboutParagraphsEn = [
    "This is a static companion site for Path of Exile 2 players. The homepage keeps the interactive single-page experience, while separate crawlable pages are generated for search and AI discovery.",
    "Coverage includes campaign world maps, ascendancy previews, poe.ninja rankings, and official GGG announcements. All static pages support Chinese and English toggling.",
  ];

  pages.push({
    urlPath: "/about.html",
    homeHref: "./index.html",
    titleZh: "关于本站 | POE2 开荒攻略站",
    titleEn: "About This Site | POE2 Campaign Guide",
    descriptionZh: "站点用途、数据来源和更新方式说明。",
    descriptionEn: "Site purpose, data sources, and update workflow notes.",
    bodyZh: renderInfoBody("zh", "关于本站", "About This Site", "关于本站", "站点用途、数据来源和更新方式说明。", aboutParagraphsZh, [
      "项目站地址：https://poe2.ve-city.com/",
      "数据来源包括 GGG 官方新闻、PoE2DB、poe.ninja 与已抓取的开荒地图素材。",
    ]),
    bodyEn: renderInfoBody("en", "关于本站", "About This Site", "About This Site", "Site purpose, data sources, and update workflow notes.", aboutParagraphsEn, [
      "Project site: https://poe2.ve-city.com/",
      "Sources include official GGG news, PoE2DB, poe.ninja, and cached campaign map material.",
    ]),
    jsonLdZh: renderJsonLd({
      title: "关于本站 | POE2 开荒攻略站",
      description: "站点用途、数据来源和更新方式说明。",
      urlPath: "/about.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "关于本站", labelEn: "About This Site" },
      ],
    }).zh,
    jsonLdEn: renderJsonLd({
      title: "About This Site | POE2 Campaign Guide",
      description: "Site purpose, data sources, and update workflow notes.",
      urlPath: "/about.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "关于本站", labelEn: "About This Site" },
      ],
    }).en,
  });

  const contactParagraphsZh = [
    `纠错或优化建议请联系 ${CONTACT_EMAIL}。`,
    "如果发现掉落、职业说明或外链有误，请直接发邮件说明页面标题和问题位置，便于快速修正。",
  ];
  const contactParagraphsEn = [
    `For corrections or optimization suggestions, email ${CONTACT_EMAIL}.`,
    "If you spot an issue in drops, class notes, or outbound links, include the page title and the problem location so it can be fixed quickly.",
  ];

  pages.push({
    urlPath: "/contact.html",
    homeHref: "./index.html",
    titleZh: "联系与纠错 | POE2 开荒攻略站",
    titleEn: "Contact & Corrections | POE2 Campaign Guide",
    descriptionZh: "联系邮箱与纠错说明。",
    descriptionEn: "Contact email and correction instructions.",
    bodyZh: renderInfoBody("zh", "联系与纠错", "Contact & Corrections", "联系与纠错", "联系邮箱与纠错说明。", contactParagraphsZh),
    bodyEn: renderInfoBody("en", "联系与纠错", "Contact & Corrections", "Contact & Corrections", "Contact email and correction instructions.", contactParagraphsEn),
    jsonLdZh: renderJsonLd({
      title: "联系与纠错 | POE2 开荒攻略站",
      description: "联系邮箱与纠错说明。",
      urlPath: "/contact.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "联系与纠错", labelEn: "Contact & Corrections" },
      ],
    }).zh,
    jsonLdEn: renderJsonLd({
      title: "Contact & Corrections | POE2 Campaign Guide",
      description: "Contact email and correction instructions.",
      urlPath: "/contact.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "联系与纠错", labelEn: "Contact & Corrections" },
      ],
    }).en,
  });

  const privacyParagraphsZh = [
    "本站不要求登录，不提供用户账号，不收集用户提交内容；页面中的语言偏好只会保存在浏览器本地。",
    "站点可能会引用外部新闻、编年史和忍者网链接，打开后会离开本项目站；未来如接入广告，会单独补充相应政策说明。",
  ];
  const privacyParagraphsEn = [
    "This site does not require sign-in, does not provide user accounts, and does not collect submitted user content. Language preference is stored locally in the browser only.",
    "The site may link out to external news, Chronicle, and poe.ninja pages. Future ad integration will be documented separately if added.",
  ];

  pages.push({
    urlPath: "/privacy.html",
    homeHref: "./index.html",
    titleZh: "隐私政策 | POE2 开荒攻略站",
    titleEn: "Privacy Policy | POE2 Campaign Guide",
    descriptionZh: "本地偏好、外链和广告相关隐私说明。",
    descriptionEn: "Local preference, outbound link, and ad-related privacy notes.",
    bodyZh: renderInfoBody("zh", "隐私政策", "Privacy Policy", "隐私政策", "本地偏好、外链和广告相关隐私说明。", privacyParagraphsZh),
    bodyEn: renderInfoBody("en", "隐私政策", "Privacy Policy", "Privacy Policy", "Local preference, outbound link, and ad-related privacy notes.", privacyParagraphsEn),
    jsonLdZh: renderJsonLd({
      title: "隐私政策 | POE2 开荒攻略站",
      description: "本地偏好、外链和广告相关隐私说明。",
      urlPath: "/privacy.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "隐私政策", labelEn: "Privacy Policy" },
      ],
    }).zh,
    jsonLdEn: renderJsonLd({
      title: "Privacy Policy | POE2 Campaign Guide",
      description: "Local preference, outbound link, and ad-related privacy notes.",
      urlPath: "/privacy.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "隐私政策", labelEn: "Privacy Policy" },
      ],
    }).en,
  });

  const disclaimerParagraphsZh = [
    "本站为非官方玩家向站点，与 Grinding Gear Games、PoE2DB、poe.ninja 和游民星空均无隶属关系。",
    "游戏数据、公告和职业排行会随版本变化，实际游玩请以游戏内和原始来源为准。",
  ];
  const disclaimerParagraphsEn = [
    "This is an unofficial fan site and is not affiliated with Grinding Gear Games, PoE2DB, poe.ninja, or Gamersky.",
    "Game data, announcements, and build rankings can change by patch; always verify against in-game information and the original sources.",
  ];

  pages.push({
    urlPath: "/disclaimer.html",
    homeHref: "./index.html",
    titleZh: "免责声明 | POE2 开荒攻略站",
    titleEn: "Disclaimer | POE2 Campaign Guide",
    descriptionZh: "站点非官方声明与数据变动提示。",
    descriptionEn: "Unofficial-site notice and data-change warning.",
    bodyZh: renderInfoBody("zh", "免责声明", "Disclaimer", "免责声明", "站点非官方声明与数据变动提示。", disclaimerParagraphsZh),
    bodyEn: renderInfoBody("en", "免责声明", "Disclaimer", "Disclaimer", "Unofficial-site notice and data-change warning.", disclaimerParagraphsEn),
    jsonLdZh: renderJsonLd({
      title: "免责声明 | POE2 开荒攻略站",
      description: "站点非官方声明与数据变动提示。",
      urlPath: "/disclaimer.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "免责声明", labelEn: "Disclaimer" },
      ],
    }).zh,
    jsonLdEn: renderJsonLd({
      title: "Disclaimer | POE2 Campaign Guide",
      description: "Unofficial-site notice and data-change warning.",
      urlPath: "/disclaimer.html",
      breadcrumbItems: [
        { labelZh: "首页", labelEn: "Home", href: "/" },
        { labelZh: "免责声明", labelEn: "Disclaimer" },
      ],
    }).en,
  });

  return pages;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeSupportFiles({ pages }) {
  const urls = [
    `${BASE_URL}/`,
    ...pages.map((page) => `${BASE_URL}${page.urlPath}`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

  const llms = `# POE2 开荒攻略站

本项目站收录 Path of Exile 2 的开荒地图、职业升华预览、poe.ninja 职业排行和 GGG 官方公告。

主要入口:
- ${BASE_URL}/
- ${BASE_URL}/campaign/act1-upper.html
- ${BASE_URL}/classes/index.html
- ${BASE_URL}/builds/poe-ninja-ranking.html

说明页:
- ${BASE_URL}/about.html
- ${BASE_URL}/contact.html
- ${BASE_URL}/privacy.html
- ${BASE_URL}/disclaimer.html

联系:
- ${CONTACT_EMAIL}
`;

  await writeFile(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(ROOT, "robots.txt"), robots, "utf8");
  await writeFile(path.join(ROOT, "llms.txt"), llms, "utf8");
}

async function main() {
  const [worldMaps, ascendancies, buildsPayload] = await Promise.all([
    readJson(DATA_PATHS.worldMaps),
    readJson(DATA_PATHS.ascendancies),
    readJson(DATA_PATHS.builds),
  ]);

  const pages = buildPages({ worldMaps, ascendancies, buildsPayload });

  for (const page of pages) {
    const html = renderPageShell(page);
    await writePage(outputForUrl(page.urlPath), html);
  }

  await writeSupportFiles({ pages });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
