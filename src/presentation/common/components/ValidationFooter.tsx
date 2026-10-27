import { Text, View } from 'react-native';

import { useTheme } from '../Palette';
import { Symbols } from '../Symbols';
import { isBlocking, issueId, issueMessage, type ValidationIssue } from '../ValidationIssue';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

export function ValidationFooter({ issues }: { issues: readonly ValidationIssue[] }) {
    const theme = useTheme();
    if (issues.length === 0) return null;
    return (
        <View accessible style={{ gap: 4 }}>
            {issues.map((issue) => {
                const color = isBlocking(issue) ? theme.red : theme.orange;
                return (
                    <View key={issueId(issue)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <SymbolIcon name={isBlocking(issue) ? Symbols.overdue : Symbols.info} size={15} color={color} />
                        <Text style={[Typography.footnote, { color, flex: 1 }]}>{issueMessage(issue)}</Text>
                    </View>
                );
            })}
        </View>
    );
}
