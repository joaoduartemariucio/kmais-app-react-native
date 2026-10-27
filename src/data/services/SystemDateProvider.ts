import { Calendar } from '@/domain/entities/Calendar';
import type { DateProvider } from '@/domain/services/DateProvider';

export class SystemDateProvider implements DateProvider {
    readonly calendar = Calendar.current;

    get now(): Date {
        return new Date();
    }
}
