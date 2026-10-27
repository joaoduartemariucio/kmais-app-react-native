import { Decimal } from 'decimal.js';

import type { FuelEntry } from '@/domain/entities/FuelEntry';

import type { SqlValue } from '../database/SqlDatabase';
import type { FuelEntryRow } from './Rows';

export const FuelEntryMapper = {
    entity(row: FuelEntryRow): FuelEntry {
        return {
            id: row.id,
            vehicleId: row.vehicle_id,
            date: new Date(row.date),
            odometer: row.odometer,
            liters: row.liters,
            pricePerLiter: new Decimal(row.price_per_liter),
            isFullTank: row.is_full_tank !== 0
        };
    },

    values(entry: FuelEntry): SqlValue[] {
        return [
            entry.id,
            entry.vehicleId,
            entry.date.getTime(),
            entry.odometer,
            entry.liters,
            entry.pricePerLiter.toString(),
            entry.isFullTank ? 1 : 0
        ];
    }
};
