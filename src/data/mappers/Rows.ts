export interface VehicleRow {
    id: string;
    name: string;
    kind: string;
    plate: string | null;
    initial_odometer: number;
    tank_capacity: number | null;
    created_at: number;
    is_archived: number;
}

export interface FuelEntryRow {
    id: string;
    vehicle_id: string;
    date: number;
    odometer: number;
    liters: number;
    price_per_liter: string;
    is_full_tank: number;
}

export interface ServiceEntryRow {
    id: string;
    vehicle_id: string;
    kind: string;
    date: number;
    odometer: number;
    cost: string;
    notes: string;
}

export interface ServiceRuleRow {
    id: string;
    vehicle_id: string;
    kind: string;
    kilometer_interval: number | null;
    month_interval: number | null;
}
