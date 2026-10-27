import { Maintenance } from '@/domain/calculations/Maintenance';
import type { MaintenanceTrigger } from '@/domain/calculations/MaintenanceForecast';
import { MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';
import type { ServiceDue } from '@/domain/calculations/ServiceDue';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { makeServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeVehicle } from '@/domain/entities/Vehicle';

import { day, dec, rule, sample, utc } from './fixtures';

function due(
    kilometers: number | null,
    months: number | null,
    dueDate: Date,
    trigger: MaintenanceTrigger = 'distance',
    since: OdometerSample = sample(0, 10_000)
): ServiceDue {
    return {
        rule: rule(kilometers, months),
        forecast: {
            dueDate,
            trigger,
            dueOdometer: kilometers === null ? null : since.odometer + kilometers,
            averageKilometersPerMonth: null
        },
        since
    };
}

function status(item: ServiceDue, odometer: number, now: number) {
    return Maintenance.status({ due: item, currentOdometer: odometer, now: day(now), calendar: utc });
}

describe('Service status', () => {
    test('halfway through both intervals is on track', () => {
        const result = status(due(10_000, 12, day(200)), 15_000, 100);

        expect(result.level).toBe(MaintenanceLevel.OnTrack);
        expect(result.progress).toBe(0.5);
        expect(result.remainingKilometers).toBe(5_000);
        expect(result.remainingDays).toBe(100);
    });

    test('a short interval uses the 300 km floor', () => {
        const chain = due(1_000, null, day(300));

        expect(status(chain, 10_650, 10).level).toBe(MaintenanceLevel.OnTrack);
        expect(status(chain, 10_750, 10).level).toBe(MaintenanceLevel.DueSoon);
    });

    test('a long interval is capped at 1,000 km', () => {
        const plugs = due(40_000, null, day(3_000));

        expect(status(plugs, 48_500, 10).level).toBe(MaintenanceLevel.OnTrack);
        expect(status(plugs, 49_100, 10).level).toBe(MaintenanceLevel.DueSoon);
    });

    test('the last days before the due date are due soon', () => {
        const oil = due(null, 12, day(365), 'calendar');

        expect(status(oil, 10_000, 330).level).toBe(MaintenanceLevel.OnTrack);
        expect(status(oil, 10_000, 340).level).toBe(MaintenanceLevel.DueSoon);
    });

    test('reaching the due odometer is overdue', () => {
        const result = status(due(10_000, 12, day(300)), 21_000, 100);

        expect(result.level).toBe(MaintenanceLevel.Overdue);
        expect(result.progress).toBe(1);
        expect(result.remainingKilometers).toBe(-1_000);
    });

    test('passing the calendar due date is overdue', () => {
        const result = status(due(null, 1, day(31), 'calendar'), 10_000, 40);

        expect(result.level).toBe(MaintenanceLevel.Overdue);
        expect(result.remainingDays).toBe(-9);
    });

    test('a pace-based date in the past is only due soon while the odometer is short', () => {
        const result = status(due(10_000, null, day(50)), 12_000, 60);

        expect(result.level).toBe(MaintenanceLevel.DueSoon);
        expect(result.remainingDays).toBe(-10);
    });

    test('due() starts counting from the last service of that kind', () => {
        const vehicle = makeVehicle({ name: 'Gol', initialOdometer: 1_000, createdAt: day(0) });
        const oil = makeServiceEntry({
            vehicleId: vehicle.id,
            kind: 'oilChange',
            date: day(20),
            odometer: 2_000,
            cost: dec(100)
        });
        const history = [sample(0, 1_000), sample(40, 3_000)];

        const withService = Maintenance.due({
            rule: rule(5_000, null),
            vehicle,
            services: [oil],
            history,
            calendar: utc
        });
        const withoutService = Maintenance.due({
            rule: rule(5_000, null),
            vehicle,
            services: [],
            history,
            calendar: utc
        });

        expect(withService?.since).toEqual(sample(20, 2_000));
        expect(withoutService?.since).toEqual(sample(0, 1_000));
    });

    test('the status says which limit made it overdue and keeps the calendar date', () => {
        const both = due(10_000, 1, day(31), 'calendar');

        const byCalendar = status(both, 12_000, 40);
        expect(byCalendar.overdueBy).toBe('calendar');
        expect(byCalendar.calendarDueDate).toEqual(day(31));

        expect(status(both, 20_000, 40).overdueBy).toBe('calendar');
        expect(status(both, 20_000, 20).overdueBy).toBe('distance');
        expect(status(both, 12_000, 10).overdueBy).toBeNull();
    });

    test('without a forecast date the status comes from km alone', () => {
        const chain: ServiceDue = {
            rule: rule(1_000, null),
            forecast: { dueDate: null, trigger: 'distance', dueOdometer: 11_000, averageKilometersPerMonth: null },
            since: sample(0, 10_000)
        };

        const early = status(chain, 10_200, 5);
        expect(early.level).toBe(MaintenanceLevel.OnTrack);
        expect(early.remainingDays).toBeNull();
        expect(early.progress).toBe(0.2);
        expect(early.isEstimatePassed).toBe(false);

        expect(status(chain, 10_800, 5).level).toBe(MaintenanceLevel.DueSoon);
        expect(status(chain, 11_000, 5).overdueBy).toBe('distance');
    });
});
