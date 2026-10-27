import { sortedChronologically } from '../entities/Chronology';
import type { FuelEntry } from '../entities/FuelEntry';
import type { ConsumptionAnomaly } from './ConsumptionAnomaly';
import { makeConsumptionInterval, type ConsumptionInterval } from './ConsumptionInterval';

function intervals(records: readonly FuelEntry[]): ConsumptionInterval[] {
    const result: ConsumptionInterval[] = [];
    let open: FuelEntry | null = null;
    let litersSinceOpen = 0;

    for (const record of sortedChronologically(records)) {
        if (record.liters <= 0) continue;
        if (!open) {
            if (record.isFullTank) open = record;
            continue;
        }

        litersSinceOpen += record.liters;
        if (!record.isFullTank) continue;

        const interval = makeConsumptionInterval({
            startDate: open.date,
            endDate: record.date,
            startOdometer: open.odometer,
            endOdometer: record.odometer,
            liters: litersSinceOpen
        });
        if (interval.distance > 0) {
            result.push(interval);
        }

        open = record;
        litersSinceOpen = 0;
    }

    return result;
}

function latest(records: readonly FuelEntry[]): ConsumptionInterval | null {
    return intervals(records).at(-1) ?? null;
}

function average(records: readonly FuelEntry[]): number | null {
    const legs = intervals(records);
    if (legs.length === 0) return null;

    const liters = legs.reduce((total, leg) => total + leg.liters, 0);
    if (liters <= 0) return null;

    return legs.reduce((total, leg) => total + leg.distance, 0) / liters;
}

function anomalies(records: readonly FuelEntry[]): ConsumptionAnomaly[] {
    const result: ConsumptionAnomaly[] = [];
    let previous: FuelEntry | null = null;

    for (const record of sortedChronologically(records)) {
        if (record.liters <= 0) {
            result.push({ record, kind: { type: 'nonPositiveLiters' } });
        }

        if (previous) {
            if (record.odometer < previous.odometer) {
                result.push({ record, kind: { type: 'odometerWentBackwards', previous: previous.odometer } });
            } else if (record.odometer === previous.odometer) {
                const isDuplicate =
                    record.date.getTime() === previous.date.getTime() &&
                    record.liters === previous.liters &&
                    record.pricePerLiter.equals(previous.pricePerLiter);
                result.push({
                    record,
                    kind: isDuplicate
                        ? { type: 'duplicate', of: previous.id }
                        : { type: 'odometerUnchanged', previous: previous.odometer }
                });
            }
        }

        previous = record;
    }

    return result;
}

export const Consumption = { intervals, latest, average, anomalies };
