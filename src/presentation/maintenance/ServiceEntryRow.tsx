import { Text, View } from 'react-native';

import type { ServiceEntry } from '@/domain/entities/ServiceEntry';

import { serviceKindLabel, serviceKindSymbol } from '../common/Display';
import { formattedCurrency, formattedDay, formattedKilometers } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { SymbolBadge } from '../common/components/SymbolBadge';
import { Typography } from '../common/components/Typography';

export function ServiceEntryRow({ entry }: { entry: ServiceEntry }) {
    const theme = useTheme();
    const secondary = [Typography.caption, Typography.digits, { color: theme.secondaryLabel }];
    return (
        <View accessible style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 2 }}>
            <SymbolBadge name={serviceKindSymbol(entry.kind)} tint={theme.service} />
            <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text style={[Typography.headline, { color: theme.label, flex: 1 }]}>
                        {serviceKindLabel(entry.kind)}
                    </Text>
                    <Text style={[Typography.headline, Typography.digits, { color: theme.label }]}>
                        {formattedCurrency(entry.cost)}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={secondary}>{formattedDay(entry.date)}</Text>
                    <Text style={secondary}>{formattedKilometers(entry.odometer)}</Text>
                </View>
                {entry.notes.length > 0 && (
                    <Text numberOfLines={2} style={[Typography.caption, { color: theme.secondaryLabel }]}>
                        {entry.notes}
                    </Text>
                )}
            </View>
        </View>
    );
}
