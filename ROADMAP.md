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
- **2026-10-13** — The data CLI stays offline: research (by a maintainer or the `/conatlas-refresh` and `/conatlas-add` skills) writes complete records to `data/drafts/`, and `data:propose` copies a published record as the starting point.
- **2026-10-13** — `data:diff` sorts changed fields into facts, verification and bookkeeping, and prints changed evidence in full, because evidence quotes and notes are public on each convention page. Control and bidi characters in draft text are printed as escapes.
- **2026-10-13** — An edition's `revision` goes up by one exactly when a published fact changes, and a convention rename counts as a fact change for each of its editions (it changes their calendar titles). `data:diff` and `data:promote` enforce it.
- **2026-10-13** — `data:promote` publishes only drafts named exactly (or `--all`, never both), after checking the published data with just those drafts applied, and removes drafts only once every copy succeeded. Agents run it only after the maintainer approves those drafts in the terminal.
- **2026-10-13** — Duplicate detection is a warning for a human: the same website host or a near-identical name for a convention, overlapping dates in the same series or city for an edition, the same URL for a source.
- **2026-10-13** — `data:report` re-checks an upcoming edition every 7 days within 30 days of its start, every 14 within 90, otherwise every 45; undated editions every 30, postponed ones every 14, and a series with nothing upcoming every 30 by its sources' `last_checked`.
- **2026-10-13** — Problems reaching a site go in the source's `access_notes`, which isn't shown on the site; evidence notes are public.
- **2026-10-13** — A recap sign-off such as "We'll see you at Anime Matsuri 2027!" doesn't announce the next edition. Without dates, a window or a location from the organizer, the series keeps "Next dates not announced".
- **2026-10-13** — Shared Claude Code skills live in `.claude/skills/` and are committed; the rest of `.claude/` stays ignored.
- **2026-10-13** — The flower mark (favicon, hero, footer and empty-state motif) is redrawn in M4. The design's path has six uneven petals and sits half a unit low in its box, while the design system described a four-petal flower. From seven drafts drawn from geometry (even petals, optically centered) and a three-reviewer shortlist, the maintainer chose five round petals, so the design system now describes a five-petal flower. The new path goes back to the claude.ai/design project so the two stay in sync.
- **2026-10-13** — M4 starts with the logo and an Impeccable design review, so the accessibility, performance and screenshot work that follows checks the final look.
- **2026-10-13** — The Impeccable design review ran three rounds against the design system and the design file until no material fix remained. From the design, the home page gained region cards and the verification steps, convention pages gained "Nearby and upcoming", and secondary lists use a compact card. The design's card-density tabs and "Hide cancelled events" checkbox are left out: the cards already read well at one density, and no edition is cancelled.
- **2026-10-13** — The hero eyebrow names no season ("VOL.01 · TEXAS"), so it can't go stale between rebuilds.
- **2026-10-13** — SEO basics: every page has its own title, description, canonical URL and Open Graph image; Saved and 404 are noindex; convention pages with organizer-confirmed dates carry schema.org Event data; `sitemap.xml` lists every indexable page. There is no `robots.txt`, since a project site can't serve one at the domain root, so the sitemap is submitted through Search Console in M5.
- **2026-10-13** — GitHub Pages deploys run after CI passes for a push to `main` (never for a fork), every morning, and on demand.
- **2026-10-13** — Hosting moves from GitHub Pages to Vercel, at the domain root (`https://conatlas-tx.vercel.app/`) instead of the `/conatlas-tx/` base path. The deploy workflow keeps its triggers and builds the site itself, then uploads the prebuilt output with a pinned Vercel CLI; Vercel never builds from Git. The token lives only in a deploy job that runs no repository code, so a compromised dependency in the build can't reach it, and only in the `production` environment, which only `main` may deploy to. Calendar UIDs don't include the host, so subscribed calendars keep their events. A domain root can serve `robots.txt`, which is left to M5.
- **2026-10-13** — Controls that need JavaScript (filters, Save, the theme switch) are shown by a `js` class the head script sets before first paint, and a head-started observer applies saved and theme state as elements are parsed. Nothing shifts or flips after first paint, and visitors without JavaScript still see no dead controls.
- **2026-10-13** — The body face and the heading face's 700 weight are preloaded. Layout shift measures 0.03 or less on every page on a throttled phone (Google's "good" is 0.1); the display weight (900) is left to swap, since preloading it competes with the CSS.
- **2026-10-13** — The site serves `robots.txt`, built from `site`: everything is allowed (Saved and 404 must stay fetchable so their noindex is seen) and it names the sitemap. This replaces the "no `robots.txt`" note in the SEO basics decision above.
- **2026-10-13** — Calendar month URLs never break. Every month from the current one to the last listed event has `/calendar/YYYY-MM/`. The current month's page names `/calendar/` as its canonical, and months that have passed redirect there with an immediate refresh, which search engines treat as a permanent move. Months with no conventions are noindex and left out of the sitemap. Month titles and descriptions name the month and the conventions in it. This replaces the 2026-10-12 rule that the current month has no page of its own.
- **2026-10-13** — The first M5 audit (four auditors, each checked by a skeptic) confirmed 17 findings, merged into nine fixes. The description of an ended, cancelled or postponed edition now says so, and the past-editions list includes every ended edition, so none is left without links. Long-cache headers for `/_astro/` files wait for the Core Web Vitals item, and region links for the region pages item. Month pages were reachable only through Next links, up to 13 clicks from home. The maintainer chose to make each month heading on the timeline a link to its calendar month. It looks the same at rest and gets the link color and a 2px underline on hover, so every month with conventions is one click from home.
- **2026-10-13** — Structured data follows Google's Event documentation as of 2026-10-13:
  - **Event data:** every edition with dates gets it, with its status (scheduled, postponed or cancelled). A postponed or cancelled event keeps its dates, as Google asks. This replaces "Event data for confirmed dates only" in the SEO basics decision.
  - **Address:** it's split into street and ZIP only when it reads exactly "<number street>, <city>, TX <ZIP>"; otherwise it stays at city level.
  - **Venue and organizer:** they appear only when the data has them, with no city or convention name standing in. The online-event property is gone, since Google dropped it in 2025.
  - **Left out:** image, offers and performer, since nothing licensed or sourced can fill them.
  - **Breadcrumbs and site name:** pages with a visible breadcrumb carry the same trail as `BreadcrumbList`, and the home page carries `WebSite` for the site name.
  - **Validation:** every page passes the Schema Markup Validator with no errors or warnings.
