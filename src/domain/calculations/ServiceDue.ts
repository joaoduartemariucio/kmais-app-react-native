import type { OdometerSample } from '../entities/OdometerSample';
import type { ServiceRule } from '../entities/ServiceRule';
import type { MaintenanceForecast } from './MaintenanceForecast';

export interface ServiceDue {
    readonly rule: ServiceRule;
    readonly forecast: MaintenanceForecast;
    readonly since: OdometerSample;
}
