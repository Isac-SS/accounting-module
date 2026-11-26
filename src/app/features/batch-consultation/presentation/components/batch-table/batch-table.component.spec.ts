import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Batch } from '../../../domain/batch';
import { BatchTableComponent } from './batch-table.component';

const batch: Batch = {
  id: 12,
  responsibleInstitution: 'Instituição responsável',
  institution: 'Instituição',
  entryDate: '2026-03-01',
  amountCents: 138750,
  entryCount: 2,
  createdBy: 'usuario02',
  approvedBy: null,
  status: 'OPEN',
  statusChangedAt: '2026-03-01T15:30:00.000Z',
  justification: null,
};

describe('BatchTableComponent', () => {
  let fixture: ComponentFixture<BatchTableComponent>;
  let component: BatchTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BatchTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(BatchTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('batches', []);
    fixture.componentRef.setInput('total', 0);
    fixture.componentRef.setInput('selectedIds', new Set<number>());
    fixture.detectChanges();
  });

  it('renders totals and formats batch date, amount, and status', () => {
    fixture.componentRef.setInput('batches', [batch]);
    fixture.componentRef.setInput('total', 1);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.results-heading')?.textContent).toContain('1 lote encontrado');
    expect(element.querySelector('tbody')?.textContent).toContain('12');
    expect(element.querySelector('tbody')?.textContent).toContain('01/03/2026');
    expect(element.querySelector('tbody')?.textContent).toContain('1.387,50');
    expect(element.querySelector('tbody')?.textContent).toContain('Aberto');
  });

  it('shows loading, initial, and searched-empty states', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando lotes',
    );
    expect(fixture.nativeElement.querySelector('.empty-row')?.textContent).toContain('Aguarde');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('hasSearched', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-row')?.textContent).toContain(
      'Informe os filtros',
    );

    fixture.componentRef.setInput('hasSearched', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-row')?.textContent).toContain(
      'Nenhum lote encontrado',
    );
  });

  it('emits changes for individual and visible row selection', () => {
    fixture.componentRef.setInput('batches', [batch]);
    fixture.detectChanges();

    const selected: Array<{ id: number; checked: boolean }> = [];
    const visibleSelection: boolean[] = [];
    component.batchSelectionChange.subscribe((change) => selected.push(change));
    component.visibleSelectionChange.subscribe((checked) => visibleSelection.push(checked));

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    checkboxes[1].checked = true;
    checkboxes[1].dispatchEvent(new Event('change'));
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));

    expect(selected).toEqual([{ id: 12, checked: true }]);
    expect(visibleSelection).toEqual([true]);
  });
});
