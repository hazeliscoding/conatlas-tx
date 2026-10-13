# Ingestion engine

How convention data changes: research stages drafts, the CLI shows exactly what they change, and a maintainer publishes them. The rules for what may be published are in [`DATA_POLICY.md`](DATA_POLICY.md); the record format is in [`data/README.md`](../data/README.md). The day-to-day routine is in [`MAINTENANCE.md`](MAINTENANCE.md).

## Flow

```
research ──▶ data/drafts/ ──▶ pnpm data:diff ──▶ maintainer approves ──▶ pnpm data:promote ──▶ data/ ──▶ commit
(network)     (staged)         (offline review)                          (offline, explicit)
```

- **Research** reads organizer pages. It is done by a maintainer, or by the `/conatlas-refresh` and `/conatlas-add` Claude Code skills in `.claude/skills/`. It writes only to `data/drafts/`.
- **The CLI** (`packages/ingestion`) never reaches the network. It compares, checks and moves local files.
- **Builds** read `data/conventions`, `data/editions` and `data/sources` only, so a draft can't reach the site until it is promoted.

## Drafts

`data/drafts/` has the same layout as `data/`: `conventions/`, `editions/` and `sources/`, one `<id>.yaml` per record. A draft with the id of a published record replaces it when promoted; any other draft is a new record. Drafts are complete records, not patches. There is no way to delete a record through drafts: a convention that stops is a status change, not a deletion.

## Commands

| Command                         | What it does                                                                                                        | Writes                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `pnpm data:validate`            | Checks every published record and cross-record rule.                                                                | nothing                 |
| `pnpm data:report`              | Lists what is due for a re-check, most urgent first, counts waiting drafts and names any record that fails to load. | nothing                 |
| `pnpm data:propose <record...>` | Copies published records into `data/drafts/` as a starting point for edits.                                         | `data/drafts/` only     |
| `pnpm data:diff`                | Shows each draft field by field and checks the published data as it would be with every draft.                      | nothing                 |
| `pnpm data:promote <record...>` | Publishes the named drafts (or `--all`) if they pass every check, and removes them from drafts.                     | `data/`, `data/drafts/` |

A record is written `editions/san-japan-2027`, or just `san-japan-2027` when the id is unambiguous. Anything else (another path, upper case) is refused before a file is touched. Every command takes `--data <dir>` and `--today YYYY-MM-DD`; `today` defaults to the date in America/Chicago. Exit codes: `0` success, `1` errors found, `2` usage error. On `1` or `2`, nothing was written: `propose` and `promote` check every record before copying any.

## What `data:diff` reports

For each draft, its status (`new`, `changed`, `no changes`) and the fields that differ, in three groups:

| Group        | Conventions     | Editions                                            | Sources                                 |
| ------------ | --------------- | --------------------------------------------------- | --------------------------------------- |
| Facts        | everything else | everything else                                     | `series`, `url`, `type`, `supports`     |
| Verification | `sources`       | `evidence`, `last_verified_at`, `last_attempted_at` | `last_checked`, `access_notes`, `notes` |
| Bookkeeping  |                 | `updated_at`, `revision`                            |                                         |

Facts are what visitors and calendar apps see. A draft that changes only verification is a re-check, not a correction, but its evidence is public too: the verification panel on each convention page shows every entry's source, quote and note. So `data:diff` prints changed evidence entries in full, the old ones marked `-` and the new ones `+`. Values are compared regardless of key order.

Then the issues, which block promotion when they are errors:

- **Revision:** a changed edition's `revision` must be the published one plus 1 if any fact changed, and unchanged otherwise. It feeds the calendar files' `SEQUENCE`, so calendar apps pick up changed facts. A calendar title includes the convention's name, so renaming a convention counts as a fact change for each of its editions: every one needs a draft with its revision raised.
- **`updated_at`:** a warning if an edited record still carries the published date (unless that date is today).
- **No changes:** a warning that the draft matches the published record and can be deleted.
- **Possible duplicates** (warnings, for a human to judge): a new convention with the same website host as another or a near-identical name (letter-pair similarity of 0.8 or more, ignoring case, spacing and punctuation); a new edition overlapping another edition of the same series, or one in the same city; a new source with the same URL as another, ignoring a trailing slash.
- **Validation:** every rule of `pnpm data:validate`, run on the published data with all drafts applied. This catches broken references, such as a new convention whose source isn't drafted.

## Promotion

`pnpm data:promote` needs the drafts named explicitly, or `--all`, not both. Each name must match a draft that loaded under exactly that id. It loads every draft (any draft that fails to load stops it), then runs the same checks as `data:diff` on the published data with only the selected drafts applied. Any error stops it with nothing written, so drafts that depend on each other (a new convention and its source) are promoted together. If everything passes, it copies each selected draft over its published file, byte for byte, and only then deletes the drafts. Committing is left to the maintainer.

The skills run `data:promote` only after the maintainer approves the specific drafts in the terminal.

## `data:report` rules

| Task                         | When                                                                                        | Priority                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- |
| Mark completed               | a confirmed edition's end date has passed                                                   | now                           |
| Retry a failed check         | `last_attempted_at` is later than `last_verified_at`                                        | now                           |
| Re-check an upcoming edition | last checked more than 7 days ago when it starts within 30 days, 14 within 90, otherwise 45 | now within 30 days, else soon |
| Look for dates               | `dates_tba`, last checked more than 30 days ago                                             | soon                          |
| Look for new dates           | `postponed`, last checked more than 14 days ago                                             | soon                          |
| Look for the next edition    | an active series with nothing upcoming, sources last checked more than 30 days ago          | later                         |

## Code

- `packages/core/src/drafts.ts`: `applyDrafts`, `diffDrafts`, `checkDrafts`, `findDuplicates` and `maintenanceTasks`. Pure functions; no file or network access.
- `packages/ingestion/src/cli.ts`: the commands, file handling and output.
- Tests: `packages/core/test/drafts.test.ts` for the rules, and `packages/ingestion/test/cli.test.ts` for the commands. The CLI tests run against the fixture in `packages/ingestion/test/fixtures/data/`, compare the full `data:diff` output, and check that only `data:promote` changes published files.
