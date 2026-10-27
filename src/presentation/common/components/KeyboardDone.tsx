import { Button, InputAccessoryView, Keyboard, Platform, View } from 'react-native';

import { t } from '../../i18n/i18n';
import { useTheme } from '../Palette';

export const keyboardDoneId = 'kmais.keyboard-done';

export function KeyboardDone() {
    const theme = useTheme();
    if (Platform.OS !== 'ios') return null;
    return (
        <InputAccessoryView nativeID={keyboardDoneId}>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    paddingHorizontal: 8,
                    backgroundColor: theme.card,
                    borderTopWidth: 0.5,
                    borderTopColor: theme.separator
                }}
            >
                <Button title={t('Done')} onPress={() => Keyboard.dismiss()} />
            </View>
        </InputAccessoryView>
    );
}
