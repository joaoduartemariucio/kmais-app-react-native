export type SqlValue = string | number | null;

export interface SqlRunResult {
    readonly changes: number;
}

export interface SqlDatabase {
    exec(sql: string): Promise<void>;
    run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult>;
    getAll<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
    getFirst<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row | null>;
    transaction(work: () => Promise<void>): Promise<void>;
}
