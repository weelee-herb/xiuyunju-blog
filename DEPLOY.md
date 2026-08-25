# 部署指南（手把手）

你有**自己的域名 + Cloudflare 免费托管**，所以首选方案是：

> **Cloudflare Pages（静态）+ Pages Functions（免费 serverless 跑订阅接口）+ Resend（免费发信）**
> 全免费、绑域名最省事、自带 HTTPS + CDN，且订阅邮件仍是宋式 HTML 模板。

三种方案对照：

| 方案 | 托管 | 订阅自动回信 | 适合谁 |
| --- | --- | --- | --- |
| **① Cloudflare Pages + Functions** | Cloudflare（免费） | ✅ 宋式 HTML 邮件（Resend） | 你现在的选择 |
| ② Railway（Node） | Railway（免费额度） | ✅ 宋式 HTML 邮件（Resend） | 想用传统服务器 |
| ③ 纯静态 + Web3Forms | Cloudflare / Vercel / Netlify | ⚠️ 纯文本固定模板 | 最省心但邮件简陋 |

---

> 本站域名（xiuyunju.cc.cd）与 Umami 统计已配置完毕；全部在 src/config.ts 一处可改。

## 方案①：Cloudflare Pages + Functions（你的首选）

### 第 1 步 · 代码推到 GitHub

```bash
git init
git add .
git commit -m "init blog"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

> 仓库里已经带了一个 `functions/api/subscribe.js`，这就是跑在 Cloudflare 上的订阅接口，无需额外操作。

### 第 2 步 · 在 Cloudflare 创建 Pages 项目

1. 打开 <https://dash.cloudflare.com>，左侧 **Workers & Pages → Create → Pages → Connect to Git**。
2. 授权并选择你的博客仓库。
3. 构建设置填：
   - **Framework preset**：Astro（没有就选「无」）
   - **Build command**：`npm run build`
   - **Build output directory**：`dist/client`  ← 关键，填这个
4. **Environment variables（生产环境）**先留空，部署一次拿到免费域名再说。

### 第 3 步 · 配 Resend（自动回信）

1. 打开 <https://resend.com> 注册，**Add Domain**，填你的域名。
2. 它会给出 SPF(TXT) 和 DKIM(CNAME) 两条 DNS 记录。你的域名就在 Cloudflare 上，直接去 **DNS → Records → Add record** 照抄即可，秒生效。
3. 回到 Resend 点 **Verify**，通过后创建 **API Key** 复制下来。

### 第 4 步 · 回 Cloudflare 填环境变量

Pages 项目 → **Settings → Environment variables → Production**，添加：

- `RESEND_API_KEY` = 你的 key
- `EMAIL_FROM` = `你的站名 <share@你的域名>`
- `EMAIL_SUBJECT`（可选）
- `EMAIL_TO_OWNER`（可选，有新订阅时通知你自己）

保存后会自动重新部署。打开 `/subscribe/` 输入自己邮箱，应该立刻收到宋式欢迎邮件。

### 第 5 步 · 绑定你的域名

1. Pages 项目 → **Custom domains → Set up a custom domain**，输入你的域名。
2. 因为域名就在同一个 Cloudflare 账号里，DNS 会自动配置好（少数情况会提示手动加一条 CNAME，照做即可）。
3. 等 1-2 分钟，HTTPS 证书自动签发，访问 `https://你的域名` 即可。

### 第 6 步 · 收尾

1. 改 `astro.config.mjs` 里的 `site` 为 `https://你的域名`。
2. 改 `public/robots.txt` 里的 Sitemap 域名。
3. 改 `src/config.ts` 的站名/笔名/邮箱/资源链接，以及 `functions/api/subscribe.js` 里 `buildEmail()` 的站名与资源链接（两处要保持一致）。
4. 提交推送，Cloudflare 自动重新部署，完成。

---

## 方案②：Railway（Node 服务器）

1. <https://railway.app> 用 GitHub 登录 → **Deploy from GitHub repo** 选仓库。
2. Build：`npm run build`；Start：`node ./dist/server/entry.mjs`。
3. Variables 里配 `RESEND_API_KEY`、`EMAIL_FROM` 等。
4. 域名：Settings → Custom Domain，去域名商加它给的 CNAME。
5. 注意：Railway 方案走的是 `src/pages/api/subscribe.ts`（不是 functions/ 那个），代码已两处都写好，会自动生效。

---

## 方案③：纯静态 + Web3Forms

1. Cloudflare Pages / Vercel / Netlify 连仓库，Build `npm run build`，输出 `dist/client`。
2. 到 <https://web3forms.com> 拿 Access Key，填环境变量 `PUBLIC_WEB3FORMS_KEY`。
3. 表单自动改走 Web3Forms；自动回信模板在它后台 **Email → Custom Autoresponder** 配（纯文本）。

> 方案③不推荐：自动回信是纯文本，没有宋式 HTML；且免费版有每月提交量上限。

---

## 评论（giscus，可选）

1. GitHub 仓库 → Settings → General → Features 开启 Discussions。
2. 打开 https://giscus.app → 填仓库名 → 选 Discussions 分类（如 Announcements）→ 复制 data-repo-id、data-category-id。
3. 填到 src/config.ts 的 comments（enabled 改 true），重新部署。

## 通用：Resend 域名验证（任何方案都要做）

Resend 为了能「以你的域名」发信，需要你在域名商加两条 DNS 记录：

- **SPF**：一条 TXT 记录
- **DKIM**：一条 CNAME 记录

在 Resend 后台点你的域名能看到具体值，照抄到 Cloudflare 的 DNS 即可。加完回到 Resend 点 Verify，一般几分钟内生效。

> 备案：域名托管在 Cloudflare（海外）不需要 ICP 备案；只有放中国大陆服务器才需要。

## - `SITE_URL` = 站点正式域名（或由部署平台注入）

环境变量 · 补充

- `GAME_DOWNLOAD_URL`：可选。订阅自动回信中《识药闯关》游戏下载链接；未设置时使用 Vercel Blob 公开地址（300 味分享版）。
