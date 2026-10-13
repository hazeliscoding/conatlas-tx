#!/usr/bin/env node
// ConAtlas data CLI. Reads and writes local files only; it never touches the network.
// Research happens elsewhere; this tool stages, compares and publishes what research found.
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  KINDS,
  applyDrafts,
  checkDrafts,
  diffDrafts,
  findDuplicates,
  isIsoDate,
  maintenanceTasks,
  todayIn,
  validateDataset,
  type Dataset,
  type Evidence,
  type FieldChange,
  type Issue,
  type Kind,
  type RecordDiff,
} from '@conatlas/core';
import { loadDataset } from '@conatlas/core/load';

const USAGE = `Usage: pnpm data:<command> [options]

  validate               check every published record and cross-record rule
  diff                   compare data/drafts/ with the published data, field by field
  propose <record...>    copy published records into data/drafts/ to edit
  promote <record...>    publish the named drafts (or --all) after checking them
  report                 list what is due for a re-check, most urgent first

  A record is "editions/san-japan-2027" or just "san-japan-2027".

Options:
  --data   data directory (default: the repo's data/)
  --today  date to check against (default: today in America/Chicago)
  --all    promote: publish every draft`;

const DEFAULT_DATA = fileURLToPath(new URL('../../../data', import.meta.url));

class UsageError extends Error {}

interface Context {
  data: string;
  drafts: string;
  today: string;
}

function printIssues(issues: Issue[]) {
  for (const issue of issues)
    console.log(`${issue.level.padEnd(7)} ${issue.record}: ${issue.message}`);
}

const count = (issues: Issue[]) => {
  const errors = issues.filter((i) => i.level === 'error').length;
  return { errors, warnings: issues.length - errors };
};

/** Published data plus drafts, with any problems loading either. Draft load issues say "drafts/". */
function load(ctx: Context) {
  const published = loadDataset(ctx.data);
  const drafts = loadDataset(ctx.drafts);
  const issues = [
    ...published.issues,
    ...drafts.issues.map((i) => ({ ...i, record: `drafts/${i.record}` })),
  ];
  return { published: published.dataset, drafts: drafts.dataset, issues };
}

/** Everything that would block publishing these drafts, or deserves a second look. */
function review(published: Dataset, drafts: Dataset, today: string) {
  const diffs = diffDrafts(published, drafts);
  const issues = [
    ...checkDrafts(diffs, published, drafts, today),
    ...findDuplicates(published, drafts).map((d): Issue => ({
      level: 'warning',
      record: d.record,
      message: `may duplicate ${d.other}: ${d.reason}`,
    })),
    ...validateDataset(applyDrafts(published, drafts), today),
  ];
  return { diffs, issues };
}

const show = (value: unknown): string => {
  if (value === undefined) return '(none)';
  if (Array.isArray(value)) return `[${value.map(show).join(', ')}]`;
  if (value && typeof value === 'object') return Object.values(value).map(show).join(', ');
  return String(value);
};

/** One evidence entry in full: its excerpt and note appear on the site, so they must be read. */
const showEvidence = (e: Evidence) => [
  `${e.source} [${e.facts.join(', ')}] checked ${e.checked_at}`,
  ...(e.excerpt ? [`  "${e.excerpt}"`] : []),
  ...(e.note ? [`  note: ${e.note}`] : []),
];

function change({ field, before, after }: FieldChange, added: boolean): string[] {
  if (field === 'evidence') {
    // Entries on both sides are left out; the rest are listed with - (before) and + (after).
    const key = (e: Evidence) => JSON.stringify(e);
    const old = new Set(((before ?? []) as Evidence[]).map(key));
    const next = new Set(((after ?? []) as Evidence[]).map(key));
    const lines = ['evidence:'];
    const list = (entries: Evidence[], skip: Set<string>, mark: string) => {
      for (const e of entries.filter((e) => !skip.has(key(e)))) {
        lines.push(...showEvidence(e).map((line, i) => `  ${i ? ' ' : mark} ${line}`));
      }
    };
    list((before ?? []) as Evidence[], next, '-');
    list((after ?? []) as Evidence[], old, '+');
    return lines;
  }
  return [added ? `${field}: ${show(after)}` : `${field}: ${show(before)} → ${show(after)}`];
}

