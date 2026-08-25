import { getCollection } from 'astro:content';

export async function GET() {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const data = posts.map((p) => ({
    slug: p.slug,
    title: p.data.title,
    description: p.data.description,
    date: p.data.date.toISOString(),
    tags: p.data.tags,
    body: (p.body ?? '')
      .replace(/[#>*\`_\-\[\]()!]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 4000),
  }));

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
