import { makeFuelEntry } from '@/domain/entities/FuelEntry';
import type { FuelEntry } from '@/domain/entities/FuelEntry';
import { makeServiceEntry, type ServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle, type Vehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import { VehicleListViewModel, type VehicleListScope } from '@/presentation/vehicles/VehicleListViewModel';

import { day, dec } from '../calculations/fixtures';
import {
    FixedDateProvider,
    InMemoryFuelEntryRepository,
    InMemoryServiceRepository,
    InMemoryVehicleRepository
} from '../fakes/InMemoryRepositories';

function makeTestVehicle(name: string, archived = false): Vehicle {
    return makeVehicle({ name, createdAt: day(0), isArchived: archived });
}

interface Options {
    scope?: VehicleListScope;
    vehicles?: Vehicle[];
    fuel?: FuelEntry[];
    services?: ServiceEntry[];
    rules?: ServiceRule[];
    now?: Date;
    failure?: Error | null;
}

function makeViewModel({
    scope = 'active',
    vehicles = [],
    fuel = [],
    services = [],
    rules = [],
    now = day(60),
    failure = null
}: Options = {}): VehicleListViewModel {
    return new VehicleListViewModel(scope, {
        vehicleRepository: new InMemoryVehicleRepository(vehicles, failure),
        fuelEntryRepository: new InMemoryFuelEntryRepository(fuel),
        serviceRepository: new InMemoryServiceRepository(services, rules),
        dateProvider: new FixedDateProvider(now)
    });
}

function rowsOf(viewModel: VehicleListViewModel) {
    expect(viewModel.state.status).toBe('loaded');
    return viewModel.state.status === 'loaded' ? viewModel.state.rows : [];
}

describe('Vehicle list', () => {
    test('loads vehicles with their stats', async () => {
        const vehicle = makeTestVehicle('Gol');
        const fuel = [0, 10].map((offset, index) =>
            makeFuelEntry({
                vehicleId: vehicle.id,
                date: day(offset),
                odometer: 1_000 + index * 400,
                liters: 40,
                pricePerLiter: dec(5),
                isFullTank: true
            })
        );
        const viewModel = makeViewModel({ vehicles: [vehicle], fuel });

        await viewModel.load();

        const rows = rowsOf(viewModel);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.vehicle.id).toBe(vehicle.id);
        expect(rows[0]?.stats.currentOdometer).toBe(1_400);
        expect(rows[0]?.stats.latestConsumption?.kilometersPerLiter).toBe(10);
    });

    test('an empty repository loads an empty list, not an error', async () => {
        const viewModel = makeViewModel();

        await viewModel.load();

        expect(rowsOf(viewModel)).toEqual([]);
    });

    test('a repository failure surfaces as failed instead of being swallowed', async () => {
        const viewModel = makeViewModel({ failure: RepositoryError.vehicleNotFound('missing') });

        await viewModel.load();

        expect(viewModel.state.status).toBe('failed');
    });

    test('the active scope hides archived vehicles', async () => {
        const viewModel = makeViewModel({ vehicles: [makeTestVehicle('Gol'), makeTestVehicle('Uno', true)] });

        await viewModel.load();

        expect(rowsOf(viewModel).map((row) => row.vehicle.name)).toEqual(['Gol']);
    });

    test('the archived scope shows only archived vehicles', async () => {
        const viewModel = makeViewModel({
            scope: 'archived',
            vehicles: [makeTestVehicle('Gol'), makeTestVehicle('Uno', true)]
        });

        await viewModel.load();

        expect(rowsOf(viewModel).map((row) => row.vehicle.name)).toEqual(['Uno']);
    });

    test('archiving reloads and drops the vehicle from the active list', async () => {
        const vehicle = makeTestVehicle('Gol');
        const viewModel = makeViewModel({ vehicles: [vehicle] });
        await viewModel.load();

        await viewModel.setArchived(true, vehicle);

        expect(rowsOf(viewModel)).toEqual([]);
    });

    test('archiving a vehicle that no longer exists surfaces the failure', async () => {
        const viewModel = makeViewModel();

        await viewModel.setArchived(true, makeTestVehicle('Gone'));

        expect(viewModel.state).toEqual({ status: 'failed', message: 'This vehicle no longer exists.' });
    });

    test("the overview adds up this month's spending and the reminders that need attention", async () => {
        const gol = makeTestVehicle('Gol');
        const cb = makeTestVehicle('CB');
        const viewModel = makeViewModel({
            vehicles: [gol, cb],
            fuel: [
                makeFuelEntry({
                    vehicleId: gol.id,
                    date: day(40),
                    odometer: 1_000,
                    liters: 10,
                    pricePerLiter: dec(5),
                    isFullTank: true
                })
            ],
            services: [
                makeServiceEntry({ vehicleId: cb.id, kind: 'chain', date: day(65), odometer: 500, cost: dec(30) })
            ],
            rules: [
                makeServiceRule({ vehicleId: cb.id, kind: 'chain', kilometerInterval: 300 }),
                makeServiceRule({ vehicleId: gol.id, kind: 'oilChange', monthInterval: 1 })
            ],
            now: day(70)
        });

        expect(viewModel.overview).toBeNull();
        await viewModel.load();

        const overview = viewModel.overview;
        expect(overview?.vehicleCount).toBe(2);
        expect(overview?.spentThisMonth).toEqualDecimal(30);
        expect(overview?.overdueCount).toBe(1);
        expect(overview?.dueSoonCount).toBe(1);
    });
});