function formatDiff(diffs: RecordDiff[]): string {
  const lines: string[] = [];
  const label = { added: 'new', changed: 'changed', unchanged: 'no changes' };
  for (const diff of diffs) {
    lines.push(`${diff.kind}/${diff.id} (${label[diff.status]})`);
    const groups = [
      ['Facts', diff.facts],
      ['Verification', diff.verification],
      ['Bookkeeping', diff.bookkeeping],
    ] as const;
    for (const [title, changes] of groups) {
      if (changes.length === 0) continue;
      lines.push(`  ${title}`);
      for (const c of changes) {
        for (const line of change(c, diff.status === 'added')) lines.push(`    ${line}`);
      }
    }
  }
  return lines.join('\n');
}

function diff(ctx: Context): number {
  const { published, drafts, issues: loadIssues } = load(ctx);
  const { diffs, issues } = review(published, drafts, ctx.today);
  if (diffs.length === 0 && loadIssues.length === 0) {
    console.log('No drafts in data/drafts/.');
    return 0;
  }
  if (diffs.length > 0) console.log(`${formatDiff(diffs)}\n`);
  const all = [...loadIssues, ...issues];
  printIssues(all);
  const { errors, warnings } = count(all);
  const n = (status: RecordDiff['status']) => diffs.filter((d) => d.status === status).length;
  console.log(
    `\n${diffs.length} drafts: ${n('added')} new, ${n('changed')} changed, ${n('unchanged')} unchanged. ` +
      `Published with these drafts: ${errors} errors, ${warnings} warnings`,
  );
  return errors > 0 ? 1 : 0;
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Finds `<dir>/<kind>/<id>.yaml` for "kind/id" or a bare id. */
function locate(dir: string, ref: string): { kind: Kind; id: string } {
  const parts = ref.split('/');
  const [kind, id] = parts.length === 2 ? parts : [undefined, parts[0]];
  // Only plain ids reach the file system, so a ref can't point outside the data directory.
  if (parts.length > 2 || !ID.test(id ?? '')) {
    throw new UsageError(`"${ref}" is not a record; write it like editions/san-japan-2027`);
  }
  if (kind !== undefined && !(KINDS as readonly string[]).includes(kind)) {
    throw new UsageError(`unknown record kind "${kind}" in "${ref}"; use ${KINDS.join(', ')}`);
  }
  const matches = (kind ? [kind as Kind] : KINDS).filter((k) =>
    existsSync(join(dir, k, `${id}.yaml`)),
  );
  if (matches.length === 0) throw new UsageError(`no record "${ref}" in ${dir}`);
  if (matches.length > 1) {
    throw new UsageError(
      `"${ref}" is ambiguous; use ${matches.map((k) => `${k}/${id}`).join(' or ')}`,
    );
  }
  return { kind: matches[0]!, id: id! };
}

const unique = (records: { kind: Kind; id: string }[]) => [
  ...new Map(records.map((r) => [`${r.kind}/${r.id}`, r])).values(),
];

function propose(ctx: Context, refs: string[]): number {
  if (refs.length === 0) throw new UsageError('name at least one record to propose');
  // Check every ref before copying any, so a bad one leaves nothing half done.
  const records = unique(refs.map((ref) => locate(ctx.data, ref)));
  for (const { kind, id } of records) {
    if (existsSync(join(ctx.drafts, kind, `${id}.yaml`))) {
      throw new UsageError(`${kind}/${id} already has a draft`);
    }
  }
  for (const { kind, id } of records) {
    mkdirSync(join(ctx.drafts, kind), { recursive: true });
    copyFileSync(join(ctx.data, kind, `${id}.yaml`), join(ctx.drafts, kind, `${id}.yaml`));
    console.log(`Copied ${kind}/${id} to drafts. Edit it, then run pnpm data:diff.`);
  }
  return 0;
}

function promote(ctx: Context, refs: string[], everything: boolean): number {
  if ((refs.length === 0) === !everything) {
    throw new UsageError('name the drafts to publish, or pass --all (not both)');
  }
  const { published, drafts, issues: loadIssues } = load(ctx);
  const draftErrors = loadIssues.filter((i) => i.level === 'error');
  if (draftErrors.length > 0) {
    printIssues(draftErrors);
    console.log('\nNothing was published. Fix the drafts that fail to load first.');
    return 1;
  }
  const loaded = (kind: Kind) => (kind === 'conventions' ? drafts.series : drafts[kind]);
  const chosen = everything
    ? KINDS.flatMap((kind) => loaded(kind).map((r) => ({ kind, id: r.id })))
    : unique(refs.map((ref) => locate(ctx.drafts, ref)));
  if (chosen.length === 0) {
    console.log('No drafts to publish.');
    return 0;
  }
  // Publish only what gets checked: each ref must be a draft that loaded under exactly that id.
  for (const { kind, id } of chosen) {
    if (!loaded(kind).some((r) => r.id === id)) throw new UsageError(`no draft ${kind}/${id}`);
  }
  const picked = (kind: Kind) => new Set(chosen.filter((c) => c.kind === kind).map((c) => c.id));
  const selection: Dataset = {
    series: drafts.series.filter((r) => picked('conventions').has(r.id)),
    editions: drafts.editions.filter((r) => picked('editions').has(r.id)),
    sources: drafts.sources.filter((r) => picked('sources').has(r.id)),
  };

  // Check the published data as it would be with only these drafts applied.
  const { issues } = review(published, selection, ctx.today);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    printIssues(errors);
    console.log('\nNothing was published. Fix these errors, then promote again.');
    return 1;
  }
  // Copy everything first; drafts are removed only after every copy worked.
  for (const { kind, id } of chosen) {
    copyFileSync(join(ctx.drafts, kind, `${id}.yaml`), join(ctx.data, kind, `${id}.yaml`));
  }
  for (const { kind, id } of chosen) {
    unlinkSync(join(ctx.drafts, kind, `${id}.yaml`));
    console.log(`Published ${kind}/${id}`);
  }
  console.log(`\nReview with git diff, then commit.`);
  return 0;
}

