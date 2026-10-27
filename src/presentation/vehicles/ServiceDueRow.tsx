import { Text, View } from 'react-native';

import { serviceKindLabel, serviceKindSymbol } from '../common/Display';
import { formattedDay, formattedKilometers, formattedRemainingKilometers } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { ProgressBar } from '../common/components/ProgressBar';
import { StatusCapsule } from '../common/components/StatusCapsule';
import { SymbolBadge } from '../common/components/SymbolBadge';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import { t } from '../i18n/i18n';
import { relativeDue, type DueItem } from './VehicleStats';

function intervalText(item: DueItem): string {
    const { kilometerInterval: kilometers, monthInterval: months } = item.due.rule;
    if (kilometers !== null && months !== null) {
        return t('Every {{distance}} or {{count}} months', {
            distance: formattedKilometers(kilometers),
            count: months
        });
    }
    if (kilometers !== null) return t('Every {{distance}}', { distance: formattedKilometers(kilometers) });
    if (months !== null) return t('Every {{count}} months', { count: months });
    return '';
}

export function ServiceDueRow({ item }: { item: DueItem }) {
    const theme = useTheme();
    const color = theme.levels[item.status.level];
    const { forecast } = item.due;
    const dueDate = forecast.dueDate;
    const dueText =
        dueDate === null
            ? null
            : forecast.trigger === 'distance'
              ? t('Around {{date}}', { date: formattedDay(dueDate) })
              : formattedDay(dueDate);
    const detail = { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 } as const;
    const detailText = [Typography.caption, { color: theme.secondaryLabel, flexShrink: 1 }];

    return (
        <View accessible style={{ gap: 10, paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SymbolBadge name={serviceKindSymbol(item.due.rule.kind)} tint={color} />
                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[Typography.headline, { color: theme.label }]}>
                        {serviceKindLabel(item.due.rule.kind)}
                    </Text>
                    <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>{intervalText(item)}</Text>
                </View>
                <StatusCapsule level={item.status.level} />
            </View>

            <ProgressBar value={item.status.progress} tint={color} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                {item.status.remainingKilometers !== null && (
                    <View style={detail}>
                        <SymbolIcon name={Symbols.road} size={13} color={theme.secondaryLabel} />
                        <Text style={detailText}>{formattedRemainingKilometers(item.status.remainingKilometers)}</Text>
                    </View>
                )}
                <View style={detail}>
                    <SymbolIcon
                        name={dueText === null ? Symbols.gauge : Symbols.calendar}
                        size={13}
                        color={theme.secondaryLabel}
                    />
                    <Text style={detailText}>
                        {dueText === null
                            ? t('Log another reading to estimate a date.')
                            : `${dueText} · ${relativeDue(item)}`}
                    </Text>
                </View>
            </View>
        </View>
    );
}
