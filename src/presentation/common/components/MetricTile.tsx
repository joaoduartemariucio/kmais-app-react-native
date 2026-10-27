import { Text, View } from 'react-native';

import { t } from '../../i18n/i18n';
import { useTheme } from '../Palette';
import type { SymbolName } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

interface Props {
    title: string;
    value: string | null;
    caption?: string | null;
    symbol: SymbolName;
    tint: string;
}

export function MetricTile({ title, value, caption = null, symbol, tint }: Props) {
    const theme = useTheme();
    return (
        <View
            accessible
            style={{ flex: 1, minHeight: 72, padding: 12, gap: 6, borderRadius: 16, backgroundColor: theme.card }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SymbolIcon name={symbol} size={14} color={tint} />
                <Text
                    numberOfLines={1}
                    style={[Typography.caption, { fontWeight: '500', color: theme.secondaryLabel }]}
                >
                    {title}
                </Text>
            </View>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[
                    value === null ? Typography.subheadline : Typography.title3,
                    Typography.digits,
                    { color: value === null ? theme.secondaryLabel : theme.label }
                ]}
            >
                {value ?? t('Not enough data')}
            </Text>
            {caption !== null && (
                <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[Typography.caption2, { color: theme.secondaryLabel }]}
                >
                    {caption}
                </Text>
            )}
        </View>
    );
}
