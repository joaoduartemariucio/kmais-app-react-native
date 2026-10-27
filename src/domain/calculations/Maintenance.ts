import { Calendar } from '../entities/Calendar';
import { sortedChronologically } from '../entities/Chronology';
import type { OdometerSample } from '../entities/OdometerSample';
import type { ServiceEntry } from '../entities/ServiceEntry';
import { compareServiceKinds } from '../entities/ServiceKind';
import type { ServiceRule } from '../entities/ServiceRule';
import type { Vehicle } from '../entities/Vehicle';
import type { MaintenanceForecast, MaintenanceTrigger } from './MaintenanceForecast';
import { MaintenanceLevel, makeMaintenanceStatus, type MaintenanceStatus } from './MaintenanceStatus';
import type { ServiceDue } from './ServiceDue';

interface ClosedRange {
    readonly lowerBound: number;
    readonly upperBound: number;
}

const averageDaysPerMonth = 365.25 / 12;
const dueSoonFraction = 0.15;
const dueSoonKilometers: ClosedRange = { lowerBound: 300, upperBound: 1_000 };
const dueSoonDays: ClosedRange = { lowerBound: 15, upperBound: 30 };

function roundedHalfAwayFromZero(value: number): number {
    return Math.sign(value) * Math.round(Math.abs(value));
}

function earlier(lhs: Date, rhs: Date): Date {
    return lhs.getTime() <= rhs.getTime() ? lhs : rhs;
}

function averageKilometersPerDay(samples: readonly OdometerSample[]): number | null {
    const sorted = sortedChronologically(samples);
    const first = sorted[0];
    const last = sorted.at(-1);
    if (!first || !last) return null;

    const days = (last.date.getTime() - first.date.getTime()) / 86_400_000;
    const kilometers = last.odometer - first.odometer;
    if (days <= 0 || kilometers <= 0) return null;

    return kilometers / days;
}

function averageKilometersPerMonth(samples: readonly OdometerSample[]): number | null {
    const perDay = averageKilometersPerDay(samples);
    return perDay === null ? null : perDay * averageDaysPerMonth;
}

interface ForecastInput {
    rule: ServiceRule;
    lastServiceDate: Date;
    lastServiceOdometer: number;
    history: readonly OdometerSample[];
    calendar?: Calendar;
}

function forecast({
    rule,
    lastServiceDate,
    lastServiceOdometer,
    history,
    calendar = Calendar.current
}: ForecastInput): MaintenanceForecast | null {
    const kilometersPerDay = averageKilometersPerDay(history);
    const kilometersPerMonth = kilometersPerDay === null ? null : kilometersPerDay * averageDaysPerMonth;

    let dueOdometer: number | null = null;
    let dateByDistance: Date | null = null;

    const interval = rule.kilometerInterval;
    if (interval !== null && interval > 0) {
        const due = lastServiceOdometer + interval;
        dueOdometer = due;

        const current = sortedChronologically(history).at(-1);
        if (kilometersPerDay !== null && current) {
            const days = (due - current.odometer) / kilometersPerDay;
            if (Number.isFinite(days) && Math.abs(days) < 36_525) {
                dateByDistance = calendar.addingDays(roundedHalfAwayFromZero(days), current.date);
            }
        }
    }

    let dateByCalendar: Date | null = null;
    const months = rule.monthInterval;
    if (months !== null && months > 0) {
        dateByCalendar = calendar.addingMonths(months, lastServiceDate);
    }

    let dueDate: Date | null;
    let trigger: MaintenanceTrigger;
    if (dateByDistance && dateByCalendar) {
        dueDate = earlier(dateByDistance, dateByCalendar);
        trigger = dateByDistance.getTime() <= dateByCalendar.getTime() ? 'distance' : 'calendar';
    } else if (dateByDistance) {
        dueDate = dateByDistance;
        trigger = 'distance';
    } else if (dateByCalendar) {
        dueDate = dateByCalendar;
        trigger = 'calendar';
    } else {
        if (dueOdometer === null) return null;
        dueDate = null;
        trigger = 'distance';
    }

    return { dueDate, trigger, dueOdometer, averageKilometersPerMonth: kilometersPerMonth };
}

interface DueInput {
    rule: ServiceRule;
    vehicle: Vehicle;
    services: readonly ServiceEntry[];
    history: readonly OdometerSample[];
    calendar?: Calendar;
}

