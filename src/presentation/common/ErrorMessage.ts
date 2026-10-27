import { RepositoryError } from '@/domain/errors/RepositoryError';

import { t } from '../i18n/i18n';

export function errorMessage(error: unknown): string {
    if (error instanceof RepositoryError) {
        switch (error.reason.type) {
            case 'vehicleNotFound':
                return t('This vehicle no longer exists.');
            case 'entryNotFound':
                return t('This record no longer exists.');
            case 'persistenceFailed':
                return t('Could not save your changes.');
        }
    }
    return error instanceof Error ? error.message : String(error);
}
