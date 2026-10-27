import { Text, View } from 'react-native';

import type { Vehicle } from '@/domain/entities/Vehicle';

import { vehicleKindLabel, vehicleKindSymbol } from '../common/Display';
import { formattedKilometers, formattedKilometersPerMonth } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { Plate } from '../common/components/Plate';
import { SymbolBadge } from '../common/components/SymbolBadge';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import type { VehicleStats } from './VehicleStats';

export function VehicleHeroCard({ vehicle, stats }: { vehicle: Vehicle; stats: VehicleStats }) {
    const theme = useTheme();
    return (
        <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 }}>
            <SymbolBadge name={vehicleKindSymbol(vehicle.kind)} tint={theme.accent} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>
                        {vehicleKindLabel(vehicle.kind)}
                    </Text>
                    {vehicle.plate !== null && <Plate plate={vehicle.plate} />}
                </View>
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={[Typography.title, Typography.digits, { color: theme.label }]}
                >
                    {formattedKilometers(stats.currentOdometer)}
                </Text>
                {stats.kilometersPerMonth !== null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <SymbolIcon name={Symbols.speedometer} size={13} color={theme.secondaryLabel} />
                        <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>
                            {formattedKilometersPerMonth(stats.kilometersPerMonth)}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}
