import type { Vehicle } from '@/domain/entities/Vehicle';
import { vehicleKinds, type VehicleKind } from '@/domain/entities/VehicleKind';

import type { SqlValue } from '../database/SqlDatabase';
import type { VehicleRow } from './Rows';

function kind(value: string): VehicleKind {
    return (vehicleKinds as readonly string[]).includes(value) ? (value as VehicleKind) : 'car';
}

export const VehicleMapper = {
    entity(row: VehicleRow): Vehicle {
        return {
            id: row.id,
            name: row.name,
            kind: kind(row.kind),
            plate: row.plate,
            initialOdometer: row.initial_odometer,
            tankCapacity: row.tank_capacity,
            createdAt: new Date(row.created_at),
            isArchived: row.is_archived !== 0
        };
    },

    values(vehicle: Vehicle): SqlValue[] {
        return [
            vehicle.id,
            vehicle.name,
            vehicle.kind,
            vehicle.plate,
            vehicle.initialOdometer,
            vehicle.tankCapacity,
            vehicle.createdAt.getTime(),
            vehicle.isArchived ? 1 : 0
        ];
    }
};