function report(ctx: Context): number {
  const { published, drafts, issues } = load(ctx);
  if (issues.length > 0) {
    printIssues(issues);
    console.log('\nThese records are left out of the report until they load.\n');
  }
  const tasks = maintenanceTasks(published, ctx.today);
  const titles = { now: 'Due now', soon: 'Due soon', later: 'When there is time' };
  for (const priority of ['now', 'soon', 'later'] as const) {
    const due = tasks.filter((t) => t.priority === priority);
    if (due.length === 0) continue;
    console.log(titles[priority]);
    for (const task of due) console.log(`  ${task.record}: ${task.reason}`);
    console.log('');
  }
  if (tasks.length === 0) console.log(`Nothing is due as of ${ctx.today}.\n`);
  const pending = drafts.series.length + drafts.editions.length + drafts.sources.length;
  if (pending > 0) console.log(`${pending} drafts are waiting for review: run pnpm data:diff.`);
  return count(issues).errors > 0 ? 1 : 0;
}

function validate(ctx: Context): number {
  const { dataset, issues: loadIssues } = loadDataset(ctx.data);
  const issues = [...loadIssues, ...validateDataset(dataset, ctx.today)];
  printIssues(issues);
  const { errors, warnings } = count(issues);
  console.log(
    `\n${dataset.series.length} conventions, ${dataset.editions.length} editions, ` +
      `${dataset.sources.length} sources checked against ${ctx.today}: ` +
      `${errors} errors, ${warnings} warnings`,
  );
  return errors > 0 ? 1 : 0;
}

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      data: { type: 'string', default: DEFAULT_DATA },
      today: { type: 'string', default: todayIn('America/Chicago') },
      all: { type: 'boolean', default: false },
    },
  });
  if (!isIsoDate(values.today))
    throw new UsageError(`--today must be YYYY-MM-DD, got "${values.today}"`);
  const ctx = { data: values.data, drafts: join(values.data, 'drafts'), today: values.today };
  switch (command) {
    case 'validate':
      return validate(ctx);
    case 'diff':
      return diff(ctx);
    case 'propose':
      return propose(ctx, positionals);
    case 'promote':
      return promote(ctx, positionals, values.all);
    case 'report':
      return report(ctx);
    default:
      throw new UsageError(command ? `unknown command "${command}"` : 'no command given');
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error((err as Error).message);
  if (err instanceof UsageError) console.error(`\n${USAGE}`);
  process.exitCode = 2;
}
