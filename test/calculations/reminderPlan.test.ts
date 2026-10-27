import { makeMaintenanceStatus, MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';
import { ReminderPlan } from '@/domain/calculations/ReminderPlan';
import type { ServiceDue } from '@/domain/calculations/ServiceDue';
import type { FuelEntry } from '@/domain/entities/FuelEntry';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle, type Vehicle } from '@/domain/entities/Vehicle';
import type { VehicleRecords } from '@/domain/entities/VehicleRecords';

import { day, full, sample, testVehicleId, utc } from './fixtures';

const vehicle = makeVehicle({ id: testVehicleId, name: 'Gol', initialOdometer: 10_000, createdAt: day(0) });

function hour(value: number, dayOffset: number): Date {
    return new Date(day(dayOffset).getTime() + value * 3_600_000);
}

function records(
    rules: ServiceRule[],
    options: { vehicle?: Vehicle; fuel?: FuelEntry[]; services?: ServiceEntry[] } = {}
): VehicleRecords {
    return { vehicle: options.vehicle ?? vehicle, fuel: options.fuel ?? [], services: options.services ?? [], rules };
}

function first<T>(items: readonly T[]): T {
    expect(items.length).toBeGreaterThan(0);
    return items[0] as T;
}

describe('Reminder plan', () => {
    test('fires at 9:00 on the due day when it is still ahead', () => {
        expect(ReminderPlan.fireDate(day(10), hour(15, 2), utc)).toEqual(hour(9, 10));
    });

    test('an overdue reminder fires at the next 9:00', () => {
        expect(ReminderPlan.fireDate(day(1), hour(7, 5), utc)).toEqual(hour(9, 5));
        expect(ReminderPlan.fireDate(day(1), hour(10, 5), utc)).toEqual(hour(9, 6));
    });

    test('a calendar rule is due months after the last service of its kind', () => {
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'oilChange', monthInterval: 6 });

        const planned = ReminderPlan.reminders([records([rule])], day(1), utc);

        const reminder = first(planned);
        expect(planned).toHaveLength(1);
        expect(reminder.id).toBe(rule.id);
        expect(reminder.due.forecast.trigger).toBe('calendar');
        expect(reminder.fireDate).toEqual(utc.settingTime(9, 0, 0, reminder.due.forecast.dueDate as Date));
        expect(reminder.isOverdue).toBe(false);
    });

    test('a reminder past its due date is flagged as overdue', () => {
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'inspection', monthInterval: 1 });

        expect(first(ReminderPlan.reminders([records([rule])], day(90), utc)).isOverdue).toBe(true);
    });

    test('an overdue reminder repeats daily for a week, then weekly', () => {
        expect(ReminderPlan.overdueFireDate(day(0), hour(10, 3), utc)).toEqual(hour(9, 4));
        expect(ReminderPlan.overdueFireDate(day(0), hour(10, 6), utc)).toEqual(hour(9, 7));
        expect(ReminderPlan.overdueFireDate(day(0), hour(10, 7), utc)).toEqual(hour(9, 14));
        expect(ReminderPlan.overdueFireDate(day(0), hour(8, 14), utc)).toEqual(hour(9, 14));
        expect(ReminderPlan.overdueFireDate(day(0), hour(10, 14), utc)).toEqual(hour(9, 21));
    });

    test('a passed pace estimate is not repeated until the service is really overdue', () => {
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'oilChange', kilometerInterval: 5_000 });
        const fuel = [full(10, 10_500, 30), full(20, 11_000, 30)];

        expect(ReminderPlan.reminders([records([rule], { fuel })], day(200), utc)).toEqual([]);
    });

    test('a km-only rule without a pace is notified once the odometer reaches it', () => {
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'chain', kilometerInterval: 1_000 });
        const cb = makeVehicle({ id: testVehicleId, name: 'CB', initialOdometer: 10_000, createdAt: day(5) });

        const planned = ReminderPlan.reminders(
            [records([rule], { vehicle: cb, fuel: [full(5, 11_200, 10)] })],
            hour(10, 5),
            utc
        );

        const reminder = first(planned);
        expect(reminder.isOverdue).toBe(true);
        expect(reminder.status.overdueBy).toBe('distance');
        expect(reminder.currentOdometer).toBe(11_200);
        expect(reminder.fireDate).toEqual(hour(9, 6));
    });

    test('overdue by km counts from the first reading at or past the due km', () => {
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'chain', kilometerInterval: 1_000 });
        const fuel = [full(10, 10_600, 10), full(20, 11_100, 10), full(30, 11_500, 10)];

        const reminder = first(ReminderPlan.reminders([records([rule], { fuel })], hour(10, 40), utc));

        expect(
            ReminderPlan.overdueSince({
                due: reminder.due,
                status: reminder.status,
                history: [sample(0, 10_000), sample(10, 10_600), sample(20, 11_100), sample(30, 11_500)],
                now: day(40),
                calendar: utc
            })
        ).toEqual(day(20));
        expect(reminder.fireDate).toEqual(hour(9, 41));
    });

    test('a passed pace estimate still reminds on the calendar due day', () => {
        const rule = makeServiceRule({
            vehicleId: testVehicleId,
            kind: 'oilChange',
            kilometerInterval: 5_000,
            monthInterval: 12
        });
        const fuel = [full(10, 10_500, 30), full(20, 11_000, 30)];

        const reminder = first(ReminderPlan.reminders([records([rule], { fuel })], day(200), utc));

        expect(reminder.isOverdue).toBe(false);
        expect(reminder.fireDate).toEqual(hour(9, 365));
    });

    test('overdue both ways counts from the earlier date', () => {
        const rule = makeServiceRule({
            vehicleId: testVehicleId,
            kind: 'oilChange',
            kilometerInterval: 1_000,
            monthInterval: 1
        });
        const fuel = [full(10, 11_200, 10), full(50, 11_400, 10)];

        const reminder = first(ReminderPlan.reminders([records([rule], { fuel })], hour(10, 60), utc));

        expect(reminder.status.overdueBy).toBe('calendar');
        expect(
            ReminderPlan.overdueSince({
                due: reminder.due,
                status: reminder.status,
                history: [sample(0, 10_000), sample(10, 11_200), sample(50, 11_400)],
                now: hour(10, 60),
                calendar: utc
            })
        ).toEqual(day(10));
    });

    test('without a reading past the due km, overdue counts from the latest reading', () => {
        const due: ServiceDue = {
            rule: makeServiceRule({ vehicleId: testVehicleId, kind: 'chain', kilometerInterval: 1_000 }),
            forecast: { dueDate: null, trigger: 'distance', dueOdometer: 11_000, averageKilometersPerMonth: null },
            since: sample(30, 10_000)
        };
        const status = makeMaintenanceStatus({
            level: MaintenanceLevel.Overdue,
            progress: 1,
            remainingKilometers: -200,
            remainingDays: null,
            overdueBy: 'distance'
        });

        expect(
            ReminderPlan.overdueSince({
                due,
                status,
                history: [sample(0, 10_000), sample(20, 11_200)],
                now: day(40),
                calendar: utc
            })
        ).toEqual(day(20));
        expect(ReminderPlan.overdueSince({ due, status, history: [], now: day(40), calendar: utc })).toEqual(day(40));
    });

    test('a distance rule without a km pace yet has nothing to schedule', () => {
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'tires', kilometerInterval: 20_000 });

        expect(ReminderPlan.reminders([records([rule])], day(1), utc)).toEqual([]);
    });

    test('archived vehicles get no reminders', () => {
        const archived = { ...vehicle, isArchived: true };
        const rule = makeServiceRule({ vehicleId: testVehicleId, kind: 'oilChange', monthInterval: 6 });

        expect(ReminderPlan.reminders([records([rule], { vehicle: archived })], day(1), utc)).toEqual([]);
    });

    test('reminders come out ordered by fire date', () => {
        const later = makeServiceRule({ vehicleId: testVehicleId, kind: 'oilChange', monthInterval: 12 });
        const sooner = makeServiceRule({ vehicleId: testVehicleId, kind: 'inspection', monthInterval: 3 });

        const planned = ReminderPlan.reminders([records([later, sooner])], day(1), utc);

        expect(planned.map((reminder) => reminder.id)).toEqual([sooner.id, later.id]);
    });
});
