import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, Subject, switchMap, tap } from 'rxjs';
import { ApiError } from '../../../core/http/httpClient.class';
import { BatchApi } from '../infrastructure/batch-api';
import {
  Batch,
  BatchDetail,
  BatchEntry,
  BatchFilters,
  BatchStatus,
  Page,
} from '../domain/batch';

export const BATCH_PAGE_SIZE = 10;

export const INITIAL_BATCH_FILTERS: BatchFilters = {
  responsibleInstitution: '0001 - COOPERATIVA CENTRAL',
  institution: '0002 - UNIDADE CENTRAL',
  status: 'ALL',
  idFrom: null,
  idTo: null,
  amountFromCents: null,
  amountToCents: null,
  entryDateFrom: '',
  entryDateTo: '',
};

@Injectable({ providedIn: 'root' })
export class BatchConsultationStore {
  private readonly api = inject(BatchApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<{ filters: BatchFilters; page: number }>();
  private readonly activeFilters = signal<BatchFilters>(INITIAL_BATCH_FILTERS);
  private moveBackAfterEmptyPage = false;

  readonly page = signal(1);
  readonly batches = signal<Batch[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly hasSearched = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  readonly actionMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly editorSaving = signal(false);
  readonly editorError = signal<string | null>(null);

  readonly selectedBatch = computed(() => {
    const selected = this.selectedIds();
    return selected.size === 1 ? this.batches().find((batch) => selected.has(batch.id)) ?? null : null;
  });
  readonly canSubmit = computed(() => {
    const selected = this.batches().filter((batch) => this.selectedIds().has(batch.id));
    return selected.length > 0 && selected.every((batch) => batch.status === 'OPEN');
  });
  readonly canConfirm = computed(() => {
    const selected = this.batches().filter((batch) => this.selectedIds().has(batch.id));
    return selected.length > 0 && selected.every((batch) => batch.status === 'SUBMITTED');
  });
  readonly allVisibleSelected = computed(() =>
    this.batches().length > 0 && this.batches().every((batch) => this.selectedIds().has(batch.id)),
  );
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / BATCH_PAGE_SIZE)));

  constructor() {
    this.requests
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap(({ filters, page }) =>
          this.api.list(filters, page, BATCH_PAGE_SIZE).pipe(
            catchError((error: unknown) => {
              this.errorMessage.set(this.searchErrorMessage(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result: Page<Batch> | null) => {
        this.loading.set(false);
        this.hasSearched.set(true);
        this.selectedIds.set(new Set());

        if (!result) {
          this.moveBackAfterEmptyPage = false;
          return;
        }

        if (this.moveBackAfterEmptyPage && result.items.length === 0 && result.total > 0 && this.page() > 1) {
          this.moveBackAfterEmptyPage = false;
          this.goToPage(Math.ceil(result.total / BATCH_PAGE_SIZE));
          return;
        }

        this.moveBackAfterEmptyPage = false;
        this.batches.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
      });

    this.requestPage(1, INITIAL_BATCH_FILTERS);
  }

  search(filters: BatchFilters): void {
    this.activeFilters.set(filters);
    this.page.set(1);
    this.requestPage(1, filters);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.requestPage(page, this.activeFilters());
  }

  toggleBatch(id: number, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    this.clearActionMessages();
  }

  toggleVisible(checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      for (const batch of this.batches()) {
        if (checked) next.add(batch.id);
        else next.delete(batch.id);
      }
      return next;
    });
    this.clearActionMessages();
  }

  changeStatus(status: Exclude<BatchStatus, 'OPEN'>): void {
    const ids = this.batches().filter((batch) => this.selectedIds().has(batch.id)).map((batch) => batch.id);
    if (!ids.length || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.clearActionMessages();
    this.api.updateStatus(ids, status).pipe(
      finalize(() => this.actionLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.selectedIds.set(new Set());
        this.actionMessage.set(status === 'SUBMITTED'
          ? 'Lote(s) enviado(s) com sucesso.'
          : 'Lote(s) confirmado(s) com sucesso.');
        this.requestPage(this.page(), this.activeFilters());
      },
      error: (error: unknown) => this.actionError.set(this.statusOf(error) === 409
        ? 'A situação de um ou mais lotes mudou. Atualize a consulta e tente novamente.'
        : 'Não foi possível atualizar a situação dos lotes. Tente novamente.'),
    });
  }

  loadBatch(id: number, onLoaded: (batch: BatchDetail) => void): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    this.api.get(id).pipe(
      finalize(() => this.actionLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (batch) => {
        if (this.selectedBatch()?.id === id) onLoaded(batch);
      },
      error: () => this.actionError.set('Não foi possível carregar os lançamentos do lote. Tente novamente.'),
    });
  }

  saveBatch(id: number | null, entries: BatchEntry[], onSaved: () => void): void {
    if (this.editorSaving() || entries.length === 0) return;
    if (id !== null && this.selectedBatch()?.id !== id) {
      this.editorError.set('Não foi possível identificar o lote selecionado. Feche e tente novamente.');
      return;
    }

    this.editorSaving.set(true);
    this.editorError.set(null);
    const request = id === null ? this.api.create({ entries }) : this.api.update(id, { entries });
    request.pipe(
      finalize(() => this.editorSaving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.selectedIds.set(new Set());
        this.actionMessage.set(id === null ? 'Lote criado com sucesso.' : 'Lote alterado com sucesso.');
        onSaved();
        this.requestPage(this.page(), this.activeFilters());
      },
      error: (error: unknown) => {
        this.editorError.set(this.statusOf(error) === 409
          ? 'Este lote deixou de estar aberto e não pode mais ser alterado. Atualize a consulta.'
          : 'Não foi possível salvar o lote. Confira os lançamentos e tente novamente.');
      },
    });
  }

  deleteSelected(onDeleted: () => void): void {
    const batch = this.selectedBatch();
    if (!batch || batch.status !== 'OPEN' || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    this.api.delete(batch.id).pipe(
      finalize(() => this.actionLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.selectedIds.set(new Set());
        this.actionMessage.set(`Lote ${batch.id} excluído com sucesso.`);
        this.moveBackAfterEmptyPage = true;
        onDeleted();
        this.requestPage(this.page(), this.activeFilters());
      },
      error: (error: unknown) => {
        this.actionError.set(this.statusOf(error) === 409
          ? 'Este lote deixou de estar aberto e não pode ser excluído. Atualize a consulta.'
          : 'Não foi possível excluir o lote. Tente novamente.');
      },
    });
  }

  clearActionMessages(): void {
    this.actionMessage.set(null);
    this.actionError.set(null);
  }

  clearMessages(): void {
    this.clearActionMessages();
    this.editorError.set(null);
  }

  clearEditorError(): void {
    this.editorError.set(null);
  }

  private requestPage(page: number, filters: BatchFilters): void {
    this.page.set(page);
    this.selectedIds.set(new Set());
    this.requests.next({ filters, page });
  }

  private searchErrorMessage(error: unknown): string {
    return this.statusOf(error) === 0
      ? 'Não foi possível conectar à API. Verifique se o servidor mock está em execução.'
      : 'Não foi possível carregar os lotes. Tente novamente.';
  }

  private statusOf(error: unknown): number | undefined {
    return error instanceof ApiError ? error.status : undefined;
  }
}
