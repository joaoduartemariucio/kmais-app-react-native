export const Log = {
    error(category: string, message: string, error: unknown): void {
        console.error(`[${category}] ${message}`, error);
    }
};
