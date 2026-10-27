import { Decimal } from 'decimal.js';

import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import { serviceKinds, type ServiceKind } from '@/domain/entities/ServiceKind';
import type { ServiceRule } from '@/domain/entities/ServiceRule';

import type { SqlValue } from '../database/SqlDatabase';
import type { ServiceEntryRow, ServiceRuleRow } from './Rows';

function kind(value: string): ServiceKind {
    return (serviceKinds as readonly string[]).includes(value) ? (value as ServiceKind) : 'other';
}

export const ServiceMapper = {
    entry(row: ServiceEntryRow): ServiceEntry {
        return {
            id: row.id,
            vehicleId: row.vehicle_id,
            kind: kind(row.kind),
            date: new Date(row.date),
            odometer: row.odometer,
            cost: new Decimal(row.cost),
            notes: row.notes
        };
    },

    entryValues(entry: ServiceEntry): SqlValue[] {
        return [
            entry.id,
            entry.vehicleId,
            entry.kind,
            entry.date.getTime(),
            entry.odometer,
            entry.cost.toString(),
            entry.notes
        ];
    },

    rule(row: ServiceRuleRow): ServiceRule {
        return {
            id: row.id,
            vehicleId: row.vehicle_id,
            kind: kind(row.kind),
            kilometerInterval: row.kilometer_interval,
            monthInterval: row.month_interval
        };
    },

    ruleValues(rule: ServiceRule, vehicleId: string): SqlValue[] {
        return [rule.id, vehicleId, rule.kind, rule.kilometerInterval, rule.monthInterval];
    }
};
