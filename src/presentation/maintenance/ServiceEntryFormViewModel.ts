import { Decimal } from 'decimal.js';
import { makeAutoObservable, observableRef, runInAction } from 'mobx';

import { Odometer } from '@/domain/calculations/Odometer';
import type { Identifier } from '@/domain/entities/Identifier';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { makeServiceEntry, type ServiceEntry } from '@/domain/entities/ServiceEntry';
import type { ServiceKind } from '@/domain/entities/ServiceKind';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { DateProvider } from '@/domain/services/DateProvider';

import { errorMessage } from '../common/ErrorMessage';
import { FormStates, type FormState } from '../common/FormState';
import { NumberInput, NumberInputStyles } from '../common/NumberInput';
import { blocksSaving, Issues, odometerIssues, type ValidationIssue } from '../common/ValidationIssue';

export type ServiceEntryFormMode =
    | { readonly type: 'create'; readonly vehicleId: Identifier }
    | { readonly type: 'edit'; readonly entry: ServiceEntry };

interface Options {
    repository: ServiceRepository;
    dateProvider: DateProvider;
    otherReadings: readonly OdometerSample[];
}

export class ServiceEntryFormViewModel {
    kind: ServiceKind;
    date: Date;
    odometer: string;
    cost: string;
    notes: string;
    state: FormState = FormStates.editing;

    private readonly repository: ServiceRepository;
    private readonly otherReadings: readonly OdometerSample[];

    constructor(
        private readonly mode: ServiceEntryFormMode,
        { repository, dateProvider, otherReadings }: Options
    ) {
        this.repository = repository;
        this.otherReadings = otherReadings;

        if (mode.type === 'edit') {
            const { entry } = mode;
            this.kind = entry.kind;
            this.date = entry.date;
            this.odometer = NumberInput.text(entry.odometer, NumberInputStyles.kilometers);
            this.cost = NumberInput.text(entry.cost, NumberInputStyles.money);
            this.notes = entry.notes;
        } else {
            this.kind = 'oilChange';
            this.date = dateProvider.now;
            this.odometer = '';
            this.cost = '';
            this.notes = '';
        }

        makeAutoObservable<this, 'mode' | 'repository' | 'otherReadings'>(
            this,
            { state: observableRef, date: observableRef, mode: false, repository: false, otherReadings: false },
            { autoBind: true }
        );
    }

    get isCreating(): boolean {
        return this.mode.type === 'create';
    }

    get parsedOdometer(): number | null {
        return NumberInput.double(this.odometer, NumberInputStyles.kilometers);
    }

    get previousReading(): number | null {
        return Odometer.neighbors(this.date, this.otherReadings).previous;
    }

    get parsedCost(): Decimal {
        return NumberInput.decimal(this.cost, NumberInputStyles.money) ?? new Decimal(0);
    }

    get issues(): ValidationIssue[] {
        const issues = odometerIssues(this.parsedOdometer, this.date, this.otherReadings);
        if (this.parsedCost.lessThan(0)) issues.push(Issues.costNegative);
        return issues;
    }

    get canSave(): boolean {
        return !blocksSaving(this.issues) && this.state.status !== 'saving';
    }

    setKind(kind: ServiceKind): void {
        this.kind = kind;
    }

    setDate(date: Date): void {
        this.date = date;
    }

    setOdometer(text: string): void {
        this.odometer = text;
    }

    setCost(text: string): void {
        this.cost = text;
    }

    setNotes(text: string): void {
        this.notes = text;
    }

    async save(): Promise<void> {
        const odometer = this.parsedOdometer;
        if (odometer === null || blocksSaving(this.issues)) return;

        this.state = FormStates.saving;
        try {
            await this.repository.save(this.entry(odometer));
            runInAction(() => {
                this.state = FormStates.saved;
            });
        } catch (error) {
            runInAction(() => {
                this.state = FormStates.failed(errorMessage(error));
            });
        }
    }

    private entry(odometer: number): ServiceEntry {
        const fields = { kind: this.kind, date: this.date, odometer, cost: this.parsedCost, notes: this.notes.trim() };
        return this.mode.type === 'edit'
            ? makeServiceEntry({ ...fields, id: this.mode.entry.id, vehicleId: this.mode.entry.vehicleId })
            : makeServiceEntry({ ...fields, vehicleId: this.mode.vehicleId });
    }
}
