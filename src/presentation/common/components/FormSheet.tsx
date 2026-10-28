import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../../i18n/i18n';
import type { FormState } from '../FormState';
import { ElevationContext, useTheme } from '../Palette';
import { KeyboardDone } from './KeyboardDone';
import { Typography } from './Typography';

interface Props {
    title: string;
    state: FormState;
    canSave: boolean;
    onSave: () => void;
    onCancel: () => void;
    children: ReactNode;
}

function SheetHeader({ title, state, canSave, onSave, onCancel }: Omit<Props, 'children'>) {
    const theme = useTheme();
    const capsule = { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.fill };
    return (
        <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
            <Pressable accessibilityRole="button" onPress={onCancel} style={capsule}>
                <Text style={[Typography.body, { color: theme.label }]}>{t('Cancel')}</Text>
            </Pressable>
            <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={[Typography.headline, { flex: 1, textAlign: 'center', color: theme.label }]}
            >
                {title}
            </Text>
            {state.status === 'saving' ? (
                <View style={[capsule, { minWidth: 72, alignItems: 'center' }]}>
                    <ActivityIndicator />
                </View>
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSave }}
                    disabled={!canSave}
                    onPress={onSave}
                    style={[capsule, canSave && { backgroundColor: theme.accent }]}
                >
                    <Text
                        style={[
                            Typography.body,
                            { fontWeight: '600', color: canSave ? '#FFFFFF' : theme.tertiaryLabel }
                        ]}
                    >
                        {t('Save')}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

function SheetBody(props: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: theme.background,
                paddingTop: Platform.OS === 'android' ? insets.top : 0
            }}
        >
            <SheetHeader {...props} />
            <ScrollView
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
            >
                {props.children}
            </ScrollView>
            <KeyboardDone />
        </View>
    );
}

export function FormSheet(props: Props) {
    return (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCancel}>
            <SafeAreaProvider>
                <ElevationContext.Provider value>
                    <SheetBody {...props} />
                </ElevationContext.Provider>
            </SafeAreaProvider>
        </Modal>
    );
}
