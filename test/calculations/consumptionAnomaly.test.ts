import { Consumption } from '@/domain/calculations/Consumption';
import type { ConsumptionAnomalyKind } from '@/domain/calculations/ConsumptionAnomaly';
import type { FuelEntry } from '@/domain/entities/FuelEntry';

import { full, partial } from './fixtures';

const first = '00000000-0000-0000-0000-000000000001';

interface Scenario {
    name: string;
    records: FuelEntry[];
    expected: ConsumptionAnomalyKind[];
}

const scenarios: Scenario[] = [
    { name: 'empty history', records: [], expected: [] },
    {
        name: 'a consistent history yields no anomaly',
        records: [full(0, 1_000, 40), partial(5, 1_200, 20), full(10, 1_400, 20)],
        expected: []
    },
    {
        name: 'a backwards odometer',
        records: [full(0, 1_000, 40), full(10, 900, 40)],
        expected: [{ type: 'odometerWentBackwards', previous: 1_000 }]
    },
    {
        name: 'one isolated mistake does not taint the records that follow',
        records: [full(0, 1_000, 40), full(10, 900, 40), full(20, 1_100, 40)],
        expected: [{ type: 'odometerWentBackwards', previous: 1_000 }]
    },
    {
        name: 'zero liters',
        records: [full(0, 1_000, 40), full(10, 1_400, 0)],
        expected: [{ type: 'nonPositiveLiters' }]
    },
    {
        name: 'negative liters',
        records: [full(0, 1_000, 40), full(10, 1_400, -5)],
        expected: [{ type: 'nonPositiveLiters' }]
    },
    {
        name: 'an unchanged odometer with different data',
        records: [full(0, 1_000, 40), full(10, 1_000, 30)],
        expected: [{ type: 'odometerUnchanged', previous: 1_000 }]
    },
    {
        name: 'an identical duplicate from import or sync',
        records: [full(0, 1_000, 40, { id: first }), full(0, 1_000, 40)],
        expected: [{ type: 'duplicate', of: first }]
    },
    {
        name: 'one record can accumulate more than one anomaly',
        records: [full(0, 1_000, 40), full(10, 900, 0)],
        expected: [{ type: 'nonPositiveLiters' }, { type: 'odometerWentBackwards', previous: 1_000 }]
    }
];

describe('Consumption anomalies', () => {
    test.each(scenarios.map((scenario) => [scenario.name, scenario] as const))(
        'anomalies() per scenario: %s',
        (_, scenario) => {
            expect(Consumption.anomalies(scenario.records).map((anomaly) => anomaly.kind)).toEqual(scenario.expected);
        }
    );

    test('the anomaly points at the record that caused it', () => {
        const bad = full(10, 900, 40, { id: first });
        const anomalies = Consumption.anomalies([full(0, 1_000, 40), bad]);

        expect(anomalies).toHaveLength(1);
        expect(anomalies[0]?.record.id).toBe(first);
    });

    test('anomaly detection and calculation are independent passes', () => {
        const records = [full(0, 1_000, 40), full(10, 900, 40), full(20, 1_400, 50)];

        expect(Consumption.anomalies(records)).toHaveLength(1);
        expect(Consumption.intervals(records)).toHaveLength(1);
    });
});
