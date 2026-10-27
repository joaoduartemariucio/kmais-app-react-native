import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import NativeSegmentedControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import type { ComponentType } from 'react';
import { Platform, Pressable, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';

import { formattedFullDate } from '../FormatStyles';
import { NumberInput, type NumberInputStyle } from '../NumberInput';
import { useTheme } from '../Palette';
import type { SymbolName } from '../Symbols';
import { Row } from './GroupedList';
import { keyboardDoneId } from './KeyboardDone';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

const SegmentedControl = NativeSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

interface LabeledNumberFieldProps {
    title: string;
    unit?: string;
    style: NumberInputStyle;
    value: string;
    onChange: (text: string) => void;
}

export function LabeledNumberField({ title, unit, style, value, onChange }: LabeledNumberFieldProps) {
    const theme = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
            <Text style={[Typography.body, { color: theme.label }]}>{title}</Text>
            <TextInput
                accessibilityLabel={title}
                value={value}
                placeholder={title}
                placeholderTextColor={theme.tertiaryLabel}
                keyboardType="number-pad"
                selection={{ start: value.length, end: value.length }}
                contextMenuHidden
                inputAccessoryViewID={keyboardDoneId}
                onChangeText={(text) => onChange(NumberInput.masked(text, value, style))}
                style={[
                    Typography.body,
                    Typography.digits,
                    { flex: 1, textAlign: 'right', color: theme.label, padding: 0 }
                ]}
            />
            {unit !== undefined && <Text style={[Typography.body, { color: theme.secondaryLabel }]}>{unit}</Text>}
        </View>
    );
}

interface TextFieldProps extends Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'multiline'> {
    placeholder: string;
    value: string;
    onChange: (text: string) => void;
    accessibilityLabel: string;
    minHeight?: number;
}

export function TextField({ placeholder, value, onChange, accessibilityLabel, minHeight, ...props }: TextFieldProps) {
    const theme = useTheme();
    return (
        <TextInput
            {...props}
            accessibilityLabel={accessibilityLabel}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={theme.tertiaryLabel}
            onChangeText={onChange}
            inputAccessoryViewID={keyboardDoneId}
            textAlignVertical={props.multiline ? 'top' : 'center'}
            style={[Typography.body, { color: theme.label, padding: 0, minHeight }]}
        />
    );
}

interface ToggleRowProps {
    title: string;
    symbol: SymbolName;
    value: boolean;
    onChange: (value: boolean) => void;
}

export function ToggleRow({ title, symbol, value, onChange }: ToggleRowProps) {
    const theme = useTheme();
    return (
        <Row style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SymbolIcon name={symbol} size={20} color={theme.accent} />
            <Text style={[Typography.body, { color: theme.label, flex: 1 }]}>{title}</Text>
            <Switch accessibilityLabel={title} value={value} onValueChange={onChange} />
        </Row>
    );
}

interface DateRowProps {
    title: string;
    value: Date;
    onChange: (date: Date) => void;
}

export function DateRow({ title, value, onChange }: DateRowProps) {
    const theme = useTheme();
    return (
        <Row style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[Typography.body, { color: theme.label }]}>{title}</Text>
            {Platform.OS === 'ios' ? (
                <DateTimePicker
                    accessibilityLabel={title}
                    value={value}
                    mode="date"
                    display="compact"
                    themeVariant={theme.scheme}
                    onChange={(_, date) => date && onChange(date)}
                />
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={title}
                    onPress={() =>
                        DateTimePickerAndroid.open({
                            value,
                            mode: 'date',
                            onChange: (_, date) => date && onChange(date)
                        })
                    }
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: theme.fill
                    }}
                >
                    <Text style={[Typography.body, { color: theme.label }]}>{formattedFullDate(value)}</Text>
                </Pressable>
            )}
        </Row>
    );
}

interface SegmentedPickerProps<Value extends string> {
    accessibilityLabel: string;
    values: readonly Value[];
    labels: readonly string[];
    selection: Value;
    onChange: (value: Value) => void;
}

export function SegmentedPicker<Value extends string>({
    accessibilityLabel,
    values,
    labels,
    selection,
    onChange
}: SegmentedPickerProps<Value>) {
    const theme = useTheme();
    return (
        <SegmentedControl
            accessibilityLabel={accessibilityLabel}
            values={[...labels]}
            selectedIndex={Math.max(0, values.indexOf(selection))}
            appearance={theme.scheme}
            style={{ height: 36 }}
            onChange={(event) => {
                const value = values[event.nativeEvent.selectedSegmentIndex];
                if (value !== undefined) onChange(value);
            }}
        />
    );
}
