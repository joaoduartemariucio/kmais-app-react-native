import { RepositoryError } from '@/domain/errors/RepositoryError';

import type { SqlDatabase } from '../database/SqlDatabase';

export async function persisting<Result>(work: () => Promise<Result>): Promise<Result> {
    try {
        return await work();
    } catch (error) {
        throw error instanceof RepositoryError ? error : RepositoryError.persistenceFailed(error);
    }
}

export async function vehicleExists(database: SqlDatabase, id: string): Promise<boolean> {
    return (await database.getFirst<{ id: string }>('SELECT id FROM vehicles WHERE id = ?', [id])) !== null;
}
