import { Decimal } from 'decimal.js';

import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import { NumberInput, NumberInputStyles } from '@/presentation/common/NumberInput';
import { Issues } from '@/presentation/common/ValidationIssue';
import { FuelEntryFormViewModel, type FuelEntryFormMode } from '@/presentation/fueling/FuelEntryFormViewModel';

import { day, dec, full, sample, testVehicleId } from '../calculations/fixtures';
import { FixedDateProvider, InMemoryFuelEntryRepository } from '../fakes/InMemoryRepositories';

interface Options {
    mode?: FuelEntryFormMode;
    repository?: InMemoryFuelEntryRepository;
    otherReadings?: OdometerSample[];
    suggestedPrice?: Decimal | null;
}

function makeViewModel({
    mode = { type: 'create', vehicleId: testVehicleId },
    repository = new InMemoryFuelEntryRepository(),
    otherReadings = [],
    suggestedPrice = null
}: Options = {}): FuelEntryFormViewModel {
    return new FuelEntryFormViewModel(mode, {
        repository,
        dateProvider: new FixedDateProvider(day(30)),
        otherReadings,
        suggestedPrice
    });
}

function fill(viewModel: FuelEntryFormViewModel, odometer = 1_500, liters = 40, price: Decimal.Value = 5): void {
    viewModel.setOdometer(NumberInput.text(odometer, NumberInputStyles.kilometers));
    viewModel.setLiters(NumberInput.text(liters, NumberInputStyles.liters));
    viewModel.setPricePerLiter(NumberInput.text(dec(price), NumberInputStyles.fuelPrice));
}

describe('Fuel entry form', () => {
    test('a new form starts today, full tank, with every field required', () => {
        const viewModel = makeViewModel();

        expect(viewModel.date).toEqual(day(30));
        expect(viewModel.isFullTank).toBe(true);
        expect(viewModel.isCreating).toBe(true);
        expect(viewModel.issues).toEqual([Issues.odometerRequired, Issues.litersRequired, Issues.priceRequired]);
        expect(viewModel.canSave).toBe(false);
        expect(viewModel.totalCost).toBeNull();
    });

    test('zero liters and zero price are rejected', () => {
        const viewModel = makeViewModel();
        fill(viewModel, 1_500, 0, 0);

        expect(viewModel.issues).toEqual([Issues.litersNotPositive, Issues.priceNotPositive]);
        expect(viewModel.canSave).toBe(false);
    });

    test('the total is liters times price', () => {
        const viewModel = makeViewModel();
        fill(viewModel, 1_500, 40, 5);

        expect(viewModel.totalCost).toEqualDecimal(200);
    });

    test('saving creates the entry for the vehicle', async () => {
        const repository = new InMemoryFuelEntryRepository();
        const viewModel = makeViewModel({ repository });
        fill(viewModel);
        viewModel.setFullTank(false);

        await viewModel.save();

        const saved = await repository.entries(testVehicleId);
        expect(viewModel.state.status).toBe('saved');
        expect(saved).toHaveLength(1);
        expect(saved[0]?.odometer).toBe(1_500);
        expect(saved[0]?.liters).toBe(40);
        expect(saved[0]?.pricePerLiter).toEqualDecimal(5);
        expect(saved[0]?.isFullTank).toBe(false);
    });

    test("editing pre-fills the fields and keeps the entry's identity", async () => {
        const existing = full(10, 1_200, 35, { price: 6 });
        const repository = new InMemoryFuelEntryRepository([existing]);
        const viewModel = makeViewModel({ mode: { type: 'edit', entry: existing }, repository });

        expect(viewModel.isCreating).toBe(false);
        expect(viewModel.parsedOdometer).toBe(1_200);
        expect(viewModel.parsedLiters).toBe(35);
        expect(viewModel.parsedPrice).toEqualDecimal(6);
        expect(viewModel.date).toEqual(day(10));

        viewModel.setLiters(NumberInput.text(36, NumberInputStyles.liters));
        viewModel.setDate(day(11));
        await viewModel.save();

        const saved = await repository.entries(testVehicleId);
        expect(saved.map((entry) => entry.id)).toEqual([existing.id]);
        expect(saved[0]?.liters).toBe(36);
        expect(saved[0]?.date).toEqual(day(11));
    });

    test('an odometer out of order warns but still saves', async () => {
        const viewModel = makeViewModel({ otherReadings: [sample(40, 2_000)] });
        fill(viewModel, 2_100);

        expect(viewModel.issues).toEqual([Issues.odometerNotBeforeNext(2_000)]);
        expect(viewModel.canSave).toBe(true);

        await viewModel.save();
        expect(viewModel.state.status).toBe('saved');
    });

    test('a blocking issue prevents saving', async () => {
        const repository = new InMemoryFuelEntryRepository();
        const viewModel = makeViewModel({ repository });

        await viewModel.save();

        expect(viewModel.state.status).toBe('editing');
        expect(await repository.entries(testVehicleId)).toEqual([]);
    });

    test('a repository failure is shown to the user', async () => {
        const viewModel = makeViewModel({
            repository: new InMemoryFuelEntryRepository([], RepositoryError.vehicleNotFound(testVehicleId))
        });
        fill(viewModel);

        await viewModel.save();

        expect(viewModel.state).toEqual({ status: 'failed', message: 'This vehicle no longer exists.' });
    });

    test('a new fuel-up starts with the suggested price; an edit keeps its own', () => {
        const created = makeViewModel({ suggestedPrice: dec('5.899') });
        expect(created.parsedPrice).toEqualDecimal('5.899');
        expect(created.isUsingSuggestedPrice).toBe(true);
        created.setPricePerLiter(NumberInput.text(dec(6), NumberInputStyles.fuelPrice));
        expect(created.isUsingSuggestedPrice).toBe(false);

        const entry = full(10, 1_000, 30, { price: 6 });
        const edited = makeViewModel({ mode: { type: 'edit', entry }, suggestedPrice: dec(4) });
        expect(edited.parsedPrice).toEqualDecimal(6);
        expect(edited.isUsingSuggestedPrice).toBe(false);
        expect(makeViewModel().isUsingSuggestedPrice).toBe(false);
    });

    test('the form shows the previous reading and the distance driven since', () => {
        const viewModel = makeViewModel({ otherReadings: [sample(10, 1_000), sample(60, 2_000)] });

        expect(viewModel.previousReading).toBe(1_000);
        expect(viewModel.distanceSincePrevious).toBeNull();

        viewModel.setOdometer(NumberInput.text(1_350, NumberInputStyles.kilometers));
        expect(viewModel.distanceSincePrevious).toBe(350);

        viewModel.setOdometer(NumberInput.text(900, NumberInputStyles.kilometers));
        expect(viewModel.distanceSincePrevious).toBeNull();
    });
});
