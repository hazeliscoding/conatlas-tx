# ConAtlas TX design system

The approved visual direction for ConAtlas TX. It comes from the maintainer's claude.ai/design project "ConAtlas TX" (prototype `ConAtlas TX.dc.html` and its design-system bundle). That project is the visual source of truth; this file is the in-repo summary.

**Tagline:** Discover your next anime adventure.
**Audience:** anime fans, cosplayers, convention newcomers, returning attendees. Free, community-maintained, Texas-only.

## Where things live

- Tokens: `apps/web/src/styles/tokens/` (`colors`, `typography`, `spacing`, `motion`, `base`), copied verbatim from the design system. `apps/web/src/styles/global.css` loads them and maps them to Tailwind.
- Fonts: self-hosted with Fontsource instead of the design's Google Fonts import, so visitors make no third-party requests.
- Components: reference React implementations live in the design project under `_ref/components/` (`core`, `discovery`, `navigation`, `brand`). They are rebuilt here as Astro components and small React islands, following those specs.

## Direction: Zine Editorial

A 1990s anime magazine layout: big rounded display type, dusty pink, lavender and sage on ivory, ribbon section labels, thin plum rules, and a pixel-font byline here and there. Retro computing stays an accent (pixel-font metadata, sticker offset shadows, dotted dividers); the personality budget goes to type and color.

## Content

- **Voice:** a knowledgeable friend who has been to every con. Warm, plain, specific. Second person ("Save cons you want to attend"), first-person plural for the project ("We verify dates against the organizer's site").
- **Casing:** sentence case everywhere. Tracked uppercase only for H6 and meta eyebrows (12–14px).
- **Dates:** month abbreviation, no leading zeros: "Mar 14–16, 2026", "Jun 5–7". Ranges use an en dash. Day of week on cards: "Fri–Sun". Times in 12-hour with lowercase am/pm.
- **Status is literal and never color-only:** "Verified Jan 12", "Postponed — new dates TBA", "Cancelled". Every status chip has an icon and text.
- **Honest uncertainty:** unannounced dates read "Dates not announced" and look tentative (dashed outline). Never imply confirmation.
- **No emoji, no decorative Japanese text.** Allowed symbols: en dash, middot (·) as a metadata separator, arrows (→) in links.
- **Buttons are verbs:** "Save", "Add to calendar", "Visit official site", "Clear all".
- **Microcopy:** "Saved to your list" / "Removed from your list" (toast); "Nothing here yet — try widening the month range" (empty); "Something's off? Suggest a correction"; "Add to calendar (.ics)".

## Visual foundations

- **Color:** warm ivory page (`#FBF6EE`), near-white cards, deep plum text (`#3B2238`, never black). Pastels (dusty pink, lavender, sage) for tints, chips and calendar spans; berry (`#B4294F`) is the single strong accent for primary actions and links. Dark mode is a deep plum night (`#1B1424`) with brightened pastels; pink becomes the accent. Both modes meet WCAG AA.
- **Type:** Zen Maru Gothic for display and H1–H4; Hanken Grotesk for body, UI, H5–H6; Silkscreen at 10px for tiny decorative metadata. Body 16px/1.5. Big day numerals (Zen Maru 900) are the signature date treatment. Tabular lining numerals for dates and counts.
- **Spacing:** 4px scale; cards padded 16 (compact) or 20–24; page gutter `clamp(16px, 4vw, 32px)`; container 1200px; prose 68ch.
- **Radii:** 8 (buttons, inputs), 14 (cards), 24 (dialogs, hero panels), full (chips).
- **Borders:** 1px warm tan on cards; 2px plum for selected or pressed; dashed 1.5px for tentative dates.
- **Shadows:** plum-tinted, never grey. Level 1 on cards, 2 on hover and popovers, 3 on dialogs. A "sticker" shadow (`2px 2px 0 plum`) on badges and ribbons, sparingly.
- **Backgrounds:** flat ivory. No gradients on surfaces.
- **Imagery:** no photos of copyrighted characters. Convention images only with permission, 16:9 or 1:1, radius 14.
- **Motion:** 120–260ms ease-out color and transform transitions. Bookmark "pop" (scale 1 → 1.15 → 1). Filter results fade and slide 8px. Calendar month change crossfades 180ms. Theme toggle crossfades 320ms. All off under `prefers-reduced-motion`.
- **Hover:** background darkens one step; links thicken underline to 2px. Never opacity-only hover on text.
- **Press:** background to the active step; buttons move 1px down.
- **Focus:** 2px lavender ring with 2px offset in both themes.
- **Cards:** near-white surface, 1px border, radius 14, shadow 1; hover adds shadow 2 and the strong border. Event cards lead with a date block (month eyebrow and big day numeral) in a tinted column.
- **Layout:** sticky header (64px desktop, 56px mobile), 12-column grid at 1024px and up, single column under 768px. The calendar grid is desktop-only; mobile gets a grouped agenda list.
- **Transparency and blur:** only the dialog scrim (55% plum) and the sticky header (surface at 92% with 8px blur).
- **Motifs:** five-petal flower, four-point sparkle, ribbon-tab section label. Bullets, empty-state ornaments, hero corners. At most two per screen, always `aria-hidden`.

## Icons

[Lucide](https://lucide.dev) (ISC), 1.75px stroke, `currentColor`. 18px inline, 20px in buttons, 24px in nav. Core glyphs: `calendar`, `calendar-plus`, `map-pin`, `bookmark`, `bookmark-check`, `external-link`, `badge-check`, `triangle-alert`, `circle-x`, `info`, `search`, `sliders-horizontal`, `chevron-left/right/down`, `x`, `menu`, `sun`, `moon`, `sparkles`. Icon-only controls carry `aria-label` and a tooltip with a 44×44 target. External links show `external-link` after the label at 0.85em.

## Accessibility

WCAG 2.2 AA. Text at least 4.5:1, large text and UI 3:1. Visible 2px focus ring. Status shown with icon, text and color. 44px targets. `prefers-reduced-motion` honored. Text scales to 200% without loss; never set `maximum-scale`. The calendar grid uses `role="grid"` with roving tabindex and an `aria-live` month announcement; the agenda list is the accessible alternative.

## Gaps in the supplied design

The design-system readme references files that were not in the project: `DESIGN_SYSTEM.md` (developer spec), `UI_MOCKUPS.md`, `tailwind.tokens.cjs`, `guidelines/`, `assets/` (flower, sparkle, dot-grid, illustration SVGs), `brief.md` and `ui_kits/`. Where they matter:

- The flower and sparkle paths come from the `Motif` component instead of the missing SVG assets. The design's flower had six uneven petals; on 2026-10-13 the maintainer chose a redrawn five-petal flower (even petals, optically centered), used in `Motif.astro` and `favicon.svg`.
- Tailwind mapping is written fresh in `global.css`.
- The prototype's own screens and the `_ref/components` code stand in for the missing mockups and spec.
- The prototype shows a "Dates unconfirmed" state for dates from a community submission. Under the data policy those dates aren't published, so that state isn't implemented.
