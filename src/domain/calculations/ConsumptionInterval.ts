export interface ConsumptionInterval {
    readonly startDate: Date;
    readonly endDate: Date;
    readonly startOdometer: number;
    readonly endOdometer: number;
    readonly liters: number;
    readonly distance: number;
    readonly kilometersPerLiter: number;
}

export function makeConsumptionInterval(
    interval: Omit<ConsumptionInterval, 'distance' | 'kilometersPerLiter'>
): ConsumptionInterval {
    const distance = interval.endOdometer - interval.startOdometer;
    return { ...interval, distance, kilometersPerLiter: distance / interval.liters };
}
