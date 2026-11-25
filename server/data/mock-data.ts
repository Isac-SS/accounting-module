import type { BatchDetail, BatchEntry, BatchEntryOptions, BatchStatus } from '../../src/app/features/batch-consultation/domain/batch';

export const accounts = new Map<string, string>([
  ['44444', 'Ana Paula Costa'],
  ['12345', 'João Batista Lima'],
  ['10001', 'Maria Eduarda Souza'],
  ['20002', 'Carlos Alberto Nunes'],
  ['30003', 'Cooperativa Agro Vale Ltda']
]);

export const entryOptions: BatchEntryOptions = {
  histories: ['Lançamento Manual', 'Tarifa Bancária', 'Estorno de Tarifa', 'Crédito de Juros', 'Débito de Convênio'],
  servicePoints: ['0001 - PA Sede', '0002 - PA Centro', '0003 - PA Bairro Novo', '0004 - PA Rural']
};

function makeSeedEntries(batchId: number, count: number, amountCents: number): BatchEntry[] {
  const accountNumbers = [...accounts.keys()];
  const baseAmount = Math.floor(amountCents / count);
  const remainder = amountCents % count;

  return Array.from({ length: count }, (_, index) => {
    const accountNumber = accountNumbers[(batchId + index) % accountNumbers.length];
    return {
      id: index + 1,
      accountNumber,
      accountHolder: accounts.get(accountNumber)!,
      amountCents: baseAmount + (index < remainder ? 1 : 0),
      history: entryOptions.histories[(batchId + index) % entryOptions.histories.length],
      reversal: false,
      document: `DOC-${String(batchId).padStart(3, '0')}-${index + 1}`,
      description: '',
      status: 'PENDING',
      servicePoint: entryOptions.servicePoints[(batchId + index) % entryOptions.servicePoints.length]
    };
  });
}

const statuses: BatchStatus[] = ['OPEN', 'SUBMITTED', 'CONFIRMED'];

export const batches: BatchDetail[] = Array.from({ length: 27 }, (_, index) => {
  const id = index + 1;
  const status = statuses[index % statuses.length];
  const entryDate = new Date(Date.UTC(2026, 2, id)).toISOString().slice(0, 10);
  const amountCents = 125000 + id * 13750;
  const entryCount = id % 4 + 1;

  return {
    id,
    responsibleInstitution: id % 5 === 0 ? '0003 - INSTITUIÇÃO SERRA' : '0001 - COOPERATIVA CENTRAL',
    institution: id % 5 === 0 ? '0004 - UNIDADE SERRA' : '0002 - UNIDADE CENTRAL',
    entryDate,
    amountCents,
    entryCount,
    createdBy: `usuario${String(id % 4 + 1).padStart(2, '0')}`,
    approvedBy: status === 'CONFIRMED' ? 'supervisor01' : null,
    status,
    statusChangedAt: `${entryDate}T15:30:00.000Z`,
    justification: status === 'CONFIRMED' ? 'Conferido e aprovado.' : null,
    entries: makeSeedEntries(id, entryCount, amountCents)
  };
});
