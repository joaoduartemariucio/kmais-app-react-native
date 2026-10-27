import type { Identifier } from '../entities/Identifier';
import type { Vehicle } from '../entities/Vehicle';

export interface VehicleRepository {
    all(includingArchived: boolean): Promise<Vehicle[]>;
    vehicle(id: Identifier): Promise<Vehicle | null>;
    save(vehicle: Vehicle): Promise<void>;
    setArchived(isArchived: boolean, vehicleId: Identifier): Promise<void>;
}
