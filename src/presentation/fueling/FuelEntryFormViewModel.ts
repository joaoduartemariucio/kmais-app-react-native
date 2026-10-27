import type { Decimal } from 'decimal.js';
import { makeAutoObservable, observableRef, runInAction } from 'mobx';

import { Odometer } from '@/domain/calculations/Odometer';
import { fuelTotalCost, makeFuelEntry, type FuelEntry } from '@/domain/entities/FuelEntry';
import type { Identifier } from '@/domain/entities/Identifier';
import type { OdometerSample } from '@/domain/entities/OdometerSample';
import type { FuelEntryRepository } from '@/domain/repositories/FuelEntryRepository';
import type { DateProvider } from '@/domain/services/DateProvider';

import { errorMessage } from '../common/ErrorMessage';
import { FormStates, type FormState } from '../common/FormState';
import { NumberInput, NumberInputStyles } from '../common/NumberInput';
import { blocksSaving, Issues, odometerIssues, type ValidationIssue } from '../common/ValidationIssue';

export type FuelEntryFormMode =
    { readonly type: 'create'; readonly vehicleId: Identifier } | { readonly type: 'edit'; readonly entry: FuelEntry };

interface Options {
    repository: FuelEntryRepository;
    dateProvider: DateProvider;
    otherReadings: readonly OdometerSample[];
    suggestedPrice?: Decimal | null;
}

export class FuelEntryFormViewModel {
    date: Date;
    odometer: string;
    liters: string;
    pricePerLiter: string;
    isFullTank: boolean;
    state: FormState = FormStates.editing;

    private readonly suggestedPriceText: string | null;
    private readonly repository: FuelEntryRepository;
    private readonly otherReadings: readonly OdometerSample[];

    constructor(
        private readonly mode: FuelEntryFormMode,
        { repository, dateProvider, otherReadings, suggestedPrice = null }: Options
    ) {
        this.repository = repository;
        this.otherReadings = otherReadings;
        this.suggestedPriceText =
            mode.type === 'create' && suggestedPrice
                ? NumberInput.text(suggestedPrice, NumberInputStyles.fuelPrice)
                : null;

        if (mode.type === 'edit') {
            const { entry } = mode;
            this.date = entry.date;
            this.odometer = NumberInput.text(entry.odometer, NumberInputStyles.kilometers);
            this.liters = NumberInput.text(entry.liters, NumberInputStyles.liters);
            this.pricePerLiter = NumberInput.text(entry.pricePerLiter, NumberInputStyles.fuelPrice);
            this.isFullTank = entry.isFullTank;
        } else {
            this.date = dateProvider.now;
            this.odometer = '';
            this.liters = '';
            this.pricePerLiter = this.suggestedPriceText ?? '';
            this.isFullTank = true;
        }

        makeAutoObservable<this, 'mode' | 'repository' | 'otherReadings' | 'suggestedPriceText'>(
            this,
            {
                state: observableRef,
                date: observableRef,
                mode: false,
                repository: false,
                otherReadings: false,
                suggestedPriceText: false
            },
            { autoBind: true }
        );
    }

    get isCreating(): boolean {
        return this.mode.type === 'create';
    }

    get parsedOdometer(): number | null {
        return NumberInput.double(this.odometer, NumberInputStyles.kilometers);
    }

    get parsedLiters(): number | null {
        return NumberInput.double(this.liters, NumberInputStyles.liters);
    }

    get parsedPrice(): Decimal | null {
        return NumberInput.decimal(this.pricePerLiter, NumberInputStyles.fuelPrice);
    }

    get isUsingSuggestedPrice(): boolean {
        return this.suggestedPriceText !== null && this.pricePerLiter === this.suggestedPriceText;
    }

    get previousReading(): number | null {
        return Odometer.neighbors(this.date, this.otherReadings).previous;
    }

    get distanceSincePrevious(): number | null {
        const odometer = this.parsedOdometer;
        const previous = this.previousReading;
        if (odometer === null || previous === null || odometer <= previous) return null;
        return odometer - previous;
    }

    get totalCost(): Decimal | null {
        const liters = this.parsedLiters;
        const price = this.parsedPrice;
        if (liters === null || price === null) return null;
        return fuelTotalCost(this.entry(this.parsedOdometer ?? 0, liters, price));
    }

    get issues(): ValidationIssue[] {
        const issues = odometerIssues(this.parsedOdometer, this.date, this.otherReadings);

        const liters = this.parsedLiters;
        if (liters === null) {
            issues.push(Issues.litersRequired);
        } else if (liters <= 0) {
            issues.push(Issues.litersNotPositive);
        }

        const price = this.parsedPrice;
        if (price === null) {
            issues.push(Issues.priceRequired);
        } else if (price.lessThanOrEqualTo(0)) {
            issues.push(Issues.priceNotPositive);
        }

        return issues;
    }

    get canSave(): boolean {
        return !blocksSaving(this.issues) && this.state.status !== 'saving';
    }

    setDate(date: Date): void {
        this.date = date;
    }

    setOdometer(text: string): void {
        this.odometer = text;
    }

    setLiters(text: string): void {
        this.liters = text;
    }

    setPricePerLiter(text: string): void {
        this.pricePerLiter = text;
    }

    setFullTank(isFullTank: boolean): void {
        this.isFullTank = isFullTank;
    }

    async save(): Promise<void> {
        const odometer = this.parsedOdometer;
        const liters = this.parsedLiters;
        const price = this.parsedPrice;
        if (odometer === null || liters === null || price === null || blocksSaving(this.issues)) return;

        this.state = FormStates.saving;
        try {
            await this.repository.save(this.entry(odometer, liters, price));
            runInAction(() => {
                this.state = FormStates.saved;
            });
        } catch (error) {
            runInAction(() => {
                this.state = FormStates.failed(errorMessage(error));
            });
        }
    }

    private entry(odometer: number, liters: number, price: Decimal): FuelEntry {
        const fields = { date: this.date, odometer, liters, pricePerLiter: price, isFullTank: this.isFullTank };
        return this.mode.type === 'edit'
            ? makeFuelEntry({ ...fields, id: this.mode.entry.id, vehicleId: this.mode.entry.vehicleId })
            : makeFuelEntry({ ...fields, vehicleId: this.mode.vehicleId });
    }
}
