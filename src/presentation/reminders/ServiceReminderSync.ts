import type { PlannedReminder } from '@/domain/calculations/PlannedReminder';
import { ReminderPlan } from '@/domain/calculations/ReminderPlan';
import type { VehicleRecords } from '@/domain/entities/VehicleRecords';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';
import type { DateProvider } from '@/domain/services/DateProvider';
import type { Reminder, ReminderScheduler } from '@/domain/services/ReminderScheduler';

import { serviceKindLabel } from '../common/Display';
import { formattedFullDate, formattedKilometers } from '../common/FormatStyles';
import { Log } from '../common/Log';
import { t } from '../i18n/i18n';

interface Dependencies {
    vehicleRepository: VehicleRepository;
    fuelEntryRepository: FuelEntryRepository;
    serviceRepository: ServiceRepository;
    scheduler: ReminderScheduler;
    dateProvider: DateProvider;
}

export class ServiceReminderSync {
    constructor(private readonly dependencies: Dependencies) {}

    async sync(): Promise<void> {
        const { scheduler, dateProvider } = this.dependencies;
        try {
            const planned = ReminderPlan.reminders(await this.records(), dateProvider.now, dateProvider.calendar);

            const wanted = new Set(planned.map((reminder) => reminder.id));
            for (const id of await scheduler.pendingIdentifiers()) {
                if (!wanted.has(id)) await scheduler.cancel(id);
            }

            if (planned.length === 0 || !(await scheduler.requestAuthorization())) return;
            for (const reminder of planned) {
                await scheduler.schedule(ServiceReminderSync.reminder(reminder));
            }
        } catch (error) {
            Log.error('reminders', 'Could not sync service reminders', error);
        }
    }

    private async records(): Promise<VehicleRecords[]> {
        const { vehicleRepository, fuelEntryRepository, serviceRepository } = this.dependencies;
        const records: VehicleRecords[] = [];
        for (const vehicle of await vehicleRepository.all(false)) {
            records.push({
                vehicle,
                fuel: await fuelEntryRepository.entries(vehicle.id),
                services: await serviceRepository.entries(vehicle.id),
                rules: await serviceRepository.rules(vehicle.id)
            });
        }
        return records;
    }

    static reminder(planned: PlannedReminder): Reminder {
        const { forecast } = planned.due;
        const { status } = planned;
        const lastReading = formattedKilometers(planned.currentOdometer);

        let body: string;
        if (status.overdueBy === 'distance' && forecast.dueOdometer !== null) {
            body = t('Was due at {{odometer}} (last reading {{reading}}).', {
                odometer: formattedKilometers(forecast.dueOdometer),
                reading: lastReading
            });
        } else if (status.overdueBy === 'calendar' && status.calendarDueDate) {
            body = t('Overdue since {{date}}.', { date: formattedFullDate(status.calendarDueDate) });
        } else if (forecast.dueDate) {
            body =
                forecast.trigger === 'distance' && forecast.dueOdometer !== null
                    ? t('Due at {{odometer}}, around {{date}}.', {
                          odometer: formattedKilometers(forecast.dueOdometer),
                          date: formattedFullDate(forecast.dueDate)
                      })
                    : t('Due on {{date}}.', { date: formattedFullDate(forecast.dueDate) });
        } else {
            body = t('Due at {{odometer}}.', { odometer: formattedKilometers(forecast.dueOdometer ?? 0) });
        }

        return {
            id: planned.id,
            title: `${planned.vehicle.name}: ${serviceKindLabel(planned.due.rule.kind)}`,
            body,
            fireDate: planned.fireDate
        };
    }
}
