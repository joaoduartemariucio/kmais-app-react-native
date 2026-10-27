import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ServiceRule } from '@/domain/entities/ServiceRule';
import { vehicleKinds } from '@/domain/entities/VehicleKind';

import { vehicleKindLabel } from '../common/Display';
import { NumberInputStyles } from '../common/NumberInput';
import { useTheme } from '../common/Palette';
import { Symbols } from '../common/Symbols';
import { FailureSection } from '../common/components/FailureRow';
import { LabeledNumberField, SegmentedPicker, TextField } from '../common/components/FormFields';
import { FormSheet } from '../common/components/FormSheet';
import { Row, Section } from '../common/components/GroupedList';
import { SwipeableRow } from '../common/components/SwipeableRow';
import { SymbolIcon } from '../common/components/SymbolIcon';
import { Typography } from '../common/components/Typography';
import { ValidationFooter } from '../common/components/ValidationFooter';
import { useDependencies } from '../di/Dependencies';
import { t } from '../i18n/i18n';
import { ServiceRuleRow } from './ServiceRuleRow';
import { VehicleFormViewModel, type VehicleFormMode } from './VehicleFormViewModel';

interface Props {
    mode: VehicleFormMode;
    existingRules?: readonly ServiceRule[];
    onSaved: () => void;
    onDismiss: () => void;
}

export const VehicleFormView = observer(function VehicleFormView({
    mode,
    existingRules = [],
    onSaved,
    onDismiss
}: Props) {
    const dependencies = useDependencies();
    const theme = useTheme();
    const [viewModel] = useState(() => new VehicleFormViewModel(mode, existingRules, dependencies));

    const save = async () => {
        await viewModel.save();
        if (viewModel.state.status === 'saved') {
            onSaved();
            onDismiss();
        }
    };

    return (
        <FormSheet
            title={viewModel.isCreating ? t('New vehicle') : t('Edit vehicle')}
            state={viewModel.state}
            canSave={viewModel.canSave}
            onSave={() => void save()}
            onCancel={onDismiss}
        >
            <Section plain>
                <SegmentedPicker
                    accessibilityLabel={t('Vehicle type')}
                    values={vehicleKinds}
                    labels={vehicleKinds.map(vehicleKindLabel)}
                    selection={viewModel.kind}
                    onChange={viewModel.setKind}
                />
            </Section>

            <Section header={t('Identification')}>
                <Row>
                    <TextField
                        accessibilityLabel={t('Name')}
                        placeholder={t('e.g. Civic, CB 500')}
                        value={viewModel.name}
                        onChange={viewModel.setName}
                    />
                </Row>
                <Row>
                    <TextField
                        accessibilityLabel={t('Plate')}
                        placeholder={t('ABC1D23')}
                        value={viewModel.plate}
                        onChange={viewModel.setPlate}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                </Row>
            </Section>

            <Section header={t('Specs')}>
                <Row>
                    <LabeledNumberField
                        title={t('Initial odometer')}
                        unit={t('km')}
                        style={NumberInputStyles.kilometers}
                        value={viewModel.initialOdometer}
                        onChange={viewModel.setInitialOdometer}
                    />
                </Row>
                <Row>
                    <LabeledNumberField
                        title={t('Tank capacity')}
                        unit={t('L')}
                        style={NumberInputStyles.liters}
                        value={viewModel.tankCapacity}
                        onChange={viewModel.setTankCapacity}
                    />
                </Row>
            </Section>

            <Section
                header={t('Service reminders')}
                footer={t('You are reminded at whichever comes first: the distance or the time.')}
            >
                {viewModel.rules.map((rule, index) => (
                    <SwipeableRow
                        key={rule.id}
                        trailing={[
                            {
                                title: t('Delete'),
                                symbol: Symbols.trash,
                                color: theme.red,
                                onPress: () => viewModel.removeRules([index])
                            }
                        ]}
                    >
                        <View style={{ backgroundColor: theme.card }}>
                            <Row>
                                <ServiceRuleRow rule={rule} />
                            </Row>
                        </View>
                    </SwipeableRow>
                ))}
                <Pressable
                    accessibilityRole="button"
                    onPress={viewModel.addRule}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 20,
                        minHeight: 52
                    }}
                >
                    <SymbolIcon name={Symbols.plusCircle} size={20} color={theme.accent} />
                    <Text style={[Typography.body, { color: theme.accent }]}>{t('Add reminder')}</Text>
                </Pressable>
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
