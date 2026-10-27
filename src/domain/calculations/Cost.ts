import { fuelTotalCost, type FuelEntry } from '../entities/FuelEntry';
import type { ServiceEntry } from '../entities/ServiceEntry';
import { makeCostSummary, type CostSummary } from './CostSummary';
import { sumDecimals } from './DecimalApproximating';

function summary(fuel: readonly FuelEntry[], services: readonly ServiceEntry[]): CostSummary {
    const odometers = [...fuel.map((entry) => entry.odometer), ...services.map((entry) => entry.odometer)];
    const distance = odometers.length > 0 ? Math.max(0, Math.max(...odometers) - Math.min(...odometers)) : 0;

    return makeCostSummary(
        sumDecimals(fuel.map(fuelTotalCost)),
        sumDecimals(services.map((entry) => entry.cost)),
        distance
    );
}

export const Cost = { summary };