- **2026-10-13** — Region and city pages:
  - **Region pages:** there are five, at `/regions/<slug>/` (`north-texas`, `central-texas`, `gulf-coast`, `south-texas`, `west-texas`). A region with no upcoming convention keeps its page, but it is noindex and stays out of the sitemap.
  - **City pages:** a city gets `/cities/<slug>/` once it has three or more upcoming conventions (today only Houston). Smaller cities are listed on their region page, so no city page is a thin one-card page.
  - **Links:** the home page's region cards open the region page, and the filter bar still filters in place. On a convention page, the region label under the venue links to its region, and the city links to its city page when one exists. The footer lists the five regions, and the header doesn't change.
  - **Counting:** "upcoming" means what the home page counts, for every count, the noindex rule, the sitemap and the city threshold. A series still waiting for its next dates isn't counted. A cancelled edition counts until its end date.
  - **Old city addresses:** a city below three conventions redirects to its region, like a passed calendar month, so its URL never 404s.
  - **Copy:** page copy is only sentences built from the data, plus lines that are true for every region. Region slugs come from the region names, and a unit test pins them.
  - **Search titles:** the Gulf Coast page's search title says "Texas Gulf Coast".
  - **Structured data:** the pages carry only the BreadcrumbList for their visible breadcrumb.
- **2026-10-13** — AI assistants:
  - **Crawlers:** search engines and AI crawlers, for search and for training, are all welcome, since the data is CC BY 4.0. `robots.txt` says so and points to `/llms.txt`.
  - **`llms.txt`:** built with every daily build. It says what the site is and how dates are checked, and lists every listed convention with its summary, plus the regions, Houston's city page, the feeds and the about pages.
  - **Summaries:** each convention page's About section opens with a plain summary built only from the record: what, where, when, at which venue, who runs it, and when it was last checked. `llms.txt` uses the same sentence, so the two can't disagree.
  - **Not added:** Google says AI features need no special files, so nothing is written only for AI. `llms-full.txt` and Markdown copies of pages are left out until an assistant we care about uses them.
