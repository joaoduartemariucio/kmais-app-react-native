export const vehicleKinds = ['car', 'motorcycle'] as const;

export type VehicleKind = (typeof vehicleKinds)[number];
