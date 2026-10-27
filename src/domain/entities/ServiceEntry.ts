import type { Decimal } from 'decimal.js';

import type { Chronological } from './Chronology';
import { newIdentifier, type Identifier } from './Identifier';
import type { ServiceKind } from './ServiceKind';

export interface ServiceEntry extends Chronological {
    readonly id: Identifier;
    readonly vehicleId: Identifier;
    readonly kind: ServiceKind;
    readonly date: Date;
    readonly odometer: number;
    readonly cost: Decimal;
    readonly notes: string;
}

export interface ServiceEntryInit {
    id?: Identifier;
    vehicleId: Identifier;
    kind?: ServiceKind;
    date: Date;
    odometer: number;
    cost: Decimal;
    notes?: string;
}

export function makeServiceEntry(init: ServiceEntryInit): ServiceEntry {
    return {
        id: init.id ?? newIdentifier(),
        vehicleId: init.vehicleId,
        kind: init.kind ?? 'other',
        date: init.date,
        odometer: init.odometer,
        cost: init.cost,
        notes: init.notes ?? ''
    };
}
