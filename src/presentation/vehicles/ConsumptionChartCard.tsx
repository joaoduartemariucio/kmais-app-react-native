import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import type { ConsumptionInterval } from '@/domain/calculations/ConsumptionInterval';

import { evenlySpacedIndices, monotonePath, niceTicks } from '../common/ChartGeometry';
import { formattedConsumption, formattedDay, formattedNumber } from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Typography } from '../common/components/Typography';
import { t } from '../i18n/i18n';

const height = 160;
const axisWidth = 36;
const labelHeight = 18;

export function ConsumptionChartCard({
    intervals,
    average
}: {
    intervals: readonly ConsumptionInterval[];
    average: number | null;
}) {
    const theme = useTheme();
    const [width, setWidth] = useState(0);

    const values = intervals.map((interval) => interval.kilometersPerLiter);
    const ticks = niceTicks(Math.min(...values, average ?? Infinity), Math.max(...values, average ?? -Infinity));
    const low = ticks[0] ?? 0;
    const high = ticks.at(-1) ?? 1;
    const plotWidth = Math.max(0, width - axisWidth);
    const plotHeight = height - labelHeight;
    const times = intervals.map((interval) => interval.endDate.getTime());
    const start = Math.min(...times);
    const span = Math.max(1, Math.max(...times) - start);

    const x = (time: number) => 6 + ((time - start) / span) * Math.max(0, plotWidth - 12);
    const y = (value: number) => plotHeight - ((value - low) / Math.max(1e-9, high - low)) * (plotHeight - 4) - 2;
    const points = intervals.map((interval) => ({
        x: x(interval.endDate.getTime()),
        y: y(interval.kilometersPerLiter)
    }));

    return (
        <View style={{ gap: 12, paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={[Typography.headline, { color: theme.label }]}>{t('Consumption')}</Text>
                {average !== null && (
                    <Text style={[Typography.caption, { color: theme.secondaryLabel }]}>
                        {t('Average {{value}}', { value: formattedConsumption(average) })}
                    </Text>
                )}
            </View>
            <View
                accessible
                accessibilityLabel={t('Consumption over time')}
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
                                    {formattedNumber(tick, tick % 1 === 0 ? 0 : 1)}
                                </SvgText>
                            </G>
                        ))}
                        {average !== null && (
                            <Line
                                x1={0}
                                x2={plotWidth}
                                y1={y(average)}
                                y2={y(average)}
                                stroke={theme.secondaryLabel}
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />
                        )}
                        <Path d={monotonePath(points)} stroke={theme.fuel} strokeWidth={2} fill="none" />
                        {points.map((point, index) => (
                            <Circle key={index} cx={point.x} cy={point.y} r={3} fill={theme.fuel} />
                        ))}
                        {evenlySpacedIndices(intervals.length, 4).map((index) => {
                            const interval = intervals[index];
                            const point = points[index];
                            if (!interval || !point) return null;
                            return (
                                <SvgText
                                    key={`label-${index}`}
                                    x={Math.min(Math.max(point.x, 20), plotWidth - 20)}
                                    y={height - 4}
                                    fontSize={11}
                                    fill={theme.secondaryLabel}
                                    textAnchor="middle"
                                >
                                    {formattedDay(interval.endDate)}
                                </SvgText>
                            );
                        })}
                    </Svg>
                )}
            </View>
        </View>
    );
}
