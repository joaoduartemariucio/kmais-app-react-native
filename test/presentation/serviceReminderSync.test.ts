import { makeMaintenanceStatus, MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';
import type { MaintenanceTrigger } from '@/domain/calculations/MaintenanceForecast';
import { makePlannedReminder, type PlannedReminder } from '@/domain/calculations/PlannedReminder';
import { makeServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle, type Vehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { Reminder } from '@/domain/services/ReminderScheduler';
import { formattedFullDate, formattedKilometers } from '@/presentation/common/FormatStyles';
import { ServiceReminderSync } from '@/presentation/reminders/ServiceReminderSync';
import { VehicleDetailViewModel } from '@/presentation/vehicles/VehicleDetailViewModel';
import { VehicleListViewModel } from '@/presentation/vehicles/VehicleListViewModel';

import { day, sample, testVehicleId } from '../calculations/fixtures';
import {
    FakeReminderScheduler,
    FixedDateProvider,
    InMemoryFuelEntryRepository,
    InMemoryServiceRepository,
    InMemoryVehicleRepository
} from '../fakes/InMemoryRepositories';

const vehicle = makeVehicle({ id: testVehicleId, name: 'Gol', initialOdometer: 10_000, createdAt: day(0) });
const oilRule = makeServiceRule({ vehicleId: testVehicleId, kind: 'oilChange', monthInterval: 6 });

interface Options {
    vehicles?: Vehicle[];
    rules?: (typeof oilRule)[];
    scheduler?: FakeReminderScheduler;
    vehicleFailure?: Error | null;
}

function makeSync({
    vehicles = [vehicle],
    rules = [oilRule],
    scheduler = new FakeReminderScheduler(),
    vehicleFailure = null
}: Options = {}): ServiceReminderSync {
    return new ServiceReminderSync({
        vehicleRepository: new InMemoryVehicleRepository(vehicles, vehicleFailure),
        fuelEntryRepository: new InMemoryFuelEntryRepository(),
        serviceRepository: new InMemoryServiceRepository([], rules),
        scheduler,
        dateProvider: new FixedDateProvider(day(1))
    });
}

function stale(id = 'stale-reminder'): Reminder {
    return { id, title: 'old', body: 'old', fireDate: day(2) };
}

function planned(
    dueDate: Date | null,
    trigger: MaintenanceTrigger,
    dueOdometer: number | null,
    overdueBy: MaintenanceTrigger | null = null
): PlannedReminder {
    return makePlannedReminder({
        vehicle,
        due: {
            rule: oilRule,
            forecast: { dueDate, trigger, dueOdometer, averageKilometersPerMonth: null },
            since: sample(0, 10_000)
        },
        status: makeMaintenanceStatus({
            level: overdueBy === null ? MaintenanceLevel.OnTrack : MaintenanceLevel.Overdue,
            progress: 0.5,
            remainingKilometers: null,
            remainingDays: null,
            overdueBy,
            calendarDueDate: day(8)
        }),
        currentOdometer: 21_234,
        fireDate: day(10)
    });
}

describe('Service reminder sync', () => {
    test('schedules one reminder per rule with a known due date', async () => {
        const scheduler = new FakeReminderScheduler();

        await makeSync({ scheduler }).sync();

        expect([...scheduler.scheduled.keys()]).toEqual([oilRule.id]);
        expect(scheduler.scheduled.get(oilRule.id)?.title.startsWith('Gol: ')).toBe(true);
        expect(scheduler.scheduled.get(oilRule.id)?.body).not.toBe('');
        expect(scheduler.authorizationRequests).toBe(1);
    });

    test('cancels reminders whose rule no longer applies', async () => {
        const leftover = stale();
        const scheduler = new FakeReminderScheduler([leftover]);

        await makeSync({ scheduler }).sync();

        expect(scheduler.scheduled.has(leftover.id)).toBe(false);
        expect(scheduler.scheduled.has(oilRule.id)).toBe(true);
    });

    test('without anything to schedule, it cancels and never asks for permission', async () => {
        const scheduler = new FakeReminderScheduler([stale()]);

        await makeSync({ rules: [], scheduler }).sync();

        expect(scheduler.scheduled.size).toBe(0);
        expect(scheduler.authorizationRequests).toBe(0);
    });

    test('when notifications are denied, nothing is scheduled', async () => {
        const scheduler = new FakeReminderScheduler([], false);

        await makeSync({ scheduler }).sync();

        expect(scheduler.scheduled.size).toBe(0);
    });

    test('a repository failure leaves pending reminders untouched', async () => {
        const pending = stale(oilRule.id);
        const scheduler = new FakeReminderScheduler([pending]);
        const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await makeSync({ scheduler, vehicleFailure: RepositoryError.vehicleNotFound(testVehicleId) }).sync();

        expect([...scheduler.scheduled.values()]).toEqual([pending]);
        expect(log).toHaveBeenCalledTimes(1);
        log.mockRestore();
    });

    test('the body says whether the service is overdue by km or date, or due by distance or date', () => {
        const byDate = ServiceReminderSync.reminder(planned(day(10), 'calendar', null));
        const byDistance = ServiceReminderSync.reminder(planned(day(10), 'distance', 20_000));
        const overdueByDate = ServiceReminderSync.reminder(planned(day(10), 'calendar', null, 'calendar'));
        const overdueByDistance = ServiceReminderSync.reminder(planned(null, 'distance', 20_000, 'distance'));
        const dateless = ServiceReminderSync.reminder(planned(null, 'distance', 20_000));

        expect(byDate.id).toBe(oilRule.id);
        expect(byDate.fireDate).toEqual(day(10));
        expect(byDate.title).toContain(vehicle.name);
        expect(new Set([byDate, byDistance, overdueByDate, overdueByDistance, dateless].map((r) => r.body)).size).toBe(
            5
        );
        expect(byDistance.body).toContain(formattedKilometers(20_000));
        expect(overdueByDistance.body).toContain(formattedKilometers(21_234));
        expect(overdueByDate.body).toContain(formattedFullDate(day(8)));
    });

    test('loading the list and the detail syncs reminders', async () => {
        const scheduler = new FakeReminderScheduler();
        const sync = makeSync({ scheduler });
        const list = new VehicleListViewModel('active', {
            vehicleRepository: new InMemoryVehicleRepository([vehicle]),
            fuelEntryRepository: new InMemoryFuelEntryRepository(),
            serviceRepository: new InMemoryServiceRepository(),
            dateProvider: new FixedDateProvider(day(30)),
            reminders: sync
        });

        await list.load();
        expect(scheduler.scheduled.size).toBe(1);

        await scheduler.cancel(oilRule.id);
        const detail = new VehicleDetailViewModel(vehicle, {
            fuelEntryRepository: new InMemoryFuelEntryRepository(),
            serviceRepository: new InMemoryServiceRepository(),
            dateProvider: new FixedDateProvider(day(1)),
            reminders: sync
        });

        await detail.load();
        expect(scheduler.scheduled.size).toBe(1);
    });
});
