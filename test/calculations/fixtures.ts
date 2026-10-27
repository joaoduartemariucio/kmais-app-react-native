import { Decimal } from 'decimal.js';

import { Calendar } from '@/domain/entities/Calendar';
import { makeFuelEntry, type FuelEntry } from '@/domain/entities/FuelEntry';
import type { Identifier } from '@/domain/entities/Identifier';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { makeServiceEntry, type ServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';

const referenceDate = Date.UTC(2001, 0, 1);

export function day(offset: number): Date {
    return new Date(referenceDate + offset * 86_400_000);
}

export const utc = Calendar.utc;

export const testVehicleId = '00000000-0000-0000-0000-00000000ca11';

export function dec(value: Decimal.Value): Decimal {
    return new Decimal(value);
}

interface FillOptions {
    price?: Decimal.Value;
    id?: Identifier;
}

export function full(dayOffset: number, odometer: number, liters: number, options: FillOptions = {}): FuelEntry {
    return makeFuelEntry({
        id: options.id,
        vehicleId: testVehicleId,
        date: day(dayOffset),
        odometer,
        liters,
        pricePerLiter: dec(options.price ?? 5),
        isFullTank: true
    });
}

export function partial(dayOffset: number, odometer: number, liters: number, options: FillOptions = {}): FuelEntry {
    return makeFuelEntry({
        id: options.id,
        vehicleId: testVehicleId,
        date: day(dayOffset),
        odometer,
        liters,
        pricePerLiter: dec(options.price ?? 5),
        isFullTank: false
    });
}

export function service(dayOffset: number, odometer: number, cost: Decimal.Value): ServiceEntry {
    return makeServiceEntry({ vehicleId: testVehicleId, date: day(dayOffset), odometer, cost: dec(cost) });
}

export function sample(dayOffset: number, odometer: number): OdometerSample {
    return { date: day(dayOffset), odometer };
}

export function rule(kilometers: number | null, months: number | null): ServiceRule {
    return makeServiceRule({
        vehicleId: testVehicleId,
        kind: 'oilChange',
        kilometerInterval: kilometers,
        monthInterval: months
    });
}
