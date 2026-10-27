import type { Decimal } from 'decimal.js';
import { makeAutoObservable, observableRef, runInAction } from 'mobx';

import { sumDecimals } from '@/domain/calculations/DecimalApproximating';
import { MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';
import type { Identifier } from '@/domain/entities/Identifier';
import type { Vehicle } from '@/domain/entities/Vehicle';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';
import type { DateProvider } from '@/domain/services/DateProvider';

import { errorMessage } from '../common/ErrorMessage';
import type { ServiceReminderSync } from '../reminders/ServiceReminderSync';
import { makeVehicleStats, type VehicleStats } from './VehicleStats';

export type VehicleListScope = 'active' | 'archived';

export interface VehicleListRow {
    readonly id: Identifier;
    readonly vehicle: Vehicle;
    readonly stats: VehicleStats;
}

export type VehicleListState =
    | { readonly status: 'loading' }
    | { readonly status: 'loaded'; readonly rows: readonly VehicleListRow[] }
    | { readonly status: 'failed'; readonly message: string };

export interface GarageOverview {
    readonly vehicleCount: number;
    readonly spentThisMonth: Decimal;
    readonly overdueCount: number;
    readonly dueSoonCount: number;
}

interface Dependencies {
    vehicleRepository: VehicleRepository;
    fuelEntryRepository: FuelEntryRepository;
    serviceRepository: ServiceRepository;
    dateProvider: DateProvider;
    reminders?: ServiceReminderSync;
}

export class VehicleListViewModel {
    state: VehicleListState = { status: 'loading' };

    constructor(
        readonly scope: VehicleListScope,
        private readonly dependencies: Dependencies
    ) {
        makeAutoObservable<this, 'dependencies'>(
            this,
            { state: observableRef, scope: false, dependencies: false },
            { autoBind: true }
        );
    }

    get overview(): GarageOverview | null {
        if (this.state.status !== 'loaded' || this.state.rows.length === 0) return null;
        const { rows } = this.state;
        const levels = rows.flatMap((row) => row.stats.dues.map((item) => item.status.level));
        return {
            vehicleCount: rows.length,
            spentThisMonth: sumDecimals(rows.map((row) => row.stats.spentThisMonth)),
            overdueCount: levels.filter((level) => level === MaintenanceLevel.Overdue).length,
            dueSoonCount: levels.filter((level) => level === MaintenanceLevel.DueSoon).length
        };
    }

    async load(): Promise<void> {
        const { vehicleRepository, fuelEntryRepository, serviceRepository, dateProvider, reminders } =
            this.dependencies;
        try {
            const archived = this.scope === 'archived';
            const vehicles = (await vehicleRepository.all(archived)).filter(
                (vehicle) => vehicle.isArchived === archived
            );

            const rows: VehicleListRow[] = [];
            for (const vehicle of vehicles) {
                const fuel = await fuelEntryRepository.entries(vehicle.id);
                const services = await serviceRepository.entries(vehicle.id);
                const rules = await serviceRepository.rules(vehicle.id);
                rows.push({
                    id: vehicle.id,
                    vehicle,
                    stats: makeVehicleStats({
                        vehicle,
                        fuel,
                        services,
                        rules,
                        now: dateProvider.now,
                        calendar: dateProvider.calendar
                    })
                });
            }
            runInAction(() => {
                this.state = { status: 'loaded', rows };
            });
        } catch (error) {
            runInAction(() => {
                this.state = { status: 'failed', message: errorMessage(error) };
            });
        }
        await reminders?.sync();
    }

    async setArchived(isArchived: boolean, vehicle: Vehicle): Promise<void> {
        try {
            await this.dependencies.vehicleRepository.setArchived(isArchived, vehicle.id);
            await this.load();
        } catch (error) {
            runInAction(() => {
                this.state = { status: 'failed', message: errorMessage(error) };
            });
        }
    }
}
