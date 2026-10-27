import { Text, View } from 'react-native';

import { useTheme } from '../Palette';
import { Typography } from './Typography';

export function Plate({ plate }: { plate: string }) {
    const theme = useTheme();
    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: theme.secondaryLabel,
                borderRadius: 4,
                paddingHorizontal: 5,
                paddingVertical: 1
            }}
        >
            <Text
                style={[Typography.caption2, { fontFamily: 'Menlo', fontWeight: '600', color: theme.secondaryLabel }]}
            >
                {plate}
            </Text>
        </View>
    );
}
