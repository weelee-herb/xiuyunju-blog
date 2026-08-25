import { getCollection } from 'astro:content';
import { marked } from 'marked';
import { site } from '../config';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Markdown → HTML（供 RSS 全文）；轻量清洗危险标签
const toHtml = (md: string) =>
  (marked.parse(md ?? '') as string)
    .replace(/<(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '');

const cdata = (s: string) => s.replace(/\]\]>/g, ']]]]><![CDATA[>');

export async function GET() {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const items = posts
    .map((p) => {
      const bodyHtml = cdata(toHtml(p.body ?? ''));
      return `    <item>
      <title>${escapeXml(p.data.title)}</title>
      <link>${site.url}/blog/${p.slug}/</link>
      <guid>${site.url}/blog/${p.slug}/</guid>
      <pubDate>${p.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(p.data.description)}</description>
      <content:encoded><![CDATA[${bodyHtml}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${site.url}/</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(site.description)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
