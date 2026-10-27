import type { FuelEntry } from '../entities/FuelEntry';
import type { Identifier } from '../entities/Identifier';

export type ConsumptionAnomalyKind =
    | { readonly type: 'odometerWentBackwards'; readonly previous: number }
    | { readonly type: 'odometerUnchanged'; readonly previous: number }
    | { readonly type: 'nonPositiveLiters' }
    | { readonly type: 'duplicate'; readonly of: Identifier };

export interface ConsumptionAnomaly {
    readonly record: FuelEntry;
    readonly kind: ConsumptionAnomalyKind;
}
