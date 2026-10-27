import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../Palette';
import type { SymbolName } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

interface Props {
    title: string;
    symbol: SymbolName;
    message: string;
    action?: ReactNode;
}

export function EmptyState({ title, symbol, message, action }: Props) {
    const theme = useTheme();
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, flexGrow: 1 }}>
            <SymbolIcon name={symbol} size={44} color={theme.secondaryLabel} />
            <Text style={[Typography.title3, { color: theme.label, fontWeight: '700', textAlign: 'center' }]}>
                {title}
            </Text>
            <Text style={[Typography.subheadline, { color: theme.secondaryLabel, textAlign: 'center' }]}>
                {message}
            </Text>
            {action}
        </View>
    );
}
