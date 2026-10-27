import { SymbolView } from 'expo-symbols';

import type { SymbolName } from '../Symbols';

interface Props {
    name: SymbolName;
    size?: number;
    color: string;
}

export function SymbolIcon({ name, size = 17, color }: Props) {
    return <SymbolView name={name} size={size} tintColor={color} resizeMode="scaleAspectFit" />;
}
