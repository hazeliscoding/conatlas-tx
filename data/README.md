# Data

Convention data lives here as YAML, one record per file, named `<id>.yaml`. It is the only datastore: the site and calendar feeds are built from it.

| Directory      | Holds                                                        | Published |
| -------------- | ------------------------------------------------------------ | --------- |
| `conventions/` | Convention series: the recurring identity (San Japan)        | yes       |
| `editions/`    | One occurrence of a series (San Japan 2026)                  | yes       |
| `sources/`     | Official pages that back the facts                           | yes       |
| `drafts/`      | Proposed records waiting for maintainer review (same layout) | never     |

Run `pnpm data:validate` after any change. The schemas are in [`packages/core/src/schema.ts`](../packages/core/src/schema.ts).

## Edition example

```yaml
id: example-con-2026 # stable forever; bookmarks and calendar UIDs use it
series: example-con
edition: 2026
slug: example-con-2026 # URL path
status: confirmed # confirmed | dates_tba | postponed | cancelled | completed
start_date: 2026-11-13 # YYYY-MM-DD, the days the organizer advertises
end_date: 2026-11-15
venue:
  name: Example Convention Center
city: Houston
region: gulf-coast # north | central | gulf-coast | south | west
timezone: America/Chicago # America/Denver only for far West Texas
url: https://example.org
evidence:
  - source: example-con-site # an id in sources/
    facts: [dates, venue, city] # existence, dates, venue, city, status, tickets
    checked_at: 2026-10-11
    excerpt: November 13-15, 2026 at the Example Convention Center
last_verified_at: 2026-10-11 # last successful check, never just "last time someone looked"
updated_at: 2026-10-11 # last edit to this file
revision: 0 # bump when a published fact changes
```

## Rules the validator enforces

- IDs are lowercase-kebab-case and match the file name. IDs and slugs are unique.
- Every edition has evidence from an official source. Third-party listings never count.
- Shown dates, venues and cancellation or postponement statuses each need official evidence for that fact.
- `confirmed` and `completed` need dates; `dates_tba` must not have them; `completed` must be in the past.
- `postponed` and `cancelled` need a `status_note` summarizing the organizer's announcement.
- A series marked `hiatus` or `ended` needs a `status_note` summarizing the organizer's announcement, and an official source that supports `status`. It can't have an edition still to come.
- `last_verified_at` can't be later than the latest evidence check.
- URLs must be `https://`.
