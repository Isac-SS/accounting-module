import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Batch,
  BatchDetail,
  BatchEntryOptions,
  BatchFilters,
  BatchSaveRequest,
  BatchStatus,
  CurrentAccount,
  Page
} from '../domain/batch';

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

  get(id: number): Observable<BatchDetail> {
    return this.http.get<BatchDetail>(`/api/batches/${id}`);
  }

  create(body: BatchSaveRequest): Observable<BatchDetail> {
    return this.http.post<BatchDetail>('/api/batches', body);
  }

  update(id: number, body: BatchSaveRequest): Observable<BatchDetail> {
    return this.http.put<BatchDetail>(`/api/batches/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/batches/${id}`);
  }

  getCurrentAccount(number: string): Observable<CurrentAccount> {
    return this.http.get<CurrentAccount>(`/api/current-accounts/${encodeURIComponent(number)}`);
  }

  getEntryOptions(): Observable<BatchEntryOptions> {
    return this.http.get<BatchEntryOptions>('/api/batch-entry-options');
  }
}
