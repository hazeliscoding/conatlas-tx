# Maintenance

The maintainer's routine for keeping listings right. How the tools work is in [`INGESTION_ENGINE.md`](INGESTION_ENGINE.md); what may be published is in [`DATA_POLICY.md`](DATA_POLICY.md).

## Weekly

Every Monday morning the Data reminder workflow runs the report, and when anything is due now or soon it opens an issue labeled `data-due` with the list, closing last week's. A quiet week opens nothing. To see what a later date will bring, run the workflow from the Actions tab with that date.

1. Run `pnpm data:report`. It lists what is due: editions starting soon that haven't been checked recently, editions that ended and need marking completed, failed checks, undated editions, and series waiting on a next edition.
2. Refresh what it lists. In Claude Code, run `/conatlas-refresh` (or `/conatlas-refresh editions/<id>` for one record). By hand: `pnpm data:propose editions/<id>`, open the organizer's pages, edit the draft, and run `pnpm data:diff`.
3. Review and publish (below).

Check more often in the weeks before a con. Organizers move venues and cancel late, and the report already shortens the interval to a week inside 30 days.

## Reviewing drafts

Run `pnpm data:diff`. For each draft:

- **Facts** changed: open the evidence URL and find the quoted words on the organizer's page. Ask whether this is the organizer saying it, for this year's edition.
- **Verification only:** a re-check that confirmed the same facts. The dates on the site don't change, but the verification panel does: read every quote and note marked `+`, because they appear on the convention's page.
- **Possible duplicates:** decide whether the "new" convention is one we already list.
- **Errors** must be fixed before publishing; `data:diff` says how.

Delete any draft you don't want: remove its file from `data/drafts/`.

## Publishing

```sh
pnpm data:promote editions/san-japan-2027 sources/san-japan-site   # or --all
pnpm data:validate
git add data/conventions data/editions data/sources
git add -u data/drafts   # only removals of drafts that were committed earlier
git commit
```

Staging those paths, rather than all of `data/`, keeps drafts you haven't approved out of the commit. Commit messages follow Conventional Commits: `fix(data): …` for corrections, `feat(data): …` for new conventions or editions, `chore(data): re-verify …` for checks that changed no facts. Work on a branch, push it and open a pull request: `main` only accepts merges whose CI passes. Once it is merged, CI runs on `main` and the site redeploys.

The site decides what is "upcoming" from the build date, so the deploy workflow rebuilds it every morning; otherwise an edition would stay listed until the next merge.

## Reports from the issue forms

Issues opened from the Contribute page arrive labelled:

| Label            | What to do                                                                         |
| ---------------- | ---------------------------------------------------------------------------------- |
| `new convention` | `/conatlas-add <issue number>`, or research it by hand as a new series.            |
| `correction`     | `/conatlas-refresh` the named edition, using the issue's links as leads.           |
| `status change`  | Refresh it; a cancellation or postponement needs the organizer's own announcement. |
| `broken link`    | Refresh the edition or source; if a page moved, find its new official URL.         |

Reply with what changed and close the issue from the commit (`Closes #12` in the commit body). If the organizer's own pages don't back the report, say so and close it; third-party listings alone are never enough.

## When a check fails

If an organizer's site is down or the page is gone, change no facts. In a draft, set `last_attempted_at` and `updated_at` to today, and note the problem in the source's `access_notes` (evidence notes are public, access notes aren't). `pnpm data:report` lists it as a failed check until a later check succeeds; that check moves `last_attempted_at` up to the same day as `last_verified_at`. If the organizer stays unreachable for weeks, raise it in an issue rather than guessing.

## Releasing

A release marks a milestone you approved; the numbering rules are the 2026-10-18 versioning decision in [`ROADMAP.md`](../ROADMAP.md).

1. Pick the number. List the commits since the last tag with `git log --oneline <last tag>..origin/main`. A milestone release bumps the minor, and a fixes-only release between milestones bumps the patch. Look for anything that changes a page or feed URL, an edition id or the `data/` format: that's a breaking change, and the notes must open with it.
2. Write the notes: what's new for visitors first, then what changed for people who subscribe to feeds or reuse the data, then the milestones covered. Link the site.
3. Tag the merged commit on `main` (Rebase and merge gives a branch's commits new hashes, so never tag the branch) and publish the release:

   ```sh
   git switch main
   git pull
   git tag -a v0.2.0 -m "v0.2.0"
   git push origin v0.2.0
   gh release create v0.2.0 --title "v0.2.0 · <title>" --notes-file <notes.md>
   ```

4. Update the version in the status line of `README.md` in the next pull request.

## Conduct and security reports

Conduct reports arrive at the address in [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md); security reports through the repository's private vulnerability reporting or the same address, as [`SECURITY.md`](../SECURITY.md) describes. Neither belongs in a public issue.
