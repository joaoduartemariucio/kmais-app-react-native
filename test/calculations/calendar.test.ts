import { Calendar } from '@/domain/entities/Calendar';
import { newIdentifier } from '@/domain/entities/Identifier';

import { day, utc } from './fixtures';

describe('Calendar', () => {
    test('adding months clamps the day to the end of a shorter month', () => {
        expect(utc.addingMonths(1, new Date(Date.UTC(2001, 0, 31, 10)))).toEqual(new Date(Date.UTC(2001, 1, 28, 10)));
        expect(utc.addingMonths(-2, new Date(Date.UTC(2001, 0, 15)))).toEqual(new Date(Date.UTC(2000, 10, 15)));
        expect(utc.addingMonths(12, day(0))).toEqual(day(365));
    });

    test('days between counts whole days and is negative backwards', () => {
        expect(utc.daysBetween(day(0), day(10))).toBe(10);
        expect(utc.daysBetween(day(10), day(0))).toBe(-10);
        expect(
            utc.daysBetween(new Date(day(0).getTime() + 10 * 3_600_000), new Date(day(1).getTime() + 9 * 3_600_000))
        ).toBe(0);
        expect(
            utc.daysBetween(new Date(day(1).getTime() + 9 * 3_600_000), new Date(day(0).getTime() + 10 * 3_600_000))
        ).toBe(0);
    });

    test('month interval starts on the first and ends on the next first', () => {
        const interval = utc.monthInterval(day(45));

        expect(interval.start).toEqual(day(31));
        expect(interval.end).toEqual(day(59));
        expect(utc.contains(interval, day(31))).toBe(true);
        expect(utc.contains(interval, day(59))).toBe(false);
    });

    test('the local calendar works in the device time zone', () => {
        const local = Calendar.current;
        const noon = new Date(2001, 4, 10, 12, 30);

        expect(local.startOfDay(noon)).toEqual(new Date(2001, 4, 10));
        expect(local.settingTime(9, 0, 0, noon)).toEqual(new Date(2001, 4, 10, 9));
        expect(local.addingDays(1, noon)).toEqual(new Date(2001, 4, 11, 12, 30));
        expect(local.monthStart(noon)).toEqual(new Date(2001, 4, 1));
    });

    test('identifiers are unique version 4 UUIDs', () => {
        const ids = new Set(Array.from({ length: 50 }, newIdentifier));

        expect(ids.size).toBe(50);
        for (const id of ids) {
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        }
    });
});
