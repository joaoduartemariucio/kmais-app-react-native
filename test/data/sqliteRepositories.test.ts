import { KmaisSchema } from '@/data/database/KmaisSchema';
import { PreviewData } from '@/data/PreviewData';
import { SqliteFuelEntryRepository } from '@/data/repositories/SqliteFuelEntryRepository';
import { SqliteServiceRepository } from '@/data/repositories/SqliteServiceRepository';
import { SqliteVehicleRepository } from '@/data/repositories/SqliteVehicleRepository';
import { SystemDateProvider } from '@/data/services/SystemDateProvider';
import { makeFuelEntry } from '@/domain/entities/FuelEntry';
import { makeServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle, type Vehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';

import { day, dec } from '../calculations/fixtures';
import { BetterSqliteDatabase } from './BetterSqliteDatabase';

async function makeRepositories() {
    const database = new BetterSqliteDatabase();
    await KmaisSchema.migrate(database);
    return {
        database,
        vehicles: new SqliteVehicleRepository(database),
        fuel: new SqliteFuelEntryRepository(database),
        services: new SqliteServiceRepository(database)
    };
}

const gol = makeVehicle({
    name: 'Gol',
    kind: 'car',
    plate: 'ABC1D23',
    initialOdometer: 1_000,
    tankCapacity: 55,
    createdAt: day(0)
});

async function rejection(promise: Promise<unknown>): Promise<RepositoryError> {
    try {
        await promise;
    } catch (error) {
        if (error instanceof RepositoryError) return error;
        throw error;
    }
    throw new Error('expected a RepositoryError');
}

describe('SQLite repositories', () => {
    test('migrating twice keeps the schema at its latest version', async () => {
        const { database } = await makeRepositories();
        await KmaisSchema.migrate(database);

        const row = await database.getFirst<{ user_version: number }>('PRAGMA user_version;');
        expect(row?.user_version).toBe(KmaisSchema.version);
    });

    test('a vehicle round-trips and updates without changing its creation date', async () => {
        const { vehicles } = await makeRepositories();
        await vehicles.save(gol);

        expect(await vehicles.vehicle(gol.id)).toEqual(gol);

        await vehicles.save({ ...gol, name: 'Gol 1.6', plate: null, createdAt: day(99) });
        const updated = await vehicles.vehicle(gol.id);
        expect(updated?.name).toBe('Gol 1.6');
        expect(updated?.plate).toBeNull();
        expect(updated?.createdAt).toEqual(day(0));
        expect(await vehicles.vehicle('missing')).toBeNull();
    });

    test('vehicles are listed newest first, archived only on request', async () => {
        const { vehicles } = await makeRepositories();
        const older = makeVehicle({ name: 'Uno', createdAt: day(-10) });
        await vehicles.save(older);
        await vehicles.save(gol);

        expect((await vehicles.all(false)).map((vehicle: Vehicle) => vehicle.name)).toEqual(['Gol', 'Uno']);

        await vehicles.setArchived(true, older.id);
        expect((await vehicles.all(false)).map((vehicle) => vehicle.name)).toEqual(['Gol']);
        expect((await vehicles.all(true)).map((vehicle) => vehicle.isArchived)).toEqual([false, true]);
        expect((await rejection(vehicles.setArchived(true, 'missing'))).reason.type).toBe('vehicleNotFound');
    });

    test('fuel entries keep decimals exact, sort by date and update in place', async () => {
        const { vehicles, fuel } = await makeRepositories();
        await vehicles.save(gol);
        const later = makeFuelEntry({
            vehicleId: gol.id,
            date: day(10),
            odometer: 1_400,
            liters: 40.25,
            pricePerLiter: dec('5.899'),
            isFullTank: false
        });
        const earlier = { ...later, id: 'earlier', date: day(1), odometer: 1_100, isFullTank: true };
        await fuel.save(later);
        await fuel.save(earlier);

        const entries = await fuel.entries(gol.id);
        expect(entries.map((entry) => entry.id)).toEqual(['earlier', later.id]);
        expect(entries[1]?.pricePerLiter).toEqualDecimal('5.899');
        expect(entries[1]?.liters).toBe(40.25);
        expect(entries[1]?.isFullTank).toBe(false);

        await fuel.save({ ...later, liters: 41 });
        expect((await fuel.entries(gol.id)).find((entry) => entry.id === later.id)?.liters).toBe(41);

        await fuel.delete(later.id);
        expect((await fuel.entries(gol.id)).map((entry) => entry.id)).toEqual(['earlier']);
        expect((await rejection(fuel.delete(later.id))).reason.type).toBe('entryNotFound');
    });

    test('a record for a vehicle that does not exist is rejected', async () => {
        const { fuel, services } = await makeRepositories();
        const entry = makeFuelEntry({
            vehicleId: 'missing',
            date: day(1),
            odometer: 1,
            liters: 1,
            pricePerLiter: dec(1),
            isFullTank: true
        });

        expect((await rejection(fuel.save(entry))).reason.type).toBe('vehicleNotFound');
        expect(
            (
                await rejection(
                    services.save(makeServiceEntry({ vehicleId: 'missing', date: day(1), odometer: 1, cost: dec(1) }))
                )
            ).reason.type
        ).toBe('vehicleNotFound');
        expect((await rejection(services.saveRules([], 'missing'))).reason.type).toBe('vehicleNotFound');
    });

    test('service entries round-trip and update in place', async () => {
        const { vehicles, services } = await makeRepositories();
        await vehicles.save(gol);
        const entry = makeServiceEntry({
            vehicleId: gol.id,
            kind: 'brakes',
            date: day(5),
            odometer: 1_200,
            cost: dec('350.10'),
            notes: 'pads'
        });
        await services.save(entry);

        expect(await services.entries(gol.id)).toEqual([entry]);

        await services.save({ ...entry, kind: 'tires', notes: '' });
        const updated = (await services.entries(gol.id))[0];
        expect(updated?.kind).toBe('tires');
        expect(updated?.cost).toEqualDecimal('350.1');

        await services.deleteEntry(entry.id);
        expect(await services.entries(gol.id)).toEqual([]);
        expect((await rejection(services.deleteEntry(entry.id))).reason.type).toBe('entryNotFound');
    });

    test('saving rules replaces the set: kept ones update, missing ones are removed', async () => {
        const { vehicles, services } = await makeRepositories();
        await vehicles.save(gol);
        const oil = makeServiceRule({
            vehicleId: gol.id,
            kind: 'oilChange',
            kilometerInterval: 10_000,
            monthInterval: 12
        });
        const tires = makeServiceRule({ vehicleId: gol.id, kind: 'tires', monthInterval: 24 });
        await services.saveRules([oil, tires], gol.id);

        await services.saveRules([{ ...oil, kilometerInterval: null }], gol.id);

        expect(await services.rules(gol.id)).toEqual([{ ...oil, kilometerInterval: null }]);

        await services.deleteRule(oil.id);
        expect(await services.rules(gol.id)).toEqual([]);
        expect((await rejection(services.deleteRule(oil.id))).reason.type).toBe('entryNotFound');
    });

    test('deleting a vehicle row cascades to its records', async () => {
        const { database, vehicles, fuel, services } = await makeRepositories();
        await vehicles.save(gol);
        await services.saveRules([makeServiceRule({ vehicleId: gol.id, monthInterval: 6 })], gol.id);
        await fuel.save(
            makeFuelEntry({
                vehicleId: gol.id,
                date: day(1),
                odometer: 1_100,
                liters: 10,
                pricePerLiter: dec(5),
                isFullTank: true
            })
        );

        await database.run('DELETE FROM vehicles WHERE id = ?', [gol.id]);

        expect(await fuel.entries(gol.id)).toEqual([]);
        expect(await services.rules(gol.id)).toEqual([]);
    });

    test('database errors are wrapped as persistence failures', async () => {
        const { database, vehicles } = await makeRepositories();
        database.database.close();

        expect((await rejection(vehicles.all(true))).reason.type).toBe('persistenceFailed');
    });

    test('unknown kinds read back as the defaults', async () => {
        const { database, vehicles, services } = await makeRepositories();
        await vehicles.save(gol);
        await database.run("UPDATE vehicles SET kind = 'truck' WHERE id = ?", [gol.id]);
        await database.run(
            "INSERT INTO service_rules (id, vehicle_id, kind, kilometer_interval, month_interval) VALUES ('r', ?, 'paint', 1000, NULL)",
            [gol.id]
        );

        expect((await vehicles.vehicle(gol.id))?.kind).toBe('car');
        expect((await services.rules(gol.id))[0]?.kind).toBe('other');
    });

    test('the preview data seeds two vehicles with history and reminders', async () => {
        const repositories = await makeRepositories();
        const preview = new PreviewData(new SystemDateProvider().now);

        await preview.seed(repositories);

        const all = await repositories.vehicles.all(true);
        expect(all.map((vehicle) => vehicle.name).sort()).toEqual(['CB 500', 'Gol 1.6']);
        expect(await repositories.fuel.entries(preview.car.id)).toHaveLength(10);
        expect(await repositories.fuel.entries(preview.motorcycle.id)).toHaveLength(4);
        expect(await repositories.services.rules(preview.motorcycle.id)).toHaveLength(1);
        expect(await repositories.services.entries(preview.car.id)).toHaveLength(1);
    });
});
