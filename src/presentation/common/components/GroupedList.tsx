import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../Palette';
import { Typography } from './Typography';

interface SectionProps {
    header?: ReactNode;
    footer?: ReactNode;
    plain?: boolean;
    children: ReactNode;
}

export function Section({ header, footer, plain = false, children }: SectionProps) {
    const theme = useTheme();
    const rows = Children.toArray(children).filter(Boolean);
    return (
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            {header !== undefined && (
                <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                    {typeof header === 'string' ? (
                        <Text style={[Typography.headline, { color: theme.secondaryLabel }]}>{header}</Text>
                    ) : (
                        header
                    )}
                </View>
            )}
            {plain ? (
                rows
            ) : (
                <View style={{ backgroundColor: theme.card, borderRadius: 26, overflow: 'hidden' }}>
                    {rows.map((row, index) => (
                        <Fragment key={index}>
                            {index > 0 && (
                                <View
                                    style={{
                                        height: 0.5,
                                        marginLeft: 20,
                                        marginRight: 20,
                                        backgroundColor: theme.separator
                                    }}
                                />
                            )}
                            {row}
                        </Fragment>
                    ))}
                </View>
            )}
            {footer !== undefined && (
                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    {typeof footer === 'string' ? (
                        <Text style={[Typography.footnote, { color: theme.secondaryLabel }]}>{footer}</Text>
                    ) : (
                        footer
                    )}
                </View>
            )}
        </View>
    );
}

interface RowProps {
    children: ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    style?: ViewStyle;
    accessibilityLabel?: string;
}

export function Row({ children, onPress, onLongPress, style, accessibilityLabel }: RowProps) {
    const theme = useTheme();
    const content = (
        <View style={[{ paddingHorizontal: 20, paddingVertical: 12, minHeight: 52 }, style]}>{children}</View>
    );
    if (!onPress && !onLongPress) return content;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => ({ backgroundColor: pressed ? theme.fill : theme.card })}
        >
            {content}
        </Pressable>
    );
}
