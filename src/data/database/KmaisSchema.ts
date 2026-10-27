import type { SqlDatabase } from './SqlDatabase';

const migrations: readonly string[] = [
    `
    CREATE TABLE vehicles (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'car',
        plate TEXT,
        initial_odometer REAL NOT NULL DEFAULT 0,
        tank_capacity REAL,
        created_at INTEGER NOT NULL,
        is_archived INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE fuel_entries (
        id TEXT PRIMARY KEY NOT NULL,
        vehicle_id TEXT NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        date INTEGER NOT NULL,
        odometer REAL NOT NULL DEFAULT 0,
        liters REAL NOT NULL DEFAULT 0,
        price_per_liter TEXT NOT NULL DEFAULT '0',
        is_full_tank INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE service_entries (
        id TEXT PRIMARY KEY NOT NULL,
        vehicle_id TEXT NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'other',
        date INTEGER NOT NULL,
        odometer REAL NOT NULL DEFAULT 0,
        cost TEXT NOT NULL DEFAULT '0',
        notes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE service_rules (
        id TEXT PRIMARY KEY NOT NULL,
        vehicle_id TEXT NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'other',
        kilometer_interval REAL,
        month_interval INTEGER
    );
    CREATE INDEX fuel_entries_vehicle ON fuel_entries (vehicle_id, date, odometer);
    CREATE INDEX service_entries_vehicle ON service_entries (vehicle_id, date, odometer);
    CREATE INDEX service_rules_vehicle ON service_rules (vehicle_id);
    `
];

export const KmaisSchema = {
    version: migrations.length,

    async migrate(database: SqlDatabase): Promise<void> {
        await database.exec('PRAGMA foreign_keys = ON;');
        const row = await database.getFirst<{ user_version: number }>('PRAGMA user_version;');
        const current = row?.user_version ?? 0;

        for (let version = current; version < migrations.length; version += 1) {
            const migration = migrations[version] ?? '';
            await database.transaction(async () => {
                await database.exec(migration);
                await database.exec(`PRAGMA user_version = ${version + 1};`);
            });
        }
    }
};
