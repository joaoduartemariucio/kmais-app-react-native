import type { MaintenanceTrigger } from './MaintenanceForecast';

export enum MaintenanceLevel {
    OnTrack = 0,
    DueSoon = 1,
    Overdue = 2
}

export const maintenanceLevels = [MaintenanceLevel.OnTrack, MaintenanceLevel.DueSoon, MaintenanceLevel.Overdue];

export interface MaintenanceStatus {
    readonly level: MaintenanceLevel;
    readonly progress: number;
    readonly remainingKilometers: number | null;
    readonly remainingDays: number | null;
    readonly overdueBy: MaintenanceTrigger | null;
    readonly calendarDueDate: Date | null;
    readonly isEstimatePassed: boolean;
}

export interface MaintenanceStatusInit {
    level: MaintenanceLevel;
    progress: number;
    remainingKilometers: number | null;
    remainingDays: number | null;
    overdueBy?: MaintenanceTrigger | null;
    calendarDueDate?: Date | null;
}

export function makeMaintenanceStatus(init: MaintenanceStatusInit): MaintenanceStatus {
    return {
        level: init.level,
        progress: init.progress,
        remainingKilometers: init.remainingKilometers,
        remainingDays: init.remainingDays,
        overdueBy: init.overdueBy ?? null,
        calendarDueDate: init.calendarDueDate ?? null,
        isEstimatePassed: init.level !== MaintenanceLevel.Overdue && (init.remainingDays ?? 0) < 0
    };
}
