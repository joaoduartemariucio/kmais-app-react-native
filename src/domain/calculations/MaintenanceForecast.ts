export type MaintenanceTrigger = 'distance' | 'calendar';

export interface MaintenanceForecast {
    readonly dueDate: Date | null;
    readonly trigger: MaintenanceTrigger;
    readonly dueOdometer: number | null;
    readonly averageKilometersPerMonth: number | null;
}
