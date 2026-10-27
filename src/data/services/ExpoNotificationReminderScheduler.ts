import {
    AndroidImportance,
    cancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync,
    requestPermissionsAsync,
    scheduleNotificationAsync,
    SchedulableTriggerInputTypes,
    setNotificationChannelAsync
} from 'expo-notifications';

import type { Identifier } from '@/domain/entities/Identifier';
import type { Reminder, ReminderScheduler } from '@/domain/services/ReminderScheduler';

const channelId = 'service-reminders';

export class ExpoNotificationReminderScheduler implements ReminderScheduler {
    async requestAuthorization(): Promise<boolean> {
        await setNotificationChannelAsync(channelId, {
            name: 'Service reminders',
            importance: AndroidImportance.DEFAULT
        });
        const permissions = await requestPermissionsAsync({
            ios: { allowAlert: true, allowSound: true, allowBadge: true }
        });
        return permissions.granted;
    }

    async schedule(reminder: Reminder): Promise<void> {
        await scheduleNotificationAsync({
            identifier: reminder.id,
            content: { title: reminder.title, body: reminder.body, sound: true },
            trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminder.fireDate, channelId }
        });
    }

    async cancel(id: Identifier): Promise<void> {
        await cancelScheduledNotificationAsync(id);
    }

    async pendingIdentifiers(): Promise<Identifier[]> {
        const pending = await getAllScheduledNotificationsAsync();
        return pending.map((request) => request.identifier);
    }
}
