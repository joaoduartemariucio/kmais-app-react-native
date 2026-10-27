import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { MaintenanceLevel } from '@/domain/calculations/MaintenanceStatus';

export interface Theme {
    readonly scheme: 'light' | 'dark';
    readonly background: string;
    readonly card: string;
    readonly label: string;
    readonly secondaryLabel: string;
    readonly tertiaryLabel: string;
    readonly separator: string;
    readonly fill: string;
    readonly accent: string;
    readonly fuel: string;
    readonly service: string;
    readonly green: string;
    readonly orange: string;
    readonly red: string;
    readonly blue: string;
    readonly levels: Readonly<Record<MaintenanceLevel, string>>;
}

const light: Theme = {
    scheme: 'light',
    background: '#F2F2F7',
    card: '#FFFFFF',
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.6)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
    separator: 'rgba(60, 60, 67, 0.29)',
    fill: 'rgba(118, 118, 128, 0.12)',
    accent: '#007AFF',
    fuel: '#30B0C7',
    service: '#5856D6',
    green: '#34C759',
    orange: '#FF9500',
    red: '#FF3B30',
    blue: '#007AFF',
    levels: {
        [MaintenanceLevel.OnTrack]: '#34C759',
        [MaintenanceLevel.DueSoon]: '#FF9500',
        [MaintenanceLevel.Overdue]: '#FF3B30'
    }
};

const dark: Theme = {
    scheme: 'dark',
    background: '#000000',
    card: '#1C1C1E',
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.6)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
    separator: 'rgba(84, 84, 88, 0.6)',
    fill: 'rgba(118, 118, 128, 0.24)',
    accent: '#0A84FF',
    fuel: '#40C8E0',
    service: '#5E5CE6',
    green: '#30D158',
    orange: '#FF9F0A',
    red: '#FF453A',
    blue: '#0A84FF',
    levels: {
        [MaintenanceLevel.OnTrack]: '#30D158',
        [MaintenanceLevel.DueSoon]: '#FF9F0A',
        [MaintenanceLevel.Overdue]: '#FF453A'
    }
};

const darkElevated: Theme = { ...dark, background: '#1C1C1E', card: '#2C2C2E' };

export const Palette = { light, dark, darkElevated };

export const ElevationContext = createContext(false);

export function withOpacity(color: string, opacity: number): string {
    const hex = color.replace('#', '');
    const value = Number.parseInt(hex, 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}

export function useTheme(): Theme {
    const isElevated = useContext(ElevationContext);
    if (useColorScheme() !== 'dark') return light;
    return isElevated ? darkElevated : dark;
}
