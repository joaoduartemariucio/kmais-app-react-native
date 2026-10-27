import { Decimal } from 'decimal.js';

import { decimalApproximating } from '@/domain/calculations/DecimalApproximating';

import { AppLocale } from './AppLocale';

export type NumberInputStyle =
    | { readonly type: 'integer' }
    | { readonly type: 'decimal'; readonly fractionDigits: number }
    | { readonly type: 'currency'; readonly fractionDigits: number };

const integer: NumberInputStyle = { type: 'integer' };

export const NumberInputStyles = {
    kilometers: integer,
    months: integer,
    liters: { type: 'decimal', fractionDigits: 2 } as NumberInputStyle,
    fuelPrice: { type: 'currency', fractionDigits: 3 } as NumberInputStyle,
    money: { type: 'currency', fractionDigits: 2 } as NumberInputStyle
};

const maxDigits = 12;

function fractionDigits(style: NumberInputStyle): number {
    return style.type === 'integer' ? 0 : style.fractionDigits;
}

function digits(text: string): string {
    return text.replace(/[^0-9]/g, '');
}

function valueFromDigits(text: string, style: NumberInputStyle): Decimal | null {
    if (text.length === 0) return null;
    return new Decimal(text).dividedBy(new Decimal(10).pow(fractionDigits(style)));
}

function format(value: Decimal | number | null, style: NumberInputStyle): string {
    if (value === null) return '';
    const decimal = typeof value === 'number' ? decimalApproximating(value) : value;
    const fraction = fractionDigits(style);
    const options: Intl.NumberFormatOptions = { minimumFractionDigits: fraction, maximumFractionDigits: fraction };
    if (style.type === 'currency') {
        options.style = 'currency';
        options.currency = AppLocale.currency;
    }
    return new Intl.NumberFormat(AppLocale.tag, options).format(Number(decimal.toFixed(fraction)));
}

function decimal(text: string, style: NumberInputStyle): Decimal | null {
    return valueFromDigits(digits(text), style);
}

function double(text: string, style: NumberInputStyle): number | null {
    return decimal(text, style)?.toNumber() ?? null;
}

function masked(text: string, previous: string, style: NumberInputStyle): string {
    let typed = digits(text);
    const parsed = decimal(text, style);
    if (parsed !== null && format(parsed, style) === text) {
        return text;
    }
    if (text.length < previous.length && typed === digits(previous)) {
        typed = typed.slice(0, -1);
    }
    const value = valueFromDigits(typed.slice(0, maxDigits), style);
    return value === null ? '' : format(value, style);
}

export const NumberInput = { masked, decimal, double, text: format, fractionDigits };
