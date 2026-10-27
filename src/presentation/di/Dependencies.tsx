import { createContext, useContext, type ReactNode } from 'react';

import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';
import type { DateProvider } from '@/domain/services/DateProvider';
import type { ReminderScheduler } from '@/domain/services/ReminderScheduler';

import type { ServiceReminderSync } from '../reminders/ServiceReminderSync';

export interface Dependencies {
    readonly vehicleRepository: VehicleRepository;
    readonly fuelEntryRepository: FuelEntryRepository;
    readonly serviceRepository: ServiceRepository;
    readonly dateProvider: DateProvider;
    readonly reminderScheduler: ReminderScheduler;
    readonly reminderSync: ServiceReminderSync;
    readonly isUsingFallbackStore: boolean;
}

const DependenciesContext = createContext<Dependencies | null>(null);

export function DependenciesProvider({ value, children }: { value: Dependencies; children: ReactNode }) {
    return <DependenciesContext.Provider value={value}>{children}</DependenciesContext.Provider>;
}

export function useDependencies(): Dependencies {
    const dependencies = useContext(DependenciesContext);
    if (!dependencies) throw new Error('useDependencies() must be used inside <DependenciesProvider>');
    return dependencies;
}
