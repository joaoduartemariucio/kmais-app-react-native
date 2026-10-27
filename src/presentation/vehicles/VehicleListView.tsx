import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import type { Vehicle } from '@/domain/entities/Vehicle';

import { showActionMenu } from '../common/ActionMenu';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { EmptyState } from '../common/components/EmptyState';
import { Row, Section } from '../common/components/GroupedList';
import { HeaderButton } from '../common/components/HeaderButton';
import { ProminentButton } from '../common/components/ProminentButton';
import { SwipeableRow, type SwipeAction } from '../common/components/SwipeableRow';
import { useDependencies } from '../di/Dependencies';
import { t } from '../i18n/i18n';
import { AppRoute } from '../navigation/AppRoute';
import { GarageOverviewCard } from './GarageOverviewCard';
import { VehicleCard } from './VehicleCard';
import { VehicleFormView } from './VehicleFormView';
import { VehicleListViewModel, type VehicleListRow, type VehicleListScope } from './VehicleListViewModel';

type Sheet = { readonly type: 'create' } | { readonly type: 'edit'; readonly vehicle: Vehicle };

export const VehicleListView = observer(function VehicleListView({ scope }: { scope: VehicleListScope }) {
    const dependencies = useDependencies();
    const theme = useTheme();
    const router = useRouter();
    const [viewModel] = useState(
        () => new VehicleListViewModel(scope, { ...dependencies, reminders: dependencies.reminderSync })
    );
    const [sheet, setSheet] = useState<Sheet | null>(null);
    const [isRefreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            void viewModel.load();
        }, [viewModel])
    );

    const refresh = async () => {
        setRefreshing(true);
        await viewModel.load();
        setRefreshing(false);
    };

    const archiveAction = (vehicle: Vehicle): SwipeAction =>
        scope === 'active'
            ? {
                  title: t('Archive'),
                  symbol: Symbols.archive,
                  color: theme.orange,
                  onPress: () => void viewModel.setArchived(true, vehicle)
              }
            : {
                  title: t('Unarchive'),
                  symbol: Symbols.unarchive,
                  color: theme.blue,
                  onPress: () => void viewModel.setArchived(false, vehicle)
              };

    const editAction = (vehicle: Vehicle): SwipeAction => ({
        title: t('Edit'),
        symbol: Symbols.pencil,
        color: theme.accent,
        onPress: () => setSheet({ type: 'edit', vehicle })
    });

    const vehicleRow = (row: VehicleListRow) => {
        const archive = archiveAction(row.vehicle);
        const edit = editAction(row.vehicle);
        return (
            <SwipeableRow key={row.id} leading={[edit]} trailing={[archive]}>
                <View style={{ backgroundColor: theme.card }}>
                    <Row
                        accessibilityLabel={row.vehicle.name}
                        onPress={() => router.push(AppRoute.vehicleDetail(row.vehicle))}
                        onLongPress={() => showActionMenu(row.vehicle.name, [edit, archive])}
                    >
                        <VehicleCard row={row} />
                    </Row>
                </View>
            </SwipeableRow>
        );
    };

    const content = () => {
        const { state } = viewModel;
        switch (state.status) {
            case 'loading':
                return <ActivityIndicator style={{ marginTop: 40 }} />;
            case 'failed':
                return (
                    <EmptyState title={t('Could not load vehicles')} symbol={Symbols.warning} message={state.message} />
                );
            case 'loaded':
                if (state.rows.length === 0) {
                    return scope === 'active' ? (
                        <EmptyState
                            title={t('No vehicles yet')}
                            symbol={Symbols.car}
                            message={t('Add your car or motorcycle to start tracking fuel and services.')}
                            action={
                                <ProminentButton
                                    title={t('Add vehicle')}
                                    symbol={Symbols.plus}
                                    tint={theme.accent}
                                    onPress={() => setSheet({ type: 'create' })}
                                />
                            }
                        />
                    ) : (
                        <EmptyState
                            title={t('Nothing archived')}
                            symbol={Symbols.archive}
                            message={t('Vehicles you archive show up here.')}
                        />
                    );
                }
                return (
                    <>
                        {scope === 'active' && viewModel.overview !== null && (
                            <Section>
                                <GarageOverviewCard overview={viewModel.overview} />
                            </Section>
                        )}
                        <Section>{state.rows.map(vehicleRow)}</Section>
                    </>
                );
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: scope === 'active' ? t('Vehicles') : t('Archived'),
                    headerLargeTitle: true,
                    headerRight:
                        scope === 'active'
                            ? () => (
                                  <HeaderButton
                                      symbol={Symbols.plus}
                                      accessibilityLabel={t('Add vehicle')}
                                      onPress={() => setSheet({ type: 'create' })}
                                  />
                              )
                            : undefined,
                    headerLeft:
                        scope === 'active'
                            ? () => (
                                  <HeaderButton
                                      symbol={Symbols.archive}
                                      accessibilityLabel={t('Archived')}
                                      onPress={() => router.push(AppRoute.archivedVehicles)}
                                  />
                              )
                            : undefined
                }}
            />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ backgroundColor: theme.background }}
                contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
            >
                {content()}
            </ScrollView>
            {sheet !== null && (
                <VehicleFormView
                    mode={sheet.type === 'create' ? { type: 'create' } : { type: 'edit', vehicle: sheet.vehicle }}
                    onSaved={() => void viewModel.load()}
                    onDismiss={() => setSheet(null)}
                />
            )}
        </>
    );
});
