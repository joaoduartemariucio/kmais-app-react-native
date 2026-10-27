import { RepositoryError } from '@/domain/errors/RepositoryError';
import { evenlySpacedIndices, monotonePath, niceTicks } from '@/presentation/common/ChartGeometry';
import { errorMessage } from '@/presentation/common/ErrorMessage';

describe('Chart geometry', () => {
    test('ticks are round numbers that cover the range', () => {
        expect(niceTicks(0, 1_000)).toEqual([0, 250, 500, 750, 1_000]);
        expect(niceTicks(8.2, 12.9)).toEqual([8, 10, 12, 14]);
        expect(niceTicks(0, 0)).toEqual([0, 0.25, 0.5, 0.75, 1]);
        expect(niceTicks(10, 10).at(0)).toBeLessThanOrEqual(10);
        expect(niceTicks(Number.NaN, 1)).toEqual([]);
    });

    test('the line goes through every point without overshooting flat segments', () => {
        expect(monotonePath([])).toBe('');
        expect(monotonePath([{ x: 0, y: 5 }])).toBe('M0,5');

        const path = monotonePath([
            { x: 0, y: 10 },
            { x: 30, y: 10 },
            { x: 60, y: 0 },
            { x: 90, y: 20 }
        ]);
        expect(path.startsWith('M0,10 C10,10 20,10 30,10')).toBe(true);
        expect(path.endsWith(' 90,20')).toBe(true);
    });

    test('axis labels are spread evenly across the data', () => {
        expect(evenlySpacedIndices(0, 4)).toEqual([]);
        expect(evenlySpacedIndices(3, 4)).toEqual([0, 1, 2]);
        expect(evenlySpacedIndices(10, 4)).toEqual([0, 3, 6, 9]);
    });
});

describe('Error messages', () => {
    test('repository errors are translated, other errors keep their message', () => {
        expect(errorMessage(RepositoryError.vehicleNotFound('id'))).toBe('This vehicle no longer exists.');
        expect(errorMessage(RepositoryError.entryNotFound('id'))).toBe('This record no longer exists.');
        expect(errorMessage(RepositoryError.persistenceFailed(new Error('disk')))).toBe('Could not save your changes.');
        expect(errorMessage(new Error('boom'))).toBe('boom');
        expect(errorMessage('plain')).toBe('plain');
    });
});
