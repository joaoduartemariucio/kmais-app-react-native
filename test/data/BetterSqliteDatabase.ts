import Database from 'better-sqlite3';

import type { SqlDatabase, SqlRunResult, SqlValue } from '@/data/database/SqlDatabase';

export class BetterSqliteDatabase implements SqlDatabase {
    readonly database = new Database(':memory:');

    async exec(sql: string): Promise<void> {
        this.database.exec(sql);
    }

    async run(sql: string, params: readonly SqlValue[] = []): Promise<SqlRunResult> {
        return { changes: this.database.prepare(sql).run(...params).changes };
    }

    async getAll<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
        return this.database.prepare(sql).all(...params) as Row[];
    }

    async getFirst<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> {
        return (this.database.prepare(sql).get(...params) as Row | undefined) ?? null;
    }

    async transaction(work: () => Promise<void>): Promise<void> {
        this.database.exec('BEGIN');
        try {
            await work();
            this.database.exec('COMMIT');
        } catch (error) {
            this.database.exec('ROLLBACK');
            throw error;
        }
    }
}
