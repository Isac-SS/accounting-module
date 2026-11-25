import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BatchApi } from './batch-api';
import { BatchFilters } from '../domain/batch';

describe('BatchApi', () => {
  let api: BatchApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    api = TestBed.inject(BatchApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a page of batches with the provided filters', () => {
    const filters: BatchFilters = {
      responsibleInstitution: 'Central',
      institution: '',
      status: 'OPEN',
      idFrom: 10,
      idTo: null,
      amountFromCents: null,
      amountToCents: 250000,
      entryDateFrom: '',
      entryDateTo: ''
    };

    api.list(filters, 2, 10).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('responsibleInstitution')).toBe('Central');
    expect(request.request.params.get('status')).toBe('OPEN');
    expect(request.request.params.get('idFrom')).toBe('10');
    expect(request.request.params.has('idTo')).toBe(false);
    expect(request.request.params.get('amountToCents')).toBe('250000');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('10');
    request.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });
});
