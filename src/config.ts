// ───────────────────────────────────────────────
// 站点配置：改这里，整个博客都会跟着变
// ───────────────────────────────────────────────
export const site = {
  // 站名 / 笔名
  name: '云岫居',
  enName: 'Yunxiu',
  author: '林屿',
  authorTitle: '独立开发者 · AI 创作者',

  // 首页与 SEO 用的副标题 / 描述
  tagline: '以代码为笔，以 AI 为墨',
  description:
    '记录我用 Codex 与 AI 创作、建站、设计的笔记与分享：工作流、踩坑实录与意外之喜。',

  // 域名：以后定了就二选一——
  //   a) 直接改下面这行；或 b) 在部署平台设置环境变量 SITE_URL（不改代码）
  url: process.env.SITE_URL || 'https://example.com',
// TODO: 站长填真实域名（或部署平台设置 SITE_URL）
  email: 'hello@example.com',
// TODO: 站长填真实邮箱

  // 首页「关于我」区块的短介绍
  aboutShort:
    '白天写代码，晚上与 AI 一起捣鼓些好玩的东西。这里记录我用 Codex 搭网站、写工具、做生成艺术的笔记与踩坑实录。',

  // 页脚 / 关于页展示的社交链接
  social: [
    { label: 'GitHub', url: 'https://github.com/yourname' },
// TODO: 站长填真实 GitHub 主页
    { label: '即刻', url: 'https://example.com' },
// TODO: 站长填真实即刻主页
    { label: '邮箱', url: 'mailto:hello@example.com' },
// TODO: 站长填真实邮箱地址
  ],

  // 订阅表单与「自动回信」邮件的内容
  subscribe: {
    heading: '订阅我的分享',
    sub: '留下邮箱，我会不定期把最新的 AI 创作笔记与资源包自动发到你的邮箱，绝不打扰。',
    button: '订阅',
    success: '已发送，请查收邮箱 ✉',
    // provider: 'resend' 用 Node 部署（推荐）；'web3forms' 用纯静态部署
    provider: 'resend',
    // 访客订阅后，自动发给他的邮件里附带的资源
    resourceTitle: '《识药闯关》看图认中药小游戏',
    resourceUrl: process.env.GAME_DOWNLOAD_URL || 'https://example.com/game',
// TODO: 部署时配置 GAME_DOWNLOAD_URL
    note: '本期附赠：300 味中药看图认名小游戏（离线可玩，纯兴趣分享）。',
  },

  // 可选：访问统计（Umami）。到 https://cloud.umami.is 免费建站后，把网站 ID 填进来
  analytics: {
    umamiId: '', // 留空 = 关闭统计
  },

  // 可选：评论（giscus，基于 GitHub Discussions）。留空 repo = 关闭评论
  comments: {
    enabled: false,
    repo: '', // 例如 'yourname/yunxiu-blog'
 // TODO: 站长填真实仓库地址
    repoId: '', // 到 https://giscus.app 填写仓库后生成
    category: 'Announcements',
    categoryId: '', // giscus 生成
  },
};
