import { View } from 'react-native';

import {
    formattedConsumption,
    formattedCurrency,
    formattedKilometers,
    formattedPerKilometer,
    formattedPerLiter
} from '../common/FormatStyles';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { MetricTile } from '../common/components/MetricTile';
import { t } from '../i18n/i18n';
import type { VehicleStats } from './VehicleStats';

export function VehicleSummaryCard({ stats }: { stats: VehicleStats }) {
    const theme = useTheme();
    const breakdown = t('Fuel {{fuel}} · Services {{services}}', {
        fuel: formattedCurrency(stats.cost.fuelCost),
        services: formattedCurrency(stats.cost.serviceCost)
    });
    return (
        <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <MetricTile
                    title={t('Average consumption')}
                    value={stats.averageConsumption === null ? null : formattedConsumption(stats.averageConsumption)}
                    caption={
                        stats.latestConsumption === null
                            ? null
                            : t('Last: {{value}}', {
                                  value: formattedConsumption(stats.latestConsumption.kilometersPerLiter)
                              })
                    }
                    symbol={Symbols.gaugeDots}
                    tint={theme.fuel}
                />
                <MetricTile
                    title={t('Cost per km')}
                    value={
                        stats.cost.costPerKilometer === null ? null : formattedPerKilometer(stats.cost.costPerKilometer)
                    }
                    caption={
                        stats.cost.distance > 0
                            ? t('Over {{distance}}', { distance: formattedKilometers(stats.cost.distance) })
                            : null
                    }
                    symbol={Symbols.road}
                    tint={theme.accent}
                />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <MetricTile
                    title={t('Total spent')}
                    value={formattedCurrency(stats.cost.totalCost)}
                    caption={breakdown}
                    symbol={Symbols.creditCard}
                    tint={theme.service}
                />
                <MetricTile
                    title={t('This month')}
                    value={formattedCurrency(stats.spentThisMonth)}
                    caption={
                        stats.lastPricePerLiter === null
                            ? null
                            : t('Last fuel price {{price}}', { price: formattedPerLiter(stats.lastPricePerLiter) })
                    }
                    symbol={Symbols.calendar}
                    tint={theme.orange}
                />
            </View>
        </View>
    );
}
