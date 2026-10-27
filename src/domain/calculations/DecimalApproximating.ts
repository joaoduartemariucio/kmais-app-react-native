import { Decimal } from 'decimal.js';

export function decimalApproximating(value: number): Decimal {
    return Number.isFinite(value) ? new Decimal(String(value)) : new Decimal(0);
}

export function sumDecimals(values: readonly Decimal[]): Decimal {
    return values.reduce((total, value) => total.plus(value), new Decimal(0));
}
