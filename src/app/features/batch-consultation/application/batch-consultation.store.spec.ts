import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BatchApi } from '../infrastructure/batch-api';
import { Batch, BatchEntry, BatchFilters, Page } from '../domain/batch';
import { BatchConsultationStore, INITIAL_BATCH_FILTERS } from './batch-consultation.store';

const makeBatch = (id: number, status: Batch['status'] = 'OPEN'): Batch => ({
  id,
  responsibleInstitution: 'Central',
  institution: 'Unit',
  entryDate: '2026-03-01',
  amountCents: 10000,
  entryCount: 1,
  createdBy: 'user',
  approvedBy: null,
  status,
  statusChangedAt: '2026-03-01T15:30:00.000Z',
  justification: null,
});

const makePage = (items: Batch[], total: number, page: number): Page<Batch> => ({ items, total, page, pageSize: 10 });

describe('BatchConsultationStore', () => {
  let store: BatchConsultationStore;
  let listRequests: Subject<Page<Batch>>[];
  let listCalls: Array<{ filters: BatchFilters; page: number }>;
  let api: {
    list: (filters: BatchFilters, page: number, pageSize: number) => Subject<Page<Batch>>;
    updateStatus: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getCurrentAccount: ReturnType<typeof vi.fn>;
    getEntryOptions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    listRequests = [];
    listCalls = [];
    api = {
      list: (filters, page) => {
        listCalls.push({ filters, page });
        const request = new Subject<Page<Batch>>();
        listRequests.push(request);
        return request;
      },
      updateStatus: vi.fn(() => of({ updated: 1 })),
      get: vi.fn(() => of({ ...makeBatch(1), entries: [] })),
      create: vi.fn(() => of({ ...makeBatch(2), entries: [] })),
      update: vi.fn(() => of({ ...makeBatch(1), entries: [] })),
      delete: vi.fn(() => of(void 0)),
      getCurrentAccount: vi.fn(),
      getEntryOptions: vi.fn(),
    };

    TestBed.configureTestingModule({ providers: [{ provide: BatchApi, useValue: api }] });
    store = TestBed.inject(BatchConsultationStore);
  });

  it('loads the initial page and searches using the submitted filters', () => {
    listRequests[0].next(makePage([makeBatch(1)], 1, 1));
    expect(store.batches().map((batch: Batch) => batch.id)).toEqual([1]);
    expect(store.hasSearched()).toBe(true);

    const filters = { ...INITIAL_BATCH_FILTERS, status: 'OPEN' as const };
    store.search(filters);
    expect(listCalls[1]).toEqual({ filters, page: 1 });
    expect(store.loading()).toBe(true);
    listRequests[1].next(makePage([makeBatch(2)], 1, 1));
    expect(store.batches().map((batch: Batch) => batch.id)).toEqual([2]);
  });

  it('ignores the result of an older search after a newer search starts', () => {
    listRequests[0].next(makePage([], 0, 1));
    store.search({ ...INITIAL_BATCH_FILTERS, status: 'OPEN' });
    store.search({ ...INITIAL_BATCH_FILTERS, status: 'CONFIRMED' });

    listRequests[1].next(makePage([makeBatch(1)], 1, 1));
    listRequests[2].next(makePage([makeBatch(2, 'CONFIRMED')], 1, 1));

    expect(store.batches().map((batch: Batch) => batch.id)).toEqual([2]);
  });

  it('enables submission for selected open batches and refreshes after changing status', () => {
    listRequests[0].next(makePage([makeBatch(1)], 1, 1));
    store.toggleBatch(1, true);
    expect(store.canSubmit()).toBe(true);
    expect(store.canConfirm()).toBe(false);

    store.changeStatus('SUBMITTED');

    expect(api.updateStatus).toHaveBeenCalledWith([1], 'SUBMITTED');
    expect(store.actionMessage()).toBe('Lote(s) enviado(s) com sucesso.');
    expect(store.selectedIds().size).toBe(0);
    expect(listCalls).toHaveLength(2);
  });

  it('creates a batch, closes the editor callback, and refreshes the current page', () => {
    listRequests[0].next(makePage([], 0, 1));
    const entries: BatchEntry[] = [{
      id: 1, accountNumber: '12345', accountHolder: 'Example', amountCents: 100,
      history: 'Credit', reversal: false, document: '1', description: '', status: 'PENDING', servicePoint: '01',
    }];
    const onSaved = vi.fn();

    store.saveBatch(null, entries, onSaved);

    expect(api.create).toHaveBeenCalledWith({ entries });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(store.actionMessage()).toBe('Lote criado com sucesso.');
    expect(store.editorSaving()).toBe(false);
    expect(listCalls[1].page).toBe(1);
  });

  it('does not save an edited batch after its selection changes', () => {
    listRequests[0].next(makePage([makeBatch(1), makeBatch(2)], 2, 1));
    store.toggleBatch(2, true);
    const entries: BatchEntry[] = [{
      id: 1, accountNumber: '12345', accountHolder: 'Example', amountCents: 100,
      history: 'Credit', reversal: false, document: '1', description: '', status: 'PENDING', servicePoint: '01',
    }];

    store.saveBatch(1, entries, vi.fn());

    expect(api.update).not.toHaveBeenCalled();
    expect(store.editorError()).toBe('Não foi possível identificar o lote selecionado. Feche e tente novamente.');
  });

  it('returns to the last existing page after deleting its only batch', () => {
    listRequests[0].next(makePage([makeBatch(1)], 11, 1));
    store.goToPage(2);
    listRequests[1].next(makePage([makeBatch(2)], 11, 2));
    store.toggleBatch(2, true);
    const onDeleted = vi.fn();

    store.deleteSelected(onDeleted);

    expect(api.delete).toHaveBeenCalledWith(2);
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(listCalls[2].page).toBe(2);
    listRequests[2].next(makePage([], 10, 2));
    expect(listCalls[3].page).toBe(1);
    listRequests[3].next(makePage([makeBatch(1)], 10, 1));
    expect(store.page()).toBe(1);
  });
});
