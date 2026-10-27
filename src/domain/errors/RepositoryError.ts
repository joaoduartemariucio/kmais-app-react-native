import type { Identifier } from '../entities/Identifier';

export type RepositoryErrorReason =
    | { readonly type: 'vehicleNotFound'; readonly id: Identifier }
    | { readonly type: 'entryNotFound'; readonly id: Identifier }
    | { readonly type: 'persistenceFailed'; readonly underlying: unknown };

export class RepositoryError extends Error {
    constructor(readonly reason: RepositoryErrorReason) {
        super(reason.type);
        this.name = 'RepositoryError';
    }

    static vehicleNotFound(id: Identifier): RepositoryError {
        return new RepositoryError({ type: 'vehicleNotFound', id });
    }

    static entryNotFound(id: Identifier): RepositoryError {
        return new RepositoryError({ type: 'entryNotFound', id });
    }

    static persistenceFailed(underlying: unknown): RepositoryError {
        return new RepositoryError({ type: 'persistenceFailed', underlying });
    }
}
