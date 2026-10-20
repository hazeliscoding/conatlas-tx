import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import { EditionSchema, SeriesSchema, SourceSchema, type Dataset } from './schema.ts';
import type { Issue } from './validate.ts';

/** Reads one kind of record: every `<id>.yaml` file in `dir`. A missing directory is empty. */
function readRecords<T>(
  dir: string,
  schema: z.ZodType<T>,
  label: string,
): { records: T[]; issues: Issue[] } {
  const records: T[] = [];
  const issues: Issue[] = [];
  if (!existsSync(dir)) return { records, issues };

  for (const file of readdirSync(dir).sort()) {
    if (file.endsWith('.yml')) {
      const fileId = file.slice(0, -'.yml'.length);
      issues.push({
        level: 'error',
        record: `${label}/${fileId}`,
        message: `rename to ${fileId}.yaml`,
      });
      continue;
    }
    if (!file.endsWith('.yaml')) continue;
    const fileId = file.slice(0, -'.yaml'.length);
    const record = `${label}/${fileId}`;
    let raw: unknown;
    try {
      raw = parse(readFileSync(join(dir, file), 'utf8'));
    } catch (err) {
      issues.push({ level: 'error', record, message: `invalid YAML: ${(err as Error).message}` });
      continue;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '(record)';
        issues.push({ level: 'error', record, message: `${path}: ${issue.message}` });
      }
      continue;
    }
    if ((result.data as { id: string }).id !== fileId) {
      issues.push({ level: 'error', record, message: `id must match the file name "${fileId}"` });
      continue;
    }
    records.push(result.data);
  }
  return { records, issues };
}

/**
 * Loads approved records from `data/conventions`, `data/editions` and `data/sources`.
 * `data/drafts` is never read here, so staged proposals can't reach a build.
 */
export function loadDataset(dataDir: string): { dataset: Dataset; issues: Issue[] } {
  const series = readRecords(join(dataDir, 'conventions'), SeriesSchema, 'conventions');
  const editions = readRecords(join(dataDir, 'editions'), EditionSchema, 'editions');
  const sources = readRecords(join(dataDir, 'sources'), SourceSchema, 'sources');
  return {
    dataset: { series: series.records, editions: editions.records, sources: sources.records },
    issues: [...series.issues, ...editions.issues, ...sources.issues],
  };
}
