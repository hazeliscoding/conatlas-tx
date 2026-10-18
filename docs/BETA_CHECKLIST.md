# Public beta checklist

Run through this once before announcing the site, and again after any big change. Automated checks (CI, axe, the end-to-end tests) cover a lot; these are the things a person has to look at on real devices and accounts.

## Site and deploy

- [x] The Vercel project has no Git connection, and the repository's `production` environment (Settings → Environments) allows only `main` and holds the secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. There are no repository-level Vercel secrets.
- [x] The latest Deploy run succeeded and https://conatlas-tx.vercel.app/ loads; a path without its trailing slash redirects, and a missing page shows the site's 404.
- [x] CI is green on `main`.
- [x] The daily scheduled Deploy has run at least once (Actions → Deploy).

## Data

- [x] `pnpm data:report` shows nothing under "Due now".
- [x] No drafts are waiting in `data/drafts/`.

## On real devices

- [ ] On a phone and a desktop, in light and dark mode, open home, the calendar, a convention page, Saved and Contribute. Nothing overlaps, scrolls sideways or looks unfinished.
- [ ] With JavaScript turned off, the home page and a convention page still show every date, venue and source.
- [ ] Save a convention, reload, and find it on the Saved page. Export it and open the `.ics` file.
- [ ] Subscribe to the all-Texas feed in Apple Calendar and Outlook with **Subscribe**, and in Google Calendar under **Other calendars → From URL**. The events show on the right days.
- [ ] Add one convention to Google Calendar from its **Add to calendar** menu.
- [ ] Paste the site's link in Discord or a chat app: the preview shows the title, description and image.

## Contributions and contacts

- [x] Each card on the Contribute page opens the right GitHub issue form, and new issues get their label. (2026-10-17: each card links to its form, and every form names a label that exists. Not yet tried with a real issue.)
- [x] "Suggest a correction" on a convention page prefills that convention in the forms. (covered by the end-to-end test "reporting from a convention page prefills the forms")
- [ ] A test email to the contact address arrives.
- [x] Private vulnerability reporting is on (Security → Report a vulnerability).

## After launch

- [x] Verify the site in Google Search Console and submit `sitemap.xml` (milestone M5; done 2026-10-14).
- [ ] Submit `sitemap.xml` in Bing Webmaster Tools once Bing has finished processing the site ([#7](https://github.com/hazeliscoding/conatlas-tx/issues/7)).
- [ ] Keep the weekly routine in [`MAINTENANCE.md`](MAINTENANCE.md).
