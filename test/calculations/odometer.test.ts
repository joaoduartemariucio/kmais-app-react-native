import { Odometer } from '@/domain/calculations/Odometer';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { makeVehicle } from '@/domain/entities/Vehicle';

import { day, full, sample, service, testVehicleId } from './fixtures';

const scenarios: [name: string, samples: OdometerSample[], expected: number | null][] = [
    ['empty history', [], null],
    ['a single sample', [sample(0, 10_000)], 10_000],
    ['the most recent reading wins', [sample(0, 10_000), sample(30, 12_000), sample(10, 11_000)], 12_000],
    [
        'a backwards odometer returns the most recent, not the highest',
        [sample(0, 10_000), sample(10, 15_000), sample(20, 12_000)],
        12_000
    ],
    ['a date tie resolves by the higher odometer', [sample(0, 10_000), sample(10, 11_000), sample(10, 11_500)], 11_500]
];

describe('Odometer', () => {
    test.each(scenarios)('current() per scenario: %s', (_, samples, expected) => {
        expect(Odometer.current(samples)).toBe(expected);
    });

    test('neighbors() brackets a date between the readings around it', () => {
        const samples = [sample(0, 10_000), sample(10, 11_000), sample(20, 12_000)];

        expect(Odometer.neighbors(day(15), samples)).toEqual({ previous: 11_000, next: 12_000 });
    });

    test('neighbors() has no next reading after the most recent one', () => {
        expect(Odometer.neighbors(day(30), [sample(0, 10_000), sample(10, 11_000)])).toEqual({
            previous: 11_000,
            next: null
        });
    });

    test('neighbors() has no previous reading before the first one', () => {
        expect(Odometer.neighbors(day(-5), [sample(0, 10_000)])).toEqual({ previous: null, next: 10_000 });
    });

    test('samples() includes the vehicle registration', () => {
        const vehicle = makeVehicle({ id: testVehicleId, name: 'Gol', initialOdometer: 50_000, createdAt: day(0) });

        const samples = Odometer.samples(vehicle, [full(10, 51_000, 40)], [service(20, 52_000, 300)]);

        expect(samples).toHaveLength(3);
        expect(Odometer.current(samples)).toBe(52_000);
        expect(Odometer.current(Odometer.samples(vehicle, [], []))).toBe(50_000);
    });
});
