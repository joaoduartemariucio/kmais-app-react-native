import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDependencies } from '@/composition/AppDependencies';
import { Palette } from '@/presentation/common/Palette';
import { DependenciesProvider } from '@/presentation/di/Dependencies';
import '@/presentation/i18n/i18n';

void SplashScreen.preventAutoHideAsync();

export default function KmaisApp() {
    const [dependencies, setDependencies] = useState<AppDependencies | null>(null);
    const isDark = useColorScheme() === 'dark';
    const palette = isDark ? Palette.dark : Palette.light;
    const navigationTheme = isDark ? DarkTheme : DefaultTheme;

    useEffect(() => {
        void AppDependencies.start().then(setDependencies);
    }, []);

    useEffect(() => {
        if (dependencies) SplashScreen.hide();
    }, [dependencies]);

    if (!dependencies) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider
                value={{
                    ...navigationTheme,
                    colors: {
                        ...navigationTheme.colors,
                        background: palette.background,
                        card: palette.background,
                        primary: palette.accent,
                        text: palette.label
                    }
                }}
            >
                <DependenciesProvider value={dependencies}>
                    <Stack
                        screenOptions={{
                            headerLargeTitle: true,
                            headerTransparent: Platform.OS === 'ios',
                            headerLargeTitleShadowVisible: false,
                            headerShadowVisible: false,
                            headerBackButtonDisplayMode: 'minimal',
                            contentStyle: { backgroundColor: palette.background }
                        }}
                    />
                    <StatusBar style="auto" />
                </DependenciesProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
