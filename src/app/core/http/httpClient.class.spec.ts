import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { defineEndpoint } from './defineEndpoint.class';
import { ApiError, HttpClient, montarUrl } from './httpClient.class';
import { HttpMethod } from './httpMethod.class';

describe('HttpClient compartilhado', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('executa um endpoint sem parâmetros de caminho', () => {
    const endpoint = defineEndpoint<{ ok: boolean }>()(HttpMethod.GET, '/api/status');

    client.request(endpoint).subscribe();

    const request = http.expectOne('/api/status');
    expect(request.request.method).toBe('GET');
    request.flush({ ok: true });
  });

  it('omite valores vazios da query string', () => {
    const endpoint = defineEndpoint<void>()(HttpMethod.GET, '/api/batches');

    client.request(endpoint, { queryParams: { status: 'OPEN', empty: '', absent: null } }).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(request.request.params.get('status')).toBe('OPEN');
    expect(request.request.params.has('empty')).toBe(false);
    expect(request.request.params.has('absent')).toBe(false);
    request.flush(null);
  });

  it('codifica parâmetros de caminho e falha se um parâmetro estiver ausente', () => {
    expect(montarUrl('/api/accounts/:number', { number: 'A 1/2' })).toBe('/api/accounts/A%201%2F2');
    expect(() => montarUrl('/api/batches/:id')).toThrowError('Path param "id" ausente em /api/batches/:id');
  });

  it('converte erro HTTP em ApiError preservando status e mensagem do servidor', () => {
    const endpoint = defineEndpoint<void>()(HttpMethod.DELETE, '/api/batches/:id');
    let receivedError: unknown;

    client.request(endpoint, { pathParams: { id: 7 } }).subscribe({ error: (error: unknown) => receivedError = error });
    http.expectOne('/api/batches/7').flush({ message: 'O lote não pode ser removido.' }, { status: 409, statusText: 'Conflict' });

    expect(receivedError).toBeInstanceOf(ApiError);
    expect(receivedError).toMatchObject({ status: 409, message: 'O lote não pode ser removido.' });
  });
});
