import { Text, View } from 'react-native';

import { fuelTotalCost, type FuelEntry } from '@/domain/entities/FuelEntry';

import {
    formattedConsumption,
    formattedCurrency,
    formattedDay,
    formattedKilometers,
    formattedLiters,
    formattedPerLiter
} from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { SymbolBadge } from '../common/components/SymbolBadge';
import { Typography } from '../common/components/Typography';
import { t } from '../i18n/i18n';

function Tag({ text, color }: { text: string; color: string }) {
    const theme = useTheme();
    return (
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: theme.fill }}>
            <Text numberOfLines={1} style={[Typography.caption2, { fontWeight: '600', color }]}>
                {text}
            </Text>
        </View>
    );
}

export function FuelEntryRow({ entry, consumption = null }: { entry: FuelEntry; consumption?: number | null }) {
    const theme = useTheme();
    const secondary = [Typography.caption, Typography.digits, { color: theme.secondaryLabel }];
    return (
        <View accessible style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 2 }}>
            <SymbolBadge name={Symbols.fuelPump} tint={theme.fuel} />
            <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text style={[Typography.headline, Typography.digits, { color: theme.label }]}>
                        {formattedLiters(entry.liters)}
                    </Text>
                    <Text style={[Typography.caption, { color: theme.secondaryLabel, flex: 1 }]}>
                        {formattedPerLiter(entry.pricePerLiter)}
                    </Text>
                    <Text style={[Typography.headline, Typography.digits, { color: theme.label }]}>
                        {formattedCurrency(fuelTotalCost(entry))}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <Text style={secondary}>{formattedDay(entry.date)}</Text>
                    <Text style={[secondary, { flex: 1 }]}>{formattedKilometers(entry.odometer)}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {consumption !== null && <Tag text={formattedConsumption(consumption)} color={theme.fuel} />}
                        <Tag
                            text={entry.isFullTank ? t('Full tank') : t('Partial fill')}
                            color={theme.secondaryLabel}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}
