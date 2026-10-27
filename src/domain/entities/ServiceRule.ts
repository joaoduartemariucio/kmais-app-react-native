import { newIdentifier, type Identifier } from './Identifier';
import type { ServiceKind } from './ServiceKind';

export interface ServiceRule {
    readonly id: Identifier;
    readonly vehicleId: Identifier;
    readonly kind: ServiceKind;
    readonly kilometerInterval: number | null;
    readonly monthInterval: number | null;
}

export interface ServiceRuleInit {
    id?: Identifier;
    vehicleId: Identifier;
    kind?: ServiceKind;
    kilometerInterval?: number | null;
    monthInterval?: number | null;
}

export function makeServiceRule(init: ServiceRuleInit): ServiceRule {
    return {
        id: init.id ?? newIdentifier(),
        vehicleId: init.vehicleId,
        kind: init.kind ?? 'other',
        kilometerInterval: init.kilometerInterval ?? null,
        monthInterval: init.monthInterval ?? null
    };
}
