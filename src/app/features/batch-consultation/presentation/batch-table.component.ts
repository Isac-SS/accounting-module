import { Component, input, output } from '@angular/core';
import { Batch, BatchStatus } from '../domain/batch';

const statusLabels: Record<BatchStatus, string> = {
  OPEN: 'Aberto',
  SUBMITTED: 'Enviado',
  CONFIRMED: 'Confirmado',
};

@Component({
  selector: 'app-batch-table',
  templateUrl: './batch-table.component.html',
  styleUrl: './batch-table.component.scss',
})
export class BatchTableComponent {
  readonly batches = input.required<Batch[]>();
  readonly total = input.required<number>();
  readonly loading = input(false);
  readonly hasSearched = input(false);
  readonly selectedIds = input.required<ReadonlySet<number>>();
  readonly allVisibleSelected = input(false);
  readonly actionLoading = input(false);

  readonly batchSelectionChange = output<{ id: number; checked: boolean }>();
  readonly visibleSelectionChange = output<boolean>();

  protected readonly visibleStatuses = statusLabels;

  protected toggleBatch(id: number, checked: boolean): void {
    this.batchSelectionChange.emit({ id, checked });
  }

  protected toggleVisible(checked: boolean): void {
    this.visibleSelectionChange.emit(checked);
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
