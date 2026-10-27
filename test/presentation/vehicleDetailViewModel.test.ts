import { Odometer } from '@/domain/calculations/Odometer';
import { makeFuelEntry, type FuelEntry } from '@/domain/entities/FuelEntry';
import { makeServiceEntry, type ServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import { VehicleDetailViewModel, type VehicleDetailContent } from '@/presentation/vehicles/VehicleDetailViewModel';
import { itemCost, type TimelineItem } from '@/presentation/vehicles/VehicleTimeline';

import { day, dec } from '../calculations/fixtures';
import {
    FixedDateProvider,
    InMemoryFuelEntryRepository,
    InMemoryServiceRepository
} from '../fakes/InMemoryRepositories';

const vehicle = makeVehicle({ name: 'Gol', initialOdometer: 1_000, createdAt: day(0) });

function fuel(dayOffset: number, odometer: number): FuelEntry {
    return makeFuelEntry({
        vehicleId: vehicle.id,
        date: day(dayOffset),
        odometer,
        liters: 40,
        pricePerLiter: dec(5),
        isFullTank: true
    });
}

interface Options {
    fuel?: FuelEntry[];
    services?: ServiceEntry[];
    rules?: ServiceRule[];
    fuelFailure?: Error | null;
    serviceFailure?: Error | null;
}

function makeViewModel({
    fuel: entries = [],
    services = [],
    rules = [],
    fuelFailure = null,
    serviceFailure = null
}: Options = {}): VehicleDetailViewModel {
    return new VehicleDetailViewModel(vehicle, {
        fuelEntryRepository: new InMemoryFuelEntryRepository(entries, fuelFailure),
        serviceRepository: new InMemoryServiceRepository(services, rules, serviceFailure),
        dateProvider: new FixedDateProvider(day(120))
    });
}

function contentOf(viewModel: VehicleDetailViewModel): VehicleDetailContent {
    expect(viewModel.state.status).toBe('loaded');
    if (viewModel.state.status !== 'loaded') throw new Error(`expected loaded, got ${viewModel.state.status}`);
    return viewModel.state.content;
}

describe('Vehicle detail', () => {
    test('loads stats, timeline and rules together', async () => {
        const viewModel = makeViewModel({
            fuel: [fuel(1, 1_000), fuel(40, 1_400)],
            services: [
                makeServiceEntry({
                    vehicleId: vehicle.id,
                    kind: 'oilChange',
                    date: day(20),
                    odometer: 1_200,
                    cost: dec(300)
                })
            ],
            rules: [
                makeServiceRule({
                    vehicleId: vehicle.id,
                    kind: 'oilChange',
                    kilometerInterval: 10_000,
                    monthInterval: 12
                })
            ]
        });

        await viewModel.load();

        const content = contentOf(viewModel);
        expect(content.stats.currentOdometer).toBe(1_400);
        expect(content.stats.cost.totalCost).toEqualDecimal(700);
        expect(content.rules).toHaveLength(1);
        expect(content.stats.nextDue).not.toBeNull();
        expect(content.sections.flatMap((section) => section.items)).toHaveLength(3);
    });

    test('a vehicle without history loads with empty sections, not an error', async () => {
        const viewModel = makeViewModel();

        await viewModel.load();

        const content = contentOf(viewModel);
        expect(content.sections).toEqual([]);
        expect(content.stats.currentOdometer).toBe(1_000);
        expect(content.stats.nextDue).toBeNull();
    });

    test('a repository failure surfaces as failed instead of being swallowed', async () => {
        const viewModel = makeViewModel({ fuelFailure: RepositoryError.entryNotFound('missing') });

        await viewModel.load();

        expect(viewModel.state).toEqual({ status: 'failed', message: 'This record no longer exists.' });
    });

    test('history is grouped by month, most recent first', async () => {
        const viewModel = makeViewModel({ fuel: [fuel(1, 1_000), fuel(40, 1_400)] });

        await viewModel.load();

        const { sections } = contentOf(viewModel);
        expect(sections).toHaveLength(2);
        expect(sections[0]?.month.getTime()).toBeGreaterThan(sections[1]?.month.getTime() ?? Infinity);
    });

    test('rules are exposed once loaded and empty before', async () => {
        const rule = makeServiceRule({ vehicleId: vehicle.id, kind: 'oilChange', kilometerInterval: 10_000 });
        const viewModel = makeViewModel({ rules: [rule] });
        expect(viewModel.rules).toEqual([]);

        await viewModel.load();

        expect(viewModel.rules).toEqual([rule]);
    });

    test('timeline items expose the cost of fuel and service entries', () => {
        const fuelItem: TimelineItem = { type: 'fuel', entry: fuel(1, 1_000) };
        const serviceItem: TimelineItem = {
            type: 'service',
            entry: makeServiceEntry({ vehicleId: vehicle.id, date: day(2), odometer: 1_100, cost: dec(50) })
        };

        expect(fuelItem.entry.odometer).toBe(1_000);
        expect(serviceItem.entry.odometer).toBe(1_100);
        expect(itemCost(fuelItem)).toEqualDecimal(200);
        expect(itemCost(serviceItem)).toEqualDecimal(50);
    });

    test('odometer readings excluding an entry ignore that entry', async () => {
        const latest = fuel(40, 1_400);
        const viewModel = makeViewModel({ fuel: [fuel(1, 1_000), latest] });
        await viewModel.load();

        expect(Odometer.current(viewModel.odometerReadings())).toBe(1_400);
        expect(Odometer.current(viewModel.odometerReadings({ type: 'fuel', entry: latest }))).toBe(1_000);
    });

    test('deleting an entry reloads without it', async () => {
        const doomed = fuel(40, 1_400);
        const viewModel = makeViewModel({ fuel: [fuel(1, 1_000), doomed] });
        await viewModel.load();

        await viewModel.delete({ type: 'fuel', entry: doomed });

        const content = contentOf(viewModel);
        expect(content.sections.flatMap((section) => section.items)).toHaveLength(1);
        expect(content.stats.currentOdometer).toBe(1_000);
    });

    test('deleting a service entry reloads without it', async () => {
        const doomed = makeServiceEntry({ vehicleId: vehicle.id, date: day(2), odometer: 1_100, cost: dec(50) });
        const viewModel = makeViewModel({ services: [doomed] });
        await viewModel.load();

        await viewModel.delete({ type: 'service', entry: doomed });

        expect(contentOf(viewModel).sections).toEqual([]);
    });

    test('deleting an entry that is gone surfaces the failure', async () => {
        const viewModel = makeViewModel();

        await viewModel.delete({ type: 'fuel', entry: fuel(1, 1_000) });

        expect(viewModel.state.status).toBe('failed');
    });

    test('the history filter hides the other record type and drops empty months', async () => {
        const viewModel = makeViewModel({
            fuel: [fuel(1, 1_000), fuel(40, 1_400)],
            services: [
                makeServiceEntry({
                    vehicleId: vehicle.id,
                    kind: 'oilChange',
                    date: day(2),
                    odometer: 1_050,
                    cost: dec(300)
                })
            ]
        });
        expect(viewModel.visibleSections).toEqual([]);
        expect(viewModel.hasHistory).toBe(false);
        expect(viewModel.lastPricePerLiter).toBeNull();

        await viewModel.load();

        expect(viewModel.hasHistory).toBe(true);
        expect(viewModel.lastPricePerLiter).toEqualDecimal(5);
        expect(viewModel.visibleSections.flatMap((section) => section.items)).toHaveLength(3);

        viewModel.setFilter('service');
        expect(viewModel.visibleSections).toHaveLength(1);
        expect(viewModel.visibleSections.flatMap((section) => section.items)).toHaveLength(1);

        viewModel.setFilter('fuel');
        expect(viewModel.visibleSections.flatMap((section) => section.items)).toHaveLength(2);
    });

    test('spending covers the last six months', async () => {
        const viewModel = makeViewModel({ fuel: [fuel(100, 1_400)] });

        await viewModel.load();

        const { spending } = contentOf(viewModel);
        expect(spending).toHaveLength(VehicleDetailViewModel.spendingMonths);
        expect(spending.reduce((total, month) => total.plus(month.total), dec(0))).toEqualDecimal(200);
    });
});
