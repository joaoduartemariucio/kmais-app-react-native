import { Text, View } from 'react-native';

import { formattedCurrency } from '../common/FormatStyles';
import { useTheme, withOpacity } from '../common/Palette';
import { Symbols, type SymbolName } from '../common/Symbols';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import { t } from '../i18n/i18n';
import type { GarageOverview } from './VehicleListViewModel';

function Chip({ text, symbol, tint }: { text: string; symbol: SymbolName; tint: string }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: withOpacity(tint, 0.12)
            }}
        >
            <SymbolIcon name={symbol} size={13} color={tint} />
            <Text numberOfLines={1} style={[Typography.caption, { fontWeight: '600', color: tint }]}>
                {text}
            </Text>
        </View>
    );
}

export function GarageOverviewCard({ overview }: { overview: GarageOverview }) {
    const theme = useTheme();
    const upToDate = overview.overdueCount === 0 && overview.dueSoonCount === 0;
    return (
        <View accessible style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 12 }}>
            <View style={{ gap: 2 }}>
                <Text style={[Typography.subheadline, { color: theme.secondaryLabel }]}>{t('Spent this month')}</Text>
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={[Typography.largeTitle, Typography.digits, { color: theme.label }]}
                >
                    {formattedCurrency(overview.spentThisMonth)}
                </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip
                    text={t('{{count}} vehicles', { count: overview.vehicleCount })}
                    symbol={Symbols.cars}
                    tint={theme.accent}
                />
                {overview.overdueCount > 0 && (
                    <Chip
                        text={t('{{count}} overdue', { count: overview.overdueCount })}
                        symbol={Symbols.overdue}
                        tint={theme.red}
                    />
                )}
                {overview.dueSoonCount > 0 && (
                    <Chip
                        text={t('{{count}} due soon', { count: overview.dueSoonCount })}
                        symbol={Symbols.clock}
                        tint={theme.orange}
                    />
                )}
                {upToDate && <Chip text={t('Maintenance up to date')} symbol={Symbols.seal} tint={theme.green} />}
            </View>
        </View>
    );
}
