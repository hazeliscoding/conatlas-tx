# Roadmap

ConAtlas TX v0.1: the smallest genuinely excellent Texas anime convention calendar.
Each milestone ends at a gate: tests run, results reported, and the maintainer approves before the next one starts.

## Decisions

- **2026-10-11** — Approved visual source of truth is the claude.ai/design project "ConAtlas TX" (`ConAtlas TX.dc.html` plus its design-system bundle). Tokens are copied into `apps/web/src/styles/tokens/`; the brand spec lives in `docs/brand/DESIGN_SYSTEM.md`.
- **2026-10-11** — Git-versioned YAML in `data/` is the only datastore. One record per file, file name = record `id`. `data/drafts/` is never read by production builds.
- **2026-10-11** — Dates are `YYYY-MM-DD` strings end to end. No `Date` objects in the domain model, so nothing shifts through UTC.
- **2026-10-11** — Edition status is one of `confirmed`, `dates_tba`, `postponed`, `cancelled`, `completed`. Series activity (`active`, `hiatus`, `ended`) is separate.
- **2026-10-11** — Every edition needs official evidence. The design prototype's "dates unconfirmed, from a community submission" state is not publishable under the data policy; such dates stay in drafts until an official source confirms them.
- **2026-10-11** — Regions follow the design: North Texas, Central Texas, Gulf Coast, South Texas, West Texas. Time zones are `America/Chicago`, or `America/Denver` for West Texas venues such as El Paso.
- **2026-10-11** — TypeScript is pinned to 6.0.x. TypeScript 7 is out but `typescript-eslint` and `@astrojs/check` do not support it yet.
- **2026-10-11** — Workspace packages ship TypeScript source with no build step. The ingestion CLI runs on Node 24's built-in type stripping, so it works the same in PowerShell and bash.
- **2026-10-11** — Fonts are self-hosted through Fontsource instead of the design's Google Fonts import, so visitors make no third-party requests.
- **2026-10-11** — Primary deploy target is GitHub Pages via Actions. The output stays plain static files, so Cloudflare Pages works too.
- **2026-10-11** — Code is MIT. Convention data in `data/` is CC BY 4.0 (as the design's About page states). Organizer names, logos and images are not covered by either license.
- **2026-10-11** — The repository is public at `hazeliscoding/conatlas-tx`.
- **2026-10-12** — Filters are progressive enhancement: the full timeline is static HTML, and the filter bar stays hidden until its script runs, so nobody without JavaScript sees dead controls.
- **2026-10-12** — Design components are rebuilt as Astro components with the design's CSS ported into scoped styles. No React until something needs client state beyond a small script.
- **2026-10-12** — The calendar is one static page per month (`/calendar/` for the current one, `/calendar/YYYY-MM/` through the last listed event), so month navigation is plain links. The design's day-selection panel and month/year selects are left out; the agenda list carries the same facts.
- **2026-10-12** — The verification panel lists every evidence entry: the facts it backs, the official page, and the quoted excerpt. Map links go to OpenStreetMap.
- **2026-10-12** — End-to-end checks use Playwright (Chromium, desktop and mobile) with axe; serious and critical WCAG 2.2 AA issues fail CI. Screenshots are captured for review, not diffed: the design's fixtures are fictional, so pixel baselines against it wouldn't mean anything.
- **2026-10-12** — Small text on tinted date blocks uses `--text-2` and `--sage-700` instead of the reference's muted and sage-ink colors, which fall just under AA there. The tokens themselves are unchanged.
- **2026-10-12** — A touring brand (KimoKawaii, Animeverse Fest) is one series with an edition per city, labelled like `Houston 2027`.
- **2026-10-12** — East Texas cities such as Tyler belong to North Texas until the design adds a region for them.
- **2026-10-12** — A series with no announced next edition keeps only its latest completed edition, so the site can say the next dates aren't announced.
- **2026-10-12** — The saved list is browser-local: edition ids in `localStorage` under `conatlas-saved`. Cards offer Save except for a past edition standing in for its series, and a convention page offers it until the edition ends. Unsaving on the Saved page keeps the card until the page is left, in place of the design's undo toast and remove-confirmation dialog.
- **2026-10-12** — The Save button's label carries its state ("Save", "Saved"), so it has no `aria-pressed`; a toggle's name shouldn't change with its state.
- **2026-10-12** — "Add to calendar" is a `<details>` menu with a static `.ics` per edition and a Google Calendar link, shown for upcoming confirmed editions. The design's "Copy dates as text" is left out.
- **2026-10-12** — Calendar files use UID `<edition id>@conatlas-tx`, SEQUENCE from `revision`, DTSTAMP from `updated_at`, and all-day dates with an exclusive end. Cancelled and postponed editions are `STATUS:CANCELLED` with the status in the title.
- **2026-10-12** — Feeds live at `feeds/all.ics` and `feeds/<region>.ics` and keep past editions, so calendar apps don't drop events that already happened. A region gets its feed once it has a dated edition, because iCalendar needs at least one event.
- **2026-10-12** — The design's five report paths share the roadmap's four issue forms: dates and venue both open the correction form. The Contribute page prefills a convention only from known edition ids, and never on the new-convention form.
- **2026-10-12** — The maintainer contact for conduct reports, security reports and people without a GitHub account is a Proton Pass alias, conatlas-tx.landing118@passfwd.com.
- **2026-10-12** — Public pages describe verification by what readers can check (organizer sources, human review), not by the tools used. `docs/DATA_POLICY.md` documents the research process.
- **2026-10-12** — Search optimization gets its own milestone, M5, after launch: audits, rich-result checks and field data need the deployed site. M4 keeps the launch basics (metadata, canonical URLs, sitemap, Open Graph, event structured data). Measurement uses Search Console and public tools, never tracking scripts.
- **2026-10-11** — `ROADMAP.md` lives at the repo root (the handoff suggested `docs/ROADMAP.md`) to match the maintainer's repo-first workflow.

## M0 — Repository foundation

- [x] pnpm workspace, TypeScript, ESLint, Prettier, Vitest
- [x] `packages/core`: Zod schemas, date helpers, dataset loader, cross-record validation
- [x] `packages/ingestion`: `pnpm data:validate`
- [x] `packages/calendar`: all-day date range helper
- [x] `apps/web`: Astro + Tailwind skeleton with the design tokens and self-hosted fonts
- [x] CI workflow: install, typecheck, lint, format, data validation, tests, build

Done when: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm data:validate` and `pnpm build` all pass locally and in CI, and the schemas accept the valid fixtures and reject the invalid ones.

Status 2026-10-11: everything passes locally on a clean frozen install (21 tests, `pnpm audit` clean), and the first CI run on `main` passed. M0 is done.

## M1 — Core website

- [x] Seed dataset of real Texas conventions, each backed by an official source
- [x] Home: hero, upcoming timeline grouped by month, region and city filters
- [x] Calendar: month grid, mobile agenda, month navigation, region filter, "Dates not announced" group
- [x] Convention detail page per edition, with status banners and verification panel
- [x] Shareable filter query parameters
- [x] Light and dark themes, responsive layouts
- [x] About page, `docs/DATA_POLICY.md`
- [x] Playwright smoke tests, axe checks, desktop and mobile screenshots compared with the design

Done when: someone can find, filter and open every seeded convention with no JavaScript required for the facts, source links work, and no unverified event is shown.

## M2 — Personal planning

- [x] Browser-local bookmarks and the Saved page
- [x] `.ics` download per edition and for the saved list
- [x] Static `.ics` feeds: all upcoming, and one per region
- [x] Contribute page and GitHub issue forms (new convention, correction, cancellation or postponement, broken link)
- [x] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

Done when: bookmarks survive a reload, generated calendars parse with an iCalendar parser, and every contribution path opens the right issue form.

Status 2026-10-12: all three are covered by end-to-end tests (82 pass). Every feed and edition `.ics` parses with ical.js, and the icalendar.org validator accepts `feeds/all.ics` and an edition file. Waiting on the maintainer's review.

## M3 — Claude-assisted ingestion

- [ ] `pnpm data:diff`, `pnpm data:propose`, `pnpm data:report`
- [ ] Draft staging and explicit promotion
- [ ] Semantic diff and duplicate detection
- [ ] `/conatlas-refresh` and `/conatlas-add` skills (un-ignore `.claude/skills/` in `.gitignore`: the maintainer's global gitignore excludes `.claude/`)
- [ ] `docs/INGESTION_ENGINE.md`, `docs/MAINTENANCE.md`

Done when: a refresh stages drafts, the diff report is correct on fixtures, and nothing reaches `data/` without explicit maintainer approval.

## M4 — Production readiness

- [ ] Accessibility review (keyboard, screen reader, reduced motion, zoom)
- [ ] SEO: metadata, canonical URLs, sitemap, Open Graph, event structured data for confirmed dates only
- [ ] Performance pass
- [ ] Deploy workflow for GitHub Pages
- [ ] `docs/ARCHITECTURE.md`, README screenshots, public beta checklist

Done when: all CI gates pass, there are no critical accessibility failures, and the site deploys statically.

## M5 — Search and discovery

- [ ] SEO audit of the live site: indexing, titles and descriptions, internal links, crawl errors
- [ ] Structured data checked with Google's Rich Results Test: `Event` for confirmed editions, plus `BreadcrumbList` and `WebSite`
- [ ] Region pages, and city pages where enough conventions exist to be useful, generated from the data
- [ ] AI answer engines: `llms.txt` and plain factual summaries they can cite
- [ ] Core Web Vitals: lab checks on every page type, and field data from Search Console once there's enough traffic
- [ ] Google Search Console and Bing Webmaster Tools verified, sitemap submitted (maintainer's accounts)

Done when: an SEO audit of the live site finds no critical issues, every confirmed edition passes the Rich Results Test, and Search Console reads the sitemap without errors.

## Later

- East Texas and Panhandle as their own regions if the dataset needs them
- `pnpm data:format`
- Archive pages per convention series

## Not planned

- Accounts, notifications, reviews or social features
- Scheduled scraping, crawlers or background AI agents
- A backend, database or public submission form
- Ticketing, hotel booking or monetization
