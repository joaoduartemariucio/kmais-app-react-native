import type { Identifier } from '@/domain/entities/Identifier';
import type { Vehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';

import type { SqlDatabase } from '../database/SqlDatabase';
import type { VehicleRow } from '../mappers/Rows';
import { VehicleMapper } from '../mappers/VehicleMapper';
import { persisting } from './RepositorySupport';

export class SqliteVehicleRepository implements VehicleRepository {
    constructor(private readonly database: SqlDatabase) {}

    all(includingArchived: boolean): Promise<Vehicle[]> {
        return persisting(async () => {
            const rows = await this.database.getAll<VehicleRow>(
                includingArchived
                    ? 'SELECT * FROM vehicles ORDER BY created_at DESC'
                    : 'SELECT * FROM vehicles WHERE is_archived = 0 ORDER BY created_at DESC'
            );
            return rows.map(VehicleMapper.entity);
        });
    }

    vehicle(id: Identifier): Promise<Vehicle | null> {
        return persisting(async () => {
            const row = await this.database.getFirst<VehicleRow>('SELECT * FROM vehicles WHERE id = ?', [id]);
            return row ? VehicleMapper.entity(row) : null;
        });
    }

    save(vehicle: Vehicle): Promise<void> {
        return persisting(async () => {
            await this.database.run(
                `INSERT INTO vehicles (id, name, kind, plate, initial_odometer, tank_capacity, created_at, is_archived)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT (id) DO UPDATE SET
                    name = excluded.name,
                    kind = excluded.kind,
                    plate = excluded.plate,
                    initial_odometer = excluded.initial_odometer,
                    tank_capacity = excluded.tank_capacity,
                    is_archived = excluded.is_archived`,
                VehicleMapper.values(vehicle)
            );
        });
    }

    setArchived(isArchived: boolean, vehicleId: Identifier): Promise<void> {
        return persisting(async () => {
            const result = await this.database.run('UPDATE vehicles SET is_archived = ? WHERE id = ?', [
                isArchived ? 1 : 0,
                vehicleId
            ]);
            if (result.changes === 0) throw RepositoryError.vehicleNotFound(vehicleId);
        });
    }
}
