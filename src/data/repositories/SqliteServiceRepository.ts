import type { Identifier } from '@/domain/entities/Identifier';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceRule } from '@/domain/entities/ServiceRule';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';

import type { SqlDatabase } from '../database/SqlDatabase';
import type { ServiceEntryRow, ServiceRuleRow } from '../mappers/Rows';
import { ServiceMapper } from '../mappers/ServiceMapper';
import { persisting, vehicleExists } from './RepositorySupport';

export class SqliteServiceRepository implements ServiceRepository {
    constructor(private readonly database: SqlDatabase) {}

    entries(vehicleId: Identifier): Promise<ServiceEntry[]> {
        return persisting(async () => {
            const rows = await this.database.getAll<ServiceEntryRow>(
                'SELECT * FROM service_entries WHERE vehicle_id = ? ORDER BY date, odometer',
                [vehicleId]
            );
            return rows.map(ServiceMapper.entry);
        });
    }

    rules(vehicleId: Identifier): Promise<ServiceRule[]> {
        return persisting(async () => {
            const rows = await this.database.getAll<ServiceRuleRow>(
                'SELECT * FROM service_rules WHERE vehicle_id = ?',
                [vehicleId]
            );
            return rows.map(ServiceMapper.rule);
        });
    }

    save(entry: ServiceEntry): Promise<void> {
        return persisting(async () => {
            const existing = await this.database.getFirst<{ id: string }>(
                'SELECT id FROM service_entries WHERE id = ?',
                [entry.id]
            );
            if (existing) {
                await this.database.run(
                    'UPDATE service_entries SET kind = ?, date = ?, odometer = ?, cost = ?, notes = ? WHERE id = ?',
                    [...ServiceMapper.entryValues(entry).slice(2), entry.id]
                );
                return;
            }
            if (!(await vehicleExists(this.database, entry.vehicleId))) {
                throw RepositoryError.vehicleNotFound(entry.vehicleId);
            }
            await this.database.run(
                `INSERT INTO service_entries (id, vehicle_id, kind, date, odometer, cost, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ServiceMapper.entryValues(entry)
            );
        });
    }

    saveRules(rules: readonly ServiceRule[], vehicleId: Identifier): Promise<void> {
        return persisting(async () => {
            if (!(await vehicleExists(this.database, vehicleId))) {
                throw RepositoryError.vehicleNotFound(vehicleId);
            }
            await this.database.transaction(async () => {
                const kept = rules.map((rule) => rule.id);
                await this.database.run(
                    `DELETE FROM service_rules WHERE vehicle_id = ? AND id NOT IN (${kept.map(() => '?').join(', ')})`,
                    [vehicleId, ...kept]
                );
                for (const rule of rules) {
                    await this.database.run(
                        `INSERT INTO service_rules (id, vehicle_id, kind, kilometer_interval, month_interval)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT (id) DO UPDATE SET
                            kind = excluded.kind,
                            kilometer_interval = excluded.kilometer_interval,
                            month_interval = excluded.month_interval`,
                        ServiceMapper.ruleValues(rule, vehicleId)
                    );
                }
            });
        });
    }

    deleteEntry(id: Identifier): Promise<void> {
        return persisting(async () => {
            const result = await this.database.run('DELETE FROM service_entries WHERE id = ?', [id]);
            if (result.changes === 0) throw RepositoryError.entryNotFound(id);
        });
    }

    deleteRule(id: Identifier): Promise<void> {
        return persisting(async () => {
            const result = await this.database.run('DELETE FROM service_rules WHERE id = ?', [id]);
            if (result.changes === 0) throw RepositoryError.entryNotFound(id);
        });
    }
}
