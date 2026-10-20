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

## Every field

Fields not marked optional are required. Dates are `YYYY-MM-DD` strings, URLs are `https://`, and text can't be empty.

### Conventions

| Field         | What it holds                                                                          |
| ------------- | -------------------------------------------------------------------------------------- |
| `id`          | Stable forever; editions and sources reference it                                      |
| `slug`        | The page at `/cons/<slug>/`; always the same as `id`                                   |
| `name`        | The convention's name as the organizer writes it                                       |
| `description` | Optional. Up to 500 characters about the convention                                    |
| `website`     | The official site                                                                      |
| `organizer`   | Optional. Who runs it                                                                  |
| `status`      | `active`, `hiatus` or `ended`                                                          |
| `status_note` | Optional; required for `hiatus` and `ended`. A summary of the organizer's announcement |
| `sources`     | Ids in `sources/` about the convention as a whole                                      |

Where a convention takes place is on its editions, since a touring convention has several cities.

### Editions

| Field               | What it holds                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | Stable forever; saved lists and calendar UIDs use it                                                                             |
| `series`            | The convention's id                                                                                                              |
| `edition`           | The label after the name: `2026`, or `Houston 2027` for a touring convention                                                     |
| `slug`              | The page at `/cons/<slug>/`; always the same as `id`                                                                             |
| `name`              | Optional. A name for this edition when it differs from the convention's                                                          |
| `status`            | `confirmed`, `dates_tba`, `postponed`, `cancelled` or `completed`                                                                |
| `status_note`       | Optional; required for `postponed` and `cancelled`. A summary of the organizer's announcement                                    |
| `start_date`        | Optional. The first day the organizer advertises                                                                                 |
| `end_date`          | Optional. The last day; left out for a one-day event                                                                             |
| `announced_window`  | Optional. Only what the organizer said, such as `Summer 2027`, never a guess                                                     |
| `venue`             | Optional. `name`, and optionally `address`                                                                                       |
| `city`              | The city, without "TX"                                                                                                           |
| `region`            | `north`, `east`, `central`, `gulf-coast`, `south` or `west`                                                                      |
| `timezone`          | `America/Chicago`, or `America/Denver` for far West Texas                                                                        |
| `url`               | The official page for this edition                                                                                               |
| `tickets_url`       | Optional. The official ticket page                                                                                               |
| `min_age`           | Optional. The organizer's minimum age to attend (18 for an 18+ convention)                                                       |
| `description`       | Optional. Up to 500 characters about this edition                                                                                |
| `evidence`          | At least one: `source`, `facts`, `checked_at`, and optionally `excerpt` (up to 300 characters, the organizer's words) and `note` |
| `last_verified_at`  | The last day the facts were confirmed against the evidence                                                                       |
| `last_attempted_at` | Optional. The last check, including ones that failed                                                                             |
| `updated_at`        | The last edit to the file                                                                                                        |
| `revision`          | Starts at 0 and goes up by one whenever a published fact changes                                                                 |

### Sources

| Field          | What it holds                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `id`           | Stable forever; evidence cites it                                                              |
| `series`       | The convention's id                                                                            |
| `url`          | The page                                                                                       |
| `type`         | `official_site`, `official_announcement`, `official_feed`, `organizer_social` or `third_party` |
| `supports`     | The facts it can back: `existence`, `dates`, `venue`, `city`, `status`, `tickets`, `age`       |
| `last_checked` | The last day the page was checked successfully                                                 |
| `access_notes` | Optional. How the page can be read and where on it the facts are                               |
| `notes`        | Optional                                                                                       |

## Ids

- A convention's id is its name in lowercase-kebab-case (`san-japan`).
- An edition's id is `<convention>-<year>` (`san-japan-2027`), or `<convention>-<city>-<year>` for a touring convention's city edition (`kimokawaii-conroe-2027`). A second edition in the same city and year adds the organizer's name for it (`example-con-winter-2027`).
- Published records are never renamed or deleted. A cancelled edition is marked `cancelled`, a convention that stops is marked `ended`, and an edition that ends stays as a past edition, so every page, saved list and calendar UID keeps working.

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
