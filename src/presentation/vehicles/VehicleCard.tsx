import { Text, View } from 'react-native';

import { MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';

import { serviceKindLabel, serviceKindSymbol, vehicleKindLabel, vehicleKindSymbol } from '../common/Display';
import { formattedConsumption, formattedKilometers, formattedPerKilometer } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { Plate } from '../common/components/Plate';
import { StatusCapsule } from '../common/components/StatusCapsule';
import { SymbolBadge } from '../common/components/SymbolBadge';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import { t } from '../i18n/i18n';
import type { VehicleListRow } from './VehicleListViewModel';
import { relativeDue } from './VehicleStats';

function Figure({ value, caption }: { value: string | null; caption: string }) {
    const theme = useTheme();
    return (
        <View style={{ flex: 1, gap: 2 }}>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[Typography.subheadline, Typography.digits, { fontWeight: '600', color: theme.label }]}
            >
                {value ?? '—'}
            </Text>
            <Text numberOfLines={1} style={[Typography.caption2, { color: theme.secondaryLabel }]}>
                {caption}
            </Text>
        </View>
    );
}

export function VehicleCard({ row }: { row: VehicleListRow }) {
    const theme = useTheme();
    const { vehicle, stats } = row;
    const next = stats.nextDue;
    const level = stats.attentionLevel;
    return (
        <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, gap: 14, paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <SymbolBadge name={vehicleKindSymbol(vehicle.kind)} tint={theme.accent} size={44} />
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={[Typography.headline, { color: theme.label }]}>
                            {vehicle.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>
                                {vehicleKindLabel(vehicle.kind)}
                            </Text>
                            {vehicle.plate !== null && <Plate plate={vehicle.plate} />}
                        </View>
                    </View>
                    {level !== null && level !== MaintenanceLevel.OnTrack && <StatusCapsule level={level} />}
                </View>

                <View style={{ flexDirection: 'row' }}>
                    <Figure value={formattedKilometers(stats.currentOdometer)} caption={t('Odometer')} />
                    <Figure
                        value={
                            stats.averageConsumption === null ? null : formattedConsumption(stats.averageConsumption)
                        }
                        caption={t('Consumption')}
                    />
                    <Figure
                        value={
                            stats.cost.costPerKilometer === null
                                ? null
                                : formattedPerKilometer(stats.cost.costPerKilometer)
                        }
                        caption={t('Cost per km')}
                    />
                </View>

                {next !== null && (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: theme.fill
                        }}
                    >
                        <SymbolIcon
                            name={serviceKindSymbol(next.due.rule.kind)}
                            size={15}
                            color={theme.levels[next.status.level]}
                        />
                        <Text style={[Typography.footnote, { fontWeight: '500', color: theme.label, flex: 1 }]}>
                            {serviceKindLabel(next.due.rule.kind)}
                        </Text>
                        <Text
                            style={[
                                Typography.footnote,
                                {
                                    color:
                                        next.status.level === MaintenanceLevel.OnTrack
                                            ? theme.secondaryLabel
                                            : theme.levels[next.status.level]
                                }
                            ]}
                        >
                            {relativeDue(next)}
                        </Text>
                    </View>
                )}
            </View>
            <SymbolIcon name={Symbols.chevron} size={13} color={theme.tertiaryLabel} />
        </View>
    );
}
