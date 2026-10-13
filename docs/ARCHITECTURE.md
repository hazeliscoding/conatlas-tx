# Architecture

ConAtlas TX is a static site built from YAML files in Git. There is no server, database or account system: every page, calendar file and feed is generated at build time and served as plain files from Vercel.

```
data/*.yaml ──▶ packages/core ──▶ apps/web (Astro build) ──▶ apps/web/dist ──▶ Vercel
  (records)     (schemas, rules)   + packages/calendar         (HTML, .ics,
       ▲                                                        sitemap, assets)
       │
 data/drafts/ ◀── research (maintainer or Claude Code skills), reviewed with packages/ingestion
```

## Packages

| Package              | Role                                                                                                                                                                                         | Depends on     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `packages/core`      | Zod schemas, date helpers (dates stay `YYYY-MM-DD` strings), cross-record validation, draft diffing and the re-check plan. Pure functions; Node file loading lives in `@conatlas/core/load`. | `zod`, `yaml`  |
| `packages/calendar`  | iCalendar generation (RFC 5545 escaping and folding) and Google Calendar links.                                                                                                              | core           |
| `packages/ingestion` | The `pnpm data:*` CLI: validate, report, propose, diff, promote. Never reaches the network.                                                                                                  | core           |
| `apps/web`           | The Astro site. Renders approved records only.                                                                                                                                               | core, calendar |

Packages ship TypeScript source with no build step; Node runs the CLI directly with type stripping.

## Data

Records live one per file in `data/conventions`, `data/editions` and `data/sources` (format in [`data/README.md`](../data/README.md), rules in [`DATA_POLICY.md`](DATA_POLICY.md)). Every build loads them through `getDataset()` in `apps/web/src/lib/data.ts`, which runs full validation and fails the build on any error, so invalid data can't be published. `data/drafts/` is never read by the build; how drafts are reviewed and promoted is in [`INGESTION_ENGINE.md`](INGESTION_ENGINE.md).

"Today" is the build date in America/Chicago. It decides which editions are upcoming, so the deploy workflow rebuilds every morning.

## The site

Astro builds every route to static HTML with trailing slashes (`vercel.json` redirects a path without one):

| Route                                                             | Built from                                                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                               | Upcoming editions grouped by month, region cards, verification steps                                                                                |
| `/calendar/`, `/calendar/YYYY-MM/`                                | One page per month from the current one to the last listed event (`lib/calendar.ts` lays out the grid)                                              |
| `/cons/<slug>/`                                                   | One page per edition, past ones included, with its evidence, breadcrumb data and Event structured data with its status for dated editions           |
| `/regions/<slug>/`                                                | Five region pages: a lead written from the data, the region's timeline and its calendar feeds; noindex while nothing is upcoming                    |
| `/cities/<slug>/`                                                 | Cities with three or more upcoming conventions, with their venues; every other city in the data redirects to its region                             |
| `/cons/<slug>.ics`, `/feeds/<feed>.ics`                           | Calendar files from `packages/calendar`; a region gets a feed once it has a dated edition                                                           |
| `/saved/`, `/contribute/`, `/about/`, `/404.html`, `/sitemap.xml` | Static pages and the sitemap                                                                                                                        |
| `/robots.txt`, `/llms.txt`                                        | Crawler policy (everything allowed, AI crawlers included) and a plain-text guide for AI assistants listing every convention with its page's summary |

Design tokens are copied verbatim from the design system into `apps/web/src/styles/tokens/` and mapped to Tailwind in `global.css`. Components are Astro components with scoped CSS, following [`brand/DESIGN_SYSTEM.md`](brand/DESIGN_SYSTEM.md).

### JavaScript is an enhancement

Every fact (dates, venues, statuses, sources) is in the HTML. Small bundled scripts add conveniences and keep their controls hidden until they run, so nobody without JavaScript sees a dead control:

| Script                                                                     | Adds                                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `components/FilterBar.astro`                                               | Region and city filters, mirrored in the URL so a view can be shared                                      |
| `components/ThemeSwitch.astro`                                             | The dark-mode switch (an inline head script applies the saved theme before paint)                         |
| `components/BookmarkButton.astro`, `SiteHeader.astro`, `pages/saved.astro` | The saved list in `localStorage` (`lib/saved.ts`), the header count, the Saved page and its `.ics` export |
| `components/CalendarExport.astro`                                          | Closes the "Add to calendar" menu on Escape or an outside click; the menu itself is a `<details>`         |
| `pages/contribute.astro`                                                   | Prefills the issue forms when arriving from a convention page                                             |

Nothing is sent anywhere: no analytics, cookies or third-party requests. Fonts are self-hosted.

## Delivery

- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request: install, typecheck, lint, format check, data validation, unit tests, build, then Playwright end-to-end tests with axe accessibility checks on the built site.
- **Deploy** (`.github/workflows/deploy.yml`) builds the site with the Vercel CLI and uploads the prebuilt output to Vercel after CI succeeds for a push to `main`, every morning, and on demand. Vercel never builds from Git. The build job runs the repository's code and gets no secrets; a separate deploy job holds the token and only uploads the built files, so no dependency ever runs next to it. The secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) belong to the `production` environment, which only `main` may deploy to, so a workflow on another branch can't read them. `vercel.json` sets the trailing-slash redirects and caches the fingerprinted `/_astro/` files for a year; pages and feeds are revalidated on every request, so a deploy shows at once.

## Tests

| Layer      | Where                              | Covers                                                                                                                                                                                   |
| ---------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit       | `packages/*/test`, `apps/web/test` | Schemas, dates, validation, drafts, iCalendar output (parsed with ical.js), calendar layout, the CLI                                                                                     |
| End to end | `e2e/`                             | Every convention reachable, no-JavaScript rendering, filters, saving, calendar files, contribution links, SEO tags, axe on every page type in both themes, screenshots for design review |
