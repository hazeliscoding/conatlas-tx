// Everything is crawlable, and crawlers are pointed at the sitemap. Saved and 404 stay allowed:
// a crawler has to fetch them to see their noindex. AI crawlers are welcome too, for search
// and training alike (the 2026-10-13 decision): the data is CC BY 4.0.
import type { APIRoute } from 'astro';
import { href } from '../lib/data.ts';

export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      '# ConAtlas TX: Texas anime convention data, licensed CC BY 4.0.',
      '# Search engines and AI crawlers (search and training) are welcome.',
      `# A plain-text summary for AI assistants: ${new URL(href('llms.txt'), site)}`,
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${new URL(href('sitemap.xml'), site)}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
