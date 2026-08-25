# 云峰居 · 上线前必填清单

> 以下占位均在 src/config.ts / .env.example 中，需站长替换；未填前展示为默认占位值，无虚构信息。

| 位置 | 项目 | 当前占位 | 建议填写 |
|---|---|---|---|
| config.ts:url | 站点 URL | `https://example.com` | 真实域名（或设环境变量 SITE_URL） |
| config.ts:email | 联系邮箱 | `hello@example.com` | 真实邮箱 |
| config.ts:social GitHub | GitHub | `https://github.com/yourname` | 真实主页 |
| config.ts:social 即刻 | 即刻 | `https://example.com` | 真实主页 |
| config.ts:social 邮箱 | 邮箱 | `mailto:hello@example.com` | 真实邮箱 |
| config.ts:subscribe.resourceUrl | 订阅附赠下载 | `GAME_DOWNLOAD_URL || https://example.com/game` | 环境变量 GAME_DOWNLOAD_URL |
| config.ts:repo | 仓库 | 空 | 真实仓库地址 |
| .env.example | RESEND_API_KEY | 空 | Resend API Key（订阅邮件用） |
| .env.example | EMAIL_FROM | `云峰居 <share@example.com>` | 真实发件人 |
| .env.example | SITE_URL | 空 | 站点域名 |
| .env.example | GAME_DOWNLOAD_URL | 空 | 游戏下载链接 |

**说明**：以上均为占位符，无虚构数据；上线前逐项替换即可。