import type { Decimal } from 'decimal.js';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { OdometerSample } from '@/domain/entities/OdometerSample';

import { formattedCurrency } from '../common/FormatStyles';
import { NumberInputStyles } from '../common/NumberInput';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { FailureSection } from '../common/components/FailureRow';
import { DateRow, LabeledNumberField, ToggleRow } from '../common/components/FormFields';
import { FormSheet } from '../common/components/FormSheet';
import { Row, Section } from '../common/components/GroupedList';
import { OdometerHint } from '../common/components/OdometerHint';
import { Typography } from '../common/components/Typography';
import { ValidationFooter } from '../common/components/ValidationFooter';
import { useDependencies } from '../di/Dependencies';
import { t } from '../i18n/i18n';
import { FuelEntryFormViewModel, type FuelEntryFormMode } from './FuelEntryFormViewModel';

interface Props {
    mode: FuelEntryFormMode;
    otherReadings: readonly OdometerSample[];
    suggestedPrice?: Decimal | null;
    onSaved: () => void;
    onDismiss: () => void;
}

function TotalHeader({ total }: { total: Decimal | null }) {
    const theme = useTheme();
    return (
        <View accessible style={{ alignItems: 'center', gap: 4, paddingVertical: 20 }}>
            <Text style={[Typography.subheadline, { color: theme.secondaryLabel }]}>{t('Total')}</Text>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                style={[
                    Typography.digits,
                    { fontSize: 40, fontWeight: '700', color: total === null ? theme.secondaryLabel : theme.label }
                ]}
            >
                {total === null ? '—' : formattedCurrency(total)}
            </Text>
        </View>
    );
}

export const FuelEntryFormView = observer(function FuelEntryFormView({
    mode,
    otherReadings,
    suggestedPrice = null,
    onSaved,
    onDismiss
}: Props) {
    const dependencies = useDependencies();
    const [viewModel] = useState(
        () =>
            new FuelEntryFormViewModel(mode, {
                repository: dependencies.fuelEntryRepository,
                dateProvider: dependencies.dateProvider,
                otherReadings,
                suggestedPrice
            })
    );

    const save = async () => {
        await viewModel.save();
        if (viewModel.state.status === 'saved') {
            onSaved();
            onDismiss();
        }
    };

    return (
        <FormSheet
            title={viewModel.isCreating ? t('New fuel-up') : t('Edit fuel-up')}
            state={viewModel.state}
            canSave={viewModel.canSave}
            onSave={() => void save()}
            onCancel={onDismiss}
        >
            <Section>
                <TotalHeader total={viewModel.totalCost} />
            </Section>

            <Section
                header={t('Fuel')}
                footer={viewModel.isUsingSuggestedPrice ? t('Price filled in from your last fuel-up.') : undefined}
            >
                <Row>
                    <LabeledNumberField
                        title={t('Liters')}
                        unit={t('L')}
                        style={NumberInputStyles.liters}
                        value={viewModel.liters}
                        onChange={viewModel.setLiters}
                    />
                </Row>
                <Row>
                    <LabeledNumberField
                        title={t('Price per liter')}
                        style={NumberInputStyles.fuelPrice}
                        value={viewModel.pricePerLiter}
                        onChange={viewModel.setPricePerLiter}
                    />
                </Row>
                <ToggleRow
                    title={t('Full tank')}
                    symbol={Symbols.fuelPump}
                    value={viewModel.isFullTank}
                    onChange={viewModel.setFullTank}
                />
            </Section>

            <Section
                header={t('When')}
                footer={
                    <OdometerHint previous={viewModel.previousReading} distance={viewModel.distanceSincePrevious} />
                }
            >
                <DateRow title={t('Date')} value={viewModel.date} onChange={viewModel.setDate} />
                <Row>
                    <LabeledNumberField
                        title={t('Odometer')}
                        unit={t('km')}
                        style={NumberInputStyles.kilometers}
                        value={viewModel.odometer}
                        onChange={viewModel.setOdometer}
                    />
                </Row>
            </Section>

            {viewModel.state.status === 'failed' && <FailureSection message={viewModel.state.message} />}

            {viewModel.issues.length > 0 && (
                <Section>
                    <Row>
                        <ValidationFooter issues={viewModel.issues} />
                    </Row>
                </Section>
            )}
        </FormSheet>
    );
});
