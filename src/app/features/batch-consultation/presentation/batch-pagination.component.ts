import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-batch-pagination',
  templateUrl: './batch-pagination.component.html',
  styleUrl: './batch-pagination.component.scss',
})
export class BatchPaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly loading = input(false);
  readonly pageChange = output<number>();

  protected goToPage(page: number): void {
    this.pageChange.emit(page);
  }
}
