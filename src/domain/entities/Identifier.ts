export type Identifier = string;

const hex = (byte: number) => byte.toString(16).padStart(2, '0');

function randomBytes(): number[] {
    const bytes = new Uint8Array(16);
    const crypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
    if (crypto?.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes);
}

export function newIdentifier(): Identifier {
    const bytes = randomBytes();
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const text = bytes.map(hex).join('');
    return [text.slice(0, 8), text.slice(8, 12), text.slice(12, 16), text.slice(16, 20), text.slice(20)].join('-');
}
