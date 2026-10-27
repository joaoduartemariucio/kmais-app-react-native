import { makeServiceRule, type ServiceRule } from '@/domain/entities/ServiceRule';
import { makeVehicle } from '@/domain/entities/Vehicle';
import { RepositoryError } from '@/domain/errors/RepositoryError';
import { NumberInput, NumberInputStyles } from '@/presentation/common/NumberInput';
import { Issues } from '@/presentation/common/ValidationIssue';
import { VehicleFormViewModel, type VehicleFormMode } from '@/presentation/vehicles/VehicleFormViewModel';

import { day } from '../calculations/fixtures';
import { FixedDateProvider, InMemoryServiceRepository, InMemoryVehicleRepository } from '../fakes/InMemoryRepositories';

interface Options {
    mode?: VehicleFormMode;
    existingRules?: ServiceRule[];
    vehicleRepository?: InMemoryVehicleRepository;
    serviceRepository?: InMemoryServiceRepository;
}

function makeViewModel({
    mode = { type: 'create' },
    existingRules = [],
    vehicleRepository = new InMemoryVehicleRepository(),
    serviceRepository = new InMemoryServiceRepository()
}: Options = {}): VehicleFormViewModel {
    return new VehicleFormViewModel(mode, existingRules, {
        vehicleRepository,
        serviceRepository,
        dateProvider: new FixedDateProvider(day(30))
    });
}

describe('Vehicle form', () => {
    test('a new vehicle needs a name', () => {
        const viewModel = makeViewModel();
        viewModel.setName('   ');

        expect(viewModel.isCreating).toBe(true);
        expect(viewModel.issues).toEqual([Issues.nameRequired]);
        expect(viewModel.canSave).toBe(false);
    });

    test('a reminder needs a distance or a time interval', () => {
        const viewModel = makeViewModel();
        viewModel.setName('Gol');
        viewModel.addRule();

        expect(viewModel.issues).toEqual([Issues.ruleWithoutInterval]);

        viewModel.rules[0]?.setMonthInterval(NumberInput.text(6, NumberInputStyles.months));
        expect(viewModel.issues).toEqual([]);
    });

    test('saving a new vehicle stores it with its reminders', async () => {
        const vehicles = new InMemoryVehicleRepository();
        const services = new InMemoryServiceRepository();
        const viewModel = makeViewModel({ vehicleRepository: vehicles, serviceRepository: services });
        viewModel.setName('  Gol  ');
        viewModel.setKind('motorcycle');
        viewModel.setPlate(' abc1d23 ');
        viewModel.setInitialOdometer(NumberInput.text(56_000, NumberInputStyles.kilometers));
        viewModel.setTankCapacity(NumberInput.text(50, NumberInputStyles.liters));
        viewModel.addRule();
        viewModel.rules[0]?.setKind('chain');
        viewModel.rules[0]?.setKilometerInterval(NumberInput.text(10_000, NumberInputStyles.kilometers));

        await viewModel.save();

        const saved = (await vehicles.all(true))[0];
        expect(viewModel.state.status).toBe('saved');
        expect(saved?.name).toBe('Gol');
        expect(saved?.kind).toBe('motorcycle');
        expect(saved?.plate).toBe('ABC1D23');
        expect(saved?.initialOdometer).toBe(56_000);
        expect(saved?.tankCapacity).toBe(50);
        expect(saved?.createdAt).toEqual(day(30));

        const rules = await services.rules(saved?.id ?? '');
        expect(rules).toHaveLength(1);
        expect(rules[0]?.kind).toBe('chain');
        expect(rules[0]?.kilometerInterval).toBe(10_000);
        expect(rules[0]?.monthInterval).toBeNull();
    });

    test('editing pre-fills the vehicle and its reminders, sorted by kind', async () => {
        const vehicle = makeVehicle({
            name: 'Jetta',
            plate: 'XYZ9A87',
            initialOdometer: 144_000,
            tankCapacity: 55,
            createdAt: day(0),
            isArchived: true
        });
        const rules = [
            makeServiceRule({ vehicleId: vehicle.id, kind: 'tires', monthInterval: 12 }),
            makeServiceRule({ vehicleId: vehicle.id, kind: 'brakes', kilometerInterval: 20_000 })
        ];
        const vehicles = new InMemoryVehicleRepository([vehicle]);
        const viewModel = makeViewModel({
            mode: { type: 'edit', vehicle },
            existingRules: rules,
            vehicleRepository: vehicles
        });

        expect(viewModel.isCreating).toBe(false);
        expect(viewModel.name).toBe('Jetta');
        expect(viewModel.plate).toBe('XYZ9A87');
        expect(viewModel.parsedInitialOdometer).toBe(144_000);
        expect(viewModel.parsedTankCapacity).toBe(55);
        expect(viewModel.rules.map((rule) => rule.kind)).toEqual(['brakes', 'tires']);
        expect(viewModel.rules[1]?.parsedMonthInterval).toBe(12);

        viewModel.setPlate('');
        await viewModel.save();

        const saved = await vehicles.vehicle(vehicle.id);
        expect(saved?.plate).toBeNull();
        expect(saved?.createdAt).toEqual(day(0));
        expect(saved?.isArchived).toBe(true);
    });

    test('removing reminders ignores indices out of range', () => {
        const viewModel = makeViewModel();
        viewModel.addRule();
        viewModel.addRule();
        const kept = viewModel.rules[1]?.id;

        viewModel.removeRules([0, 5]);

        expect(viewModel.rules.map((rule) => rule.id)).toEqual([kept]);
    });

    test('a blocking issue prevents saving', async () => {
        const vehicles = new InMemoryVehicleRepository();
        const viewModel = makeViewModel({ vehicleRepository: vehicles });

        await viewModel.save();

        expect(viewModel.state.status).toBe('editing');
        expect(await vehicles.all(true)).toEqual([]);
    });

    test('a repository failure is shown to the user', async () => {
        const viewModel = makeViewModel({
            vehicleRepository: new InMemoryVehicleRepository([], RepositoryError.vehicleNotFound('missing'))
        });
        viewModel.setName('Gol');

        await viewModel.save();

        expect(viewModel.state.status).toBe('failed');
    });
});
