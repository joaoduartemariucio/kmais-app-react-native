import { Maintenance } from '@/domain/calculations/Maintenance';
import type { MaintenanceForecast } from '@/domain/calculations/MaintenanceForecast';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { makeServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceKind } from '@/domain/entities/ServiceKind';
import { makeServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle } from '@/domain/entities/Vehicle';

import { day, dec, rule, sample, utc } from './fixtures';

const history = [sample(0, 10_000), sample(100, 15_000)];
const lastServiceOdometer = 10_000;
const kilometersPerMonth = (50 * 365.25) / 12;

function require<T>(value: T | null | undefined): T {
    expect(value).not.toBeNull();
    expect(value).not.toBeUndefined();
    return value as T;
}

describe('Service forecast', () => {
    const averageScenarios: [name: string, samples: OdometerSample[], expected: number | null][] = [
        ['empty history', [], null],
        ['a single sample', [sample(0, 10_000)], null],
        ['two samples at the same instant', [sample(0, 10_000), sample(0, 10_500)], null],
        ['a vehicle that has not moved', [sample(0, 10_000), sample(100, 10_000)], null],
        ['50 km per day', history, kilometersPerMonth],
        ['out-of-order samples are sorted first', [sample(100, 15_000), sample(0, 10_000)], kilometersPerMonth]
    ];

    test.each(averageScenarios)('averageKilometersPerMonth() per scenario: %s', (_, samples, expected) => {
        const average = Maintenance.averageKilometersPerMonth(samples);
        if (expected === null) {
            expect(average).toBeNull();
        } else {
            expect(Math.abs(require(average) - expected)).toBeLessThan(1e-9);
        }
    });

    function makeForecast(
        kilometers: number | null,
        months: number | null,
        samples: OdometerSample[] = history
    ): MaintenanceForecast | null {
        return Maintenance.forecast({
            rule: rule(kilometers, months),
            lastServiceDate: day(0),
            lastServiceOdometer,
            history: samples,
            calendar: utc
        });
    }

    test('a rule with no interval forecasts nothing', () => {
        expect(makeForecast(null, null)).toBeNull();
        expect(makeForecast(0, 0)).toBeNull();
    });

    test('a distance-only rule without usable history keeps its due km but has no date', () => {
        const histories = [[], [sample(0, 10_000)], [sample(0, 10_000), sample(100, 10_000)]];
        for (const samples of histories) {
            const forecast = require(makeForecast(10_000, null, samples));
            expect(forecast.dueDate).toBeNull();
            expect(forecast.dueOdometer).toBe(20_000);
            expect(forecast.trigger).toBe('distance');
        }
    });

    test('distance comes due before the calendar', () => {
        const forecast = require(makeForecast(10_000, 12));

        expect(forecast.trigger).toBe('distance');
        expect(forecast.dueDate).toEqual(day(200));
        expect(forecast.dueOdometer).toBe(20_000);
        expect(Math.abs(require(forecast.averageKilometersPerMonth) - kilometersPerMonth)).toBeLessThan(1e-9);
    });

    test('months come due before the distance', () => {
        const forecast = require(makeForecast(30_000, 6));

        expect(forecast.trigger).toBe('calendar');
        expect(forecast.dueDate).toEqual(day(181));
        expect(forecast.dueOdometer).toBe(40_000);
    });

    test('a time-only rule has no due odometer', () => {
        const forecast = require(makeForecast(null, 6));

        expect(forecast.trigger).toBe('calendar');
        expect(forecast.dueDate).toEqual(day(181));
        expect(forecast.dueOdometer).toBeNull();
    });

    test('a distance-only rule projects the date from the usage pace', () => {
        const forecast = require(makeForecast(10_000, null));

        expect(forecast.trigger).toBe('distance');
        expect(forecast.dueDate).toEqual(day(200));
    });

    test('a tie between distance and calendar resolves to distance', () => {
        const forecast = require(makeForecast(18_250, 12));

        expect(forecast.dueDate).toEqual(day(365));
        expect(forecast.trigger).toBe('distance');
    });

    test('an already overdue service returns a date in the past', () => {
        const forecast = require(makeForecast(1_000, 12));

        expect(forecast.trigger).toBe('distance');
        expect(forecast.dueDate).toEqual(day(20));
        expect(require(forecast.dueDate).getTime()).toBeLessThan(day(100).getTime());
    });

    test('a vehicle that has not moved falls back to the time rule', () => {
        const forecast = require(makeForecast(10_000, 6, [sample(0, 10_000), sample(100, 10_000)]));

        expect(forecast.trigger).toBe('calendar');
        expect(forecast.dueDate).toEqual(day(181));
        expect(forecast.dueOdometer).toBe(20_000);
        expect(forecast.averageKilometersPerMonth).toBeNull();
    });
});

