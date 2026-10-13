// Subscribable feeds: every dated edition in Texas, and one per region that has any. Past editions stay in, so
// calendar apps don't delete events that already happened.
import { calendar, editionEvent } from '@conatlas/calendar';
import type { APIRoute } from 'astro';
import { editionTitle, eventDetails, getDataset, getFeeds } from '../../lib/data.ts';

export function getStaticPaths() {
  return Object.entries(getFeeds()).map(([feed, label]) => ({
    params: { feed },
    props: { label },
  }));
}

export const GET: APIRoute = ({ params, props }) => {
  const { series, editions } = getDataset();
  const names = new Map(series.map((s) => [s.id, s.name]));
  const events = editions
    .filter((e) => params.feed === 'all' || e.region === params.feed)
    .sort(
      (a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? '') || a.id.localeCompare(b.id),
    )
    .flatMap((e) => editionEvent(e, eventDetails(e, editionTitle(e, names.get(e.series)!))) ?? []);
  return new Response(calendar(`ConAtlas TX: ${props.label}`, events), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
