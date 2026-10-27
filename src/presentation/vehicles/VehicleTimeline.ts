import { Decimal } from 'decimal.js';

import { sumDecimals } from '@/domain/calculations/DecimalApproximating';
import type { Calendar } from '@/domain/entities/Calendar';
import { fuelTotalCost, type FuelEntry } from '@/domain/entities/FuelEntry';
import type { Identifier } from '@/domain/entities/Identifier';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';

import { t } from '../i18n/i18n';

export type TimelineItem =
    { readonly type: 'fuel'; readonly entry: FuelEntry } | { readonly type: 'service'; readonly entry: ServiceEntry };

export const timelineFilters = ['all', 'fuel', 'service'] as const;

export type TimelineFilter = (typeof timelineFilters)[number];

export interface MonthSection {
    readonly month: Date;
    readonly items: readonly TimelineItem[];
    readonly total: Decimal;
}

export interface MonthSpending {
    readonly month: Date;
    readonly fuel: Decimal;
    readonly service: Decimal;
    readonly total: Decimal;
}

export function itemId(item: TimelineItem): Identifier {
    return item.entry.id;
}

export function itemCost(item: TimelineItem): Decimal {
    return item.type === 'fuel' ? fuelTotalCost(item.entry) : item.entry.cost;
}

export function itemMatches(item: TimelineItem, filter: TimelineFilter): boolean {
    return filter === 'all' || filter === item.type;
}

export function filterLabel(filter: TimelineFilter): string {
    switch (filter) {
        case 'all':
            return t('All');
        case 'fuel':
            return t('Fuel');
        case 'service':
            return t('Services');
    }
}

function section(month: Date, items: readonly TimelineItem[]): MonthSection {
    return { month, items, total: sumDecimals(items.map(itemCost)) };
}

export function filteredSection(month: MonthSection, filter: TimelineFilter): MonthSection | null {
    const kept = month.items.filter((item) => itemMatches(item, filter));
    return kept.length === 0 ? null : section(month.month, kept);
}

function sections(fuel: readonly FuelEntry[], services: readonly ServiceEntry[], calendar: Calendar): MonthSection[] {
    const items: TimelineItem[] = [
        ...fuel.map((entry): TimelineItem => ({ type: 'fuel', entry })),
        ...services.map((entry): TimelineItem => ({ type: 'service', entry }))
    ];

    const grouped = new Map<number, TimelineItem[]>();
    for (const item of items) {
        const month = calendar.monthStart(item.entry.date).getTime();
        grouped.set(month, [...(grouped.get(month) ?? []), item]);
    }

    return [...grouped.entries()]
        .map(([month, monthItems]) =>
            section(
                new Date(month),
                [...monthItems].sort((lhs, rhs) => {
                    const byDate = rhs.entry.date.getTime() - lhs.entry.date.getTime();
                    return byDate === 0 ? rhs.entry.odometer - lhs.entry.odometer : byDate;
                })
            )
        )
        .sort((lhs, rhs) => rhs.month.getTime() - lhs.month.getTime());
}

function spending(
    monthSections: readonly MonthSection[],
    months: number,
    endingAt: Date,
    calendar: Calendar
): MonthSpending[] {
    const byMonth = new Map(monthSections.map((item) => [item.month.getTime(), item.items]));
    const current = calendar.monthStart(endingAt);

    return Array.from({ length: Math.max(0, months) }, (_, index) => months - 1 - index).map((offset) => {
        const month = calendar.addingMonths(-offset, current);
        const items = byMonth.get(month.getTime()) ?? [];
        const fuelTotal = sumDecimals(items.filter((item) => item.type === 'fuel').map(itemCost));
        const serviceTotal = sumDecimals(items.filter((item) => item.type === 'service').map(itemCost));
        return { month, fuel: fuelTotal, service: serviceTotal, total: fuelTotal.plus(serviceTotal) };
    });
}

export const VehicleTimeline = { sections, spending, zero: new Decimal(0) };
