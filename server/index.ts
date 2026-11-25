import type { Batch, BatchStatus } from '../src/app/features/batch-consultation/domain/batch';

const port = 3333;
const statuses: BatchStatus[] = ['OPEN', 'SUBMITTED', 'CONFIRMED'];
const batches: Batch[] = Array.from({ length: 27 }, (_, index) => {
  const id = index + 1;
  const status = statuses[index % statuses.length];
  const entryDate = new Date(Date.UTC(2026, 2, id)).toISOString().slice(0, 10);

  return {
    id,
    responsibleInstitution: id % 5 === 0 ? '0003 - INSTITUIÇÃO SERRA' : '0001 - COOPERATIVA CENTRAL',
    institution: id % 5 === 0 ? '0004 - UNIDADE SERRA' : '0002 - UNIDADE CENTRAL',
    entryDate,
    amountCents: 125000 + id * 13750,
    entryCount: id % 4 + 1,
    createdBy: `usuario${String(id % 4 + 1).padStart(2, '0')}`,
    approvedBy: status === 'CONFIRMED' ? 'supervisor01' : null,
    status,
    statusChangedAt: `${entryDate}T15:30:00.000Z`,
    justification: status === 'CONFIRMED' ? 'Conferido e aprovado.' : null
  };
});

const matchesText = (value: string, query: string | null): boolean =>
  !query || value.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));

const matchesNumberRange = (value: number, from: string | null, to: string | null): boolean =>
  (from === null || value >= Number(from)) && (to === null || value <= Number(to));

Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/batches' || request.method !== 'GET') {
      return Response.json({ message: 'Endpoint não encontrado.' }, { status: 404 });
    }

    const query = url.searchParams;
    const filtered = batches.filter((batch) =>
      matchesText(batch.responsibleInstitution, query.get('responsibleInstitution')) &&
      matchesText(batch.institution, query.get('institution')) &&
      (!query.has('status') || batch.status === query.get('status')) &&
      matchesNumberRange(batch.id, query.get('idFrom'), query.get('idTo')) &&
      matchesNumberRange(batch.amountCents, query.get('amountFromCents'), query.get('amountToCents')) &&
      (!query.has('entryDateFrom') || batch.entryDate >= (query.get('entryDateFrom') ?? '')) &&
      (!query.has('entryDateTo') || batch.entryDate <= (query.get('entryDateTo') ?? ''))
    );

    const page = Math.max(1, Number(query.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize')) || 10));
    const start = (page - 1) * pageSize;
    return Response.json({ items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize });
  }
});

console.info(`API local disponível em http://localhost:${port}`);
