import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';
import { site } from './src/config';

// 白名单：默认 schema + 放行 div 与 class（用于 callout / resource-box 提示框）
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'div'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...((defaultSchema.attributes || {})['*'] || []), 'className', 'loading', 'decoding'],
  },
};

// https://astro.build/config
// 域名统一在 src/config.ts 里配置（可用环境变量 SITE_URL 覆盖）
export default defineConfig({
  site: site.url,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  markdown: {
    shikiConfig: { theme: 'github-dark' },
    // 安全：清洗 Markdown 里的原始 HTML（script/onerror 等一律剥离，div+class 放行）
    rehypePlugins: [rehypeRaw, [rehypeSanitize, sanitizeSchema]],
  },
});
