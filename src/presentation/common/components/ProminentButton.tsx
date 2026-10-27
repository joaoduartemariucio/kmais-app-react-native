import { Pressable, Text } from 'react-native';

import type { SymbolName } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

interface Props {
    title: string;
    symbol: SymbolName;
    tint: string;
    onPress: () => void;
    grow?: boolean;
}

export function ProminentButton({ title, symbol, tint, onPress, grow = false }: Props) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={onPress}
            style={({ pressed }) => ({
                flex: grow ? 1 : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderRadius: 999,
                backgroundColor: tint,
                opacity: pressed ? 0.8 : 1
            })}
        >
            <SymbolIcon name={symbol} size={17} color="#FFFFFF" />
            <Text style={[Typography.headline, { color: '#FFFFFF' }]}>{title}</Text>
        </Pressable>
    );
}
