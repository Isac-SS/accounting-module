import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { catchError, of, Subject, switchMap, tap } from 'rxjs';
import { Batch, BatchDetail, BatchEntry, BatchFilters, BatchStatus, BatchStatusFilter, Page } from '../domain/batch';
import { BatchApi } from '../data/batch-api';
import { BatchEntryEditorComponent } from './batch-entry-editor.component';

const pageSize = 10;
const initialFilters: BatchFilters = {
  responsibleInstitution: '0001 - COOPERATIVA CENTRAL',
  institution: '0002 - UNIDADE CENTRAL',
  status: 'ALL',
  idFrom: null,
  idTo: null,
  amountFromCents: null,
  amountToCents: null,
  entryDateFrom: '',
  entryDateTo: ''
};

const statusLabels: Record<BatchStatus, string> = {
  OPEN: 'Aberto',
  SUBMITTED: 'Enviado',
  CONFIRMED: 'Confirmado'
};

function orderedRange(fromName: string, toName: string): ValidatorFn {
  return (control): ValidationErrors | null => {
    const from = control.get(fromName)?.value as string | number | null;
    const to = control.get(toName)?.value as string | number | null;
    return from !== null && from !== '' && to !== null && to !== '' && from > to
      ? { [`rangeOrder_${fromName}`]: { fromName, toName } }
      : null;
  };
}

@Component({
  selector: 'app-batch-consultation-page',
  imports: [ReactiveFormsModule, BatchEntryEditorComponent],
  templateUrl: './batch-consultation.page.html',
  styleUrl: './batch-consultation.page.scss'
})
export class BatchConsultationPage {
  private readonly api = inject(BatchApi);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<{ filters: BatchFilters; page: number }>();

