import { Pressable } from 'react-native';

import { useTheme } from '../Palette';
import type { SymbolName } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';

interface Props {
    symbol: SymbolName;
    accessibilityLabel: string;
    onPress: () => void;
}

export function HeaderButton({ symbol, accessibilityLabel, onPress }: Props) {
    const theme = useTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={8}
            onPress={onPress}
            style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}
        >
            <SymbolIcon name={symbol} size={20} color={theme.label} />
        </Pressable>
    );
}
