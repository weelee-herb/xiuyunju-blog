# 云岫居 · 宋式美学个人博客

一座以「宋徽宗美学」为设计语言的个人博客：汝窑天青、宣纸底色、瘦金体标题、朱砂印章、竖排诗与瑞鹤线描。用于分享你用 **Codex / AI 创作**的内容，并带一个「访客留邮箱 → 自动收到回信」的订阅系统。

技术栈：**Astro + Markdown**（内容驱动，构建快，可部署为 Node 服务）。

---

## 快速开始

```bash
npm install
npm run dev        # 开发预览 http://localhost:4321
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
```

> 提示：构建时如果遇到 Astro 遥测目录权限报错，加环境变量 `ASTRO_TELEMETRY_DISABLED=1`。

## 目录结构

```text
src/
├── config.ts              # ★ 站点信息：站名/笔名/域名/订阅内容（先改这里）
├── content/blog/*.md      # ★ 文章都在这里（Markdown + frontmatter）
├── pages/                 # 页面与路由
│   ├── index.astro        #   首页（近作 + 关于 + 订阅）
│   ├── blog/[slug].astro  #   文章详情（进度条/前后篇/订阅引导）
│   ├── about.astro        #   关于我
│   ├── subscribe.astro    #   订阅页（留邮箱 → 自动回信）
│   ├── api/subscribe.ts   #   ★ 订阅接口（发邮件）
│   ├── rss.xml.ts         #   RSS 订阅源
│   └── sitemap.xml.ts     #   站点地图
├── components/            # 印章/瑞鹤/竖排诗/订阅表单等组件
├── styles/global.css      # ★ 宋式设计系统（配色全部是 CSS 变量）
└── lib/email.ts           # 邮件模板与 Resend 发信
```

## 一、改成你自己的博客

1. 打开 **`src/config.ts`**，改站名、笔名、副标题、简介、社交链接、域名——**全站唯一配置源**，`astro.config.mjs`、RSS、sitemap、robots、canonical 都会自动跟着变。
   - 域名也可以用环境变量 `SITE_URL` 设置（部署平台里填，连代码都不用改）。
2. 替换 `src/content/blog/` 里的示例文章，每篇开头长这样：

```markdown
---
title: 文章标题
description: 摘要（用于列表页与 SEO）
date: 2025-12-28
tags: [AI, 随笔]
draft: false        # 写 true 则构建时隐藏
---
正文开始……
```

4. 站点所有配色、字体、留白都在 `src/styles/global.css` 顶部的 CSS 变量里，改一处全站生效。
5. 文内想放「提示/备注」块，用 HTML 引 `callout` 样式：

```html
<div class="callout"><p>📌 一个小提示……</p></div>
```

6. 图标/清单：`public/icon-192/512.png`（PWA 图标）、`apple-touch-icon.png`、`manifest.webmanifest` 与 `favicon.svg` 都由 `scripts/design/icon.svg` 生成，改站名后同样可用 Chrome 重新渲染（参照「封面与分享图」一节的命令）。

## 二、配置「自动回信」邮件（核心功能）

访客在订阅页输入邮箱后，服务器会用 **Resend** 自动给他发一封宋式风格的欢迎邮件，附带你的资源包链接。

1. 注册 <https://resend.com>（免费额度足够个人博客用），在后台验证你的发件域名，拿到 **API Key**。
2. 复制 `.env.example` 为 `.env` 并填写：

```bash
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM="云岫居 <share@你的域名.com>"   # 必须是验证过的域名邮箱
EMAIL_SUBJECT="云岫居 · 欢迎订阅"          # 可选
EMAIL_TO_OWNER=                           # 可选：新订阅时通知站长自己
```

3. 邮件正文里的资源包名称与链接在 `src/config.ts` 的 `subscribe` 里改。
4. 重启服务，在订阅页输入自己的邮箱测试，应立刻收到欢迎邮件。

> 不配置 `RESEND_API_KEY` 时接口会返回「站长还没有配置邮件服务」的友好提示，不影响其它功能。

## 三、部署

完整的手把手教程（Railway + Resend + 自有域名，以及纯静态 + Web3Forms 两种方案）见 **`DEPLOY.md`**。

一句话摘要：

- **首选（Cloudflare 免费 + 自有域名）**：Cloudflare Pages（Build `npm run build`，输出 `dist/client`）+ 自带 `functions/api/subscribe.js` + Resend，全免费且邮件是宋式 HTML。
- **Node 服务器**：Railway，Start 命令 `node ./dist/server/entry.mjs`，配 `RESEND_API_KEY`。
- **纯静态最简**：Web3Forms（设 `PUBLIC_WEB3FORMS_KEY`），自动回信为纯文本。

部署后把 `astro.config.mjs` 里的 `site` 改成线上域名。

## 四、设计语言（宋徽宗美学）

- **天青**：汝窑「雨过天青云破处」，唯一的冷色；
- **宣纸**：暖米色底 + 纸纹噪点，深色模式则是深夜墨色；
- **朱砂**：只用于印章、标题小点、进度条、链接悬停——克制即高级；
- **细节**：竖排诗（writing-mode: vertical-rl）、干支纪年（岁在乙巳）、首字下沉、文末签名印章、回到顶部印章按钮。

## 五、常见问题

- **订阅后收不到邮件？** 检查 Resend 域名验证状态、`.env` 是否被读取（重启服务）、垃圾箱。
- **想换文章标签的筛选顺序？** 标签自动从文章 frontmatter 汇总，无需配置。
- **想加图片？** 放进 `src/assets/`，在 Markdown 里正常引用即可，构建时自动优化。

## 发布前待办（域名/身份以后再定也行）

当前站点信息全部是占位符（云岫居 / 林屿 / example.com）。以后确定后，只需改：

- `src/config.ts` —— 站名、笔名、邮箱、社交链接、资源包、域名（全站生效）
- `functions/api/subscribe.js` 里 `buildEmail()` —— 邮件模板里的站名与资源链接（与 config 保持同步）
- 部署平台环境变量 —— `SITE_URL`、`RESEND_API_KEY`、`EMAIL_FROM`

改完推一次代码（或重新部署）即可，站点结构、文章、样式都不用动。

## 封面与分享图

- 全站分享图 `public/og.png`（1200×630，微信/X/推特分享卡片）+ 三张文章封面 `public/covers/*.png`，都由 `scripts/design/` 下的 SVG 手绘生成。
- **改了站名后要重新生成 og.png**：编辑 `scripts/design/og-card.svg` 里的文字 → 用 Chrome 渲染：
  ~~~~bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --window-size=1200,630 --screenshot=public/og.png \
    "file://$(pwd)/scripts/design/og-card.svg"
  ~~~~
- 文章换封面：改 frontmatter 的 `cover` 路径，或把新图放进 `public/covers/`。

祝创作愉快，以代码为笔，以 AI 为墨。

---

## 更新记录

- **2026-08-24 · 识药闯关专区**：订阅资源改为《识药闯关》看图认中药小游戏（subscribe.resourceTitle/Url/note 更新，GAME_DOWNLOAD_URL 环境变量可配）；新增 /game/ 专区页（玩法介绍 + 下载按钮占位）；Header 导航与首页加入口与介绍卡（public/game/ 内 5 张科普卡）；npm run build 通过。
- **2026-08-24 · 冷知识与专区完善**：新增两篇文章与冷知识系列三篇（厨房/花园/山野各 20 味）；/game/ 页升级（科普卡画廊分页、订阅领游戏表单、玩法图文）；SEO：schema 增加 keywords、文章补齐 description/keywords、og 图更新；npm run build 通过。
