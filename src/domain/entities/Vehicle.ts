import { newIdentifier, type Identifier } from './Identifier';
import type { VehicleKind } from './VehicleKind';

export interface Vehicle {
    readonly id: Identifier;
    readonly name: string;
    readonly kind: VehicleKind;
    readonly plate: string | null;
    readonly initialOdometer: number;
    readonly tankCapacity: number | null;
    readonly createdAt: Date;
    readonly isArchived: boolean;
}

export interface VehicleInit {
    id?: Identifier;
    name: string;
    kind?: VehicleKind;
    plate?: string | null;
    initialOdometer?: number;
    tankCapacity?: number | null;
    createdAt: Date;
    isArchived?: boolean;
}

export function makeVehicle(init: VehicleInit): Vehicle {
    return {
        id: init.id ?? newIdentifier(),
        name: init.name,
        kind: init.kind ?? 'car',
        plate: init.plate ?? null,
        initialOdometer: init.initialOdometer ?? 0,
        tankCapacity: init.tankCapacity ?? null,
        createdAt: init.createdAt,
        isArchived: init.isArchived ?? false
    };
}
