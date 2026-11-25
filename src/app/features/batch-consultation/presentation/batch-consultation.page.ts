import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { catchError, of, Subject, switchMap, tap } from 'rxjs';
import { Batch, BatchFilters, BatchStatus, BatchStatusFilter, Page } from '../domain/batch';
import { BatchApi } from '../data/batch-api';

const pageSize = 10;
const initialFilters: BatchFilters = {
  responsibleInstitution: '0001 - COOPERATIVA CENTRAL',
  institution: '0002 - UNIDADE CENTRAL',
  status: 'ALL',
  idFrom: null,
  idTo: null,
  amountFromCents: null,
  amountToCents: null,
  entryDateFrom: '',
  entryDateTo: ''
};

const statusLabels: Record<BatchStatus, string> = {
  OPEN: 'Aberto',
  SUBMITTED: 'Enviado',
  CONFIRMED: 'Confirmado'
};

function orderedRange(fromName: string, toName: string): ValidatorFn {
  return (control): ValidationErrors | null => {
    const from = control.get(fromName)?.value as string | number | null;
    const to = control.get(toName)?.value as string | number | null;
    return from !== null && from !== '' && to !== null && to !== '' && from > to
      ? { [`rangeOrder_${fromName}`]: { fromName, toName } }
      : null;
  };
}

@Component({
  selector: 'app-batch-consultation-page',
  imports: [ReactiveFormsModule],
  templateUrl: './batch-consultation.page.html',
  styleUrl: './batch-consultation.page.scss'
})
export class BatchConsultationPage {
  private readonly api = inject(BatchApi);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<{ filters: BatchFilters; page: number }>();

  protected readonly pageSize = pageSize;
  protected readonly page = signal(1);
  private readonly activeFilters = signal<BatchFilters>(initialFilters);
  protected readonly batches = signal<Batch[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly filtersExpanded = signal(true);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / pageSize)));
  protected readonly visibleStatuses = statusLabels;

  protected readonly form = this.formBuilder.group({
    responsibleInstitution: this.formBuilder.nonNullable.control(initialFilters.responsibleInstitution, [Validators.maxLength(60)]),
    institution: this.formBuilder.nonNullable.control(initialFilters.institution, [Validators.maxLength(60)]),
    status: this.formBuilder.nonNullable.control<BatchStatusFilter>('ALL'),
    idFrom: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    idTo: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
    amountFrom: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    amountTo: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    entryDateFrom: this.formBuilder.nonNullable.control(''),
    entryDateTo: this.formBuilder.nonNullable.control('')
  }, {
    validators: [
      orderedRange('idFrom', 'idTo'),
      orderedRange('amountFrom', 'amountTo'),
      orderedRange('entryDateFrom', 'entryDateTo')
    ]
  });

  constructor() {
    this.requests.pipe(
      tap(() => {
        this.loading.set(true);
        this.errorMessage.set(null);
      }),
      switchMap(({ filters, page: requestedPage }) => this.api.list(filters, requestedPage, pageSize).pipe(
        catchError((error: unknown) => {
          const message = error instanceof HttpErrorResponse && error.status === 0
            ? 'Não foi possível conectar à API. Verifique se o servidor mock está em execução.'
            : 'Não foi possível carregar os lotes. Tente novamente.';
          this.errorMessage.set(message);
          return of(null);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((result: Page<Batch> | null) => {
      this.loading.set(false);
      this.hasSearched.set(true);
      if (result) {
        this.batches.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
      }
    });

    this.requestPage(1, initialFilters);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const filters: BatchFilters = {
      responsibleInstitution: values.responsibleInstitution.trim(),
      institution: values.institution.trim(),
      status: values.status,
      idFrom: values.idFrom,
      idTo: values.idTo,
      amountFromCents: this.toCents(values.amountFrom),
      amountToCents: this.toCents(values.amountTo),
      entryDateFrom: values.entryDateFrom,
      entryDateTo: values.entryDateTo
    };
    this.activeFilters.set(filters);
    this.requestPage(1, filters);
  }

  protected clear(): void {
    this.form.reset({
      responsibleInstitution: '', institution: '', status: 'ALL',
      idFrom: null, idTo: null, amountFrom: null, amountTo: null,
      entryDateFrom: '', entryDateTo: ''
    });
  }

  protected goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages() || nextPage === this.page()) return;
    this.requestPage(nextPage, this.activeFilters());
  }

  protected formatAmount(amountCents: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  }

  protected formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  protected formatDateTime(dateTime: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateTime));
  }

  private requestPage(requestedPage: number, filters: BatchFilters): void {
    this.page.set(requestedPage);
    this.requests.next({ filters, page: requestedPage });
  }

  private toCents(value: number | null): number | null {
    return value === null ? null : Math.round(value * 100);
  }
}
