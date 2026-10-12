import { z } from 'zod';
import { isIsoDate } from './dates.ts';

export const REGIONS = ['north', 'central', 'gulf-coast', 'south', 'west'] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_NAMES: Record<Region, string> = {
  north: 'North Texas',
  central: 'Central Texas',
  'gulf-coast': 'Gulf Coast',
  south: 'South Texas',
  west: 'West Texas',
};

/** Texas venues are on Central time, except the far west (El Paso, Hudspeth) on Mountain. */
export const TIMEZONES = ['America/Chicago', 'America/Denver'] as const;

export const EDITION_STATUSES = [
  'confirmed',
  'dates_tba',
  'postponed',
  'cancelled',
  'completed',
] as const;
export type EditionStatus = (typeof EDITION_STATUSES)[number];

export const SERIES_STATUSES = ['active', 'hiatus', 'ended'] as const;

export const SOURCE_TYPES = [
  'official_site',
  'official_announcement',
  'official_feed',
  'organizer_social',
  'third_party',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Source types that can back a published fact. Third-party listings are leads only. */
export const OFFICIAL_SOURCE_TYPES: readonly SourceType[] = SOURCE_TYPES.filter(
  (type) => type !== 'third_party',
);

export const FACTS = ['existence', 'dates', 'venue', 'city', 'status', 'tickets'] as const;

const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase-kebab-case (a-z, 0-9, hyphens)');
const isoDate = z.string().refine(isIsoDate, 'must be a real date written YYYY-MM-DD');
const url = z.url({
  protocol: /^https$/,
  hostname: z.regexes.domain,
  error: 'must be an https:// URL',
});
const text = z.string().trim().min(1);

export const SourceSchema = z.strictObject({
  id,
  series: id,
  url,
  type: z.enum(SOURCE_TYPES),
  supports: z.array(z.enum(FACTS)).min(1),
  last_checked: isoDate,
  access_notes: text.optional(),
  notes: text.optional(),
});

export const SeriesSchema = z.strictObject({
  id,
  slug: id,
  name: text,
  description: text.max(500).optional(),
  website: url,
  organizer: text.optional(),
  city: text.optional(),
  region: z.enum(REGIONS).optional(),
  status: z.enum(SERIES_STATUSES),
  sources: z.array(id).min(1),
});

export const EvidenceSchema = z.strictObject({
  source: id,
  facts: z.array(z.enum(FACTS)).min(1),
  checked_at: isoDate,
  excerpt: text.max(300).optional(),
  note: text.optional(),
});

export const EditionSchema = z.strictObject({
  id,
  series: id,
  // YAML reads an unquoted `2026` as a number; accept both.
  edition: z.union([text, z.int().positive()]).transform(String),
  slug: id,
  name: text.optional(),
  status: z.enum(EDITION_STATUSES),
  status_note: text.optional(),
  start_date: isoDate.optional(),
  end_date: isoDate.optional(),
  /** Only what the organizer said, e.g. "Summer 2027". Never inferred from past editions. */
  announced_window: text.optional(),
  venue: z.strictObject({ name: text, address: text.optional() }).optional(),
  city: text,
  region: z.enum(REGIONS),
  timezone: z.enum(TIMEZONES),
  url,
  tickets_url: url.optional(),
  description: text.max(500).optional(),
  evidence: z.array(EvidenceSchema).min(1),
  /** Last date a maintainer successfully confirmed the facts against the evidence. */
  last_verified_at: isoDate,
  /** Last research attempt, including failed ones. */
  last_attempted_at: isoDate.optional(),
  /** Last date the record itself was edited. */
  updated_at: isoDate,
  /** Bumped whenever a published fact changes; feeds iCalendar SEQUENCE. */
  revision: z.int().min(0),
});

export type Source = z.infer<typeof SourceSchema>;
export type Series = z.infer<typeof SeriesSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Edition = z.infer<typeof EditionSchema>;

export interface Dataset {
  series: Series[];
  editions: Edition[];
  sources: Source[];
}
