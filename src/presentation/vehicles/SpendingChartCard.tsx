import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { niceTicks } from '../common/ChartGeometry';
import { formattedNumber, formattedShortMonth } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Typography } from '../common/components/Typography';
import { t } from '../i18n/i18n';
import type { MonthSpending } from './VehicleTimeline';

const height = 170;
const axisWidth = 44;
const labelHeight = 18;

function Legend({ color, title }: { color: string; title: string }) {
    const theme = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>{title}</Text>
        </View>
    );
}

export function SpendingChartCard({ months }: { months: readonly MonthSpending[] }) {
    const theme = useTheme();
    const [width, setWidth] = useState(0);

    const ticks = niceTicks(0, Math.max(...months.map((month) => month.total.toNumber()), 0));
    const high = ticks.at(-1) ?? 1;
    const plotWidth = Math.max(0, width - axisWidth);
    const plotHeight = height - labelHeight;
    const slot = months.length === 0 ? 0 : plotWidth / months.length;
    const barWidth = slot * 0.6;
    const y = (value: number) => plotHeight - (value / high) * plotHeight;

    return (
        <View style={{ gap: 12, paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={[Typography.headline, { color: theme.label }]}>{t('Spending')}</Text>
                <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>
                    {t('Last {{count}} months', { count: months.length })}
                </Text>
            </View>
            <View
                accessible
                accessibilityLabel={t('Spending per month')}
                style={{ height }}
                onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            >
                {width > 0 && (
                    <Svg width={width} height={height}>
                        {ticks.map((tick) => (
                            <G key={tick}>
                                <Line
                                    x1={0}
                                    x2={plotWidth}
                                    y1={y(tick)}
                                    y2={y(tick)}
                                    stroke={theme.separator}
                                    strokeWidth={0.5}
                                />
                                <SvgText x={plotWidth + 6} y={y(tick) + 4} fontSize={11} fill={theme.secondaryLabel}>
                                    {formattedNumber(tick)}
                                </SvgText>
                            </G>
                        ))}
                        {months.map((month, index) => {
                            const left = index * slot + (slot - barWidth) / 2;
                            const fuel = month.fuel.toNumber();
                            const service = month.service.toNumber();
                            return (
                                <G key={month.month.getTime()}>
                                    <Rect
                                        x={left}
                                        y={y(fuel)}
                                        width={barWidth}
                                        height={plotHeight - y(fuel)}
                                        fill={theme.fuel}
                                    />
                                    <Rect
                                        x={left}
                                        y={y(fuel + service)}
                                        width={barWidth}
                                        height={y(fuel) - y(fuel + service)}
                                        fill={theme.service}
                                    />
                                    <SvgText
                                        x={index * slot + slot / 2}
                                        y={height - 4}
                                        fontSize={11}
                                        fill={theme.secondaryLabel}
                                        textAnchor="middle"
                                    >
                                        {formattedShortMonth(month.month)}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </Svg>
                )}
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
                <Legend color={theme.fuel} title={t('Fuel')} />
                <Legend color={theme.service} title={t('Services')} />
            </View>
        </View>
    );
}
