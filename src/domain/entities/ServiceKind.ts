export const serviceKinds = [
    'oilChange',
    'oilFilter',
    'airFilter',
    'fuelFilter',
    'sparkPlugs',
    'brakes',
    'tires',
    'chain',
    'coolant',
    'inspection',
    'other'
] as const;

export type ServiceKind = (typeof serviceKinds)[number];

export function compareServiceKinds(lhs: ServiceKind, rhs: ServiceKind): number {
    if (lhs === rhs) return 0;
    return lhs < rhs ? -1 : 1;
}
