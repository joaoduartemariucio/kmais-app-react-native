import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { t } from '../i18n/i18n';

export interface MenuAction {
    title: string;
    destructive?: boolean;
    onPress: () => void;
}

export function showActionMenu(title: string, actions: readonly MenuAction[]): void {
    if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
            {
                title,
                options: [...actions.map((action) => action.title), t('Cancel')],
                cancelButtonIndex: actions.length,
                destructiveButtonIndex: actions.flatMap((action, index) => (action.destructive ? [index] : []))
            },
            (index) => actions[index]?.onPress()
        );
        return;
    }
    Alert.alert(title, undefined, [
        ...actions.map((action) => ({
            text: action.title,
            style: action.destructive ? ('destructive' as const) : ('default' as const),
            onPress: action.onPress
        })),
        { text: t('Cancel'), style: 'cancel' as const }
    ]);
}
