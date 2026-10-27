import type { Identifier } from '../entities/Identifier';
import type { Vehicle } from '../entities/Vehicle';
import { MaintenanceLevel, type MaintenanceStatus } from './MaintenanceStatus';
import type { ServiceDue } from './ServiceDue';

export interface PlannedReminder {
    readonly id: Identifier;
    readonly vehicle: Vehicle;
    readonly due: ServiceDue;
    readonly status: MaintenanceStatus;
    readonly currentOdometer: number;
    readonly fireDate: Date;
    readonly isOverdue: boolean;
}

export function makePlannedReminder(reminder: Omit<PlannedReminder, 'id' | 'isOverdue'>): PlannedReminder {
    return {
        ...reminder,
        id: reminder.due.rule.id,
        isOverdue: reminder.status.level === MaintenanceLevel.Overdue
    };
}
