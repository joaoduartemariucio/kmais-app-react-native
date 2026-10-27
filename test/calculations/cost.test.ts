import { Cost } from '@/domain/calculations/Cost';

import { day, full, service } from './fixtures';

describe('Cost per kilometer', () => {
    test('no records: everything zeroed and no cost per kilometer', () => {
        const summary = Cost.summary([], []);

        expect(summary.totalCost).toEqualDecimal(0);
        expect(summary.distance).toBe(0);
        expect(summary.costPerKilometer).toBeNull();
    });

    test('a single record has a known spend but no cost per kilometer', () => {
        const summary = Cost.summary([full(0, 1_000, 40, { price: 5 })], []);

        expect(summary.fuelCost).toEqualDecimal(200);
        expect(summary.distance).toBe(0);
        expect(summary.costPerKilometer).toBeNull();
    });

    test('records all at the same odometer define no distance', () => {
        const summary = Cost.summary([full(0, 1_000, 40), full(10, 1_000, 40)], []);

        expect(summary.distance).toBe(0);
        expect(summary.costPerKilometer).toBeNull();
    });

    test('fuel and services add up in the cost per kilometer', () => {
        const summary = Cost.summary(
            [full(0, 1_000, 40, { price: 5 }), full(10, 1_400, 40, { price: '5.50' })],
            [service(5, 1_200, 100)]
        );

        expect(summary.fuelCost).toEqualDecimal(420);
        expect(summary.serviceCost).toEqualDecimal(100);
        expect(summary.totalCost).toEqualDecimal(520);
        expect(summary.distance).toBe(400);
        expect(summary.costPerKilometer).toEqualDecimal('1.30');
    });

    test('a service can be the far end of the odometer span', () => {
        const summary = Cost.summary([full(0, 1_000, 40), full(10, 1_400, 40)], [service(20, 1_600, 200)]);

        expect(summary.distance).toBe(600);
    });

    test('summing cents does not accumulate floating-point error', () => {
        const fuel = Array.from({ length: 10 }, (_, index) => full(index, 1_000 + index * 100, 1, { price: '0.10' }));

        const summary = Cost.summary(fuel, []);
        const viaDouble = Array.from({ length: 10 }).reduce<number>((total) => total + 0.1, 0);

        expect(summary.fuelCost).toEqualDecimal(1);
        expect(viaDouble).not.toBe(1);
    });

    test('the period is whatever the arrays carry: filtering by date changes the result', () => {
        const everything = [full(0, 1_000, 40), full(10, 1_400, 40), full(20, 1_800, 40)];
        const recent = everything.filter((entry) => entry.date.getTime() >= day(10).getTime());

        expect(Cost.summary(everything, []).distance).toBe(800);
        expect(Cost.summary(recent, []).distance).toBe(400);
    });
});
