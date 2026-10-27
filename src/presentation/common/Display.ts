import { MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';
import type { ServiceKind } from '@/domain/entities/ServiceKind';
import type { VehicleKind } from '@/domain/entities/VehicleKind';

import { t } from '../i18n/i18n';
import { Symbols, type SymbolName } from './Symbols';

export function serviceKindLabel(kind: ServiceKind): string {
    switch (kind) {
        case 'oilChange':
            return t('Oil change');
        case 'oilFilter':
            return t('Oil filter');
        case 'airFilter':
            return t('Air filter');
        case 'fuelFilter':
            return t('Fuel filter');
        case 'sparkPlugs':
            return t('Spark plugs');
        case 'brakes':
            return t('Brakes');
        case 'tires':
            return t('Tires');
        case 'chain':
            return t('Chain');
        case 'coolant':
            return t('Coolant');
        case 'inspection':
            return t('Inspection');
        case 'other':
            return t('Other');
    }
}

export function serviceKindSymbol(kind: ServiceKind): SymbolName {
    switch (kind) {
        case 'oilChange':
        case 'oilFilter':
            return Symbols.oil;
        case 'airFilter':
        case 'fuelFilter':
            return Symbols.filter;
        case 'sparkPlugs':
            return Symbols.bolt;
        case 'brakes':
            return Symbols.brakes;
        case 'tires':
            return Symbols.tire;
        case 'chain':
            return Symbols.link;
        case 'coolant':
            return Symbols.thermometer;
        case 'inspection':
            return Symbols.checklist;
        case 'other':
            return Symbols.wrench;
    }
}

export function vehicleKindLabel(kind: VehicleKind): string {
    return kind === 'car' ? t('Car') : t('Motorcycle');
}

export function vehicleKindSymbol(kind: VehicleKind): SymbolName {
    return kind === 'car' ? Symbols.car : Symbols.motorcycle;
}

export function levelLabel(level: MaintenanceLevel): string {
    switch (level) {
        case MaintenanceLevel.OnTrack:
            return t('On track');
        case MaintenanceLevel.DueSoon:
            return t('Due soon');
        case MaintenanceLevel.Overdue:
            return t('Overdue');
    }
}

export function levelSymbol(level: MaintenanceLevel): SymbolName {
    switch (level) {
        case MaintenanceLevel.OnTrack:
            return Symbols.onTrack;
        case MaintenanceLevel.DueSoon:
            return Symbols.dueSoon;
        case MaintenanceLevel.Overdue:
            return Symbols.overdue;
    }
}
