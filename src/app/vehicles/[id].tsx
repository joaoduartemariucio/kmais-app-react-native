import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import type { Vehicle } from '@/domain/entities/Vehicle';
import { Symbols } from '@/presentation/common/Symbols';
import { EmptyState } from '@/presentation/common/components/EmptyState';
import { useDependencies } from '@/presentation/di/Dependencies';
import { t } from '@/presentation/i18n/i18n';
import { VehicleDetailView } from '@/presentation/vehicles/VehicleDetailView';

type Lookup =
    | { readonly status: 'loading' }
    | { readonly status: 'found'; readonly vehicle: Vehicle }
    | { readonly status: 'missing' };

export default function VehicleDetailRoute() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { vehicleRepository } = useDependencies();
    const [lookup, setLookup] = useState<Lookup>({ status: 'loading' });

    useEffect(() => {
        vehicleRepository
            .vehicle(id)
            .then((vehicle) => setLookup(vehicle ? { status: 'found', vehicle } : { status: 'missing' }))
            .catch(() => setLookup({ status: 'missing' }));
    }, [id, vehicleRepository]);

    switch (lookup.status) {
        case 'loading':
            return <ActivityIndicator style={{ marginTop: 120 }} />;
        case 'missing':
            return (
                <EmptyState
                    title={t('Could not load this vehicle')}
                    symbol={Symbols.warning}
                    message={t('This vehicle no longer exists.')}
                />
            );
        case 'found':
            return <VehicleDetailView vehicle={lookup.vehicle} />;
    }
}
