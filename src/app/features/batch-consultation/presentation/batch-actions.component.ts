import { Component, input, output } from '@angular/core';
import { Batch } from '../domain/batch';

@Component({
  selector: 'app-batch-actions',
  templateUrl: './batch-actions.component.html',
  styleUrl: './batch-actions.component.scss',
})
export class BatchActionsComponent {
  readonly selectedBatch = input<Batch | null>(null);
  readonly canConfirm = input(false);
  readonly canSubmit = input(false);
  readonly loading = input(false);
  readonly actionLoading = input(false);

  readonly create = output<void>();
  readonly edit = output<void>();
  readonly view = output<void>();
  readonly delete = output<void>();
  readonly confirm = output<void>();
  readonly submit = output<void>();
  readonly showJustification = output<void>();
}
