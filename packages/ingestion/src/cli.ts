#!/usr/bin/env node
// ConAtlas data CLI. Reads local files only; it never touches the network.
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isIsoDate, todayIn, validateDataset, type Issue } from '@conatlas/core';
import { loadDataset } from '@conatlas/core/load';

const USAGE = `Usage: pnpm data:validate [--data <dir>] [--today YYYY-MM-DD]

  --data   data directory (default: the repo's data/)
  --today  date to validate against (default: today in America/Chicago)`;

function printIssues(issues: Issue[]) {
  for (const issue of issues)
    console.log(`${issue.level.padEnd(7)} ${issue.record}: ${issue.message}`);
}

function validate(args: string[]): number {
  const { values } = parseArgs({
    args,
    options: {
      data: { type: 'string', default: fileURLToPath(new URL('../../../data', import.meta.url)) },
      today: { type: 'string', default: todayIn('America/Chicago') },
    },
  });
  if (!isIsoDate(values.today)) {
    console.error(`--today must be YYYY-MM-DD, got "${values.today}"`);
    return 2;
  }

  const { dataset, issues: loadIssues } = loadDataset(values.data);
  const issues = [...loadIssues, ...validateDataset(dataset, values.today)];
  printIssues(issues);

  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;
  console.log(
    `\n${dataset.series.length} conventions, ${dataset.editions.length} editions, ` +
      `${dataset.sources.length} sources checked against ${values.today}: ` +
      `${errors} errors, ${warnings} warnings`,
  );
  return errors > 0 ? 1 : 0;
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'validate') process.exitCode = validate(rest);
  else {
    console.error(USAGE);
    process.exitCode = 2;
  }
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 2;
}
