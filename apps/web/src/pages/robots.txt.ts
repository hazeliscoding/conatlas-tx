// Everything is crawlable, and crawlers are pointed at the sitemap. Saved and 404 stay allowed:
// a crawler has to fetch them to see their noindex.
import type { APIRoute } from 'astro';
import { href } from '../lib/data.ts';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(href('sitemap.xml'), site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
