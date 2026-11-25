import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Batch, BatchFilters, BatchStatus, Page } from '../domain/batch';

@Injectable({ providedIn: 'root' })
export class BatchApi {
  private readonly http = inject(HttpClient);

  list(filters: BatchFilters, page: number, pageSize: number): Observable<Page<Batch>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    const filterParams: Array<[string, string | number | null]> = [
      ['responsibleInstitution', filters.responsibleInstitution],
      ['institution', filters.institution],
      ['status', filters.status === 'ALL' ? '' : filters.status],
      ['idFrom', filters.idFrom],
      ['idTo', filters.idTo],
      ['amountFromCents', filters.amountFromCents],
      ['amountToCents', filters.amountToCents],
      ['entryDateFrom', filters.entryDateFrom],
      ['entryDateTo', filters.entryDateTo]
    ];

    for (const [key, value] of filterParams) {
      if (value !== null && value !== '') params = params.set(key, value);
    }

    return this.http.get<Page<Batch>>('/api/batches', { params });
  }

  updateStatus(ids: number[], status: Exclude<BatchStatus, 'OPEN'>): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>('/api/batches/status', { ids, status });
  }
}
