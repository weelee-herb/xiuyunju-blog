import { getCollection } from 'astro:content';
import { site } from '../config';

export async function GET() {
  const posts = (await getCollection('blog')).filter((p) => !p.data.draft);
  const pages = ['/', '/blog/', '/about/', '/subscribe/', '/reset-password/', '/search/', '/tags/', '/links/', '/game/', '/privacy/', '/notes/', '/herbs/', '/essays/', '/featured/', '/archive/'];

  const urls = [
    ...pages.map(
      (p) => `  <url><loc>${site.url}${p}</loc><changefreq>weekly</changefreq></url>`,
    ),
    ...posts.map(
      (p) => `  <url><loc>${site.url}/blog/${p.slug}/</loc><lastmod>${p.data.date.toISOString().slice(0, 10)}</lastmod></url>`,
    ),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
