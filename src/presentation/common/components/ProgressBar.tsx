import { View } from 'react-native';

import { useTheme } from '../Palette';

export function ProgressBar({ value, tint }: { value: number; tint: string }) {
    const theme = useTheme();
    const clamped = Math.min(1, Math.max(0, value));
    return (
        <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
            style={{ height: 6, borderRadius: 3, backgroundColor: theme.fill, overflow: 'hidden' }}
        >
            <View
                style={{ width: `${clamped * 100}%`, minWidth: 6, height: 6, borderRadius: 3, backgroundColor: tint }}
            />
        </View>
    );
}
