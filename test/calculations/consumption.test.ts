import { Consumption } from '@/domain/calculations/Consumption';
import type { FuelEntry } from '@/domain/entities/FuelEntry';

import { day, full, partial } from './fixtures';

interface Scenario {
    name: string;
    records: FuelEntry[];
    intervals: [distance: number, liters: number][];
    average: number | null;
}

const scenarios: Scenario[] = [
    { name: 'empty history', records: [], intervals: [], average: null },
    { name: 'a single fill-up does not open a leg', records: [full(0, 1_000, 40)], intervals: [], average: null },
    {
        name: 'a sequence of partial fills only',
        records: [partial(0, 1_000, 10), partial(5, 1_200, 12), partial(10, 1_400, 11)],
        intervals: [],
        average: null
    },
    {
        name: 'full tank to full tank',
        records: [full(0, 1_000, 40), full(10, 1_400, 40)],
        intervals: [[400, 40]],
        average: 10
    },
    {
        name: 'a partial fill before the first full tank is ignored',
        records: [partial(0, 900, 10), full(5, 1_000, 40), full(15, 1_400, 40)],
        intervals: [[400, 40]],
        average: 10
    },
    {
        name: 'a partial fill in between adds liters to the leg',
        records: [full(0, 1_000, 40), partial(5, 1_200, 20), full(10, 1_400, 20)],
        intervals: [[400, 40]],
        average: 10
    },
    {
        name: 'multiple partial fills within the same leg',
        records: [
            full(0, 1_000, 50),
            partial(2, 1_100, 10),
            partial(4, 1_200, 10),
            partial(6, 1_300, 10),
            full(8, 1_500, 20)
        ],
        intervals: [[500, 50]],
        average: 10
    },
    {
        name: 'two consecutive legs, weighted average',
        records: [full(0, 1_000, 40), full(10, 1_400, 40), full(20, 1_800, 50)],
        intervals: [
            [400, 40],
            [400, 50]
        ],
        average: 800 / 90
    },
    {
        name: 'a backwards odometer discards only the affected leg',
        records: [full(0, 1_000, 40), full(10, 900, 40), full(20, 1_400, 50)],
        intervals: [[500, 50]],
        average: 10
    },
    {
        name: 'an unchanged odometer between two full tanks is not a leg',
        records: [full(0, 1_000, 40), full(10, 1_000, 30)],
        intervals: [],
        average: null
    },
    {
        name: 'a record with non-positive liters is ignored',
        records: [full(0, 1_000, 40), full(10, 1_400, 0)],
        intervals: [],
        average: null
    },
    {
        name: 'an out-of-order array is sorted before calculating',
        records: [full(10, 1_400, 40), full(0, 1_000, 40)],
        intervals: [[400, 40]],
        average: 10
    }
];

describe('Consumption', () => {
    test.each(scenarios.map((scenario) => [scenario.name, scenario] as const))(
        'intervals() and average() per scenario: %s',
        (_, scenario) => {
            const intervals = Consumption.intervals(scenario.records);

            expect(intervals).toHaveLength(scenario.intervals.length);
            intervals.forEach((actual, index) => {
                const [distance, liters] = scenario.intervals[index] ?? [NaN, NaN];
                expect(actual.distance).toBe(distance);
                expect(actual.liters).toBe(liters);
                expect(actual.kilometersPerLiter).toBe(distance / liters);
            });

            const average = Consumption.average(scenario.records);
            if (scenario.average === null) {
                expect(average).toBeNull();
            } else {
                expect(average).not.toBeNull();
                expect(Math.abs((average ?? NaN) - scenario.average)).toBeLessThan(1e-9);
            }
        }
    );

    test('latest() returns the most recent leg', () => {
        const latest = Consumption.latest([full(0, 1_000, 40), full(10, 1_400, 40), full(20, 1_800, 50)]);

        expect(latest?.startOdometer).toBe(1_400);
        expect(latest?.endOdometer).toBe(1_800);
        expect(latest?.liters).toBe(50);
    });

    test('latest() is null without a closed leg', () => {
        expect(Consumption.latest([full(0, 1_000, 40)])).toBeNull();
    });

    test('the leg carries the dates of the full tanks bounding it', () => {
        const interval = Consumption.latest([full(3, 1_000, 40), full(13, 1_400, 40)]);

        expect(interval?.startDate).toEqual(day(3));
        expect(interval?.endDate).toEqual(day(13));
    });
});
