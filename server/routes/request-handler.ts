import type { BatchDetail, CurrentAccount } from '../../src/app/features/batch-consultation/domain/batch';
import { accounts, batches, entryOptions } from '../data/mock-data';
import { calculateTotalCents, matchesNumberRange, matchesText, parseEntries, toSummary } from '../domain/batch-rules';

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  if (url.pathname === '/api/batch-entry-options' && method === 'GET') {
    return Response.json(entryOptions);
  }

  const accountMatch = url.pathname.match(/^\/api\/current-accounts\/([^/]+)$/);
  if (accountMatch && method === 'GET') {
    const number = decodeURIComponent(accountMatch[1]);
    const holder = accounts.get(number);
    if (!holder) return Response.json({ message: 'Conta corrente não encontrada.' }, { status: 404 });
    const account: CurrentAccount = { number, holder };
    return Response.json(account);
  }

  if (url.pathname === '/api/batches/status' && method === 'PATCH') {
    const body = await request.json().catch(() => null) as { ids?: unknown; status?: unknown } | null;
    const ids = body?.ids;
    const targetStatus = body?.status;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(id)) ||
        (targetStatus !== 'SUBMITTED' && targetStatus !== 'CONFIRMED')) {
      return Response.json({ message: 'Informe IDs e uma situação válida.' }, { status: 400 });
    }

    const selected = ids.map((id) => batches.find((batch) => batch.id === id));
    if (selected.some((batch) => !batch)) {
      return Response.json({ message: 'Um ou mais lotes não foram encontrados.' }, { status: 404 });
    }

    const expectedStatus = targetStatus === 'SUBMITTED' ? 'OPEN' : 'SUBMITTED';
    if (selected.some((batch) => batch?.status !== expectedStatus)) {
      return Response.json({ message: 'A transição de situação solicitada não é permitida.' }, { status: 409 });
    }

    const changedAt = new Date().toISOString();
    for (const batch of selected) {
      batch!.status = targetStatus;
      batch!.statusChangedAt = changedAt;
      if (targetStatus === 'CONFIRMED') batch!.approvedBy = 'supervisor01';
    }
    return Response.json({ updated: selected.length });
  }

  if (url.pathname === '/api/batches' && method === 'GET') {
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
    return Response.json({ items: filtered.slice(start, start + pageSize).map(toSummary), total: filtered.length, page, pageSize });
  }

  if (url.pathname === '/api/batches' && method === 'POST') {
    const entries = parseEntries(await request.json().catch(() => null));
    if (!entries) return Response.json({ message: 'Informe ao menos um lançamento válido.' }, { status: 400 });

    const now = new Date();
    const batch: BatchDetail = {
      id: Math.max(0, ...batches.map((item) => item.id)) + 1,
      responsibleInstitution: '0001 - COOPERATIVA CENTRAL',
      institution: '0002 - UNIDADE CENTRAL',
      entryDate: now.toISOString().slice(0, 10),
      amountCents: calculateTotalCents(entries),
      entryCount: entries.length,
      createdBy: 'usuario01',
      approvedBy: null,
      status: 'OPEN',
      statusChangedAt: now.toISOString(),
      justification: null,
      entries
    };
    batches.push(batch);
    return Response.json(batch, { status: 201 });
  }

  const batchMatch = url.pathname.match(/^\/api\/batches\/(\d+)$/);
  if (batchMatch) {
    const batchId = Number(batchMatch[1]);
    const batchIndex = batches.findIndex((item) => item.id === batchId);
    const batch = batches[batchIndex];
    if (!batch) return Response.json({ message: 'Lote não encontrado.' }, { status: 404 });

    if (method === 'GET') return Response.json(batch);

    if (method === 'PUT') {
      if (batch.status !== 'OPEN') {
        return Response.json({ message: 'Somente lotes abertos podem ser alterados.' }, { status: 409 });
      }
      const entries = parseEntries(await request.json().catch(() => null));
      if (!entries) return Response.json({ message: 'Informe ao menos um lançamento válido.' }, { status: 400 });
      Object.assign(batch, { entries, amountCents: calculateTotalCents(entries), entryCount: entries.length });
      return Response.json(batch);
    }

    if (method === 'DELETE') {
      if (batch.status !== 'OPEN') {
        return Response.json({ message: 'Somente lotes abertos podem ser excluídos.' }, { status: 409 });
      }
      batches.splice(batchIndex, 1);
      return new Response(null, { status: 204 });
    }
  }

  return Response.json({ message: 'Endpoint não encontrado.' }, { status: 404 });
}
