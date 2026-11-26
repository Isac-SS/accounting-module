import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Batch, BatchEntry, BatchFilters, BatchStatus, BatchStatusFilter } from '../domain/batch';
import { BatchConsultationStore, BATCH_PAGE_SIZE, INITIAL_BATCH_FILTERS } from '../application/batch-consultation.store';
import { BatchEntryEditorComponent } from './batch-entry-editor.component';

const statusLabels: Record<BatchStatus, string> = {
  OPEN: 'Aberto',
  SUBMITTED: 'Enviado',
  CONFIRMED: 'Confirmado',
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
  styleUrl: './batch-consultation.page.scss',
})
export class BatchConsultationPage {
  protected readonly store = inject(BatchConsultationStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly page = this.store.page;
  protected readonly pageSize = BATCH_PAGE_SIZE;
  protected readonly batches = this.store.batches;
  protected readonly total = this.store.total;
  protected readonly loading = this.store.loading;
  protected readonly hasSearched = this.store.hasSearched;
  protected readonly errorMessage = this.store.errorMessage;
  protected readonly selectedIds = this.store.selectedIds;
  protected readonly selectedBatch = this.store.selectedBatch;
  protected readonly canSubmit = this.store.canSubmit;
  protected readonly canConfirm = this.store.canConfirm;
  protected readonly allVisibleSelected = this.store.allVisibleSelected;
  protected readonly totalPages = this.store.totalPages;
  protected readonly actionMessage = this.store.actionMessage;
  protected readonly actionError = this.store.actionError;
  protected readonly actionLoading = this.store.actionLoading;
  protected readonly editorSaving = this.store.editorSaving;
  protected readonly editorError = this.store.editorError;
  protected readonly visibleStatuses = statusLabels;

  protected readonly filtersExpanded = signal(true);
  protected readonly justificationOpen = signal(false);
  protected readonly deleteConfirmationOpen = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editorMode = signal<'create' | 'edit' | 'view'>('create');
  protected readonly editorEntries = signal<BatchEntry[]>([]);
  private editorBatchId: number | null = null;

  protected readonly form = this.formBuilder.group({
    responsibleInstitution: this.formBuilder.nonNullable.control(INITIAL_BATCH_FILTERS.responsibleInstitution, [Validators.maxLength(60)]),
    institution: this.formBuilder.nonNullable.control(INITIAL_BATCH_FILTERS.institution, [Validators.maxLength(60)]),
    status: this.formBuilder.nonNullable.control<BatchStatusFilter>('ALL'),
    idFrom: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    idTo: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    amountFrom: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    amountTo: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    entryDateFrom: this.formBuilder.nonNullable.control(''),
    entryDateTo: this.formBuilder.nonNullable.control(''),
  }, {
    validators: [
      orderedRange('idFrom', 'idTo'),
      orderedRange('amountFrom', 'amountTo'),
      orderedRange('entryDateFrom', 'entryDateTo'),
    ],
  });

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
      entryDateTo: values.entryDateTo,
    };
    this.store.search(filters);
  }

  protected clear(): void {
    this.form.reset({
      responsibleInstitution: '', institution: '', status: 'ALL',
      idFrom: null, idTo: null, amountFrom: null, amountTo: null,
      entryDateFrom: '', entryDateTo: '',
    });
  }

  protected goToPage(page: number): void {
    this.store.goToPage(page);
  }

  protected toggleBatch(id: number, checked: boolean): void {
    this.store.toggleBatch(id, checked);
  }

  protected toggleVisible(checked: boolean): void {
    this.store.toggleVisible(checked);
  }

  protected changeStatus(status: Exclude<BatchStatus, 'OPEN'>): void {
    this.store.changeStatus(status);
  }

  protected openJustification(): void {
    if (this.selectedBatch()) {
      this.store.clearMessages();
      this.justificationOpen.set(true);
    }
  }

  protected openCreate(): void {
    this.store.clearMessages();
    this.editorMode.set('create');
    this.editorBatchId = null;
    this.editorEntries.set([]);
    this.editorOpen.set(true);
  }

  protected openSelected(mode: 'edit' | 'view'): void {
    const batch = this.selectedBatch();
    if (!batch || (mode === 'edit' && batch.status !== 'OPEN') || this.actionLoading()) return;
    this.store.clearMessages();
    this.store.loadBatch(batch.id, (detail) => {
      this.editorBatchId = detail.id;
      this.editorMode.set(mode);
      this.editorEntries.set(detail.entries);
      this.editorOpen.set(true);
    });
  }

  protected saveEntries(entries: BatchEntry[]): void {
    if (this.editorSaving() || entries.length === 0) return;
    const id = this.editorMode() === 'create' ? null : this.editorBatchId;
    this.store.saveBatch(id, entries, () => {
      this.editorOpen.set(false);
      this.editorBatchId = null;
    });
  }

  protected closeEditor(): void {
    if (this.editorSaving()) return;
    this.editorOpen.set(false);
    this.editorBatchId = null;
    this.store.clearEditorError();
  }

  protected openDeleteConfirmation(): void {
    if (this.selectedBatch()?.status === 'OPEN') {
      this.store.clearMessages();
      this.deleteConfirmationOpen.set(true);
    }
  }

  protected deleteSelected(): void {
    this.store.deleteSelected(() => this.deleteConfirmationOpen.set(false));
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

  private toCents(value: number | null): number | null {
    return value === null ? null : Math.round(value * 100);
  }
}
