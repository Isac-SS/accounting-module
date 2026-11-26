import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BatchEndpoints } from '../../../core/http/endpoints/BatchEndpoints';
import { HttpClient } from '../../../core/http/httpClient.class';
import {
  Batch,
  BatchDetail,
  BatchEntryOptions,
  BatchFilters,
  BatchSaveRequest,
  BatchStatus,
  CurrentAccount,
  Page,
} from '../domain/batch';

@Injectable({ providedIn: 'root' })
export class BatchApi {
  private readonly http = inject(HttpClient);

  list(filters: BatchFilters, page: number, pageSize: number): Observable<Page<Batch>> {
    return this.http.request(BatchEndpoints.batches.list, {
      queryParams: {
        responsibleInstitution: filters.responsibleInstitution,
        institution: filters.institution,
        status: filters.status === 'ALL' ? undefined : filters.status,
        idFrom: filters.idFrom,
        idTo: filters.idTo,
        amountFromCents: filters.amountFromCents,
        amountToCents: filters.amountToCents,
        entryDateFrom: filters.entryDateFrom,
        entryDateTo: filters.entryDateTo,
        page,
        pageSize,
      },
    });
  }

  updateStatus(ids: number[], status: Exclude<BatchStatus, 'OPEN'>): Observable<{ updated: number }> {
    return this.http.request(BatchEndpoints.batches.updateStatus, { body: { ids, status } });
  }

  get(id: number): Observable<BatchDetail> {
    return this.http.request(BatchEndpoints.batches.get, { pathParams: { id } });
  }

  create(body: BatchSaveRequest): Observable<BatchDetail> {
    return this.http.request(BatchEndpoints.batches.create, { body });
  }

  update(id: number, body: BatchSaveRequest): Observable<BatchDetail> {
    return this.http.request(BatchEndpoints.batches.update, { pathParams: { id }, body });
  }

  delete(id: number): Observable<void> {
    return this.http.request(BatchEndpoints.batches.delete, { pathParams: { id } });
  }

  getCurrentAccount(number: string): Observable<CurrentAccount> {
    return this.http.request(BatchEndpoints.currentAccounts.get, { pathParams: { number } });
  }

  getEntryOptions(): Observable<BatchEntryOptions> {
    return this.http.request(BatchEndpoints.batchEntryOptions.get);
  }
}
