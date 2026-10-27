import type { OdometerSample } from '@/domain/entities/OdometerSample';
import { makeServiceEntry } from '@/domain/entities/ServiceEntry';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import { NumberInput, NumberInputStyles } from '@/presentation/common/NumberInput';
import { Issues } from '@/presentation/common/ValidationIssue';
import {
    ServiceEntryFormViewModel,
    type ServiceEntryFormMode
} from '@/presentation/maintenance/ServiceEntryFormViewModel';

import { day, dec, sample, testVehicleId } from '../calculations/fixtures';
import { FixedDateProvider, InMemoryServiceRepository } from '../fakes/InMemoryRepositories';

interface Options {
    mode?: ServiceEntryFormMode;
    repository?: InMemoryServiceRepository;
    otherReadings?: OdometerSample[];
}

function makeViewModel({
    mode = { type: 'create', vehicleId: testVehicleId },
    repository = new InMemoryServiceRepository(),
    otherReadings = []
}: Options = {}): ServiceEntryFormViewModel {
    return new ServiceEntryFormViewModel(mode, {
        repository,
        dateProvider: new FixedDateProvider(day(30)),
        otherReadings
    });
}

describe('Service entry form', () => {
    test('a new form defaults to an oil change today and only needs the odometer', () => {
        const viewModel = makeViewModel();

        expect(viewModel.kind).toBe('oilChange');
        expect(viewModel.date).toEqual(day(30));
        expect(viewModel.isCreating).toBe(true);
        expect(viewModel.issues).toEqual([Issues.odometerRequired]);
        expect(viewModel.canSave).toBe(false);
    });

    test('an empty cost is saved as zero and notes are trimmed', async () => {
        const repository = new InMemoryServiceRepository();
        const viewModel = makeViewModel({ repository });
        viewModel.setKind('tires');
        viewModel.setOdometer(NumberInput.text(1_500, NumberInputStyles.kilometers));
        viewModel.setNotes('  front tires  \n');

        expect(viewModel.canSave).toBe(true);
        await viewModel.save();

        const saved = await repository.entries(testVehicleId);
        expect(viewModel.state.status).toBe('saved');
        expect(saved).toHaveLength(1);
        expect(saved[0]?.kind).toBe('tires');
        expect(saved[0]?.odometer).toBe(1_500);
        expect(saved[0]?.cost).toEqualDecimal(0);
        expect(saved[0]?.notes).toBe('front tires');
    });

    test("editing pre-fills the fields and keeps the entry's identity", async () => {
        const existing = makeServiceEntry({
            vehicleId: testVehicleId,
            kind: 'brakes',
            date: day(10),
            odometer: 1_200,
            cost: dec(350),
            notes: 'pads'
        });
        const repository = new InMemoryServiceRepository([existing]);
        const viewModel = makeViewModel({ mode: { type: 'edit', entry: existing }, repository });

        expect(viewModel.isCreating).toBe(false);
        expect(viewModel.kind).toBe('brakes');
        expect(viewModel.parsedOdometer).toBe(1_200);
        expect(viewModel.parsedCost).toEqualDecimal(350);
        expect(viewModel.notes).toBe('pads');

        viewModel.setCost(NumberInput.text(dec(400), NumberInputStyles.money));
        viewModel.setDate(day(12));
        await viewModel.save();

        const saved = await repository.entries(testVehicleId);
        expect(saved.map((entry) => entry.id)).toEqual([existing.id]);
        expect(saved[0]?.cost).toEqualDecimal(400);
        expect(saved[0]?.date).toEqual(day(12));
    });

    test('an odometer below the previous record warns but still saves', async () => {
        const viewModel = makeViewModel({ otherReadings: [sample(10, 2_000)] });
        viewModel.setOdometer(NumberInput.text(1_900, NumberInputStyles.kilometers));

        expect(viewModel.issues).toEqual([Issues.odometerNotAfterPrevious(2_000)]);

        await viewModel.save();
        expect(viewModel.state.status).toBe('saved');
    });

    test('a blocking issue prevents saving', async () => {
        const repository = new InMemoryServiceRepository();
        const viewModel = makeViewModel({ repository });

        await viewModel.save();

        expect(viewModel.state.status).toBe('editing');
        expect(await repository.entries(testVehicleId)).toEqual([]);
    });

    test('a repository failure is shown to the user', async () => {
        const viewModel = makeViewModel({
            repository: new InMemoryServiceRepository([], [], RepositoryError.vehicleNotFound(testVehicleId))
        });
        viewModel.setOdometer(NumberInput.text(1_500, NumberInputStyles.kilometers));

        await viewModel.save();

        expect(viewModel.state.status).toBe('failed');
    });

    test('the form shows the reading right before its date', () => {
        expect(makeViewModel().previousReading).toBeNull();
        expect(makeViewModel({ otherReadings: [sample(10, 1_000), sample(60, 2_000)] }).previousReading).toBe(1_000);
    });
});
