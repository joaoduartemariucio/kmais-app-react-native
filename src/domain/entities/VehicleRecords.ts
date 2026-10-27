import type { FuelEntry } from './FuelEntry';
import type { ServiceEntry } from './ServiceEntry';
import type { ServiceRule } from './ServiceRule';
import type { Vehicle } from './Vehicle';

export interface VehicleRecords {
    readonly vehicle: Vehicle;
    readonly fuel: readonly FuelEntry[];
    readonly services: readonly ServiceEntry[];
    readonly rules: readonly ServiceRule[];
}
