import { View } from 'react-native';

import { withOpacity } from '../Palette';
import type { SymbolName } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';

interface Props {
    name: SymbolName;
    tint: string;
    size?: number;
}

export function SymbolBadge({ name, tint, size = 36 }: Props) {
    return (
        <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.3,
                backgroundColor: withOpacity(tint, 0.15),
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <SymbolIcon name={name} size={size * 0.5} color={tint} />
        </View>
    );
}
