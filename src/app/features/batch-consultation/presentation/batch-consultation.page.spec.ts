import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Batch } from '../domain/batch';
import { BatchConsultationPage } from './batch-consultation.page';

const sampleBatch: Batch = {
  id: 1,
  responsibleInstitution: '0001 - COOPERATIVA CENTRAL',
  institution: '0002 - UNIDADE CENTRAL',
  entryDate: '2026-03-01',
  amountCents: 138750,
  entryCount: 2,
  createdBy: 'usuario02',
  approvedBy: null,
  status: 'OPEN',
  statusChangedAt: '2026-03-01T15:30:00.000Z',
  justification: null
};

describe('BatchConsultationPage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchConsultationPage],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and displays the first page of batches on entry', () => {
    const fixture = TestBed.createComponent(BatchConsultationPage);
    fixture.detectChanges();

    const request = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.get('responsibleInstitution')).toBe('0001 - COOPERATIVA CENTRAL');
    request.flush({ items: [sampleBatch], total: 1, page: 1, pageSize: 10 });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')?.textContent).toContain('1.387,50');
    expect(element.querySelector('tbody')?.textContent).toContain('Aberto');
  });

  it('converts amount filters to integer cents before requesting', () => {
    const fixture = TestBed.createComponent(BatchConsultationPage);
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url === '/api/batches')
      .flush({ items: [], total: 0, page: 1, pageSize: 10 });
    fixture.detectChanges();

    const amountFrom = fixture.nativeElement.querySelector('#amount-from') as HTMLInputElement;
    amountFrom.value = '1250.75';
    amountFrom.dispatchEvent(new Event('input'));
    const searchButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    searchButton.click();
    fixture.detectChanges();

    const request = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(request.request.params.get('amountFromCents')).toBe('125075');
    request.flush({ items: [], total: 0, page: 1, pageSize: 10 });
  });

  it('loads the next page when the user selects next', () => {
    const fixture = TestBed.createComponent(BatchConsultationPage);
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url === '/api/batches')
      .flush({ items: [sampleBatch], total: 15, page: 1, pageSize: 10 });
    fixture.detectChanges();

    const nextButton = fixture.nativeElement.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement;
    nextButton.click();
    fixture.detectChanges();

    const request = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ items: [], total: 15, page: 2, pageSize: 10 });
  });

  it('keeps the last searched filters when paging after editing the form', () => {
    const fixture = TestBed.createComponent(BatchConsultationPage);
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url === '/api/batches')
      .flush({ items: [sampleBatch], total: 15, page: 1, pageSize: 10 });
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('#status') as HTMLSelectElement;
    status.value = 'OPEN';
    status.dispatchEvent(new Event('change'));
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const filteredRequest = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(filteredRequest.request.params.get('status')).toBe('OPEN');
    filteredRequest.flush({ items: [sampleBatch], total: 15, page: 1, pageSize: 10 });
    fixture.detectChanges();

    status.value = 'CONFIRMED';
    status.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click();

    const nextPageRequest = http.expectOne((candidate) => candidate.url === '/api/batches');
    expect(nextPageRequest.request.params.get('status')).toBe('OPEN');
    expect(nextPageRequest.request.params.get('page')).toBe('2');
    nextPageRequest.flush({ items: [], total: 15, page: 2, pageSize: 10 });
  });

  it('shows a range error only for the invalid range', () => {
    const fixture = TestBed.createComponent(BatchConsultationPage);
    fixture.detectChanges();
    http.expectOne((candidate) => candidate.url === '/api/batches')
      .flush({ items: [], total: 0, page: 1, pageSize: 10 });
    fixture.detectChanges();

    const idFrom = fixture.nativeElement.querySelector('#id-from') as HTMLInputElement;
    const idTo = fixture.nativeElement.querySelector('#id-to') as HTMLInputElement;
    idFrom.value = '10';
    idFrom.dispatchEvent(new Event('input'));
    idTo.value = '2';
    idTo.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.range-error')).toHaveLength(1);
    http.expectNone((candidate) => candidate.url === '/api/batches');
  });
});
