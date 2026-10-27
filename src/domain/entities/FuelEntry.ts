import type { Decimal } from 'decimal.js';

import { decimalApproximating } from '../calculations/DecimalApproximating';
import type { Chronological } from './Chronology';
import { newIdentifier, type Identifier } from './Identifier';

export interface FuelEntry extends Chronological {
    readonly id: Identifier;
    readonly vehicleId: Identifier;
    readonly date: Date;
    readonly odometer: number;
    readonly liters: number;
    readonly pricePerLiter: Decimal;
    readonly isFullTank: boolean;
}

export interface FuelEntryInit {
    id?: Identifier;
    vehicleId: Identifier;
    date: Date;
    odometer: number;
    liters: number;
    pricePerLiter: Decimal;
    isFullTank: boolean;
}

export function makeFuelEntry(init: FuelEntryInit): FuelEntry {
    return { ...init, id: init.id ?? newIdentifier() };
}

export function fuelTotalCost(entry: FuelEntry): Decimal {
    return decimalApproximating(entry.liters).times(entry.pricePerLiter);
}
