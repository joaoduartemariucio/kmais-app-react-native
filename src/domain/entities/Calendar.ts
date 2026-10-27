export type TimeZone = 'utc' | 'local';

export interface DateInterval {
    readonly start: Date;
    readonly end: Date;
}

interface Fields {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
}

const millisecondsPerDay = 86_400_000;

export class Calendar {
    static readonly utc = new Calendar('utc');
    static readonly current = new Calendar('local');

    constructor(readonly timeZone: TimeZone) {}

    startOfDay(date: Date): Date {
        const fields = this.fields(date);
        return this.date({ ...fields, hour: 0, minute: 0, second: 0, millisecond: 0 });
    }

    addingDays(days: number, to: Date): Date {
        const fields = this.fields(to);
        return this.date({ ...fields, day: fields.day + days });
    }

    addingMonths(months: number, to: Date): Date {
        const fields = this.fields(to);
        const total = fields.year * 12 + fields.month + months;
        const year = Math.floor(total / 12);
        const month = total - year * 12;
        const day = Math.min(fields.day, this.daysInMonth(year, month));
        return this.date({ ...fields, year, month, day });
    }

    settingTime(hour: number, minute: number, second: number, of: Date): Date {
        return this.date({ ...this.fields(of), hour, minute, second, millisecond: 0 });
    }

    daysBetween(from: Date, to: Date): number {
        if (to.getTime() < from.getTime()) {
            const days = this.daysBetween(to, from);
            return days === 0 ? 0 : -days;
        }
        let days = Math.floor((to.getTime() - from.getTime()) / millisecondsPerDay);
        while (days > 0 && this.addingDays(days, from).getTime() > to.getTime()) days -= 1;
        while (this.addingDays(days + 1, from).getTime() <= to.getTime()) days += 1;
        return days;
    }

    monthStart(date: Date): Date {
        const fields = this.fields(date);
        return this.date({ ...fields, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 });
    }

    monthInterval(date: Date): DateInterval {
        const start = this.monthStart(date);
        return { start, end: this.addingMonths(1, start) };
    }

    contains(interval: DateInterval, date: Date): boolean {
        return date.getTime() >= interval.start.getTime() && date.getTime() < interval.end.getTime();
    }

    private daysInMonth(year: number, month: number): number {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    private fields(date: Date): Fields {
        if (this.timeZone === 'utc') {
            return {
                year: date.getUTCFullYear(),
                month: date.getUTCMonth(),
                day: date.getUTCDate(),
                hour: date.getUTCHours(),
                minute: date.getUTCMinutes(),
                second: date.getUTCSeconds(),
                millisecond: date.getUTCMilliseconds()
            };
        }
        return {
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
            millisecond: date.getMilliseconds()
        };
    }

    private date(fields: Fields): Date {
        const { year, month, day, hour, minute, second, millisecond } = fields;
        if (this.timeZone === 'utc') {
            const utc = new Date(0);
            utc.setUTCFullYear(year, month, day);
            utc.setUTCHours(hour, minute, second, millisecond);
            return utc;
        }
        const local = new Date(0);
        local.setFullYear(year, month, day);
        local.setHours(hour, minute, second, millisecond);
        return local;
    }
}