  protected readonly pageSize = pageSize;
  protected readonly page = signal(1);
  private readonly activeFilters = signal<BatchFilters>(initialFilters);
  protected readonly batches = signal<Batch[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly filtersExpanded = signal(true);
  protected readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  protected readonly actionMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionLoading = signal(false);
  protected readonly justificationOpen = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editorMode = signal<'create' | 'edit' | 'view'>('create');
  protected readonly editorEntries = signal<BatchEntry[]>([]);
  protected readonly editorError = signal<string | null>(null);
  protected readonly editorSaving = signal(false);
  protected readonly selectedBatch = computed(() => {
    const selected = this.selectedIds();
    return selected.size === 1 ? this.batches().find((batch) => selected.has(batch.id)) ?? null : null;
  });
  protected readonly canSubmit = computed(() => {
    const selected = this.batches().filter((batch) => this.selectedIds().has(batch.id));
    return selected.length > 0 && selected.every((batch) => batch.status === 'OPEN');
  });
  protected readonly canConfirm = computed(() => {
    const selected = this.batches().filter((batch) => this.selectedIds().has(batch.id));
    return selected.length > 0 && selected.every((batch) => batch.status === 'SUBMITTED');
  });
  protected readonly allVisibleSelected = computed(() =>
    this.batches().length > 0 && this.batches().every((batch) => this.selectedIds().has(batch.id))
  );
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / pageSize)));
  protected readonly visibleStatuses = statusLabels;

  protected readonly form = this.formBuilder.group({
    responsibleInstitution: this.formBuilder.nonNullable.control(initialFilters.responsibleInstitution, [Validators.maxLength(60)]),
    institution: this.formBuilder.nonNullable.control(initialFilters.institution, [Validators.maxLength(60)]),
    status: this.formBuilder.nonNullable.control<BatchStatusFilter>('ALL'),
    idFrom: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    idTo: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    amountFrom: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    amountTo: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    entryDateFrom: this.formBuilder.nonNullable.control(''),
    entryDateTo: this.formBuilder.nonNullable.control('')
  }, {
    validators: [
      orderedRange('idFrom', 'idTo'),
      orderedRange('amountFrom', 'amountTo'),
      orderedRange('entryDateFrom', 'entryDateTo')
    ]
  });

  constructor() {
    this.requests.pipe(
      tap(() => {
        this.loading.set(true);
        this.errorMessage.set(null);
      }),
      switchMap(({ filters, page: requestedPage }) => this.api.list(filters, requestedPage, pageSize).pipe(
        catchError((error: unknown) => {
          const message = error instanceof HttpErrorResponse && error.status === 0
            ? 'Não foi possível conectar à API. Verifique se o servidor mock está em execução.'
            : 'Não foi possível carregar os lotes. Tente novamente.';
          this.errorMessage.set(message);
          return of(null);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((result: Page<Batch> | null) => {
      this.loading.set(false);
      this.hasSearched.set(true);
      if (result) {
        this.batches.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
      }
    });

    this.requestPage(1, initialFilters);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const filters: BatchFilters = {
      responsibleInstitution: values.responsibleInstitution.trim(),
      institution: values.institution.trim(),
      status: values.status,
      idFrom: values.idFrom,
      idTo: values.idTo,
      amountFromCents: this.toCents(values.amountFrom),
      amountToCents: this.toCents(values.amountTo),
      entryDateFrom: values.entryDateFrom,
      entryDateTo: values.entryDateTo
    };
    this.activeFilters.set(filters);
    this.requestPage(1, filters);
  }

  protected clear(): void {
    this.form.reset({
      responsibleInstitution: '', institution: '', status: 'ALL',
      idFrom: null, idTo: null, amountFrom: null, amountTo: null,
      entryDateFrom: '', entryDateTo: ''
    });
  }

  protected goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages() || nextPage === this.page()) return;
    this.requestPage(nextPage, this.activeFilters());
  }

  protected toggleBatch(id: number, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    this.actionMessage.set(null);
    this.actionError.set(null);
  }

  protected toggleVisible(checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      for (const batch of this.batches()) {
        if (checked) next.add(batch.id);
        else next.delete(batch.id);
      }
      return next;
    });
    this.actionMessage.set(null);
    this.actionError.set(null);
  }

  protected changeStatus(status: Exclude<BatchStatus, 'OPEN'>): void {
    const ids = [...this.selectedIds()];
    if (!ids.length || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.actionMessage.set(null);
    this.actionError.set(null);
    this.api.updateStatus(ids, status).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.selectedIds.set(new Set());
        this.actionMessage.set(status === 'SUBMITTED' ? 'Lote(s) enviado(s) com sucesso.' : 'Lote(s) confirmado(s) com sucesso.');
        this.requestPage(this.page(), this.activeFilters());
        this.actionLoading.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(error instanceof HttpErrorResponse && error.status === 409
          ? 'A situação de um ou mais lotes mudou. Atualize a consulta e tente novamente.'
          : 'Não foi possível atualizar a situação dos lotes. Tente novamente.');
        this.actionLoading.set(false);
      }
    });
  }

  protected openJustification(): void {
    if (this.selectedBatch()) this.justificationOpen.set(true);
  }

  protected openCreate(): void {
    this.editorMode.set('create');
    this.editorEntries.set([]);
    this.editorError.set(null);
    this.editorOpen.set(true);
  }

  protected openSelected(mode: 'edit' | 'view'): void {
    const batch = this.selectedBatch();
    if (!batch || (mode === 'edit' && batch.status !== 'OPEN') || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.editorError.set(null);
    this.api.get(batch.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail: BatchDetail) => {
        this.editorMode.set(mode);
        this.editorEntries.set(detail.entries);
        this.editorOpen.set(true);
        this.actionLoading.set(false);
      },
      error: () => {
        this.actionError.set('Não foi possível carregar os lançamentos do lote. Tente novamente.');
        this.actionLoading.set(false);
      }
    });
  }

  protected saveEntries(entries: BatchEntry[]): void {
    if (this.editorSaving() || entries.length === 0) return;
    this.editorSaving.set(true);
    this.editorError.set(null);
    const batch = this.selectedBatch();
    const saveRequest = this.editorMode() === 'create'
      ? this.api.create({ entries })
      : batch
        ? this.api.update(batch.id, { entries })
        : null;
    if (!saveRequest) {
      this.editorError.set('Não foi possível identificar o lote selecionado. Feche e tente novamente.');
      this.editorSaving.set(false);
      return;
    }

    saveRequest.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.editorOpen.set(false);
        this.editorSaving.set(false);
        this.selectedIds.set(new Set());
        this.actionMessage.set(this.editorMode() === 'create' ? 'Lote criado com sucesso.' : 'Lote alterado com sucesso.');
        this.requestPage(this.page(), this.activeFilters());
      },
      error: (error: unknown) => {
        this.editorError.set(error instanceof HttpErrorResponse && error.status === 409
          ? 'Este lote deixou de estar aberto e não pode mais ser alterado. Atualize a consulta.'
          : 'Não foi possível salvar o lote. Confira os lançamentos e tente novamente.');
        this.editorSaving.set(false);
      }
    });
  }

  protected closeEditor(): void {
    if (this.editorSaving()) return;
    this.editorOpen.set(false);
    this.editorError.set(null);
  }

  protected formatAmount(amountCents: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  }

  protected formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  protected formatDateTime(dateTime: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateTime));
  }

  private requestPage(requestedPage: number, filters: BatchFilters): void {
    this.page.set(requestedPage);
    this.selectedIds.set(new Set());
    this.requests.next({ filters, page: requestedPage });
  }

  private toCents(value: number | null): number | null {
    return value === null ? null : Math.round(value * 100);
  }
}
