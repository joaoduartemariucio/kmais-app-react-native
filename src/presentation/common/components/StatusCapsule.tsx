import { Text, View } from 'react-native';

import type { MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';

import { levelLabel, levelSymbol } from '../Display';
import { useTheme, withOpacity } from '../Palette';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

export function StatusCapsule({ level }: { level: MaintenanceLevel }) {
    const color = useTheme().levels[level];
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: withOpacity(color, 0.15)
            }}
        >
            <SymbolIcon name={levelSymbol(level)} size={12} color={color} />
            <Text style={[Typography.caption, { fontWeight: '600', color }]}>{levelLabel(level)}</Text>
        </View>
    );
}
