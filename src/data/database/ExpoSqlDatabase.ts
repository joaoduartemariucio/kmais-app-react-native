import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { SqlDatabase, SqlRunResult, SqlValue } from './SqlDatabase';

export class ExpoSqlDatabase implements SqlDatabase {
    private constructor(private readonly database: SQLiteDatabase) {}

    static async open(name: string): Promise<ExpoSqlDatabase> {
        return new ExpoSqlDatabase(await openDatabaseAsync(name));
    }

    static inMemory(): Promise<ExpoSqlDatabase> {
        return ExpoSqlDatabase.open(':memory:');
    }

    async exec(sql: string): Promise<void> {
        await this.database.execAsync(sql);
    }

    async run(sql: string, params: readonly SqlValue[] = []): Promise<SqlRunResult> {
        const result = await this.database.runAsync(sql, [...params]);
        return { changes: result.changes };
    }

    getAll<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
        return this.database.getAllAsync<Row>(sql, [...params]);
    }

    getFirst<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> {
        return this.database.getFirstAsync<Row>(sql, [...params]);
    }

    transaction(work: () => Promise<void>): Promise<void> {
        return this.database.withTransactionAsync(work);
    }
}
