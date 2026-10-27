import { Calendar } from '../entities/Calendar';
import { sortedChronologically } from '../entities/Chronology';
import type { OdometerSample } from '../entities/OdometerSample';
import type { VehicleRecords } from '../entities/VehicleRecords';
import { Maintenance } from './Maintenance';
import { MaintenanceLevel, type MaintenanceStatus } from './MaintenanceStatus';
import { Odometer } from './Odometer';
import { makePlannedReminder, type PlannedReminder } from './PlannedReminder';
import type { ServiceDue } from './ServiceDue';

const hourOfDay = 9;
const dailyOverdueDays = 7;
const overdueRepeatDays = 7;

function morning(date: Date, calendar: Calendar): Date {
    return calendar.settingTime(hourOfDay, 0, 0, date);
}

function fireDateFor(dueDate: Date, now: Date, calendar: Calendar = Calendar.current): Date {
    const onDueDay = morning(dueDate, calendar);
    if (onDueDay.getTime() > now.getTime()) return onDueDay;

    const today = morning(now, calendar);
    return today.getTime() > now.getTime() ? today : calendar.addingDays(1, today);
}

function overdueFireDate(since: Date, now: Date, calendar: Calendar = Calendar.current): Date {
    const next = fireDateFor(since, now, calendar);
    const elapsed = calendar.daysBetween(calendar.startOfDay(since), calendar.startOfDay(next));
    if (elapsed <= dailyOverdueDays) return next;

    const offset = (overdueRepeatDays - (elapsed % overdueRepeatDays)) % overdueRepeatDays;
    return calendar.addingDays(offset, next);
}

interface OverdueSinceInput {
    due: ServiceDue;
    status: MaintenanceStatus;
    history: readonly OdometerSample[];
    now: Date;
    calendar?: Calendar;
}

function overdueSince({ due, status, history, now, calendar = Calendar.current }: OverdueSinceInput): Date {
    const sorted = sortedChronologically(history);
    const candidates: Date[] = [];

    const calendarDueDate = status.calendarDueDate;
    if (calendarDueDate && calendarDueDate.getTime() < calendar.startOfDay(now).getTime()) {
        candidates.push(calendarDueDate);
    }
    const remaining = status.remainingKilometers;
    const dueOdometer = due.forecast.dueOdometer;
    if (remaining !== null && remaining <= 0 && dueOdometer !== null) {
        const reached = sorted.find(
            (sample) => sample.date.getTime() >= due.since.date.getTime() && sample.odometer >= dueOdometer
        );
        candidates.push(reached?.date ?? sorted.at(-1)?.date ?? now);
    }
    return (
        candidates.reduce<Date | null>(
            (earliest, date) => (earliest === null || date.getTime() < earliest.getTime() ? date : earliest),
            null
        ) ?? now
    );
}

function fireDate(
    due: ServiceDue,
    status: MaintenanceStatus,
    history: readonly OdometerSample[],
    now: Date,
    calendar: Calendar
): Date | null {
    if (status.level === MaintenanceLevel.Overdue) {
        const since = overdueSince({ due, status, history, now, calendar });
        return overdueFireDate(since, now, calendar);
    }
    const upcoming = [due.forecast.dueDate, status.calendarDueDate]
        .filter((date): date is Date => date !== null)
        .map((date) => morning(date, calendar))
        .filter((date) => date.getTime() > now.getTime())
        .sort((lhs, rhs) => lhs.getTime() - rhs.getTime());
    return upcoming[0] ?? null;
}

function remindersForVehicle(record: VehicleRecords, now: Date, calendar: Calendar): PlannedReminder[] {
    const history = Odometer.samples(record.vehicle, record.fuel, record.services);
    const current = Odometer.current(history) ?? record.vehicle.initialOdometer;

    return record.rules.flatMap((rule) => {
        const due = Maintenance.due({
            rule,
            vehicle: record.vehicle,
            services: record.services,
            history,
            calendar
        });
        if (!due) return [];

        const status = Maintenance.status({ due, currentOdometer: current, now, calendar });
        const date = fireDate(due, status, history, now, calendar);
        if (!date) return [];

        return [
            makePlannedReminder({ vehicle: record.vehicle, due, status, currentOdometer: current, fireDate: date })
        ];
    });
}

function reminders(
    records: readonly VehicleRecords[],
    now: Date,
    calendar: Calendar = Calendar.current
): PlannedReminder[] {
    return records
        .filter((record) => !record.vehicle.isArchived)
        .flatMap((record) => remindersForVehicle(record, now, calendar))
        .sort((lhs, rhs) => {
            const byDate = lhs.fireDate.getTime() - rhs.fireDate.getTime();
            if (byDate !== 0) return byDate;
            return lhs.id < rhs.id ? -1 : lhs.id > rhs.id ? 1 : 0;
        });
}

export const ReminderPlan = {
    hourOfDay,
    dailyOverdueDays,
    overdueRepeatDays,
    reminders,
    overdueSince,
    overdueFireDate,
    fireDate: fireDateFor
};
