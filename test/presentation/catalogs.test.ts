import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import en from '@/presentation/i18n/locales/en.json';
import ptBR from '@/presentation/i18n/locales/pt-BR.json';

function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(name) ? [path] : [];
    });
}

const pluralSuffix = /_(one|other)$/;

describe('Localization catalogs', () => {
    test('English and Portuguese have the same keys, all translated', () => {
        expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
        for (const value of Object.values(ptBR)) {
            expect(value.trim()).not.toBe('');
        }
    });

    test('every string used in the code is in the catalogs, and every catalog key is used', () => {
        const pattern = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
        const used = new Set<string>();
        for (const file of sourceFiles(join(__dirname, '../../src'))) {
            for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
                used.add((match[2] ?? '').replace(/\\'/g, "'"));
            }
        }
        const keys = new Set(Object.keys(en).map((key) => key.replace(pluralSuffix, '')));

        expect([...used].filter((key) => !keys.has(key))).toEqual([]);
        expect([...keys].filter((key) => !used.has(key))).toEqual([]);
    });
});
