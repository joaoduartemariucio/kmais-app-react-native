import { makeMaintenanceStatus, MaintenanceLevel, maintenanceLevels } from '@/domain/calculations/MaintenanceStatus';
import type { ServiceDue } from '@/domain/calculations/ServiceDue';
import type { FuelEntry } from '@/domain/entities/FuelEntry';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import { serviceKinds } from '@/domain/entities/ServiceKind';
import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle } from '@/domain/entities/Vehicle';
import { vehicleKinds } from '@/domain/entities/VehicleKind';
import {
    levelLabel,
    levelSymbol,
    serviceKindLabel,
    serviceKindSymbol,
    vehicleKindLabel,
    vehicleKindSymbol
} from '@/presentation/common/Display';
import {
    formattedConsumption,
    formattedCurrency,
    formattedDay,
    formattedKilometersPerMonth,
    formattedLiters,
    formattedMonthAndYear,
    formattedNumber,
    formattedPerKilometer,
    formattedPerLiter,
    formattedRelativeDays,
    formattedRemainingKilometers,
    formattedShortMonth
} from '@/presentation/common/FormatStyles';
import { Palette, withOpacity } from '@/presentation/common/Palette';
import { makeVehicleStats, relativeDue, type DueItem } from '@/presentation/vehicles/VehicleStats';
import {
    filteredSection,
    filterLabel,
    timelineFilters,
    VehicleTimeline
} from '@/presentation/vehicles/VehicleTimeline';

import { day, dec, full, partial, rule, sample, service, testVehicleId, utc } from '../calculations/fixtures';

const vehicle = makeVehicle({ id: testVehicleId, name: 'Gol', initialOdometer: 1_000, createdAt: day(0) });

function stats(options: { fuel?: FuelEntry[]; services?: ServiceEntry[]; rules?: ServiceRule[]; now?: number } = {}) {
    return makeVehicleStats({
        vehicle,
        fuel: options.fuel ?? [],
        services: options.services ?? [],
        rules: options.rules ?? [],
        now: day(options.now ?? 45),
        calendar: utc
    });
}

