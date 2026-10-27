import type { Decimal } from 'decimal.js';
import { makeAutoObservable, observableRef, runInAction } from 'mobx';

import { Odometer } from '@/domain/calculations/Odometer';
import type { FuelEntry } from '@/domain/entities/FuelEntry';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceRule } from '@/domain/entities/ServiceRule';
import type { Vehicle } from '@/domain/entities/Vehicle';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { DateProvider } from '@/domain/services/DateProvider';

import { errorMessage } from '../common/ErrorMessage';
import type { ServiceReminderSync } from '../reminders/ServiceReminderSync';
import { makeVehicleStats, type VehicleStats } from './VehicleStats';
import {
    filteredSection,
    itemId,
    VehicleTimeline,
    type MonthSection,
    type MonthSpending,
    type TimelineFilter,
    type TimelineItem
} from './VehicleTimeline';

export interface VehicleDetailContent {
    readonly stats: VehicleStats;
    readonly sections: readonly MonthSection[];
    readonly spending: readonly MonthSpending[];
    readonly rules: readonly ServiceRule[];
}

export type VehicleDetailState =
    | { readonly status: 'loading' }
    | { readonly status: 'loaded'; readonly content: VehicleDetailContent }
    | { readonly status: 'failed'; readonly message: string };

interface Dependencies {
    fuelEntryRepository: FuelEntryRepository;
    serviceRepository: ServiceRepository;
    dateProvider: DateProvider;
    reminders?: ServiceReminderSync;
}

export class VehicleDetailViewModel {
    static readonly spendingMonths = 6;

    state: VehicleDetailState = { status: 'loading' };
    filter: TimelineFilter = 'all';

    private fuel: readonly FuelEntry[] = [];
    private services: readonly ServiceEntry[] = [];

    constructor(
        readonly vehicle: Vehicle,
        private readonly dependencies: Dependencies
    ) {
        makeAutoObservable<this, 'dependencies' | 'fuel' | 'services'>(
            this,
            { state: observableRef, vehicle: false, dependencies: false, fuel: false, services: false },
            { autoBind: true }
        );
    }

    async load(): Promise<void> {
        const { fuelEntryRepository, serviceRepository, dateProvider, reminders } = this.dependencies;
        try {
            const fuel = await fuelEntryRepository.entries(this.vehicle.id);
            const services = await serviceRepository.entries(this.vehicle.id);
            const rules = await serviceRepository.rules(this.vehicle.id);

            this.fuel = fuel;
            this.services = services;

            const { calendar, now } = dateProvider;
            const sections = VehicleTimeline.sections(fuel, services, calendar);

            runInAction(() => {
                this.state = {
                    status: 'loaded',
                    content: {
                        stats: makeVehicleStats({ vehicle: this.vehicle, fuel, services, rules, now, calendar }),
                        sections,
                        spending: VehicleTimeline.spending(
                            sections,
                            VehicleDetailViewModel.spendingMonths,
                            now,
                            calendar
                        ),
                        rules
                    }
                };
            });
        } catch (error) {
            runInAction(() => {
                this.state = { status: 'failed', message: errorMessage(error) };
            });
        }
        await reminders?.sync();
    }

    setFilter(filter: TimelineFilter): void {
        this.filter = filter;
    }

    get visibleSections(): MonthSection[] {
        if (this.state.status !== 'loaded') return [];
        return this.state.content.sections
            .map((section) => filteredSection(section, this.filter))
            .filter((section): section is MonthSection => section !== null);
    }

    get hasHistory(): boolean {
        return this.state.status === 'loaded' && this.state.content.sections.length > 0;
    }

    get lastPricePerLiter(): Decimal | null {
        return this.state.status === 'loaded' ? this.state.content.stats.lastPricePerLiter : null;
    }

    get rules(): readonly ServiceRule[] {
        return this.state.status === 'loaded' ? this.state.content.rules : [];
    }

    odometerReadings(excluding: TimelineItem | null = null): OdometerSample[] {
        const excludedId = excluding ? itemId(excluding) : null;
        return Odometer.samples(
            this.vehicle,
            this.fuel.filter((entry) => entry.id !== excludedId),
            this.services.filter((entry) => entry.id !== excludedId)
        );
    }

    async delete(item: TimelineItem): Promise<void> {
        try {
            if (item.type === 'fuel') {
                await this.dependencies.fuelEntryRepository.delete(item.entry.id);
            } else {
                await this.dependencies.serviceRepository.deleteEntry(item.entry.id);
            }
            await this.load();
        } catch (error) {
            runInAction(() => {
                this.state = { status: 'failed', message: errorMessage(error) };
            });
        }
    }
}
