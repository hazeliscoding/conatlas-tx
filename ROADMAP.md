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
- **2026-10-11** — `ROADMAP.md` lives at the repo root (the handoff suggested `docs/ROADMAP.md`) to match the maintainer's repo-first workflow.

## M0 — Repository foundation

- [x] pnpm workspace, TypeScript, ESLint, Prettier, Vitest
- [x] `packages/core`: Zod schemas, date helpers, dataset loader, cross-record validation
- [x] `packages/ingestion`: `pnpm data:validate`
- [x] `packages/calendar`: all-day date range helper
- [x] `apps/web`: Astro + Tailwind skeleton with the design tokens and self-hosted fonts
- [x] CI workflow: install, typecheck, lint, format, data validation, tests, build

Done when: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm data:validate` and `pnpm build` all pass locally and in CI, and the schemas accept the valid fixtures and reject the invalid ones.

Status 2026-10-11: everything passes locally on a clean frozen install (21 tests, `pnpm audit` clean). The CI run is still pending because the GitHub repo doesn't exist yet.

## M1 — Core website

- [ ] Seed dataset of real Texas conventions, each backed by an official source
- [ ] Home: hero, upcoming timeline grouped by month, region and city filters
- [ ] Calendar: month grid, mobile agenda, month navigation, region filter, "Dates not announced" group
- [ ] Convention detail page per edition, with status banners and verification panel
- [ ] Shareable filter query parameters
- [ ] Light and dark themes, responsive layouts
- [ ] About page, `docs/DATA_POLICY.md`
- [ ] Playwright smoke tests, axe checks, desktop and mobile screenshots compared with the design

Done when: someone can find, filter and open every seeded convention with no JavaScript required for the facts, source links work, and no unverified event is shown.

## M2 — Personal planning

- [ ] Browser-local bookmarks and the Saved page
- [ ] `.ics` download per edition and for the saved list
- [ ] Static `.ics` feeds: all upcoming, and one per region
- [ ] Contribute page and GitHub issue forms (new convention, correction, cancellation or postponement, broken link)
- [ ] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`

Done when: bookmarks survive a reload, generated calendars parse with an iCalendar parser, and every contribution path opens the right issue form.

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

## Later

- East Texas and Panhandle as their own regions if the dataset needs them
- `pnpm data:format`
- Archive pages per convention series

## Not planned

- Accounts, notifications, reviews or social features
- Scheduled scraping, crawlers or background AI agents
- A backend, database or public submission form
- Ticketing, hotel booking or monetization
