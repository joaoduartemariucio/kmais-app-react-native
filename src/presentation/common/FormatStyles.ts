import type { Decimal } from 'decimal.js';

import { t } from '../i18n/i18n';
import { AppLocale } from './AppLocale';

function number(value: number, fractionDigits: number): string {
    return new Intl.NumberFormat(AppLocale.tag, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    }).format(value);
}

function date(value: Date, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(AppLocale.tag, options).format(value);
}

export function formattedKilometers(value: number, fractionDigits = 0): string {
    return `${number(value, fractionDigits)} km`;
}

export function formattedLiters(value: number, fractionDigits = 2): string {
    return `${number(value, fractionDigits)} L`;
}

export function formattedConsumption(value: number): string {
    return t('{{value}} km/L', { value: number(value, 1) });
}

export function formattedKilometersPerMonth(value: number): string {
    return t('{{distance}}/month', { distance: formattedKilometers(value) });
}

export function formattedRemainingKilometers(value: number): string {
    return value > 0
        ? t('{{distance}} left', { distance: formattedKilometers(value) })
        : t('{{distance}} past due', { distance: formattedKilometers(-value) });
}

export function formattedRelativeDays(days: number): string {
    if (days === 0) return t('today');
    if (days === 1) return t('tomorrow');
    if (days === -1) return t('yesterday');
    return days > 0 ? t('in {{count}} days', { count: days }) : t('{{count}} days ago', { count: -days });
}

export function formattedNumber(value: number, fractionDigits = 0): string {
    return number(value, fractionDigits);
}

export function formattedCurrency(value: Decimal): string {
    return new Intl.NumberFormat(AppLocale.tag, { style: 'currency', currency: AppLocale.currency }).format(
        value.toNumber()
    );
}

export function formattedPerKilometer(value: Decimal): string {
    return t('{{value}}/km', { value: formattedCurrency(value) });
}

export function formattedPerLiter(value: Decimal): string {
    return t('{{value}}/L', { value: formattedCurrency(value) });
}

export function formattedDay(value: Date): string {
    return date(value, { day: 'numeric', month: 'short' });
}

export function formattedFullDate(value: Date): string {
    return date(value, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formattedMonthAndYear(value: Date): string {
    return date(value, { month: 'long', year: 'numeric' });
}

export function formattedShortMonth(value: Date): string {
    return date(value, { month: 'short' });
}
