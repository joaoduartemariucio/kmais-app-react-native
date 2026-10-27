import { makeAutoObservable, observableRef, observableShallow, runInAction } from 'mobx';

import { newIdentifier, type Identifier } from '@/domain/entities/Identifier';
import { compareServiceKinds, type ServiceKind } from '@/domain/entities/ServiceKind';
import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle, type Vehicle } from '@/domain/entities/Vehicle';
import type { VehicleKind } from '@/domain/entities/VehicleKind';
import type { ServiceRepository } from '@/domain/repositories/ServiceRepository';
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository';
import type { DateProvider } from '@/domain/services/DateProvider';

import { errorMessage } from '../common/ErrorMessage';
import { FormStates, type FormState } from '../common/FormState';
import { NumberInput, NumberInputStyles } from '../common/NumberInput';
import { blocksSaving, Issues, type ValidationIssue } from '../common/ValidationIssue';

export class RuleDraft {
    readonly id: Identifier;
    kind: ServiceKind;
    kilometerInterval: string;
    monthInterval: string;

    constructor(rule: ServiceRule | null = null, kind: ServiceKind = 'oilChange') {
        this.id = rule?.id ?? newIdentifier();
        this.kind = rule?.kind ?? kind;
        this.kilometerInterval = NumberInput.text(rule?.kilometerInterval ?? null, NumberInputStyles.kilometers);
        this.monthInterval = NumberInput.text(rule?.monthInterval ?? null, NumberInputStyles.months);
        makeAutoObservable(this, { id: false }, { autoBind: true });
    }

    get parsedKilometerInterval(): number | null {
        const value = NumberInput.double(this.kilometerInterval, NumberInputStyles.kilometers);
        return value !== null && value > 0 ? value : null;
    }

    get parsedMonthInterval(): number | null {
        const value = NumberInput.double(this.monthInterval, NumberInputStyles.months);
        return value !== null && value > 0 ? Math.trunc(value) : null;
    }

    get issues(): ValidationIssue[] {
        return this.parsedKilometerInterval === null && this.parsedMonthInterval === null
            ? [Issues.ruleWithoutInterval]
            : [];
    }

    setKind(kind: ServiceKind): void {
        this.kind = kind;
    }

    setKilometerInterval(text: string): void {
        this.kilometerInterval = text;
    }

    setMonthInterval(text: string): void {
        this.monthInterval = text;
    }
}

export type VehicleFormMode = { readonly type: 'create' } | { readonly type: 'edit'; readonly vehicle: Vehicle };

interface Dependencies {
    vehicleRepository: VehicleRepository;
    serviceRepository: ServiceRepository;
    dateProvider: DateProvider;
}

export class VehicleFormViewModel {
    name: string;
    kind: VehicleKind;
    plate: string;
    initialOdometer: string;
    tankCapacity: string;
    rules: RuleDraft[];
    state: FormState = FormStates.editing;

    constructor(
        private readonly mode: VehicleFormMode,
        existingRules: readonly ServiceRule[],
        private readonly dependencies: Dependencies
    ) {
        if (mode.type === 'edit') {
            const { vehicle } = mode;
            this.name = vehicle.name;
            this.kind = vehicle.kind;
            this.plate = vehicle.plate ?? '';
            this.initialOdometer = NumberInput.text(vehicle.initialOdometer, NumberInputStyles.kilometers);
            this.tankCapacity = NumberInput.text(vehicle.tankCapacity, NumberInputStyles.liters);
        } else {
            this.name = '';
            this.kind = 'car';
            this.plate = '';
            this.initialOdometer = '';
            this.tankCapacity = '';
        }

        this.rules = [...existingRules]
            .sort((lhs, rhs) => compareServiceKinds(lhs.kind, rhs.kind))
            .map((rule) => new RuleDraft(rule));

        makeAutoObservable<this, 'mode' | 'dependencies'>(
            this,
            { state: observableRef, rules: observableShallow, mode: false, dependencies: false },
            { autoBind: true }
        );
    }

    get isCreating(): boolean {
        return this.mode.type === 'create';
    }

    get trimmedName(): string {
        return this.name.trim();
    }

    get parsedPlate(): string | null {
        const trimmed = this.plate.trim();
        return trimmed.length === 0 ? null : trimmed.toUpperCase();
    }

    get parsedInitialOdometer(): number {
        return NumberInput.double(this.initialOdometer, NumberInputStyles.kilometers) ?? 0;
    }

    get parsedTankCapacity(): number | null {
        return NumberInput.double(this.tankCapacity, NumberInputStyles.liters);
    }

    get issues(): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        if (this.trimmedName.length === 0) issues.push(Issues.nameRequired);
        issues.push(...this.rules.flatMap((rule) => rule.issues));
        return issues;
    }

    get canSave(): boolean {
        return !blocksSaving(this.issues) && this.state.status !== 'saving';
    }

    setName(text: string): void {
        this.name = text;
    }

    setKind(kind: VehicleKind): void {
        this.kind = kind;
    }

    setPlate(text: string): void {
        this.plate = text;
    }

    setInitialOdometer(text: string): void {
        this.initialOdometer = text;
    }

    setTankCapacity(text: string): void {
        this.tankCapacity = text;
    }

    addRule(): void {
        this.rules.push(new RuleDraft());
    }

    removeRules(indices: readonly number[]): void {
        for (const index of [...indices].sort((lhs, rhs) => rhs - lhs)) {
            if (index >= 0 && index < this.rules.length) this.rules.splice(index, 1);
        }
    }

    async save(): Promise<void> {
        if (blocksSaving(this.issues)) return;

        this.state = FormStates.saving;
        const vehicle = this.vehicle();
        const rules = this.rules.map((draft) =>
            makeServiceRule({
                id: draft.id,
                vehicleId: vehicle.id,
                kind: draft.kind,
                kilometerInterval: draft.parsedKilometerInterval,
                monthInterval: draft.parsedMonthInterval
            })
        );
        try {
            await this.dependencies.vehicleRepository.save(vehicle);
            await this.dependencies.serviceRepository.saveRules(rules, vehicle.id);
            runInAction(() => {
                this.state = FormStates.saved;
            });
        } catch (error) {
            runInAction(() => {
                this.state = FormStates.failed(errorMessage(error));
            });
        }
    }

    private vehicle(): Vehicle {
        const fields = {
            name: this.trimmedName,
            kind: this.kind,
            plate: this.parsedPlate,
            initialOdometer: this.parsedInitialOdometer,
            tankCapacity: this.parsedTankCapacity
        };
        if (this.mode.type === 'edit') {
            const existing = this.mode.vehicle;
            return makeVehicle({
                ...fields,
                id: existing.id,
                createdAt: existing.createdAt,
                isArchived: existing.isArchived
            });
        }
        return makeVehicle({ ...fields, createdAt: this.dependencies.dateProvider.now });
    }
}
