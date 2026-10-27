import { observer } from 'mobx-react-lite';
import { Pressable, Text, View } from 'react-native';

import { serviceKinds } from '@/domain/entities/ServiceKind';

import { showActionMenu } from '../common/ActionMenu';
import { serviceKindLabel, serviceKindSymbol } from '../common/Display';
import { NumberInputStyles } from '../common/NumberInput';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { LabeledNumberField } from '../common/components/FormFields';
import { SymbolBadge } from '../common/components/SymbolBadge';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import { ValidationFooter } from '../common/components/ValidationFooter';
import { t } from '../i18n/i18n';
import type { RuleDraft } from './VehicleFormViewModel';

export const ServiceRuleRow = observer(function ServiceRuleRow({ rule }: { rule: RuleDraft }) {
    const theme = useTheme();
    return (
        <View style={{ gap: 10, paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SymbolBadge name={serviceKindSymbol(rule.kind)} tint={theme.service} size={32} />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Service type')}
                    onPress={() =>
                        showActionMenu(
                            t('Service type'),
                            serviceKinds.map((kind) => ({
                                title: serviceKindLabel(kind),
                                onPress: () => rule.setKind(kind)
                            }))
                        )
                    }
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                    <Text style={[Typography.body, { color: theme.accent }]}>{serviceKindLabel(rule.kind)}</Text>
                    <SymbolIcon name={Symbols.chevron} size={11} color={theme.accent} />
                </Pressable>
            </View>
            <LabeledNumberField
                title={t('Every')}
                unit={t('km')}
                style={NumberInputStyles.kilometers}
                value={rule.kilometerInterval}
                onChange={rule.setKilometerInterval}
            />
            <LabeledNumberField
                title={t('Or every')}
                unit={t('months')}
                style={NumberInputStyles.months}
                value={rule.monthInterval}
                onChange={rule.setMonthInterval}
            />
            <ValidationFooter issues={rule.issues} />
        </View>
    );
});
