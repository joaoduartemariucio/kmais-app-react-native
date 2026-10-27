import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { serviceKinds, type ServiceKind } from '@/domain/entities/ServiceKind';

import { serviceKindLabel, serviceKindSymbol } from '../common/Display';
import { useTheme } from '../common/Palette';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';

const minimumWidth = 96;
const spacing = 8;

export function ServiceKindGrid({
    selection,
    onChange
}: {
    selection: ServiceKind;
    onChange: (kind: ServiceKind) => void;
}) {
    const theme = useTheme();
    const [width, setWidth] = useState(0);
    const columns = Math.max(1, Math.floor((width + spacing) / (minimumWidth + spacing)));
    const itemWidth = width === 0 ? minimumWidth : (width - spacing * (columns - 1)) / columns;

    return (
        <View
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing }}
        >
            {serviceKinds.map((kind) => {
                const isSelected = kind === selection;
                const color = isSelected ? '#FFFFFF' : theme.label;
                return (
                    <Pressable
                        key={kind}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={serviceKindLabel(kind)}
                        onPress={() => {
                            if (kind !== selection) void Haptics.selectionAsync();
                            onChange(kind);
                        }}
                        style={{
                            width: itemWidth,
                            minHeight: 72,
                            gap: 6,
                            padding: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            backgroundColor: isSelected ? theme.service : theme.fill
                        }}
                    >
                        <SymbolIcon name={serviceKindSymbol(kind)} size={22} color={color} />
                        <Text
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                            style={[Typography.caption, { fontWeight: '500', color, textAlign: 'center' }]}
                        >
                            {serviceKindLabel(kind)}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
