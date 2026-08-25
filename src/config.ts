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

  // 站点建立日期（页脚「已运行 N 天」用）
  siteSince: '2026-07-29', // 真实开站日期

  // 域名：以后定了就二选一——
  //   a) 直接改下面这行；或 b) 在部署平台设置环境变量 SITE_URL（不改代码）
  url: process.env.SITE_URL || 'https://xiuyunju.cc.cd', // 已确认：DNS 指向 Cloudflare
// TODO: 站长填真实域名（或部署平台设置 SITE_URL）
  email: 'hello@example.com',
// TODO: 站长填真实邮箱

  // 首页「关于我」区块的短介绍
  aboutShort:
    '白天写代码，晚上与 AI 一起捣鼓些好玩的东西。这里记录我用 Codex 搭网站、写工具、做生成艺术的笔记与踩坑实录。',

  // 页脚 / 关于页展示的社交链接
  social: [
    { label: 'GitHub', url: 'https://github.com/weelee-herb' },
    { label: '邮箱', url: 'mailto:lwoo0448@gmail.com' },
  ],

  // 友链（博客圈互推）：留空数组则页面显示「虚位以待」
  friends: [
    { name: '中药题库', url: 'https://herb-quiz.cc.cd/', desc: '邀请码：692626', seal: '题' },
  ],

  // 项目直达清单：新增作品时在这里登记，自动出现在 /projects/ 与顶部导航
  projects: [
    {
      slug: 'herb-quiz',
      name: '中药题库',
      fullName: '执业药师（中药学）在线刷题系统',
      desc: '刷题 · 模考 · 错题本 · AI 智能解析',
      href: 'https://herb-quiz.cc.cd/',
      external: true,
      note: '邀请码 692626',
      icon: '题',
    },
    {
      slug: 'herb-game',
      name: '识药闯关',
      fullName: '《识药闯关》看图认中药小游戏',
      desc: '300 味中药看图认名，离线可玩',
      href: '/game/',
      external: false,
      note: '下载离线分享包 27MB',
      download: 'https://arelpjfm9rt6pv8z.public.blob.vercel-storage.com/game-300.zip',
      icon: '药',
    },
    {
      slug: 'yunxiu',
      name: '云岫居',
      fullName: '云岫居 · 独立博客',
      desc: 'AI 创作、建站经验、本草与生活',
      href: '/',
      external: false,
      note: '本站首页',
      icon: '云',
    },
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
    resourceUrl: process.env.GAME_DOWNLOAD_URL || 'https://arelpjfm9rt6pv8z.public.blob.vercel-storage.com/game-300.zip',
// 换资源时改这里（或部署时配置 GAME_DOWNLOAD_URL 覆盖）
    note: '本期附赠：300 味中药看图认名小游戏（离线可玩，纯兴趣分享）。',
  },

  // 可选：访问统计（Umami）。到 https://cloud.umami.is 免费建站后，把网站 ID 填进来
  analytics: {
    umamiId: 'd83bea8a-df55-42c8-9cee-4af6b45d4b50', // Umami 网站 ID（站长后台截图核对）
  },

  // 可选：评论（giscus，基于 GitHub Discussions）。留空 repo = 关闭评论
  comments: {
    // 'waline' = 邮箱即可评论（推荐）；'giscus' = GitHub 评论
    type: 'waline',
    enabled: true,
    waline: {
      serverURL: 'https://comment-section-flax.vercel.app', // Waline 后端
    },
    // giscus 备选配置（type 切回 'giscus' 即可用）
    repo: 'weelee-herb/xiuyunju-blog',
    repoId: 'R_kgDOUDWNGw',
    category: 'Announcements',
    categoryId: 'DIC_kwDOUDWNG84DEIxh',
  },
};
