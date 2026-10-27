import { Decimal } from 'decimal.js';

import '@/presentation/i18n/i18n';

jest.mock('expo-localization', () => ({
    getLocales: () => [{ languageTag: 'en-US', languageCode: 'en', currencyCode: 'USD' }]
}));

expect.extend({
    toEqualDecimal(received: unknown, expected: Decimal.Value) {
        const pass = received instanceof Decimal && received.equals(expected);
        return {
            pass,
            message: () => `expected ${String(received)} ${pass ? 'not ' : ''}to equal decimal ${String(expected)}`
        };
    }
});
