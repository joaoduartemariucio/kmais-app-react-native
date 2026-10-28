import { gridColumns, gridRows } from '@/presentation/common/GridLayout';

describe('Grid layout', () => {
    test('as many columns fit as the minimum width allows', () => {
        expect(gridColumns(0, 96, 8)).toBe(1);
        expect(gridColumns(Number.NaN, 96, 8)).toBe(1);
        expect(gridColumns(50, 96, 8)).toBe(1);
        expect(gridColumns(200, 96, 8)).toBe(2);
        expect(gridColumns(304, 96, 8)).toBe(3);
        expect(gridColumns(303.6190490722656, 96, 8)).toBe(2);
        expect(gridColumns(361.1428527832031, 96, 8)).toBe(3);
    });

    test('items are split into full rows and the last row is padded', () => {
        expect(gridRows([], 3)).toEqual([]);
        expect(gridRows([1, 2, 3, 4, 5], 3)).toEqual([
            [1, 2, 3],
            [4, 5, null]
        ]);
        expect(gridRows([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    });

    test.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        'an invalid column count (%p) falls back to one column',
        (columns) => {
            expect(gridRows([1, 2], columns)).toEqual([[1], [2]]);
        }
    );
});
