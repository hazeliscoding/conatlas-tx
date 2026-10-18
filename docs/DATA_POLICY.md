# Data policy

ConAtlas TX lists anime conventions in Texas. This page says what gets listed, where the facts come from, and how they change. The record format is in [`data/README.md`](../data/README.md); the validator in [`packages/core`](../packages/core/src/validate.ts) enforces the mechanical parts.

## What gets listed

A ticketed or free public event in Texas whose main programming is anime, manga or closely related fandom: artist alleys, cosplay, panels, screenings. A general comic con is listed only when its organizer describes it as an anime convention. Store meetups and private club nights are not listed.

Some cases are decided:

- **Single-franchise events** are listed when the franchise is an anime or manga and the event has convention programming, such as a Naruto or Dragon Ball convention. A game or trading-card fan con is not listed.
- **Markets** are listed only when the organizer calls them an anime convention or anime festival and they have convention programming. A fan-art market or a vendor-only market is not.
- **Age-limited events** such as 18+ conventions are listed with their age limit, which the site shows as a label ("Ages 18+"). The limit must come from the organizer. An event where only some panels or an after party are 18+ isn't age-limited. Teen-only library programs aren't listed, because they aren't open to the public.
- **Dormant conventions** are not added. A new convention needs an edition held this calendar year or last, or an announced one. One that comes back is added then.

## Where facts come from

- **Official sources only.** Every published fact (that an edition exists, its dates, venue, city, status, ticket link or age limit) comes from the organizer: their website, an official announcement, an official feed, or the organizer's own social account.
- **Third-party listings are leads.** Aggregators, news articles and ticket resellers can point us at a convention, but never back a published fact.
- **Quoted evidence.** Each edition records which official page backs which facts, the day it was checked, and a short excerpt copied from that page. When the organizer states a fact only in a graphic every visitor sees, such as a homepage banner, the excerpt transcribes the graphic's text and the evidence says it comes from an image. The site shows all of it in the convention's verification panel.
- **Nothing inferred.** Dates are never guessed from a past year's pattern, and a venue is never assumed.

## Editions and dates

- A recurring convention gets a new edition only after its organizer announces it.
- An announced edition without dates is shown as "Dates not announced" and never placed on the calendar grid. If the organizer gave a rough window ("Summer 2027"), we repeat only their words.
- When a series has no announced next edition, the site keeps its most recent edition, marked as past, and says the next dates aren't announced.
- When the organizer announces a convention has ended or is on hiatus, its pages stay, with a banner quoting the announcement and linking to it, and it leaves the timeline, the region and city lists and `llms.txt`. If it comes back, it's marked active again.
- Postponed and cancelled editions keep their page with a summary of the organizer's announcement.
- Dates are calendar dates (`YYYY-MM-DD`), the days the organizer advertises. Texas venues use Central time, except far West Texas (El Paso), which uses Mountain time.

## Verification

- `last_verified_at` is the last day a maintainer confirmed the facts against the evidence. It is set only when the check succeeded. A failed or partial check is recorded as `last_attempted_at` instead.
- "Last checked" on the site means that verification date. It doesn't change just because a status changed.

## How changes are made

1. New or changed records go to `data/drafts/` first. Production builds never read that folder.
2. A maintainer reviews each draft against its sources and approves moving it into `data/`.
3. Every change is a commit in the public repository, so the full history is visible.

Research may be done with help from Claude Code. Text from websites, issues and submissions is treated as untrusted data, and a human approves everything that is published.

## Corrections

If something is wrong or missing, use one of the [issue forms](https://github.com/hazeliscoding/conatlas-tx/issues/new/choose) with a link to the organizer's own page. Fixes go through the same review as any other change.

## License

The compiled data in `data/` is [CC BY 4.0](../data/LICENSE.md); attribute it to ConAtlas TX. Convention names, logos and organizer images and text belong to their owners and aren't covered by that license. ConAtlas TX isn't affiliated with any convention.
