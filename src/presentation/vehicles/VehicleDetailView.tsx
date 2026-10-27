import { Stack, useFocusEffect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FuelEntry } from '@/domain/entities/FuelEntry';
import type { ServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceRule } from '@/domain/entities/ServiceRule';
import type { Vehicle } from '@/domain/entities/Vehicle';

import { formattedCurrency, formattedMonthAndYear } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { EmptyState } from '../common/components/EmptyState';
import { SegmentedPicker } from '../common/components/FormFields';
import { Row, Section } from '../common/components/GroupedList';
import { HeaderButton } from '../common/components/HeaderButton';
import { ProminentButton } from '../common/components/ProminentButton';
import { SwipeableRow } from '../common/components/SwipeableRow';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import { useDependencies } from '../di/Dependencies';
import { FuelEntryFormView } from '../fueling/FuelEntryFormView';
import { FuelEntryRow } from '../fueling/FuelEntryRow';
import { t } from '../i18n/i18n';
import { ServiceEntryFormView } from '../maintenance/ServiceEntryFormView';
import { ServiceEntryRow } from '../maintenance/ServiceEntryRow';
import { ConsumptionChartCard } from './ConsumptionChartCard';
import { ServiceDueRow } from './ServiceDueRow';
import { SpendingChartCard } from './SpendingChartCard';
import { VehicleDetailViewModel, type VehicleDetailContent } from './VehicleDetailViewModel';
import { VehicleFormView } from './VehicleFormView';
import { VehicleHeroCard } from './VehicleHeroCard';
import { VehicleSummaryCard } from './VehicleSummaryCard';
import { filterLabel, itemId, timelineFilters, type TimelineItem } from './VehicleTimeline';

type Sheet =
    | { readonly type: 'newFuel' }
    | { readonly type: 'newService' }
    | { readonly type: 'editFuel'; readonly entry: FuelEntry }
    | { readonly type: 'editService'; readonly entry: ServiceEntry }
    | { readonly type: 'editVehicle'; readonly rules: readonly ServiceRule[] };

const bottomBarHeight = 72;

