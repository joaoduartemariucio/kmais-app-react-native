import { createInstance } from 'i18next';

import { AppLocale } from '../common/AppLocale';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

const i18n = createInstance();

void i18n.init({
    resources: { en: { translation: en }, 'pt-BR': { translation: ptBR } },
    lng: AppLocale.language,
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    initAsync: false
});

export const t = i18n.t.bind(i18n);
