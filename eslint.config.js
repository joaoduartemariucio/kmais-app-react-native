const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

const layer = (name) => [`@/${name}`, `@/${name}/*`, `**/${name}/**`];

const restrict = (message, groups) => ({
    'no-restricted-imports': ['error', { patterns: [{ group: groups, message }] }]
});

module.exports = defineConfig([
    expoConfig,
    prettierConfig,
    {
        ignores: ['dist/*', 'coverage/*', '.build/*', '.expo/*', 'ios/*', 'android/*', 'node_modules/*']
    },
    {
        files: ['**/*.d.ts'],
        rules: { '@typescript-eslint/no-namespace': 'off' }
    },
    {
        files: ['src/domain/**/*.{ts,tsx}'],
        rules: restrict(
            'Domain is plain TypeScript. A type that needs React, Expo or another layer belongs elsewhere.',
            [
                ...layer('data'),
                ...layer('presentation'),
                ...layer('app'),
                ...layer('composition'),
                'react',
                'react-*',
                'expo',
                'expo-*',
                '@expo/*',
                '@react-native*/*',
                'mobx',
                'mobx-*',
                'i18next',
                'react-i18next'
            ]
        )
    },
    {
        files: ['src/data/**/*.{ts,tsx}'],
        rules: restrict('Data implements Domain contracts. It must not reach Presentation, the app or React.', [
            ...layer('presentation'),
            ...layer('app'),
            ...layer('composition'),
            'react',
            'react-native',
            'mobx',
            'mobx-*',
            'i18next',
            'react-i18next'
        ])
    },
    {
        files: ['src/presentation/**/*.{ts,tsx}'],
        rules: restrict('Presentation talks to Domain contracts only. This belongs to the Data layer or the app.', [
            ...layer('data'),
            ...layer('app'),
            ...layer('composition'),
            'expo-sqlite',
            'expo-sqlite/*',
            'expo-notifications',
            'better-sqlite3'
        ])
    }
]);
