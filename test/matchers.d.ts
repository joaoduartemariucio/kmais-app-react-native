import type { Decimal } from 'decimal.js';

declare global {
    namespace jest {
        interface Matchers<R> {
            toEqualDecimal(expected: Decimal.Value): R;
        }
    }
}
