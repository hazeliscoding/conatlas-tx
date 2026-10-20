# Data

Convention data lives here as YAML, one record per file, named `<id>.yaml`. It is the only datastore: the site and calendar feeds are built from it.

| Directory      | Holds                                                        | Published |
| -------------- | ------------------------------------------------------------ | --------- |
| `conventions/` | Convention series: the recurring identity (San Japan)        | yes       |
| `editions/`    | One occurrence of a series (San Japan 2026)                  | yes       |
| `sources/`     | Official pages that back the facts                           | yes       |
| `drafts/`      | Proposed records waiting for maintainer review (same layout) | never     |

Run `pnpm data:validate` after any change. Drafts are checked with `pnpm data:diff`, because `pnpm data:validate` reads only published data. The schemas are in [`packages/core/src/schema.ts`](../packages/core/src/schema.ts).

## Convention example

```yaml
id: example-con # stable forever; editions reference it
slug: example-con # URL path
name: Example Convention
website: https://example.org
status: active # active | hiatus | ended
sources:
  - example-con-site # an id in sources/
```

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
region: gulf-coast # north | east | central | gulf-coast | south | west
timezone: America/Chicago # America/Denver only for far West Texas
url: https://example.org
evidence:
  - source: example-con-site # an id in sources/
    facts: [dates, venue, city] # existence, dates, venue, city, status, tickets, age
    checked_at: 2026-10-11
    excerpt: November 13-15, 2026 at the Example Convention Center
last_verified_at: 2026-10-11 # last successful check, never just "last time someone looked"
updated_at: 2026-10-11 # last edit to this file
revision: 0 # bump when a published fact changes
```

## Source example

```yaml
id: example-con-site # stable forever; editions cite it in evidence
series: example-con
url: https://example.org
type: official_site # official_site | official_announcement | official_feed | organizer_social | third_party
supports: [existence, dates, venue, city] # existence, dates, venue, city, status, tickets, age
last_checked: 2026-10-11 # YYYY-MM-DD, last successful check
```

## Rules the validator enforces

- IDs are lowercase-kebab-case and match the file name, and a slug always matches its id. IDs and slugs are unique, and a convention's slug never matches an edition's, since both pages live under `/cons/`.
- Every edition has evidence from an official source. Third-party listings never count.
- Shown dates, venues and cancellation or postponement statuses each need official evidence for that fact.
- `confirmed` and `completed` need dates; `dates_tba` must not have them; `completed` must be in the past.
- `min_age`, the organizer's minimum age to attend (18 for an 18+ convention), needs official evidence for `age`.
- `postponed` and `cancelled` need a `status_note` summarizing the organizer's announcement.
- A series marked `hiatus` or `ended` needs a `status_note` summarizing the organizer's announcement, and an official source that supports `status`. All its editions must be completed or cancelled.
- `last_verified_at` can't be later than the latest evidence check.
- URLs must be `https://`.
