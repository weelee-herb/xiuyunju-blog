import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { site } from './src/config';

// https://astro.build/config
// 域名统一在 src/config.ts 里配置（可用环境变量 SITE_URL 覆盖）
export default defineConfig({
  site: site.url,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
