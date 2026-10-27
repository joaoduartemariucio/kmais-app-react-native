import { Decimal } from 'decimal.js';

import { Calendar } from '@/domain/entities/Calendar';
import { makeFuelEntry } from '@/domain/entities/FuelEntry';
import { makeServiceEntry } from '@/domain/entities/ServiceEntry';
import { makeServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle, type Vehicle } from '@/domain/entities/Vehicle';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';

interface Repositories {
    vehicles: VehicleRepository;
    fuel: FuelEntryRepository;
    services: ServiceRepository;
}

interface Fill {
    monthsAgo: number;
    days: number;
    odometer: number;
    liters: number;
    price: string;
    full: boolean;
}

export class PreviewData {
    private readonly calendar = Calendar.current;
    readonly car: Vehicle;
    readonly motorcycle: Vehicle;

    constructor(private readonly now: Date) {
        this.car = makeVehicle({
            id: '00000000-0000-0000-0000-0000000000c1',
            name: 'Gol 1.6',
            kind: 'car',
            plate: 'ABC1D23',
            initialOdometer: 38_000,
            tankCapacity: 55,
            createdAt: this.date(5)
        });
        this.motorcycle = makeVehicle({
            id: '00000000-0000-0000-0000-0000000000b1',
            name: 'CB 500',
            kind: 'motorcycle',
            plate: 'XYZ9K87',
            initialOdometer: 12_000,
            tankCapacity: 17,
            createdAt: this.date(4)
        });
    }

    async seed(repositories: Repositories): Promise<void> {
        await this.seedCar(repositories);
        await this.seedMotorcycle(repositories);
    }

    private date(monthsAgo: number, plusDays = 0): Date {
        return this.calendar.addingDays(plusDays, this.calendar.addingMonths(-monthsAgo, this.now));
    }

    private async insert(fill: Fill, vehicle: Vehicle, repository: FuelEntryRepository): Promise<void> {
        await repository.save(
            makeFuelEntry({
                vehicleId: vehicle.id,
                date: this.date(fill.monthsAgo, fill.days),
                odometer: fill.odometer,
                liters: fill.liters,
                pricePerLiter: new Decimal(fill.price),
                isFullTank: fill.full
            })
        );
    }

    private async seedCar({ vehicles, fuel, services }: Repositories): Promise<void> {
        const vehicle = this.car;
        await vehicles.save(vehicle);

        let odometer = vehicle.initialOdometer;
        for (let month = 4; month >= 0; month -= 1) {
            odometer += 620;
            await this.insert(
                { monthsAgo: month, days: 3, odometer, liters: 42, price: '5.89', full: true },
                vehicle,
                fuel
            );
            odometer += 180;
            await this.insert(
                { monthsAgo: month, days: 17, odometer, liters: 15, price: '5.95', full: false },
                vehicle,
                fuel
            );
        }

        await services.save(
            makeServiceEntry({
                vehicleId: vehicle.id,
                kind: 'oilChange',
                date: this.date(3),
                odometer: vehicle.initialOdometer + 1_500,
                cost: new Decimal('320.00'),
                notes: 'Óleo sintético 5W30'
            })
        );
        await services.saveRules(
            [
                makeServiceRule({
                    vehicleId: vehicle.id,
                    kind: 'oilChange',
                    kilometerInterval: 10_000,
                    monthInterval: 12
                })
            ],
            vehicle.id
        );
    }

    private async seedMotorcycle({ vehicles, fuel, services }: Repositories): Promise<void> {
        const vehicle = this.motorcycle;
        await vehicles.save(vehicle);

        let odometer = vehicle.initialOdometer;
        for (let month = 3; month >= 0; month -= 1) {
            odometer += 340;
            await this.insert(
                { monthsAgo: month, days: 8, odometer, liters: 13, price: '5.79', full: true },
                vehicle,
                fuel
            );
        }

        await services.saveRules(
            [makeServiceRule({ vehicleId: vehicle.id, kind: 'chain', kilometerInterval: 1_000 })],
            vehicle.id
        );
    }
}
