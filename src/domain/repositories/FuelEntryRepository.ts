import type { FuelEntry } from '../entities/FuelEntry';
import type { Identifier } from '../entities/Identifier';

export interface FuelEntryRepository {
    entries(vehicleId: Identifier): Promise<FuelEntry[]>;
    save(entry: FuelEntry): Promise<void>;
    delete(id: Identifier): Promise<void>;
}
