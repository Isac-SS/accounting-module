import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Batch } from '../domain/batch';
import { BatchActionsComponent } from './batch-actions.component';

const selectedOpenBatch: Batch = {
  id: 3,
  responsibleInstitution: 'Instituição responsável',
  institution: 'Instituição',
  entryDate: '2026-03-01',
  amountCents: 2500,
  entryCount: 1,
  createdBy: 'usuario',
  approvedBy: null,
  status: 'OPEN',
  statusChangedAt: '2026-03-01T15:30:00.000Z',
  justification: null,
};

describe('BatchActionsComponent', () => {
  let fixture: ComponentFixture<BatchActionsComponent>;
  let component: BatchActionsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BatchActionsComponent] }).compileComponents();
    fixture = TestBed.createComponent(BatchActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('enables actions based on selection, batch status, and loading state', () => {
    expect(button('Incluir').disabled).toBe(false);
    expect(button('Alterar').disabled).toBe(true);
    expect(button('Visualizar').disabled).toBe(true);

    fixture.componentRef.setInput('selectedBatch', selectedOpenBatch);
    fixture.componentRef.setInput('canSubmit', true);
    fixture.detectChanges();

    expect(button('Alterar').disabled).toBe(false);
    expect(button('Visualizar').disabled).toBe(false);
    expect(button('Excluir').disabled).toBe(false);
    expect(button('Enviar').disabled).toBe(false);
    expect(button('Confirmar').disabled).toBe(true);

    fixture.componentRef.setInput('actionLoading', true);
    fixture.detectChanges();
    expect(button('Alterar').disabled).toBe(true);
    expect(button('Enviar').disabled).toBe(true);
  });

  it('emits an event for each enabled button', () => {
    fixture.componentRef.setInput('selectedBatch', selectedOpenBatch);
    fixture.componentRef.setInput('canSubmit', true);
    fixture.componentRef.setInput('canConfirm', true);
    fixture.detectChanges();

    const events = { create: 0, edit: 0, view: 0, delete: 0, confirm: 0, submit: 0, showJustification: 0 };
    component.create.subscribe(() => events.create++);
    component.edit.subscribe(() => events.edit++);
    component.view.subscribe(() => events.view++);
    component.delete.subscribe(() => events.delete++);
    component.confirm.subscribe(() => events.confirm++);
    component.submit.subscribe(() => events.submit++);
    component.showJustification.subscribe(() => events.showJustification++);

    for (const label of ['Incluir', 'Alterar', 'Visualizar', 'Excluir', 'Confirmar', 'Enviar', 'Visualizar justificativa']) {
      button(label).click();
    }

    expect(events).toEqual({ create: 1, edit: 1, view: 1, delete: 1, confirm: 1, submit: 1, showJustification: 1 });
  });

  function button(label: string): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('button')]
      .find((element) => element.textContent?.trim() === label) as HTMLButtonElement;
  }
});
