import type { Decimal } from 'decimal.js';

import { Consumption } from '@/domain/calculations/Consumption';
import type { ConsumptionInterval } from '@/domain/calculations/ConsumptionInterval';
import { Cost } from '@/domain/calculations/Cost';
import type { CostSummary } from '@/domain/calculations/CostSummary';
import { sumDecimals } from '@/domain/calculations/DecimalApproximating';
import { compareDueDates, Maintenance } from '@/domain/calculations/Maintenance';
import type { MaintenanceLevel, MaintenanceStatus } from '@/domain/calculations/MaintenanceStatus';
import { Odometer } from '@/domain/calculations/Odometer';
import type { ServiceDue } from '@/domain/calculations/ServiceDue';
import { Calendar } from '@/domain/entities/Calendar';
import { sortedChronologically } from '@/domain/entities/Chronology';
import { fuelTotalCost, type FuelEntry } from '@/domain/entities/FuelEntry';
import type { Identifier } from '@/domain/entities/Identifier';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceRule } from '@/domain/entities/ServiceRule';
import type { Vehicle } from '@/domain/entities/Vehicle';

import { t } from '../i18n/i18n';
import { formattedRelativeDays, formattedRemainingKilometers } from '../common/FormatStyles';

export interface DueItem {
    readonly id: Identifier;
    readonly due: ServiceDue;
    readonly status: MaintenanceStatus;
}

export function relativeDue(item: DueItem): string {
    if (item.status.isEstimatePassed) return t('Estimate passed');
    if (item.status.remainingDays !== null) return formattedRelativeDays(item.status.remainingDays);
    return item.status.remainingKilometers === null
        ? ''
        : formattedRemainingKilometers(item.status.remainingKilometers);
}

export interface VehicleStats {
    readonly currentOdometer: number;
    readonly latestConsumption: ConsumptionInterval | null;
    readonly averageConsumption: number | null;
    readonly consumptionHistory: readonly ConsumptionInterval[];
    readonly consumptionByEntry: ReadonlyMap<Identifier, number>;
    readonly kilometersPerMonth: number | null;
    readonly cost: CostSummary;
    readonly spentThisMonth: Decimal;
    readonly lastPricePerLiter: Decimal | null;
    readonly dues: readonly DueItem[];
    readonly nextDue: DueItem | null;
    readonly attentionLevel: MaintenanceLevel | null;
}

interface StatsInput {
    vehicle: Vehicle;
    fuel: readonly FuelEntry[];
    services: readonly ServiceEntry[];
    rules?: readonly ServiceRule[];
    now: Date;
    calendar?: Calendar;
}

function consumptionByEntry(
    fuel: readonly FuelEntry[],
    intervals: readonly ConsumptionInterval[]
): Map<Identifier, number> {
    const result = new Map<Identifier, number>();
    for (const interval of intervals) {
        const closing = fuel.find(
            (entry) =>
                entry.isFullTank &&
                entry.date.getTime() === interval.endDate.getTime() &&
                entry.odometer === interval.endOdometer
        );
        if (closing) result.set(closing.id, interval.kilometersPerLiter);
    }
    return result;
}

export function makeVehicleStats({
    vehicle,
    fuel,
    services,
    rules = [],
    now,
    calendar = Calendar.current
}: StatsInput): VehicleStats {
    const samples = Odometer.samples(vehicle, fuel, services);
    const intervals = Consumption.intervals(fuel);
    const current = Odometer.current(samples) ?? vehicle.initialOdometer;

    const thisMonth = calendar.monthInterval(now);
    const spentThisMonth = sumDecimals([
        ...fuel.filter((entry) => calendar.contains(thisMonth, entry.date)).map(fuelTotalCost),
        ...services.filter((entry) => calendar.contains(thisMonth, entry.date)).map((entry) => entry.cost)
    ]);

    const dues = rules
        .map((rule) => Maintenance.due({ rule, vehicle, services, history: samples, calendar }))
        .filter((due): due is ServiceDue => due !== null)
        .map((due): DueItem => ({
            id: due.rule.id,
            due,
            status: Maintenance.status({ due, currentOdometer: current, now, calendar })
        }))
        .sort((lhs, rhs) =>
            lhs.status.level !== rhs.status.level
                ? rhs.status.level - lhs.status.level
                : compareDueDates(lhs.due, rhs.due)
        );

    return {
        currentOdometer: current,
        latestConsumption: intervals.at(-1) ?? null,
        averageConsumption: Consumption.average(fuel),
        consumptionHistory: intervals,
        consumptionByEntry: consumptionByEntry(fuel, intervals),
        kilometersPerMonth: Maintenance.averageKilometersPerMonth(samples),
        cost: Cost.summary(fuel, services),
        spentThisMonth,
        lastPricePerLiter: sortedChronologically(fuel).at(-1)?.pricePerLiter ?? null,
        dues,
        nextDue: dues[0] ?? null,
        attentionLevel: dues.length === 0 ? null : Math.max(...dues.map((item) => item.status.level))
    };
}
