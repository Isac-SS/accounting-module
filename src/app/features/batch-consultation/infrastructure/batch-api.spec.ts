import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BatchFilters } from '../domain/batch';
import { BatchApi } from './batch-api';

describe('BatchApi', () => {
  let api: BatchApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(BatchApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists batches and omits empty filters', () => {
    const filters: BatchFilters = {
      responsibleInstitution: 'Central', institution: '', status: 'ALL', idFrom: 10, idTo: null,
      amountFromCents: null, amountToCents: 250000, entryDateFrom: '', entryDateTo: ''
    };

    api.list(filters, 2, 10).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('responsibleInstitution')).toBe('Central');
    expect(request.request.params.has('institution')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.get('idFrom')).toBe('10');
    expect(request.request.params.get('idTo')).toBeNull();
    expect(request.request.params.get('amountToCents')).toBe('250000');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('10');
    request.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('updates status with PATCH and the selected ids', () => {
    api.updateStatus([3, 8], 'SUBMITTED').subscribe();
    const request = http.expectOne('/api/batches/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ ids: [3, 8], status: 'SUBMITTED' });
    request.flush({ updated: 2 });
  });

  it('gets a batch by id', () => {
    api.get(42).subscribe();
    const request = http.expectOne('/api/batches/42');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('creates a batch with its entries', () => {
    const body = { entries: [] };
    api.create(body).subscribe();
    const request = http.expectOne('/api/batches');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('updates a batch with PUT', () => {
    const body = { entries: [] };
    api.update(42, body).subscribe();
    const request = http.expectOne('/api/batches/42');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({});
  });

  it('deletes a batch by id', () => {
    api.delete(42).subscribe();
    const request = http.expectOne('/api/batches/42');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('encodes the current account number in the path', () => {
    api.getCurrentAccount('ACC 1/2').subscribe();
    const request = http.expectOne('/api/current-accounts/ACC%201%2F2');
    expect(request.request.method).toBe('GET');
    request.flush({ number: 'ACC 1/2', holder: 'Example Holder' });
  });

  it('loads batch entry options', () => {
    api.getEntryOptions().subscribe();
    const request = http.expectOne('/api/batch-entry-options');
    expect(request.request.method).toBe('GET');
    request.flush({ histories: [], servicePoints: [] });
  });
});
