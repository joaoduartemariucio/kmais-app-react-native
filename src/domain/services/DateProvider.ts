import type { Calendar } from '../entities/Calendar';

export interface DateProvider {
    readonly now: Date;
    readonly calendar: Calendar;
}
