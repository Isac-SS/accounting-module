import { Component, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { BatchFilters, BatchStatusFilter } from '../../../domain/batch';
import { INITIAL_BATCH_FILTERS } from '../../../application/batch-consultation.store';
import { BrlCurrencyPipe } from '../../../../../core/pipes/brl-currency.pipe';

const AMOUNT_MAX_DIGITS = 9; // inclui as 2 casas decimais: até R$ 9.999.999,99
const brlCurrency = new BrlCurrencyPipe();

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
  selector: 'app-batch-filter-form',
  imports: [ReactiveFormsModule, BrlCurrencyPipe],
  templateUrl: './batch-filter-form.component.html',
  styleUrl: './batch-filter-form.component.scss',
})
export class BatchFilterFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = input(false);
  readonly search = output<BatchFilters>();
  protected readonly filtersExpanded = signal(true);
  // Caracteres do maior valor formatado ("R$ 9.999.999,99").
  protected readonly amountMaxLength = brlCurrency.transform(
    Number('9'.repeat(AMOUNT_MAX_DIGITS)) / 100,
  ).length;

  protected readonly form = this.formBuilder.group(
    {
      responsibleInstitution: this.formBuilder.nonNullable.control(
        INITIAL_BATCH_FILTERS.responsibleInstitution,
        [Validators.maxLength(60)],
      ),
      institution: this.formBuilder.nonNullable.control(INITIAL_BATCH_FILTERS.institution, [
        Validators.maxLength(60),
      ]),
      status: this.formBuilder.nonNullable.control<BatchStatusFilter>('ALL'),
      idFrom: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
      idTo: this.formBuilder.control<number | null>(null, [Validators.min(1)]),
      amountFrom: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
      amountTo: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
      entryDateFrom: this.formBuilder.nonNullable.control(''),
      entryDateTo: this.formBuilder.nonNullable.control(''),
    },
    {
      validators: [
        orderedRange('idFrom', 'idTo'),
        orderedRange('amountFrom', 'amountTo'),
        orderedRange('entryDateFrom', 'entryDateTo'),
      ],
    },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.search.emit({
      responsibleInstitution: values.responsibleInstitution.trim(),
      institution: values.institution.trim(),
      status: values.status,
      idFrom: values.idFrom,
      idTo: values.idTo,
      amountFromCents: this.toCents(values.amountFrom),
      amountToCents: this.toCents(values.amountTo),
      entryDateFrom: values.entryDateFrom,
      entryDateTo: values.entryDateTo,
    });
  }

  protected clear(): void {
    this.form.reset({
      responsibleInstitution: '',
      institution: '',
      status: 'ALL',
      idFrom: null,
      idTo: null,
      amountFrom: null,
      amountTo: null,
      entryDateFrom: '',
      entryDateTo: '',
    });
  }

  protected onAmountInput(name: 'amountFrom' | 'amountTo', event: Event): void {
    const input = event.target as HTMLInputElement;
    // Máscara de centavos: os dígitos digitados entram pela direita.
    const digits = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, AMOUNT_MAX_DIGITS);
    const value = digits === '' ? null : Number(digits) / 100;
    this.form.controls[name].setValue(value);
    input.value = brlCurrency.transform(value);
  }

  private toCents(value: number | null): number | null {
    return value === null ? null : Math.round(value * 100);
  }
}
