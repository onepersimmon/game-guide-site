# AdSense 与多子域名实施记录

## 当前状态

- 根域名：`aristpersimmon.top`
- 当前项目：POE2 开荒攻略站
- 当前发布：GitHub Pages
- 当前站点地址：`https://aristpersimmon.top/`
- AdSense 发布商 ID：`ca-pub-2796426183102013`
- AdSense 验证脚本已加入首页和所有静态页面的 `<head>`。
- AdSense 所有权验证已通过，站点审核已提交，状态进入 `Getting ready`。

## 核心决策

短期不迁移域名结构。先让 `aristpersimmon.top` 完成 AdSense 审核。

原因：

- AdSense 当前审核对象是根域 `aristpersimmon.top`。
- 审核期间变更到 `poe2.aristpersimmon.top` 可能导致 Google 重新抓取、重新判断站点内容。
- 先让根域通过审核，后续多个子域名可以复用同一个发布商账号和广告代码。

## 长期域名结构

通过 AdSense 审核后，把根域留作总站，把具体项目拆到子域名：

| 域名 | 用途 |
| --- | --- |
| `aristpersimmon.top` | 个人/项目导航主站 |
| `poe2.aristpersimmon.top` | 当前 POE2 开荒攻略站 |
| `tools.aristpersimmon.top` | 后续工具类站点 |
| `ai.aristpersimmon.top` | 后续 AI 项目站 |

## 迁移 POE2 到子域名的步骤

等 AdSense 审核通过后再执行：

1. 在阿里云 DNS 添加 `poe2` 子域名记录，指向 GitHub Pages。
2. 把本仓库的 `CNAME` 从 `aristpersimmon.top` 改成 `poe2.aristpersimmon.top`。
3. 把 `scripts/generate-static-pages.mjs`、`sitemap.xml`、`robots.txt`、`llms.txt`、canonical URL、JSON-LD 中的基准地址改成 `https://poe2.aristpersimmon.top`。
4. 重新生成静态页面并运行测试。
5. 在 GitHub Pages 设置中确认 custom domain 为 `poe2.aristpersimmon.top`，等证书签发后开启 `Enforce HTTPS`。
6. 新建或指定一个根域主站仓库，绑定 `aristpersimmon.top`。
7. 根域主站至少放置：项目导航、About、Contact、Privacy、Disclaimer、`sitemap.xml`、`robots.txt`、`ads.txt`。
8. 确认 AdSense 后台仍以 `aristpersimmon.top` 为主域审核对象，不为普通子域名单独新增 Site。

## 广告代码策略

- 验证脚本可以继续保留在所有页面 `<head>`。
- 广告位通过审核后再添加，避免审核前页面体验被广告占位影响。
- POE2 页面广告位不要插在地图图片和编号奖励之间。
- 根域主站和各子域名都使用同一个发布商 ID：`ca-pub-2796426183102013`。

## 审核期间不要做的事

- 不要把当前项目立即迁移到 `poe2.aristpersimmon.top`。
- 不要删除 AdSense 验证脚本。
- 不要频繁切换 GitHub Pages custom domain。
- 不要先铺大量广告位。

## 参考

- Google AdSense Sites 管理说明：<https://support.google.com/adsense/answer/12170421>
- Google AdSense ads.txt 说明：<https://support.google.com/adsense/answer/12171612>
- GitHub Pages 自定义域名说明：<https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site>