describe('Vehicle stats and timeline', () => {
    test('km/L is attached to the fill-up that closes each interval', () => {
        const first = full(1, 1_000, 40);
        const middle = partial(10, 1_200, 10);
        const closing = full(20, 1_500, 30, { price: 6 });

        const result = stats({ fuel: [first, middle, closing] });

        expect([...result.consumptionByEntry.entries()]).toEqual([[closing.id, 500 / 40]]);
        expect(result.consumptionHistory).toHaveLength(1);
        expect(result.lastPricePerLiter).toEqualDecimal(6);
    });

    test('spending this month counts only records in the current calendar month', () => {
        const result = stats({
            fuel: [full(10, 1_100, 10), full(35, 1_400, 10)],
            services: [service(40, 1_450, 120), service(5, 1_050, 999)],
            now: 45
        });

        expect(result.spentThisMonth).toEqualDecimal(170);
    });

    test('dues are sorted by urgency, the most urgent first', () => {
        const relaxed = makeServiceRule({ vehicleId: testVehicleId, kind: 'airFilter', kilometerInterval: 20_000 });
        const urgent = makeServiceRule({ vehicleId: testVehicleId, kind: 'chain', kilometerInterval: 600 });

        const result = stats({ fuel: [full(1, 1_000, 40), full(40, 1_500, 30)], rules: [relaxed, urgent] });

        expect(result.dues.map((item) => item.due.rule.kind)).toEqual(['chain', 'airFilter']);
        expect(result.nextDue?.due.rule.kind).toBe('chain');
        expect(result.attentionLevel).toBe(MaintenanceLevel.DueSoon);
        expect(stats().attentionLevel).toBeNull();
    });

    test('a passed pace estimate is not shown as days late', () => {
        const due: ServiceDue = {
            rule: rule(10_000, null),
            forecast: { dueDate: day(10), trigger: 'distance', dueOdometer: 11_000, averageKilometersPerMonth: null },
            since: sample(0, 1_000)
        };
        const item = (status: Parameters<typeof makeMaintenanceStatus>[0]): DueItem => ({
            id: due.rule.id,
            due,
            status: makeMaintenanceStatus(status)
        });
        const passed = item({
            level: MaintenanceLevel.DueSoon,
            progress: 1,
            remainingKilometers: 500,
            remainingDays: -5
        });
        const overdue = item({
            level: MaintenanceLevel.Overdue,
            progress: 1,
            remainingKilometers: -5,
            remainingDays: -5
        });
        const dateless = item({
            level: MaintenanceLevel.OnTrack,
            progress: 0.5,
            remainingKilometers: 500,
            remainingDays: null
        });

        expect(passed.status.isEstimatePassed).toBe(true);
        expect(relativeDue(passed)).toBe('Estimate passed');
        expect(overdue.status.isEstimatePassed).toBe(false);
        expect(relativeDue(overdue)).toBe(formattedRelativeDays(-5));
        expect(relativeDue(dateless)).toBe(formattedRemainingKilometers(500));
        expect(relativeDue(item({ ...dateless.status, remainingKilometers: null }))).toBe('');
    });

    test('a km-only rule without a pace still shows, after the dated ones', () => {
        const chain = makeServiceRule({ vehicleId: testVehicleId, kind: 'chain', kilometerInterval: 1_000 });
        const inspection = makeServiceRule({ vehicleId: testVehicleId, kind: 'inspection', monthInterval: 12 });

        const result = stats({ rules: [chain, inspection] });

        expect(result.dues.map((item) => item.due.rule.kind)).toEqual(['inspection', 'chain']);
        expect(result.dues.at(-1)?.due.forecast.dueDate).toBeNull();
        expect(result.dues.at(-1)?.status.remainingKilometers).toBe(1_000);
    });

    test('sections can be filtered by record type and know their total', () => {
        const sections = VehicleTimeline.sections([full(1, 1_000, 10)], [service(2, 1_100, 80)], utc);
        const month = sections[0];
        if (!month) throw new Error('expected one section');

        expect(sections).toHaveLength(1);
        expect(month.total).toEqualDecimal(130);
        expect(filteredSection(month, 'fuel')?.items).toHaveLength(1);
        expect(filteredSection(month, 'service')?.total).toEqualDecimal(80);
        expect(filteredSection(month, 'all')?.items).toHaveLength(2);

        const fuelOnly = VehicleTimeline.sections([full(1, 1_000, 10)], [], utc)[0];
        expect(fuelOnly && filteredSection(fuelOnly, 'service')).toBeNull();
    });

    test('items in a month are newest first, then by higher odometer', () => {
        const sections = VehicleTimeline.sections(
            [full(1, 1_000, 10), full(5, 1_200, 10), full(5, 1_300, 10)],
            [],
            utc
        );

        expect(sections[0]?.items.map((item) => item.entry.odometer)).toEqual([1_300, 1_200, 1_000]);
    });

    test('monthly spending fills months without records with zero', () => {
        const sections = VehicleTimeline.sections([full(1, 1_000, 10)], [service(70, 1_500, 200)], utc);

        const months = VehicleTimeline.spending(sections, 3, day(75), utc);

        expect(months).toHaveLength(3);
        expect(months.map((month) => month.fuel.toNumber())).toEqual([50, 0, 0]);
        expect(months.map((month) => month.service.toNumber())).toEqual([0, 0, 200]);
        expect(months.at(-1)?.total).toEqualDecimal(200);
        expect(VehicleTimeline.spending(sections, 0, day(75), utc)).toEqual([]);
    });

    test('every filter, kind and status level has its own label, color and symbol', () => {
        expect(new Set(maintenanceLevels.map(levelLabel)).size).toBe(3);
        expect(new Set(maintenanceLevels.map((level) => levelSymbol(level).ios)).size).toBe(3);
        expect(new Set(maintenanceLevels.map((level) => Palette.light.levels[level])).size).toBe(3);
        expect(new Set(maintenanceLevels.map((level) => Palette.dark.levels[level])).size).toBe(3);
        expect(new Set(timelineFilters.map(filterLabel)).size).toBe(3);
        expect(new Set(serviceKinds.map(serviceKindLabel)).size).toBe(serviceKinds.length);
        expect(new Set(vehicleKinds.map(vehicleKindLabel)).size).toBe(vehicleKinds.length);
        expect(MaintenanceLevel.OnTrack < MaintenanceLevel.Overdue).toBe(true);
    });

    test('every symbol has an iOS and an Android name', () => {
        const symbols = [
            ...serviceKinds.map(serviceKindSymbol),
            ...vehicleKinds.map(vehicleKindSymbol),
            ...maintenanceLevels.map(levelSymbol)
        ];
        for (const symbol of symbols) {
            expect(symbol.ios).not.toBe('');
            expect(symbol.android).not.toBe('');
        }
    });

    test('display formats include their units', () => {
        expect(formattedKilometersPerMonth(1_200)).toBe('1,200 km/month');
        expect(formattedRemainingKilometers(500)).not.toBe(formattedRemainingKilometers(-500));
        expect(formattedRemainingKilometers(-500)).toContain('500');
        expect(formattedPerKilometer(dec(1)).endsWith('/km')).toBe(true);
        expect(formattedPerLiter(dec(6)).endsWith('/L')).toBe(true);
        expect(formattedRelativeDays(3)).not.toBe(formattedRelativeDays(-3));
        expect([0, 1, -1].map(formattedRelativeDays)).toEqual(['today', 'tomorrow', 'yesterday']);
        expect(formattedConsumption(12.44)).toBe('12.4 km/L');
        expect(formattedLiters(40.5)).toBe('40.50 L');
        expect(formattedCurrency(dec('1106.25'))).toBe('$1,106.25');
        expect(formattedNumber(1_234.5, 1)).toBe('1,234.5');
        expect(formattedShortMonth(day(0))).not.toBe('');
        expect(formattedDay(day(0))).not.toBe('');
        expect(formattedMonthAndYear(day(0))).not.toBe('');
        expect(withOpacity('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });
});
