// One edition as a calendar file, behind "Add to calendar" on its page.
import { calendar, editionEvent } from '@conatlas/calendar';
import type { APIRoute } from 'astro';
import { editionTitle, eventDetails, getDataset } from '../../lib/data.ts';

export function getStaticPaths() {
  const { series, editions } = getDataset();
  return editions.flatMap((edition) => {
    const title = editionTitle(edition, series.find((s) => s.id === edition.series)!.name);
    const event = editionEvent(edition, eventDetails(edition, title));
    return event ? [{ params: { slug: edition.slug }, props: { title, event } }] : [];
  });
}

export const GET: APIRoute = ({ props }) =>
  new Response(calendar(props.title, [props.event]), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
