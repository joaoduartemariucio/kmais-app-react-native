import { sortedChronologically } from '../entities/Chronology';
import type { FuelEntry } from '../entities/FuelEntry';
import type { OdometerSample } from '../entities/OdometerSample';
import type { ServiceEntry } from '../entities/ServiceEntry';
import type { Vehicle } from '../entities/Vehicle';
import type { OdometerNeighbors } from './OdometerNeighbors';

function current(samples: readonly OdometerSample[]): number | null {
    return sortedChronologically(samples).at(-1)?.odometer ?? null;
}

function neighbors(date: Date, samples: readonly OdometerSample[]): OdometerNeighbors {
    const sorted = sortedChronologically(samples);
    return {
        previous: sorted.findLast((sample) => sample.date.getTime() <= date.getTime())?.odometer ?? null,
        next: sorted.find((sample) => sample.date.getTime() > date.getTime())?.odometer ?? null
    };
}

function samples(vehicle: Vehicle, fuel: readonly FuelEntry[], services: readonly ServiceEntry[]): OdometerSample[] {
    return [
        { date: vehicle.createdAt, odometer: vehicle.initialOdometer },
        ...fuel.map((entry) => ({ date: entry.date, odometer: entry.odometer })),
        ...services.map((entry) => ({ date: entry.date, odometer: entry.odometer }))
    ];
}

export const Odometer = { current, neighbors, samples };