- **2026-10-13** — Core Web Vitals:
  - **How it was measured:** PageSpeed Insights' keyless quota was used up, so lab checks ran with Lighthouse 13.5 (mobile, simulated throttling) and a Chrome trace (4× CPU, Slow 4G). There is no CrUX field data yet.
  - **Render-blocking CSS:** it stays, because Chrome's trace estimates removing it saves 0 ms.
  - **Display fonts:** they keep swapping in, as decided in M4.
  - **Caching:** the trace found that fingerprinted `/_astro/` files were served with `max-age=0`, so every repeat visit re-checked each one. `vercel.json` now caches them for a year as immutable. Pages, feeds and other files keep Vercel's default revalidation.
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

- [x] `pnpm data:diff`, `pnpm data:propose`, `pnpm data:report`
- [x] Draft staging and explicit promotion
- [x] Semantic diff and duplicate detection
- [x] `/conatlas-refresh` and `/conatlas-add` skills (un-ignore `.claude/skills/` in `.gitignore`: the maintainer's global gitignore excludes `.claude/`)
- [x] `docs/INGESTION_ENGINE.md`, `docs/MAINTENANCE.md`

Done when: a refresh stages drafts, the diff report is correct on fixtures, and nothing reaches `data/` without explicit maintainer approval.

Status 2026-10-13: a live refresh of five conventions staged 19 drafts, a second agent re-checked every quote, and the maintainer approved 16 of them (Anime Matsuri 2027 held). The CLI tests compare the full `data:diff` output on a fixture and show that only `data:promote` writes published data, and only for drafts it checked. 68 unit and 82 end-to-end tests pass. Waiting on the maintainer's review.

## M4 — Production readiness

- [x] Logo: redraw the flower mark with even petals, centered in its box, and check it with the wordmark, favicon and every motif at each size and in both themes
- [x] Impeccable design review of every page type (desktop and mobile, light and dark), fixing what it finds
- [x] Accessibility review (keyboard, screen reader, reduced motion, zoom)
- [x] SEO: metadata, canonical URLs, sitemap, Open Graph, event structured data for confirmed dates only
- [x] Performance pass
- [x] Deploy workflow (GitHub Pages, then Vercel)
- [x] `docs/ARCHITECTURE.md`, README screenshots, public beta checklist

Done when: all CI gates pass, the design review has nothing left to fix, there are no critical accessibility failures, and the site deploys statically.

Status 2026-10-13: CI passes (68 unit and 64 end-to-end tests, axe on every page type in both themes), after three design-review rounds a final pass found nothing left to fix, Lighthouse scores 100 for accessibility, and layout shift stays at 0.03 or less on a throttled phone. The site deploys to https://conatlas-tx.vercel.app/ after CI: every page type, calendar file and the sitemap return 200 with the right types, paths without a trailing slash redirect, and missing pages get the site's 404. Approved by the maintainer on 2026-10-13.

## M5 — Search and discovery

- [x] SEO audit of the live site: indexing, titles and descriptions, internal links, crawl errors (Search Console's crawl reports get a second look once Google has crawled the site)
- [x] Structured data checked with Google's Rich Results Test: `Event` for dated editions (scheduled, postponed, cancelled), plus `BreadcrumbList` and `WebSite` (2026-10-13: all 16 convention pages have valid Events and Breadcrumbs, and Contribute has valid Breadcrumbs. The only warnings are for optional fields we have no sourced data for. `WebSite` passes the Schema Markup Validator, since the Rich Results Test doesn't cover site names.)
- [x] Region pages, and city pages where enough conventions exist to be useful, generated from the data (2026-10-13: five region pages and a Houston city page. Two design-review rounds, and the second found nothing left to fix.)
- [x] AI answer engines: `llms.txt` and plain factual summaries they can cite (2026-10-13)
- [x] Core Web Vitals lab checks on every page type (2026-10-13: Lighthouse mobile scores 97 to 100, LCP 1.2–1.6 s, total blocking time 26 ms or less, CLS 0.002 or less on all 11 page types)
- [ ] Core Web Vitals field data from Search Console once there's enough traffic
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
