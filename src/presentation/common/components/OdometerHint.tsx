import { Text, View } from 'react-native';

import { t } from '../../i18n/i18n';
import { formattedKilometers } from '../FormatStyles';
import { useTheme } from '../Palette';
import { Symbols } from '../Symbols';
import { SymbolIcon } from './SymbolIcon';
import { Typography } from './Typography';

export function OdometerHint({ previous, distance = null }: { previous: number | null; distance?: number | null }) {
    const theme = useTheme();
    if (previous === null) return null;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <SymbolIcon name={Symbols.gauge} size={13} color={theme.secondaryLabel} />
            <Text style={[Typography.footnote, Typography.digits, { color: theme.secondaryLabel }]}>
                {t('Last reading: {{value}}', { value: formattedKilometers(previous) })}
            </Text>
            {distance !== null && (
                <Text style={[Typography.footnote, Typography.digits, { color: theme.accent, fontWeight: '600' }]}>
                    {`· +${formattedKilometers(distance)}`}
                </Text>
            )}
        </View>
    );
}
