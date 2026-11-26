import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatchPaginationComponent } from './batch-pagination.component';

describe('BatchPaginationComponent', () => {
  let fixture: ComponentFixture<BatchPaginationComponent>;
  let component: BatchPaginationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BatchPaginationComponent] }).compileComponents();
    fixture = TestBed.createComponent(BatchPaginationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 3);
    fixture.detectChanges();
  });

  it('disables boundary navigation and emits requested pages', () => {
    const changes: number[] = [];
    component.pageChange.subscribe((page) => changes.push(page));

    expect(button('Primeira página').disabled).toBe(true);
    expect(button('Página anterior').disabled).toBe(true);
    expect(button('Próxima página').disabled).toBe(false);
    expect(button('Última página').disabled).toBe(false);

    button('Próxima página').click();
    button('Última página').click();
    expect(changes).toEqual([2, 3]);

    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    expect(button('Próxima página').disabled).toBe(true);
    expect(button('Última página').disabled).toBe(true);
    expect(button('Primeira página').disabled).toBe(false);
    expect(button('Página anterior').disabled).toBe(false);
  });

  it('hides pagination for one page and disables navigation while loading', () => {
    fixture.componentRef.setInput('totalPages', 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();

    fixture.componentRef.setInput('totalPages', 3);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('button')].every((item: HTMLButtonElement) => item.disabled)).toBe(true);
  });

  function button(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;
  }
});
