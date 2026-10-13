# Public beta checklist

Run through this once before announcing the site, and again after any big change. Automated checks (CI, axe, the end-to-end tests) cover a lot; these are the things a person has to look at on real devices and accounts.

## Site and deploy

- [ ] GitHub Pages is enabled with **GitHub Actions** as the source (Settings → Pages).
- [ ] The latest Deploy run succeeded and https://hazeliscoding.github.io/conatlas-tx/ loads.
- [ ] CI is green on `main`.
- [ ] The daily scheduled Deploy has run at least once (Actions → Deploy).

## Data

- [ ] `pnpm data:report` shows nothing under "Due now".
- [ ] No drafts are waiting in `data/drafts/`.

## On real devices

- [ ] On a phone and a desktop, in light and dark mode, open home, the calendar, a convention page, Saved and Contribute. Nothing overlaps, scrolls sideways or looks unfinished.
- [ ] With JavaScript turned off, the home page and a convention page still show every date, venue and source.
- [ ] Save a convention, reload, and find it on the Saved page. Export it and open the `.ics` file.
- [ ] Subscribe to the all-Texas feed in Apple Calendar and Outlook with **Subscribe**, and in Google Calendar under **Other calendars → From URL**. The events show on the right days.
- [ ] Add one convention to Google Calendar from its **Add to calendar** menu.
- [ ] Paste the site's link in Discord or a chat app: the preview shows the title, description and image.

## Contributions and contacts

- [ ] Each card on the Contribute page opens the right GitHub issue form, and new issues get their label.
- [ ] "Report a problem" on a convention page prefills that convention in the forms.
- [ ] A test email to the contact address arrives.
- [ ] Private vulnerability reporting is on (Security → Report a vulnerability).

## After launch

- [ ] Verify the site in Google Search Console and Bing Webmaster Tools and submit `sitemap.xml` (milestone M5).
- [ ] Keep the weekly routine in [`MAINTENANCE.md`](MAINTENANCE.md).