export const VehicleDetailView = observer(function VehicleDetailView({ vehicle }: { vehicle: Vehicle }) {
    const dependencies = useDependencies();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [viewModel] = useState(
        () => new VehicleDetailViewModel(vehicle, { ...dependencies, reminders: dependencies.reminderSync })
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

    const reload = () => void viewModel.load();
    const dismiss = () => setSheet(null);

    const sheetContent = (current: Sheet) => {
        switch (current.type) {
            case 'newFuel':
                return (
                    <FuelEntryFormView
                        mode={{ type: 'create', vehicleId: vehicle.id }}
                        otherReadings={viewModel.odometerReadings()}
                        suggestedPrice={viewModel.lastPricePerLiter}
                        onSaved={reload}
                        onDismiss={dismiss}
                    />
                );
            case 'editFuel':
                return (
                    <FuelEntryFormView
                        mode={{ type: 'edit', entry: current.entry }}
                        otherReadings={viewModel.odometerReadings({ type: 'fuel', entry: current.entry })}
                        onSaved={reload}
                        onDismiss={dismiss}
                    />
                );
            case 'newService':
                return (
                    <ServiceEntryFormView
                        mode={{ type: 'create', vehicleId: vehicle.id }}
                        otherReadings={viewModel.odometerReadings()}
                        onSaved={reload}
                        onDismiss={dismiss}
                    />
                );
            case 'editService':
                return (
                    <ServiceEntryFormView
                        mode={{ type: 'edit', entry: current.entry }}
                        otherReadings={viewModel.odometerReadings({ type: 'service', entry: current.entry })}
                        onSaved={reload}
                        onDismiss={dismiss}
                    />
                );
            case 'editVehicle':
                return (
                    <VehicleFormView
                        mode={{ type: 'edit', vehicle }}
                        existingRules={current.rules}
                        onSaved={reload}
                        onDismiss={dismiss}
                    />
                );
        }
    };

    const dashboard = (content: VehicleDetailContent) => (
        <>
            <Section>
                <Row>
                    <VehicleHeroCard vehicle={vehicle} stats={content.stats} />
                </Row>
            </Section>

            <Section plain>
                <VehicleSummaryCard stats={content.stats} />
            </Section>

            <Section header={t('Maintenance')}>
                {content.stats.dues.length === 0 ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => setSheet({ type: 'editVehicle', rules: content.rules })}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingHorizontal: 20,
                            minHeight: 52
                        }}
                    >
                        <SymbolIcon name={Symbols.bell} size={18} color={theme.accent} />
                        <Text style={[Typography.body, { color: theme.accent }]}>{t('Set up service reminders')}</Text>
                    </Pressable>
                ) : (
                    content.stats.dues.map((item) => (
                        <Row key={item.id}>
                            <ServiceDueRow item={item} />
                        </Row>
                    ))
                )}
            </Section>

            {content.stats.consumptionHistory.length >= 2 && (
                <Section>
                    <Row>
                        <ConsumptionChartCard
                            intervals={content.stats.consumptionHistory}
                            average={content.stats.averageConsumption}
                        />
                    </Row>
                </Section>
            )}

            {content.spending.some((month) => month.total.greaterThan(0)) && (
                <Section>
                    <Row>
                        <SpendingChartCard months={content.spending} />
                    </Row>
                </Section>
            )}
        </>
    );

    const historyRow = (item: TimelineItem, content: VehicleDetailContent) => (
        <SwipeableRow
            key={itemId(item)}
            trailing={[
                {
                    title: t('Delete'),
                    symbol: Symbols.trash,
                    color: theme.red,
                    onPress: () => void viewModel.delete(item)
                }
            ]}
        >
            <View style={{ backgroundColor: theme.card }}>
                <Row
                    onPress={() =>
                        setSheet(
                            item.type === 'fuel'
                                ? { type: 'editFuel', entry: item.entry }
                                : { type: 'editService', entry: item.entry }
                        )
                    }
                >
                    {item.type === 'fuel' ? (
                        <FuelEntryRow
                            entry={item.entry}
                            consumption={content.stats.consumptionByEntry.get(item.entry.id) ?? null}
                        />
                    ) : (
                        <ServiceEntryRow entry={item.entry} />
                    )}
                </Row>
            </View>
        </SwipeableRow>
    );

    const history = (content: VehicleDetailContent) => {
        if (!viewModel.hasHistory) {
            return (
                <Section>
                    <EmptyState
                        title={t('No history yet')}
                        symbol={Symbols.history}
                        message={t('Log a fuel-up or a service to see it here.')}
                    />
                </Section>
            );
        }
        return (
            <>
                <Section header={t('History')} plain>
                    <SegmentedPicker
                        accessibilityLabel={t('Show')}
                        values={timelineFilters}
                        labels={timelineFilters.map(filterLabel)}
                        selection={viewModel.filter}
                        onChange={viewModel.setFilter}
                    />
                </Section>
                {viewModel.visibleSections.map((section) => (
                    <Section
                        key={section.month.getTime()}
                        header={
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text
                                    style={[Typography.subheadline, { fontWeight: '600', color: theme.secondaryLabel }]}
                                >
                                    {formattedMonthAndYear(section.month)}
                                </Text>
                                <Text
                                    style={[
                                        Typography.subheadline,
                                        Typography.digits,
                                        { fontWeight: '600', color: theme.secondaryLabel }
                                    ]}
                                >
                                    {formattedCurrency(section.total)}
                                </Text>
                            </View>
                        }
                    >
                        {section.items.map((item) => historyRow(item, content))}
                    </Section>
                ))}
            </>
        );
    };

    const body = () => {
        const { state } = viewModel;
        switch (state.status) {
            case 'loading':
                return <ActivityIndicator style={{ marginTop: 40 }} />;
            case 'failed':
                return (
                    <EmptyState
                        title={t('Could not load this vehicle')}
                        symbol={Symbols.warning}
                        message={state.message}
                    />
                );
            case 'loaded':
                return (
                    <>
                        {dashboard(state.content)}
                        {history(state.content)}
                    </>
                );
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: vehicle.name,
                    headerLargeTitle: true,
                    headerRight: () => (
                        <HeaderButton
                            symbol={Symbols.pencil}
                            accessibilityLabel={t('Edit vehicle')}
                            onPress={() => setSheet({ type: 'editVehicle', rules: viewModel.rules })}
                        />
                    )
                }}
            />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ backgroundColor: theme.background }}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingTop: 8,
                    paddingBottom: bottomBarHeight + insets.bottom + 16
                }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
            >
                {body()}
            </ScrollView>
            <View
                style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    bottom: insets.bottom + 8,
                    flexDirection: 'row',
                    gap: 12
                }}
            >
                <ProminentButton
                    grow
                    title={t('Fuel-up')}
                    symbol={Symbols.fuelPump}
                    tint={theme.fuel}
                    onPress={() => setSheet({ type: 'newFuel' })}
                />
                <ProminentButton
                    grow
                    title={t('Service')}
                    symbol={Symbols.wrench}
                    tint={theme.service}
                    onPress={() => setSheet({ type: 'newService' })}
                />
            </View>
            {sheet !== null && sheetContent(sheet)}
        </>
    );
});
