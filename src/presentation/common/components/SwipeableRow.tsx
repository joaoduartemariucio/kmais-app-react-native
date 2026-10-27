import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { SymbolName } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

export interface SwipeAction {
    title: string;
    symbol: SymbolName;
    color: string;
    onPress: () => void;
}

function Actions({ actions, close }: { actions: readonly SwipeAction[]; close: () => void }) {
    return actions.map((action) => (
        <Pressable
            key={action.title}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            onPress={() => {
                close();
                action.onPress();
            }}
            style={{ width: 84, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: action.color }}
        >
            <SymbolIcon name={action.symbol} size={20} color="#FFFFFF" />
            <Text style={[Typography.caption, { color: '#FFFFFF', fontWeight: '600' }]}>{action.title}</Text>
        </Pressable>
    ));
}

interface Props {
    leading?: readonly SwipeAction[];
    trailing?: readonly SwipeAction[];
    children: ReactNode;
}

export function SwipeableRow({ leading = [], trailing = [], children }: Props) {
    const render = (actions: readonly SwipeAction[]) =>
        actions.length === 0
            ? undefined
            : (_progress: unknown, _translation: unknown, methods: SwipeableMethods) => (
                  <Actions actions={actions} close={() => methods.close()} />
              );
    return (
        <ReanimatedSwipeable
            friction={2}
            overshootFriction={8}
            renderLeftActions={render(leading)}
            renderRightActions={render(trailing)}
        >
            {children}
        </ReanimatedSwipeable>
    );
}
