import { Component, inject, signal } from '@angular/core';
import { Batch, BatchEntry, BatchFilters, BatchStatus } from '../domain/batch';
import { BatchConsultationStore, BATCH_PAGE_SIZE } from '../application/batch-consultation.store';
import { BatchEntryEditorComponent } from './batch-entry-editor.component';
import { BatchFilterFormComponent } from './batch-filter-form.component';

const statusLabels: Record<BatchStatus, string> = {
  OPEN: 'Aberto',
  SUBMITTED: 'Enviado',
  CONFIRMED: 'Confirmado',
};

@Component({
  selector: 'app-batch-consultation-page',
  imports: [BatchEntryEditorComponent, BatchFilterFormComponent],
  templateUrl: './batch-consultation.page.html',
  styleUrl: './batch-consultation.page.scss',
})
export class BatchConsultationPage {
  protected readonly store = inject(BatchConsultationStore);

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

  protected readonly justificationOpen = signal(false);
  protected readonly deleteConfirmationOpen = signal(false);
  protected readonly editorOpen = signal(false);
  protected readonly editorMode = signal<'create' | 'edit' | 'view'>('create');
  protected readonly editorEntries = signal<BatchEntry[]>([]);
  private editorBatchId: number | null = null;

  protected search(filters: BatchFilters): void {
    this.store.search(filters);
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
}
