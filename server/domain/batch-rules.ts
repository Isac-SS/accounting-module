import type { BatchDetail, BatchEntry } from '../../src/app/features/batch-consultation/domain/batch';
import { accounts, entryOptions } from '../data/mock-data';

export const toSummary = ({ entries: _entries, ...batch }: BatchDetail) => batch;

export const calculateTotalCents = (entries: BatchEntry[]): number =>
  entries.reduce((total, entry) => total + (entry.reversal ? -entry.amountCents : entry.amountCents), 0);

export function parseEntries(body: unknown): BatchEntry[] | null {
  if (typeof body !== 'object' || body === null || !('entries' in body) || !Array.isArray(body.entries)) return null;
  const entries = body.entries as unknown[];
  if (entries.length === 0) return null;

  const parsed: BatchEntry[] = [];
  for (const [index, value] of entries.entries()) {
    if (typeof value !== 'object' || value === null) return null;
    const entry = value as Partial<BatchEntry>;
    const accountNumber = entry.accountNumber;
    const accountHolder = typeof accountNumber === 'string' ? accounts.get(accountNumber) : undefined;

    if (
      !accountHolder ||
      typeof entry.amountCents !== 'number' || !Number.isInteger(entry.amountCents) || entry.amountCents <= 0 ||
      typeof entry.history !== 'string' || !entryOptions.histories.includes(entry.history) ||
      typeof entry.reversal !== 'boolean' ||
      typeof entry.document !== 'string' || entry.document.trim().length === 0 || entry.document.trim().length > 20 ||
      typeof entry.description !== 'string' || entry.description.length > 200 ||
      typeof entry.servicePoint !== 'string' || !entryOptions.servicePoints.includes(entry.servicePoint)
    ) return null;

    parsed.push({
      id: index + 1,
      accountNumber: accountNumber!,
      accountHolder,
      amountCents: entry.amountCents,
      history: entry.history,
      reversal: entry.reversal,
      document: entry.document.trim(),
      description: entry.description.trim(),
      status: 'PENDING',
      servicePoint: entry.servicePoint
    });
  }
  return parsed;
}

export const matchesText = (value: string, query: string | null): boolean =>
  !query || value.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));

export const matchesNumberRange = (value: number, from: string | null, to: string | null): boolean =>
  (from === null || value >= Number(from)) && (to === null || value <= Number(to));
