import { getLocales } from 'expo-localization';

const primary = getLocales()[0];

export const AppLocale = {
    tag: primary?.languageTag ?? 'en-US',
    language: primary?.languageCode === 'pt' ? 'pt-BR' : 'en',
    currency: primary?.currencyCode ?? 'BRL'
};
