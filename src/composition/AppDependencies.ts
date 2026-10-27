import { ExpoSqlDatabase } from '@/data/database/ExpoSqlDatabase';
import { KmaisSchema } from '@/data/database/KmaisSchema';
import type { SqlDatabase } from '@/data/database/SqlDatabase';
import { PreviewData } from '@/data/PreviewData';
import { SqliteFuelEntryRepository } from '@/data/repositories/SqliteFuelEntryRepository';
import { SqliteServiceRepository } from '@/data/repositories/SqliteServiceRepository';
import { SqliteVehicleRepository } from '@/data/repositories/SqliteVehicleRepository';
import { ExpoNotificationReminderScheduler } from '@/data/services/ExpoNotificationReminderScheduler';
import { SystemDateProvider } from '@/data/services/SystemDateProvider';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';
import type { DateProvider } from '@/domain/services/DateProvider';
import type { ReminderScheduler } from '@/domain/services/ReminderScheduler';
import { Log } from '@/presentation/common/Log';
import type { Dependencies } from '@/presentation/di/Dependencies';
import { ServiceReminderSync } from '@/presentation/reminders/ServiceReminderSync';

const databaseName = 'kmais.db';

export class AppDependencies implements Dependencies {
    readonly vehicleRepository: VehicleRepository;
    readonly fuelEntryRepository: FuelEntryRepository;
    readonly serviceRepository: ServiceRepository;
    readonly dateProvider: DateProvider;
    readonly reminderScheduler: ReminderScheduler;
    readonly reminderSync: ServiceReminderSync;

    private constructor(
        database: SqlDatabase,
        readonly isUsingFallbackStore: boolean
    ) {
        this.vehicleRepository = new SqliteVehicleRepository(database);
        this.fuelEntryRepository = new SqliteFuelEntryRepository(database);
        this.serviceRepository = new SqliteServiceRepository(database);
        this.dateProvider = new SystemDateProvider();
        this.reminderScheduler = new ExpoNotificationReminderScheduler();
        this.reminderSync = new ServiceReminderSync({
            vehicleRepository: this.vehicleRepository,
            fuelEntryRepository: this.fuelEntryRepository,
            serviceRepository: this.serviceRepository,
            scheduler: this.reminderScheduler,
            dateProvider: this.dateProvider
        });
    }

    static async create(database: SqlDatabase, isUsingFallbackStore = false): Promise<AppDependencies> {
        await KmaisSchema.migrate(database);
        return new AppDependencies(database, isUsingFallbackStore);
    }

    static async live(): Promise<AppDependencies> {
        try {
            return await AppDependencies.create(await ExpoSqlDatabase.open(databaseName));
        } catch (error) {
            Log.error('startup', 'On-disk store unavailable, falling back to memory', error);
            return AppDependencies.inMemory(true);
        }
    }

    static async inMemory(isUsingFallbackStore = false): Promise<AppDependencies> {
        return AppDependencies.create(await ExpoSqlDatabase.inMemory(), isUsingFallbackStore);
    }

    static async preview(): Promise<AppDependencies> {
        const dependencies = await AppDependencies.inMemory();
        await new PreviewData(dependencies.dateProvider.now).seed({
            vehicles: dependencies.vehicleRepository,
            fuel: dependencies.fuelEntryRepository,
            services: dependencies.serviceRepository
        });
        return dependencies;
    }

    static start(): Promise<AppDependencies> {
        return process.env.EXPO_PUBLIC_PREVIEW_DATA === 'true' ? AppDependencies.preview() : AppDependencies.live();
    }
}
