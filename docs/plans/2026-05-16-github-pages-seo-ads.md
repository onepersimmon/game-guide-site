# GitHub Pages SEO 与广告实施计划

> **给 Claude：** 必须使用 superpowers:executing-plans，按任务逐步执行这份计划。

**目标：** 让现有 GitHub Pages 站点更容易被 Google、Bing 和 AI 搜索工具发现、理解、引用，并为后续接入 Google AdSense 做准备。

**架构：** 保留当前 `index.html` 单页体验作为首页，同时生成一批可被搜索引擎直接抓取的静态内容页，覆盖开荒地图、职业预览、BD 排行和政策说明页。当前公开 URL 使用 `https://aristpersimmon.top/`；同时补齐 sitemap、robots、metadata、JSON-LD。长期域名结构应支持一个根域承载多个项目子域名。

**技术栈：** 静态 HTML/CSS/JS、Node.js 脚本、JSON 数据文件、GitHub Pages、Google Search Console、Bing Webmaster Tools、Google AdSense。

---

## 前提与限制

- 公开访问基准地址为 `https://aristpersimmon.top/`。
- GitHub Pages 支持多页面静态站，所以 `/campaign/act-1-upper.html` 这类页面是可行的。
- 当前应用继续保留为 `index.html`，静态 SEO 页面是补充入口，不替代现有应用。
- AdSense 已用根域 `aristpersimmon.top` 发起站点审核。普通子域名不再作为独立站点单独添加到 AdSense Sites，应先让根域过审，再把具体项目迁移到子域名。

## 当前域名与广告决策（2026-05-19）

- 短期：保持 `aristpersimmon.top` 指向当前 POE2 项目，直到 AdSense 审核完成，避免审核期间频繁变更站点结构。
- 中期：AdSense 通过后，把当前 POE2 项目迁移到 `poe2.aristpersimmon.top`。
- 长期：`aristpersimmon.top` 保留为个人/项目导航主站，承载多个项目入口；每个具体网站使用独立子域名，例如 `poe2.aristpersimmon.top`、`tools.aristpersimmon.top`、`ai.aristpersimmon.top`。
- AdSense 侧：继续以 `aristpersimmon.top` 作为主站点审核对象。根域过审后，各子域名页面仍需放置同一个发布商账号的 AdSense 脚本和必要广告位，但不把普通子域名当成新的 AdSense Site 单独申请。
- GitHub Pages 侧：每个仓库可以绑定一个不同的自定义域名或子域名。迁移 POE2 时，应把本仓库的 `CNAME` 从 `aristpersimmon.top` 改为 `poe2.aristpersimmon.top`，并在 DNS 中为 `poe2` 配置到 GitHub Pages 的记录。
- 根域主站：迁移后需要新建或指定一个仓库承载 `aristpersimmon.top`，至少包含项目导航、关于、联系、隐私、声明、sitemap、robots、ads.txt。

## 成功标准

- Google 能抓到列出所有重要页面的 `sitemap.xml`。
- 每个地图、职业、BD 主题都有独立静态 URL，页面在 JavaScript 运行前就有可读正文。
- 每个页面都有独立的 title、description、canonical URL 和 JSON-LD。
- 首页能链接到静态页面，方便搜索引擎和用户发现。
- Google Search Console 和 Bing Webmaster Tools 能验证这个项目站 URL 前缀。
- AdSense 审核所需的基础页面存在：About、Contact、Privacy、Disclaimer。
- 后续广告位不影响地图查询体验。

---

### 任务 1：补齐 SEO 基础文件

**文件：**
- 新建：`robots.txt`
- 新建：`sitemap.xml`
- 新建：`llms.txt`
- 修改：`tests/site-structure.test.mjs`

**步骤 1：先写失败测试**

在测试里断言这些文件存在，并包含项目站基准 URL：

```js
assert.equal(existsSync("/Users/persimmon/project/game-guide-site/robots.txt"), true);
assert.equal(existsSync("/Users/persimmon/project/game-guide-site/sitemap.xml"), true);
assert.equal(existsSync("/Users/persimmon/project/game-guide-site/llms.txt"), true);
```

