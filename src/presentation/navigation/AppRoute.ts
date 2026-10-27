import type { Vehicle } from '@/domain/entities/Vehicle';

export const AppRoute = {
    vehicleList: '/',
    archivedVehicles: '/archived',
    vehicleDetail: (vehicle: Vehicle) => ({ pathname: '/vehicles/[id]', params: { id: vehicle.id } }) as const
} as const;
