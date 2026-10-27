import { Calendar } from '@/domain/entities/Calendar';
import { sortedChronologically } from '@/domain/entities/Chronology';
import type { FuelEntry } from '@/domain/entities/FuelEntry';
import type { Identifier } from '@/domain/entities/Identifier';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceRule } from '@/domain/entities/ServiceRule';
import type { Vehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';
import type { DateProvider } from '@/domain/services/DateProvider';
import type { Reminder, ReminderScheduler } from '@/domain/services/ReminderScheduler';

const byId = <Item extends { id: Identifier }>(items: readonly Item[]) =>
    new Map(items.map((item) => [item.id, item] as const));

export class InMemoryVehicleRepository implements VehicleRepository {
    private readonly storage: Map<Identifier, Vehicle>;

    constructor(
        vehicles: readonly Vehicle[] = [],
        public failure: Error | null = null
    ) {
        this.storage = byId(vehicles);
    }

    async all(includingArchived: boolean): Promise<Vehicle[]> {
        if (this.failure) throw this.failure;
        return [...this.storage.values()]
            .filter((vehicle) => includingArchived || !vehicle.isArchived)
            .sort((lhs, rhs) => rhs.createdAt.getTime() - lhs.createdAt.getTime());
    }

    async vehicle(id: Identifier): Promise<Vehicle | null> {
        if (this.failure) throw this.failure;
        return this.storage.get(id) ?? null;
    }

    async save(vehicle: Vehicle): Promise<void> {
        if (this.failure) throw this.failure;
        this.storage.set(vehicle.id, vehicle);
    }

    async setArchived(isArchived: boolean, vehicleId: Identifier): Promise<void> {
        if (this.failure) throw this.failure;
        const vehicle = this.storage.get(vehicleId);
        if (!vehicle) throw RepositoryError.vehicleNotFound(vehicleId);
        this.storage.set(vehicleId, { ...vehicle, isArchived });
    }
}

export class InMemoryFuelEntryRepository implements FuelEntryRepository {
    private readonly storage: Map<Identifier, FuelEntry>;

    constructor(
        entries: readonly FuelEntry[] = [],
        public failure: Error | null = null
    ) {
        this.storage = byId(entries);
    }

    async entries(vehicleId: Identifier): Promise<FuelEntry[]> {
        if (this.failure) throw this.failure;
        return sortedChronologically([...this.storage.values()].filter((entry) => entry.vehicleId === vehicleId));
    }

    async save(entry: FuelEntry): Promise<void> {
        if (this.failure) throw this.failure;
        this.storage.set(entry.id, entry);
    }

    async delete(id: Identifier): Promise<void> {
        if (this.failure) throw this.failure;
        if (!this.storage.delete(id)) throw RepositoryError.entryNotFound(id);
    }
}

export class InMemoryServiceRepository implements ServiceRepository {
    private readonly entryStorage: Map<Identifier, ServiceEntry>;
    private readonly ruleStorage: Map<Identifier, ServiceRule>;

    constructor(
        entries: readonly ServiceEntry[] = [],
        rules: readonly ServiceRule[] = [],
        public failure: Error | null = null
    ) {
        this.entryStorage = byId(entries);
        this.ruleStorage = byId(rules);
    }

    async entries(vehicleId: Identifier): Promise<ServiceEntry[]> {
        if (this.failure) throw this.failure;
        return sortedChronologically([...this.entryStorage.values()].filter((entry) => entry.vehicleId === vehicleId));
    }

    async rules(vehicleId: Identifier): Promise<ServiceRule[]> {
        if (this.failure) throw this.failure;
        return [...this.ruleStorage.values()].filter((rule) => rule.vehicleId === vehicleId);
    }

    async save(entry: ServiceEntry): Promise<void> {
        if (this.failure) throw this.failure;
        this.entryStorage.set(entry.id, entry);
    }

    async saveRules(rules: readonly ServiceRule[], vehicleId: Identifier): Promise<void> {
        if (this.failure) throw this.failure;
        const kept = new Set(rules.map((rule) => rule.id));
        for (const [id, rule] of this.ruleStorage) {
            if (rule.vehicleId === vehicleId && !kept.has(id)) this.ruleStorage.delete(id);
        }
        for (const rule of rules) this.ruleStorage.set(rule.id, rule);
    }

    async deleteEntry(id: Identifier): Promise<void> {
        if (this.failure) throw this.failure;
        if (!this.entryStorage.delete(id)) throw RepositoryError.entryNotFound(id);
    }

    async deleteRule(id: Identifier): Promise<void> {
        if (this.failure) throw this.failure;
        if (!this.ruleStorage.delete(id)) throw RepositoryError.entryNotFound(id);
    }
}

export class FixedDateProvider implements DateProvider {
    constructor(
        readonly now: Date,
        readonly calendar: Calendar = Calendar.utc
    ) {}
}

export class FakeReminderScheduler implements ReminderScheduler {
    readonly scheduled: Map<Identifier, Reminder>;
    authorizationRequests = 0;

    constructor(
        pending: readonly Reminder[] = [],
        private readonly isAuthorized = true
    ) {
        this.scheduled = byId(pending);
    }

    async requestAuthorization(): Promise<boolean> {
        this.authorizationRequests += 1;
        return this.isAuthorized;
    }

    async schedule(reminder: Reminder): Promise<void> {
        this.scheduled.set(reminder.id, reminder);
    }

    async cancel(id: Identifier): Promise<void> {
        this.scheduled.delete(id);
    }

    async pendingIdentifiers(): Promise<Identifier[]> {
        return [...this.scheduled.keys()];
    }
}
