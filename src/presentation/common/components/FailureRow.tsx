import { Text } from 'react-native';

import { useTheme } from '../Palette';
import { Symbols } from '../Symbols';
import { Row, Section } from './GroupedList';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

export function FailureSection({ message }: { message: string }) {
    const theme = useTheme();
    return (
        <Section>
            <Row style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SymbolIcon name={Symbols.overdue} size={15} color={theme.red} />
                <Text style={[Typography.body, { color: theme.red, flex: 1 }]}>{message}</Text>
            </Row>
        </Section>
    );
}