**步骤 2：运行测试，确认失败**

运行：

```bash
node --test tests/site-structure.test.mjs
```

预期：失败，因为这些文件还不存在。

**步骤 3：实现基础文件**

创建 `robots.txt`：

```txt
User-agent: *
Allow: /

Sitemap: https://aristpersimmon.top/sitemap.xml
```

创建初版 `sitemap.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://aristpersimmon.top/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

创建 `llms.txt`：

```txt
# POE2 Campaign Guide

This site provides Path of Exile 2 campaign maps, numbered campaign rewards, ascendancy previews, GGG official announcement links, and poe.ninja class ranking summaries.

Main URL:
- https://aristpersimmon.top/

Contact:
- onepersimmon@163.com
```

**步骤 4：验证**

运行：

```bash
node --test tests/site-structure.test.mjs
```

预期：通过。

**步骤 5：提交**

```bash
git add robots.txt sitemap.xml llms.txt tests/site-structure.test.mjs
git commit -m "Add crawl discovery files"
```

---

### 任务 2：生成静态 SEO 页面

**文件：**
- 新建：`scripts/generate-static-pages.mjs`
- 新建：`tests/static-pages.test.mjs`
- 修改：`.github/workflows/update-builds.yml`

**步骤 1：先写失败测试**

创建测试，运行生成脚本后至少检查这些页面是否存在：

```text
campaign/act1-upper.html
campaign/act1-lower.html
builds/poe-ninja-ranking.html
classes/index.html
```

同时断言生成后的 `act1-upper.html` 至少包含：

```html
<h1>Act 1 World Map - Upper Layer</h1>
<script type="application/ld+json">
```

**步骤 2：运行测试，确认失败**

```bash
node --test tests/static-pages.test.mjs
```

预期：失败，因为生成脚本和页面都还不存在。

**步骤 3：实现生成脚本**

`scripts/generate-static-pages.mjs` 需要做到：

- 读取 `data/world-maps.json`、`data/ascendancies.json`、`data/builds.json`、`data/ggg-news.json`。
- 使用基准 URL `https://aristpersimmon.top`。
- 创建目录：
  - `campaign/`
  - `classes/`
  - `builds/`
- 每张世界地图生成一个独立页面。
- 生成 `classes/index.html`。
- 生成 `builds/poe-ninja-ranking.html`。
- 重新生成 `sitemap.xml`，把所有静态页面写进去。

**步骤 4：地图页面最低模板要求**

每个地图静态页至少包含：

- `<!doctype html>`
- `<html lang="zh-CN">`
- 独立 `<title>`
- 独立 `<meta name="description">`
- `<link rel="canonical" href="...">`
- 返回首页链接
- 地图图片
- 编号奖励的真实 HTML 列表
- 来源和纠错邮箱
- JSON-LD：`Article` 和 `BreadcrumbList`

**步骤 5：验证**

```bash
node ./scripts/generate-static-pages.mjs
node --test tests/static-pages.test.mjs
```

预期：通过。

**步骤 6：接入 GitHub Actions**

在 `.github/workflows/update-builds.yml` 里加入：

```yaml
- name: Generate static SEO pages
  run: node ./scripts/generate-static-pages.mjs
```

放在数据抓取之后执行；可以在 `embed-local-data.mjs` 之前或之后，但必须确保读取到最新数据。 workflow 的 `git add` 里要加入生成目录和 `sitemap.xml`。

**步骤 7：提交**

```bash
git add scripts/generate-static-pages.mjs tests/static-pages.test.mjs .github/workflows/update-builds.yml campaign classes builds sitemap.xml
git commit -m "Generate static SEO pages"
```

---

### 任务 3：首页补充静态页面入口

**文件：**
- 修改：`index.html`
- 修改：`app.js`
- 修改：`styles.css`
- 修改：`tests/ui-shell.test.mjs`

**步骤 1：先写失败测试**

断言首页能暴露静态页面链接：

