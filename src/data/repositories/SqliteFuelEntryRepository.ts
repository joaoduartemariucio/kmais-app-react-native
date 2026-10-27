import type { FuelEntry } from '@/domain/entities/FuelEntry';
import type { Identifier } from '@/domain/entities/Identifier';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';

import type { SqlDatabase } from '../database/SqlDatabase';
import { FuelEntryMapper } from '../mappers/FuelEntryMapper';
import type { FuelEntryRow } from '../mappers/Rows';
import { persisting, vehicleExists } from './RepositorySupport';

export class SqliteFuelEntryRepository implements FuelEntryRepository {
    constructor(private readonly database: SqlDatabase) {}

    entries(vehicleId: Identifier): Promise<FuelEntry[]> {
        return persisting(async () => {
            const rows = await this.database.getAll<FuelEntryRow>(
                'SELECT * FROM fuel_entries WHERE vehicle_id = ? ORDER BY date, odometer',
                [vehicleId]
            );
            return rows.map(FuelEntryMapper.entity);
        });
    }

    save(entry: FuelEntry): Promise<void> {
        return persisting(async () => {
            const existing = await this.database.getFirst<{ id: string }>('SELECT id FROM fuel_entries WHERE id = ?', [
                entry.id
            ]);
            if (existing) {
                await this.database.run(
                    'UPDATE fuel_entries SET date = ?, odometer = ?, liters = ?, price_per_liter = ?, is_full_tank = ? WHERE id = ?',
                    [...FuelEntryMapper.values(entry).slice(2), entry.id]
                );
                return;
            }
            if (!(await vehicleExists(this.database, entry.vehicleId))) {
                throw RepositoryError.vehicleNotFound(entry.vehicleId);
            }
            await this.database.run(
                `INSERT INTO fuel_entries (id, vehicle_id, date, odometer, liters, price_per_liter, is_full_tank)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                FuelEntryMapper.values(entry)
            );
        });
    }

    delete(id: Identifier): Promise<void> {
        return persisting(async () => {
            const result = await this.database.run('DELETE FROM fuel_entries WHERE id = ?', [id]);
            if (result.changes === 0) throw RepositoryError.entryNotFound(id);
        });
    }
}
