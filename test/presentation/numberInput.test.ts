import { Decimal } from 'decimal.js';

import { NumberInput, NumberInputStyles, type NumberInputStyle } from '@/presentation/common/NumberInput';

describe('Number input mask', () => {
    test.each<[string, NumberInputStyle, string, Decimal]>([
        ['kilometers', NumberInputStyles.kilometers, '42350', new Decimal(42_350)],
        ['liters', NumberInputStyles.liters, '4050', new Decimal('40.5')],
        ['fuel price', NumberInputStyles.fuelPrice, '5899', new Decimal('5.899')],
        ['money', NumberInputStyles.money, '15000', new Decimal(150)]
    ])('typed digits shift into the fraction digits of %s', (_, style, typed, expected) => {
        const masked = NumberInput.masked(typed, '', style);

        expect(masked).toBe(NumberInput.text(expected, style));
        expect(NumberInput.decimal(masked, style)).toEqualDecimal(expected);
    });

    test('an empty field stays empty and distinct from zero', () => {
        expect(NumberInput.masked('', '1', NumberInputStyles.liters)).toBe('');
        expect(NumberInput.decimal('', NumberInputStyles.liters)).toBeNull();
        expect(
            NumberInput.decimal(NumberInput.masked('0', '', NumberInputStyles.liters), NumberInputStyles.liters)
        ).toEqualDecimal(0);
    });

    test('formatted text is left untouched', () => {
        const formatted = NumberInput.text(new Decimal('5.899'), NumberInputStyles.fuelPrice);

        expect(NumberInput.masked(formatted, '', NumberInputStyles.fuelPrice)).toBe(formatted);
    });

    test('deleting a non-digit character removes the last digit instead', () => {
        const formatted = NumberInput.text(new Decimal('40.5'), NumberInputStyles.liters);

        const masked = NumberInput.masked(`${formatted} `, `${formatted} L`, NumberInputStyles.liters);

        expect(NumberInput.decimal(masked, NumberInputStyles.liters)).toEqualDecimal('4.05');
    });

    test('edit mode round-trips a stored value', () => {
        const text = NumberInput.text(42_000, NumberInputStyles.kilometers);

        expect(NumberInput.double(text, NumberInputStyles.kilometers)).toBe(42_000);
    });

    test('long input is capped at twelve digits', () => {
        const masked = NumberInput.masked('12345678901234', '', NumberInputStyles.kilometers);

        expect(NumberInput.double(masked, NumberInputStyles.kilometers)).toBe(123_456_789_012);
    });
});
