import type { Identifier } from '../entities/Identifier';

export interface Reminder {
    readonly id: Identifier;
    readonly title: string;
    readonly body: string;
    readonly fireDate: Date;
}

export interface ReminderScheduler {
    requestAuthorization(): Promise<boolean>;
    schedule(reminder: Reminder): Promise<void>;
    cancel(id: Identifier): Promise<void>;
    pendingIdentifiers(): Promise<Identifier[]>;
}