function due({ rule, vehicle, services, history, calendar = Calendar.current }: DueInput): ServiceDue | null {
    const last = services
        .filter((service) => service.kind === rule.kind)
        .reduce<ServiceEntry | null>(
            (latest, service) => (latest && latest.date.getTime() >= service.date.getTime() ? latest : service),
            null
        );

    const since: OdometerSample = {
        date: last?.date ?? vehicle.createdAt,
        odometer: last?.odometer ?? vehicle.initialOdometer
    };

    const result = forecast({
        rule,
        lastServiceDate: since.date,
        lastServiceOdometer: since.odometer,
        history,
        calendar
    });
    return result ? { rule, forecast: result, since } : null;
}

export function compareDueDates(lhs: ServiceDue, rhs: ServiceDue): number {
    const left = lhs.forecast.dueDate;
    const right = rhs.forecast.dueDate;
    if (left && right && left.getTime() !== right.getTime()) return left.getTime() - right.getTime();
    if (left && !right) return -1;
    if (!left && right) return 1;
    return compareServiceKinds(lhs.rule.kind, rhs.rule.kind);
}

interface NextDueInput {
    rules: readonly ServiceRule[];
    vehicle: Vehicle;
    services: readonly ServiceEntry[];
    history: readonly OdometerSample[];
    calendar?: Calendar;
}

function nextDue({ rules, vehicle, services, history, calendar = Calendar.current }: NextDueInput): ServiceDue | null {
    const dues = rules
        .map((rule) => due({ rule, vehicle, services, history, calendar }))
        .filter((item): item is ServiceDue => item !== null);
    return dues.reduce<ServiceDue | null>(
        (best, item) => (best === null || compareDueDates(item, best) < 0 ? item : best),
        null
    );
}

function window(length: number, range: ClosedRange): number {
    return Math.min(range.upperBound, Math.max(range.lowerBound, length * dueSoonFraction));
}

interface StatusInput {
    due: ServiceDue;
    currentOdometer: number;
    now: Date;
    calendar?: Calendar;
}

function status({ due: item, currentOdometer, now, calendar = Calendar.current }: StatusInput): MaintenanceStatus {
    const today = calendar.startOfDay(now);
    const start = calendar.startOfDay(item.since.date);

    let remainingDays: number | null = null;
    let dateProgress = 0;
    let isDueSoon = false;
    if (item.forecast.dueDate) {
        const estimated = calendar.startOfDay(item.forecast.dueDate);
        const remaining = calendar.daysBetween(today, estimated);
        const periodDays = Math.max(1, calendar.daysBetween(start, estimated));
        remainingDays = remaining;
        dateProgress = (periodDays - remaining) / periodDays;
        isDueSoon = remaining <= window(periodDays, dueSoonDays);
    }

    let overdueBy: MaintenanceTrigger | null = null;
    let calendarDueDate: Date | null = null;
    const months = item.rule.monthInterval;
    if (months !== null && months > 0) {
        calendarDueDate = calendar.addingMonths(months, start);
        if (calendarDueDate.getTime() < today.getTime()) overdueBy = 'calendar';
    }

    let remainingKilometers: number | null = null;
    let distanceProgress = 0;
    const interval = item.rule.kilometerInterval;
    if (interval !== null && interval > 0) {
        const remaining = item.since.odometer + interval - currentOdometer;
        remainingKilometers = remaining;
        distanceProgress = (interval - remaining) / interval;
        if (remaining <= 0 && overdueBy === null) overdueBy = 'distance';
        isDueSoon = isDueSoon || remaining <= window(interval, dueSoonKilometers);
    }

    let level = MaintenanceLevel.OnTrack;
    if (overdueBy !== null) {
        level = MaintenanceLevel.Overdue;
    } else if (isDueSoon) {
        level = MaintenanceLevel.DueSoon;
    }

    return makeMaintenanceStatus({
        level,
        progress: Math.min(1, Math.max(0, distanceProgress, dateProgress)),
        remainingKilometers,
        remainingDays,
        overdueBy,
        calendarDueDate
    });
}

export const Maintenance = {
    averageDaysPerMonth,
    dueSoonFraction,
    dueSoonKilometers,
    dueSoonDays,
    averageKilometersPerDay,
    averageKilometersPerMonth,
    forecast,
    due,
    nextDue,
    status
};
