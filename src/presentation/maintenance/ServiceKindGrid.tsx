import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { serviceKinds, type ServiceKind } from '@/domain/entities/ServiceKind';

import { serviceKindLabel, serviceKindSymbol } from '../common/Display';
import { gridColumns, gridRows } from '../common/GridLayout';
import { useTheme } from '../common/Palette';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';

const minimumWidth = 96;
const spacing = 8;
const cellBox = { flex: 1, padding: 4 } as const;

export function ServiceKindGrid({
    selection,
    onChange
}: {
    selection: ServiceKind;
    onChange: (kind: ServiceKind) => void;
}) {
    const theme = useTheme();
    const [width, setWidth] = useState(0);
    const rows = width === 0 ? [] : gridRows(serviceKinds, gridColumns(width, minimumWidth, spacing));

    return (
        <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ gap: spacing }}>
            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', gap: spacing }}>
                    {row.map((kind, columnIndex) => {
                        if (kind === null) return <View key={`empty-${columnIndex}`} style={cellBox} />;
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
                                    ...cellBox,
                                    minHeight: 72,
                                    gap: 6,
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
            ))}
        </View>
    );
}
