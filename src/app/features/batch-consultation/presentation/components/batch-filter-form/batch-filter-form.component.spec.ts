import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatchFilters } from '../../../domain/batch';
import { BatchFilterFormComponent } from './batch-filter-form.component';

describe('BatchFilterFormComponent', () => {
  let fixture: ComponentFixture<BatchFilterFormComponent>;
  let component: BatchFilterFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchFilterFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchFilterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits trimmed filters and converts monetary values to cents', () => {
    const emitted: BatchFilters[] = [];
    component.search.subscribe((filters) => emitted.push(filters));

    setValue('#responsible-institution', '  Cooperativa  ');
    setValue('#institution', '  Unidade  ');
    setValue('#status', 'CONFIRMED', 'change');
    setValue('#id-from', '1');
    setValue('#id-to', '10');
    setValue('#amount-from', '12.34');
    setValue('#amount-to', '500.75');
    setValue('#entry-date-from', '2026-01-01');
    setValue('#entry-date-to', '2026-01-31');

    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();

    expect(emitted).toEqual([
      {
        responsibleInstitution: 'Cooperativa',
        institution: 'Unidade',
        status: 'CONFIRMED',
        idFrom: 1,
        idTo: 10,
        amountFromCents: 1234,
        amountToCents: 50075,
        entryDateFrom: '2026-01-01',
        entryDateTo: '2026-01-31',
      },
    ]);
  });

  it('formats amount fields as BRL while typing and caps them at 9 digits', () => {
    const amountFrom = fixture.nativeElement.querySelector('#amount-from') as HTMLInputElement;

    setValue('#amount-from', '1234');
    expect(amountFrom.value).toBe('R$ 12,34');

    setValue('#amount-from', '12345678901');
    expect(amountFrom.value).toBe('R$ 1.234.567,89');
    expect(amountFrom.maxLength).toBe('R$ 9.999.999,99'.length);
    expect(fixture.nativeElement.querySelector('#amount-to').maxLength).toBe(15);

    setValue('#amount-from', '');
    expect(amountFrom.value).toBe('');
  });

  it('does not emit filters for an invalid range and shows its error', () => {
    const emitted: BatchFilters[] = [];
    component.search.subscribe((filters) => emitted.push(filters));

    setValue('#id-from', '10');
    setValue('#id-to', '2');
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('.range-error')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.range-error').textContent).toContain(
      'O valor inicial',
    );
  });

  it('clears form fields without submitting a new search', () => {
    const emitted: BatchFilters[] = [];
    component.search.subscribe((filters) => emitted.push(filters));

    setValue('#responsible-institution', 'Cooperativa');
    fixture.nativeElement.querySelector('.filter-actions button[type="button"]').click();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('#responsible-institution') as HTMLInputElement).value,
    ).toBe('');
    expect(emitted).toEqual([]);
  });

  function setValue(selector: string, value: string, eventName = 'input'): void {
    const element = fixture.nativeElement.querySelector(selector) as
      HTMLInputElement | HTMLSelectElement;
    element.value = value;
    element.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  }
});
