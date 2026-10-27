import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import type { OdometerSample } from '@/domain/entities/OdometerSample';

import { NumberInputStyles } from '../common/NumberInput';
import { FailureSection } from '../common/components/FailureRow';
import { DateRow, LabeledNumberField, TextField } from '../common/components/FormFields';
import { FormSheet } from '../common/components/FormSheet';
import { Row, Section } from '../common/components/GroupedList';
import { OdometerHint } from '../common/components/OdometerHint';
import { ValidationFooter } from '../common/components/ValidationFooter';
import { useDependencies } from '../di/Dependencies';
import { t } from '../i18n/i18n';
import { ServiceEntryFormViewModel, type ServiceEntryFormMode } from './ServiceEntryFormViewModel';
import { ServiceKindGrid } from './ServiceKindGrid';

interface Props {
    mode: ServiceEntryFormMode;
    otherReadings: readonly OdometerSample[];
    onSaved: () => void;
    onDismiss: () => void;
}

export const ServiceEntryFormView = observer(function ServiceEntryFormView({
    mode,
    otherReadings,
    onSaved,
    onDismiss
}: Props) {
    const dependencies = useDependencies();
    const [viewModel] = useState(
        () =>
            new ServiceEntryFormViewModel(mode, {
                repository: dependencies.serviceRepository,
                dateProvider: dependencies.dateProvider,
                otherReadings
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
            title={viewModel.isCreating ? t('New service') : t('Edit service')}
            state={viewModel.state}
            canSave={viewModel.canSave}
            onSave={() => void save()}
            onCancel={onDismiss}
        >
            <Section header={t('Service type')}>
                <Row style={{ padding: 12 }}>
                    <ServiceKindGrid selection={viewModel.kind} onChange={viewModel.setKind} />
                </Row>
            </Section>

            <Section footer={<OdometerHint previous={viewModel.previousReading} />}>
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
                <Row>
                    <LabeledNumberField
                        title={t('Cost')}
                        style={NumberInputStyles.money}
                        value={viewModel.cost}
                        onChange={viewModel.setCost}
                    />
                </Row>
            </Section>

            <Section header={t('Notes')}>
                <Row>
                    <TextField
                        accessibilityLabel={t('Notes')}
                        placeholder={t('Parts, shop, warranty…')}
                        value={viewModel.notes}
                        onChange={viewModel.setNotes}
                        multiline
                        minHeight={72}
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
