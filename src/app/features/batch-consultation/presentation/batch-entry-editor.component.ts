import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, DestroyRef, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, distinctUntilChanged, map, of, switchMap, tap, timer } from 'rxjs';
import { BatchApi } from '../data/batch-api';
import { BatchEntry, BatchEntryOptions } from '../domain/batch';

type EditorMode = 'create' | 'edit' | 'view';
type AccountLookup = 'idle' | 'checking' | 'found' | 'not-found' | 'unavailable';

function centPrecision(control: AbstractControl): { centPrecision: true } | null {
  const value = control.value;
  return typeof value === 'number' && Math.abs(value * 100 - Math.round(value * 100)) > 1e-8
    ? { centPrecision: true }
    : null;
}

@Component({
  selector: 'app-batch-entry-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './batch-entry-editor.component.html',
  styleUrl: './batch-entry-editor.component.scss'
})
export class BatchEntryEditorComponent implements OnInit, OnChanges, AfterViewInit {
  @Input({ required: true }) entries: BatchEntry[] = [];
  @Input({ required: true }) mode: EditorMode = 'create';
  @Input() saving = false;
  @Input() apiError: string | null = null;
  @ViewChild('dialog') private dialog!: ElementRef<HTMLDialogElement>;

  readonly save = output<BatchEntry[]>();
  readonly cancel = output<void>();

  private readonly api = inject(BatchApi);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly options = signal<BatchEntryOptions>({ histories: [], servicePoints: [] });
  protected readonly rows = signal<BatchEntry[]>([]);
  protected readonly selectedIndex = signal<number | null>(null);
  protected readonly accountLookup = signal<AccountLookup>('idle');
  protected readonly accountHolder = signal('');
  protected readonly optionsError = signal(false);
  protected readonly rowError = signal<string | null>(null);
  protected readonly totalCents = signal(0);
  protected readonly readOnly = () => this.mode === 'view';

  protected readonly form = this.formBuilder.group({
    accountNumber: this.formBuilder.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{5}$/)]),
    amount: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01), centPrecision]),
    history: this.formBuilder.nonNullable.control('', Validators.required),
    reversal: this.formBuilder.nonNullable.control(false),
    document: this.formBuilder.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]),
    description: this.formBuilder.nonNullable.control('', Validators.maxLength(200)),
    servicePoint: this.formBuilder.nonNullable.control('', Validators.required)
  });

  ngOnInit(): void {
    this.api.getEntryOptions().pipe(
      catchError(() => {
        this.optionsError.set(true);
        return of({ histories: [], servicePoints: [] });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((options) => this.options.set(options));

    this.form.controls.accountNumber.valueChanges.pipe(
      map((number) => number.trim()),
      distinctUntilChanged(),
      tap(() => {
        this.accountHolder.set('');
        this.accountLookup.set('idle');
      }),
      switchMap((number) => {
        if (!/^\d{5}$/.test(number)) {
          return of(null);
        }
        this.accountLookup.set('checking');
        return timer(400).pipe(switchMap(() => this.api.getCurrentAccount(number).pipe(
          map((account) => ({ kind: 'found' as const, holder: account.holder })),
          catchError((error: unknown) => of({ kind: error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' as const : 'unavailable' as const, holder: '' }))
        )));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((result) => {
      if (!result) return;
      this.accountLookup.set(result.kind);
      this.accountHolder.set(result.holder);
    });
  }

  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entries']) {
      this.rows.set([...this.entries]);
      this.selectedIndex.set(null);
      this.updateTotal();
    }
    if (changes['mode'] && this.mode === 'view') this.form.disable({ emitEvent: false });
    else if (changes['mode']) this.form.enable({ emitEvent: false });
  }

  protected addOrUpdateRow(): void {
    if (this.readOnly()) return;
    if (this.form.invalid || this.accountLookup() !== 'found') {
      this.form.markAllAsTouched();
      this.rowError.set(this.accountLookup() === 'not-found'
        ? 'A conta corrente informada não foi encontrada.'
        : this.accountLookup() === 'unavailable'
          ? 'Não foi possível consultar a conta. Verifique a API e tente novamente.'
          : 'Revise os campos e aguarde a confirmação da conta corrente.');
      return;
    }

    const value = this.form.getRawValue();
    const row: BatchEntry = {
      id: this.selectedIndex() === null ? this.nextId() : this.rows()[this.selectedIndex()!].id,
      accountNumber: value.accountNumber.trim(),
      accountHolder: this.accountHolder(),
      amountCents: Math.round((value.amount ?? 0) * 100),
      history: value.history,
      reversal: value.reversal,
      document: value.document.trim(),
      description: value.description.trim(),
      status: 'PENDING',
      servicePoint: value.servicePoint
    };
    const next = [...this.rows()];
    const selected = this.selectedIndex();
    if (selected === null) next.push(row);
    else next[selected] = row;
    this.rows.set(next);
    this.selectedIndex.set(null);
    this.rowError.set(null);
    this.form.reset({ accountNumber: '', amount: null, history: '', reversal: false, document: '', description: '', servicePoint: '' });
    this.updateTotal();
  }

  protected selectRow(index: number): void {
    const row = this.rows()[index];
    this.selectedIndex.set(index);
    this.rowError.set(null);
    this.accountHolder.set(row.accountHolder);
    this.accountLookup.set('found');
    this.form.reset({
      accountNumber: row.accountNumber,
      amount: row.amountCents / 100,
      history: row.history,
      reversal: row.reversal,
      document: row.document,
      description: row.description,
      servicePoint: row.servicePoint
    }, { emitEvent: false });
  }

  protected removeRow(index: number): void {
    if (this.readOnly()) return;
    this.rows.update((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
    this.selectedIndex.set(null);
    this.rowError.set(null);
    this.updateTotal();
  }

  protected duplicateRow(index: number): void {
    if (this.readOnly()) return;
    const source = this.rows()[index];
    const copy = { ...source, id: this.nextId(), document: `${source.document.slice(0, 17)}-C` };
    this.rows.update((rows) => [...rows, copy]);
    this.rowError.set(null);
    this.updateTotal();
  }

  protected submit(): void {
    if (this.readOnly() || this.saving) return;
    if (this.rows().length === 0) {
      this.rowError.set('Adicione ao menos um lançamento antes de salvar.');
      return;
    }
    this.save.emit(this.rows());
  }

  protected formatAmount(cents: number): string {
    const signed = cents / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(signed);
  }

  protected closeOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
    }
  }

  protected cancelEdit(): void {
    this.cancel.emit();
  }

  private nextId(): number {
    return Math.max(0, ...this.rows().map((row) => row.id)) + 1;
  }

  private updateTotal(): void {
    this.totalCents.set(this.rows().reduce((total, row) => total + (row.reversal ? -row.amountCents : row.amountCents), 0));
  }
}
