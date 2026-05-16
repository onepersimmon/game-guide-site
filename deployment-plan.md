# 游戏攻略网站上线方案

## 目标

搭建一个以网页为主的游戏攻略网站，优先满足以下要求：

- 上线快
- 成本低
- 支持自定义海外域名
- 前端可以用单个 `HTML` 页面起步
- 代码托管在 GitHub
- 对外通过自定义域名访问

这个方案适合热点游戏、活动专题、版本攻略、兑换码页、角色配装页这类生命周期较短的内容站。

## 推荐方案

- 域名注册：Cloudflare Registrar
- 代码托管：GitHub
- 静态发布：GitHub Pages
- 页面形态：单个 `index.html`，按需补充 `style.css` 和 `script.js`
- 域名解析：Cloudflare DNS

## 为什么这样选

### 1. 适合短周期项目

这类攻略站的热度通常集中在前一周到一个月。用静态站方案可以快速上线，不需要先搭服务器、数据库和后台系统。

### 2. 成本和维护压力低

GitHub Pages 适合托管纯静态页面，配合 Cloudflare 管理域名和 DNS，整体成本较低，维护也简单。

### 3. 自定义域名可行

GitHub Pages 官方支持自定义域名，并支持 `HTTPS`。

参考文档：

- GitHub Pages 自定义域名：
  [https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- GitHub Pages 介绍：
  [https://pages.github.com/](https://pages.github.com/)

## 域名注册建议

推荐使用 Cloudflare Registrar：

- 官网：
  [https://www.cloudflare.com/products/registrar/](https://www.cloudflare.com/products/registrar/)

选择理由：

- 域名管理和 DNS 在同一平台，省事
- 后续接入 CDN、缓存、基础防护更方便
- 对静态站部署很友好

如果 Cloudflare Registrar 当前不方便使用，也可以考虑：

- Namecheap：
  [https://www.namecheap.com/](https://www.namecheap.com/)
- Porkbun：
  [https://porkbun.com/](https://porkbun.com/)

## 推荐域名思路

可优先考虑：

- `游戏名 + guide`
- `游戏名 + wiki`
- `游戏名 + build`
- `游戏名 + map`
- `游戏名 + codes`

例如：

- `xxxguide.com`
- `xxxwiki.gg`
- `xxxbuilds.com`

如果站点主要面向中文用户，也可以考虑英文域名搭配中文内容，这样注册和品牌命名通常更灵活。

## 项目结构建议

前期建议保持最简结构：

```text
game-guide-site/
  index.html
  style.css
  script.js
  CNAME
  assets/
```

如果只做单页专题，甚至可以先只有：

```text
game-guide-site/
  index.html
  CNAME
```

## GitHub Pages 发布流程

### 1. 创建仓库

在 GitHub 新建一个仓库，例如：

- `game-guide-site`

### 2. 上传静态文件

将以下文件推送到仓库：

- `index.html`
- 可选的 `style.css`
- 可选的 `script.js`
- 可选的图片资源

### 3. 开启 GitHub Pages

在仓库设置中打开 Pages：

- 进入 `Settings`
- 打开 `Pages`
- 选择从主分支发布

常见选择：

- Branch: `main`
- Folder: `/root`

启用后，GitHub 会生成一个默认访问地址，例如：

- `https://yourname.github.io/game-guide-site/`

## 绑定自定义域名

### 1. 在仓库里添加 `CNAME` 文件

如果你想绑定：

- `www.example.com`

那么仓库根目录的 `CNAME` 文件内容就是：

```text
www.example.com
```

### 2. 在 DNS 中配置记录

常见方式如下。

#### 方案 A：使用 `www` 子域名

给 `www` 添加 `CNAME`，指向：

```text
yourname.github.io
```

这是最省心的方式。

#### 方案 B：使用根域名

如果你希望直接使用：

```text
example.com
```

则需要按 GitHub 官方文档配置根域名所需的 `A` 记录。具体 IP 请以 GitHub 官方文档当前说明为准。

GitHub 官方文档：

- [https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

### 3. 在 GitHub Pages 设置中填写自定义域名

在 Pages 设置页中填入你的域名，并开启 `Enforce HTTPS`。

## 这种方案的适用范围

### 适合

- 活动专题页
- 游戏开服攻略页
- 兑换码汇总页
- 角色配装页
- 材料路线页
- 版本更新说明页
- 单页数据库索引页

### 不适合

- 实时搜索聚合
- 复杂用户系统
- 在线编辑后台
- 高频动态更新的大型内容平台
- 直接在浏览器里执行跨站抓取

## 关于“爬内容”的现实限制

如果前端是单个 `HTML` 页面，不建议把抓取逻辑放在浏览器里执行。主要原因有：

- 大多数网站有 `CORS` 限制
- 很多站点有反爬措施
- 浏览器直接请求第三方页面通常拿不到目标内容
- 前端暴露采集逻辑不稳定，也不利于后续维护

因此更合理的方式是：

1. 在本地脚本或 GitHub Actions 中执行采集
2. 将采集结果整理成静态 `HTML` 或 `JSON`
3. 再发布到 GitHub Pages

一句话概括：

前台可以是单 `HTML`，采集流程不要放在前台。

## 更稳妥的内容方案

建议做成“采集辅助 + 原创整理”的模式，而不是直接搬运：

- 采集官方公告、版本时间、活动信息
- 采集公开可验证的数据
- 汇总常见问题和热搜问题
- 由人工或脚本生成结构化攻略页
- 标注更新时间和来源

这样更利于：

- 搜索收录
- 页面质量
- 后续广告接入
- 降低版权和平台风控风险

## 推荐的上线节奏

### 第一阶段：最快上线

目标是 1 天内上线一个可访问的页面：

- 注册域名
- 创建 GitHub 仓库
- 写好 `index.html`
- 开启 GitHub Pages
- 绑定自定义域名

### 第二阶段：补内容和模板

- 增加更多攻略模块
- 统一页面样式
- 增加目录导航、更新时间、相关推荐

### 第三阶段：补采集和自动化

- 用脚本整理数据源
- 用 GitHub Actions 自动生成页面
- 定时发布静态文件

## 后续可以扩展的方向

- 增加多个游戏专题页
- 按角色、地图、活动拆分页面
- 增加静态搜索索引
- 接入广告代码
- 接入统计工具

## 结论

“海外域名 + GitHub Pages + 单 HTML + 自定义域名” 这套方案完全可行，而且很适合短周期的游戏攻略网站。

最关键的判断是：

- 前端页面可以极简
- 发布方式可以纯静态
- 域名可以走海外注册
- 采集逻辑不要直接放在浏览器前端

推荐起步路径：

1. 用 Cloudflare Registrar 注册域名
2. 用 GitHub Pages 托管静态站
3. 先做单页 `HTML`
4. 后续再加自动采集和静态生成流程
