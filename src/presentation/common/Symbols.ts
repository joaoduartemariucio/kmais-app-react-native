import type { SymbolViewProps } from 'expo-symbols';

type PlatformNames = Exclude<SymbolViewProps['name'], string>;

export interface SymbolName {
    readonly ios: NonNullable<PlatformNames['ios']>;
    readonly android: NonNullable<PlatformNames['android']>;
}

const symbol = (name: SymbolName): SymbolName => name;

export const Symbols = {
    car: symbol({ ios: 'car.fill', android: 'directions_car' }),
    motorcycle: symbol({ ios: 'motorcycle.fill', android: 'two_wheeler' }),
    cars: symbol({ ios: 'car.2.fill', android: 'garage' }),
    oil: symbol({ ios: 'oilcan.fill', android: 'oil_barrel' }),
    filter: symbol({ ios: 'air.purifier.fill', android: 'air' }),
    bolt: symbol({ ios: 'bolt.fill', android: 'bolt' }),
    brakes: symbol({ ios: 'brakesignal', android: 'tire_repair' }),
    tire: symbol({ ios: 'tire', android: 'trip_origin' }),
    link: symbol({ ios: 'link', android: 'link' }),
    thermometer: symbol({ ios: 'thermometer.medium', android: 'thermostat' }),
    checklist: symbol({ ios: 'checklist', android: 'checklist' }),
    wrench: symbol({ ios: 'wrench.and.screwdriver.fill', android: 'construction' }),
    fuelPump: symbol({ ios: 'fuelpump.fill', android: 'local_gas_station' }),
    onTrack: symbol({ ios: 'checkmark.circle.fill', android: 'check_circle' }),
    dueSoon: symbol({ ios: 'clock.badge.exclamationmark.fill', android: 'schedule' }),
    overdue: symbol({ ios: 'exclamationmark.triangle.fill', android: 'warning' }),
    clock: symbol({ ios: 'clock.fill', android: 'schedule' }),
    seal: symbol({ ios: 'checkmark.seal.fill', android: 'verified' }),
    info: symbol({ ios: 'info.circle.fill', android: 'info' }),
    warning: symbol({ ios: 'exclamationmark.triangle', android: 'warning' }),
    archive: symbol({ ios: 'archivebox', android: 'archive' }),
    unarchive: symbol({ ios: 'arrow.uturn.backward', android: 'undo' }),
    plus: symbol({ ios: 'plus', android: 'add' }),
    plusCircle: symbol({ ios: 'plus.circle.fill', android: 'add_circle' }),
    pencil: symbol({ ios: 'pencil', android: 'edit' }),
    trash: symbol({ ios: 'trash', android: 'delete' }),
    calendar: symbol({ ios: 'calendar', android: 'calendar_month' }),
    gauge: symbol({ ios: 'gauge.with.needle', android: 'speed' }),
    gaugeDots: symbol({ ios: 'gauge.with.dots.needle.67percent', android: 'speed' }),
    speedometer: symbol({ ios: 'speedometer', android: 'speed' }),
    road: symbol({ ios: 'road.lanes', android: 'road' }),
    creditCard: symbol({ ios: 'creditcard', android: 'credit_card' }),
    bell: symbol({ ios: 'bell.badge', android: 'notifications' }),
    history: symbol({ ios: 'list.bullet.rectangle', android: 'history' }),
    chevron: symbol({ ios: 'chevron.right', android: 'chevron_right' })
};
