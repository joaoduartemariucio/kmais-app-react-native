import type { Identifier } from '../entities/Identifier';
import type { ServiceEntry } from '../entities/ServiceEntry';
import type { ServiceRule } from '../entities/ServiceRule';

export interface ServiceRepository {
    entries(vehicleId: Identifier): Promise<ServiceEntry[]>;
    rules(vehicleId: Identifier): Promise<ServiceRule[]>;
    save(entry: ServiceEntry): Promise<void>;
    saveRules(rules: readonly ServiceRule[], vehicleId: Identifier): Promise<void>;
    deleteEntry(id: Identifier): Promise<void>;
    deleteRule(id: Identifier): Promise<void>;
}