```js
assert.match(html, /href="\.\/campaign\/act1-upper\.html"/);
assert.match(html, /href="\.\/builds\/poe-ninja-ranking\.html"/);
assert.match(html, /href="\.\/classes\/index\.html"/);
```

**步骤 2：运行测试**

```bash
node --test tests/ui-shell.test.mjs
```

预期：失败。

**步骤 3：实现链接入口**

加一些低调但明确的入口：

- 每张世界地图视图里加“独立页面”链接。
- 职业预览标题区链接到 `classes/index.html`。
- BD 标题区链接到 `builds/poe-ninja-ranking.html`。

这些链接要小而实用，不要做成营销卡片。

**步骤 4：验证**

```bash
node --test tests/ui-shell.test.mjs
node --test
```

预期：通过。

**步骤 5：提交**

```bash
git add index.html app.js app-lib.mjs styles.css tests/ui-shell.test.mjs
git commit -m "Link static SEO pages from app"
```

---

### 任务 4：补齐信任与政策页面

**文件：**
- 新建：`about.html`
- 新建：`contact.html`
- 新建：`privacy.html`
- 新建：`disclaimer.html`
- 修改：`index.html`
- 修改：`styles.css`
- 修改：`tests/site-structure.test.mjs`

**步骤 1：先写失败测试**

断言所有政策页面存在，并且首页 footer 链接到这些页面。

**步骤 2：运行测试**

```bash
node --test tests/site-structure.test.mjs
```

预期：失败。

**步骤 3：实现页面**

创建这些页面：

- `about.html`：说明网站用途、本地爬虫/缓存模式、非官方性质。
- `contact.html`：放 `onepersimmon@163.com`。
- `privacy.html`：说明 GitHub Pages 托管、可能的统计、未来 Google 广告和 Cookie。
- `disclaimer.html`：声明不是 Grinding Gear Games 官方站，数据来自公开来源，提供纠错邮箱。

**步骤 4：更新页脚**

页脚加入：

```html
<a href="./about.html">About</a>
<a href="./privacy.html">Privacy</a>
<a href="./disclaimer.html">Disclaimer</a>
<a href="./contact.html">Contact</a>
```

**步骤 5：验证**

```bash
node --test
```

预期：通过。

**步骤 6：提交**

```bash
git add about.html contact.html privacy.html disclaimer.html index.html styles.css tests/site-structure.test.mjs
git commit -m "Add trust and policy pages"
```

---

### 任务 5：添加结构化数据

**文件：**
- 修改：`index.html`
- 修改：`scripts/generate-static-pages.mjs`
- 修改：`tests/static-pages.test.mjs`
- 修改：`tests/ui-shell.test.mjs`

**步骤 1：先写失败测试**

断言首页包含：

```html
application/ld+json
```

生成的地图页需要包含这些 JSON-LD 类型：

```json
"@type": "Article"
"@type": "BreadcrumbList"
```

**步骤 2：运行测试**

```bash
node --test tests/ui-shell.test.mjs tests/static-pages.test.mjs
```

预期：失败。

**步骤 3：实现 JSON-LD**

首页：

- `WebSite`
- `Organization` 或 `Person`

地图页：

- `Article`
- `BreadcrumbList`
- `ImageObject`

BD 页面：

- `Article`
- `ItemList`，用于职业排行条目

职业页面：

- `ItemList`，用于职业/升华条目

**步骤 4：验证**

部署后手动用 Google Rich Results Test 检查：

```text
https://search.google.com/test/rich-results
```

本地运行：

```bash
node --test
```

预期：通过。

**步骤 5：提交**

```bash
git add index.html scripts/generate-static-pages.mjs tests/static-pages.test.mjs tests/ui-shell.test.mjs
git commit -m "Add structured data"
```

---

### 任务 6：提交到 Google Search Console 和 Bing

**文件：**
- 新建：`docs/search-submission.md`

**步骤 1：记录提交目标**

创建 `docs/search-submission.md`：

