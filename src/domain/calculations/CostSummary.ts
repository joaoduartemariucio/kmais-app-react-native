import type { Decimal } from 'decimal.js';

import { decimalApproximating } from './DecimalApproximating';

export interface CostSummary {
    readonly fuelCost: Decimal;
    readonly serviceCost: Decimal;
    readonly distance: number;
    readonly totalCost: Decimal;
    readonly costPerKilometer: Decimal | null;
}

export function makeCostSummary(fuelCost: Decimal, serviceCost: Decimal, distance: number): CostSummary {
    const totalCost = fuelCost.plus(serviceCost);
    return {
        fuelCost,
        serviceCost,
        distance,
        totalCost,
        costPerKilometer: distance > 0 ? totalCost.dividedBy(decimalApproximating(distance)) : null
    };
}