describe('Next service due', () => {
    const vehicle = makeVehicle({ name: 'Gol', initialOdometer: 10_000, createdAt: day(0) });

    const kindRule = (kind: ServiceKind, kilometers: number | null, months: number | null) =>
        makeServiceRule({ vehicleId: vehicle.id, kind, kilometerInterval: kilometers, monthInterval: months });

    const serviceOf = (kind: ServiceKind) =>
        makeServiceEntry({ vehicleId: vehicle.id, kind, date: day(50), odometer: 12_500, cost: dec(300) });

    test('without rules there is nothing due', () => {
        expect(Maintenance.nextDue({ rules: [], vehicle, services: [], history, calendar: utc })).toBeNull();
    });

    test('with no service of that kind the baseline is the vehicle registration', () => {
        const due = require(
            Maintenance.due({
                rule: kindRule('oilChange', 10_000, null),
                vehicle,
                services: [],
                history,
                calendar: utc
            })
        );

        expect(due.forecast.dueOdometer).toBe(20_000);
        expect(due.forecast.dueDate).toEqual(day(200));
    });

    test('the last service of the kind wins over the registration', () => {
        const due = require(
            Maintenance.due({
                rule: kindRule('oilChange', 10_000, null),
                vehicle,
                services: [serviceOf('oilChange')],
                history,
                calendar: utc
            })
        );

        expect(due.forecast.dueOdometer).toBe(22_500);
    });

    test('a service of another kind does not move the baseline', () => {
        const due = require(
            Maintenance.due({
                rule: kindRule('oilChange', 10_000, null),
                vehicle,
                services: [serviceOf('tires')],
                history,
                calendar: utc
            })
        );

        expect(due.forecast.dueOdometer).toBe(20_000);
    });

    test('the earliest due date wins among several rules', () => {
        const due = require(
            Maintenance.nextDue({
                rules: [
                    kindRule('oilChange', 10_000, null),
                    kindRule('brakes', null, 6),
                    kindRule('tires', 40_000, null)
                ],
                vehicle,
                services: [],
                history,
                calendar: utc
            })
        );

        expect(due.rule.kind).toBe('brakes');
        expect(due.forecast.dueDate).toEqual(day(181));
    });

    test('a rule with no possible forecast is skipped instead of blocking the others', () => {
        const due = require(
            Maintenance.nextDue({
                rules: [kindRule('tires', null, null), kindRule('oilChange', 10_000, null)],
                vehicle,
                services: [],
                history,
                calendar: utc
            })
        );

        expect(due.rule.kind).toBe('oilChange');
    });

    test('an overdue rule beats a future one', () => {
        const due = require(
            Maintenance.nextDue({
                rules: [kindRule('oilChange', 10_000, null), kindRule('chain', 1_000, null)],
                vehicle,
                services: [],
                history,
                calendar: utc
            })
        );

        expect(due.rule.kind).toBe('chain');
        expect(require(due.forecast.dueDate).getTime()).toBeLessThan(day(100).getTime());
    });

    test('a tie on the due date resolves deterministically by kind', () => {
        const due = require(
            Maintenance.nextDue({
                rules: [kindRule('tires', 10_000, null), kindRule('brakes', 10_000, null)],
                vehicle,
                services: [],
                history,
                calendar: utc
            })
        );

        expect(due.rule.kind).toBe('brakes');
    });
});