```text
Google Search Console property:
https://aristpersimmon.top/

Sitemap:
https://aristpersimmon.top/sitemap.xml

Bing Webmaster Tools URL:
https://aristpersimmon.top/
```

**步骤 2：记录验证方式**

Google Search Console 使用 URL-prefix property。优先考虑：

- 如果 Google 允许在 GitHub Pages 项目路径上传验证 HTML 文件，就用 HTML 文件验证。
- 如果上传路径不方便，就在 `index.html` 里加 HTML tag 验证。

**步骤 3：提交**

```bash
git add docs/search-submission.md
git commit -m "Document search submission steps"
```

**部署后手动操作：**

- 在 Google Search Console 提交 sitemap。
- 在 Bing Webmaster Tools 提交 sitemap。
- 用 URL Inspection 检查：
  - 首页
  - 任意一个地图页
  - BD 排行页

---

### 任务 7：AdSense 准入检查

**文件：**
- 新建：`docs/adsense-plan.md`
- 后续可能新建：`ads.txt`

**步骤 1：记录 GitHub Pages 限制**

创建 `docs/adsense-plan.md`，写清楚：

- AdSense 可能要求 `ads.txt` 位于 `https://onepersimmon.github.io/ads.txt`。
- 当前仓库发布在 `https://aristpersimmon.top/`。
- `https://aristpersimmon.top/ads.txt` 不一定能通过 Google 对 host 根目录的检查。

**步骤 2：定义开始申请 AdSense 的门槛**

满足下面条件后再申请：

- 静态页面已经上线。
- Search Console 能看到 sitemap。
- 至少有 20 到 30 个有实际内容的静态页面。
- About、Contact、Privacy、Disclaimer 都已上线。
- 没有明显的整段版权内容复制。
- 地图图片和来源标注清楚可见。

**步骤 3：定义 AdSense 路线**

路线 A：先试项目站：

- 用 `https://aristpersimmon.top/` 申请。
- 把验证 `<script>` 放进 `index.html`。
- 在项目根目录加 `ads.txt`。
- 如果 AdSense 接受，就继续。

路线 B：如果 `ads.txt` 卡住：

- 新建一个名为 `onepersimmon.github.io` 的 GitHub 仓库。
- 在根目录放 `ads.txt`。
- 做一个简单根站首页，链接到 `/game-guide-site/`。
- 等根文件上线后重新尝试 AdSense。

路线 C：暂缓广告：

- 先继续做 SEO 和内容增长。
- 等有真实流量后，再考虑自定义域名。

**步骤 4：提交**

```bash
git add docs/adsense-plan.md
git commit -m "Document AdSense readiness plan"
```

---

### 任务 8：AdSense 通过后再加广告位

**文件：**
- 后续修改：`index.html`
- 后续修改：`styles.css`
- 后续新建：`ads.txt`

**AdSense 通过前不要实现这个任务。**

通过后再做：

- 把 AdSense script 加到 `<head>`。
- 在 GGG 公告下面或首个内容区后面加一个响应式广告位。
- 在页面底部附近加一个广告位。
- 不要把广告插在地图图片和编号奖励之间。
- 移动端如果影响使用，就隐藏或弱化顶部广告。

**验证：**

```bash
node --test
```

手动检查：

- 移动端布局没有明显跳动。
- 地图面板仍然好读。
- 页脚政策链接仍然可见。

---

## 推荐执行顺序

1. 任务 1：SEO 基础文件。
2. 任务 2：静态页面生成器。
3. 任务 3：首页链接到静态页面。
4. 任务 4：信任与政策页面。
5. 任务 5：结构化数据。
6. 任务 6：提交 Google Search Console 和 Bing。
7. 等待收录和展示数据。
8. 任务 7：AdSense 准入检查。
9. 任务 8：通过审核后再加广告。

## 参考资料

- Google SEO 入门指南：https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google sitemap 指南：https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google 结构化数据：https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Google AdSense 资格要求：https://support.google.com/adsense/answer/9724
- Google AdSense ads.txt 指南：https://support.google.com/adsense/answer/12171612
