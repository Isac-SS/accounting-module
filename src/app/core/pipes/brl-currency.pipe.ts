import { Pipe, PipeTransform } from '@angular/core';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const AMOUNT_MAX_DIGITS = 9; // inclui as 2 casas decimais: até R$ 9.999.999,99

@Pipe({ name: 'brlCurrency' })
export class BrlCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : BRL.format(value);
  }
}

// Caracteres do maior valor formatado ("R$ 9.999.999,99").
export const AMOUNT_MAX_LENGTH = BRL.format(Number('9'.repeat(AMOUNT_MAX_DIGITS)) / 100).length;

// Máscara de centavos: os dígitos digitados entram pela direita. Reformata o input e devolve o valor em reais.
export function applyBrlMask(input: HTMLInputElement): number | null {
  const digits = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, AMOUNT_MAX_DIGITS);
  const value = digits === '' ? null : Number(digits) / 100;
  input.value = value === null ? '' : BRL.format(value);
  return value;
}
