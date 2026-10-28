export function gridColumns(width: number, minimumWidth: number, spacing: number): number {
    if (!Number.isFinite(width) || width <= 0) return 1;
    return Math.max(1, Math.floor((width + spacing) / (minimumWidth + spacing)));
}

export function gridRows<Item>(items: readonly Item[], columns: number): (Item | null)[][] {
    const size = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1;
    const rows: (Item | null)[][] = [];
    for (let start = 0; start < items.length; start += size) {
        const row: (Item | null)[] = items.slice(start, start + size);
        while (row.length < size) row.push(null);
        rows.push(row);
    }
    return rows;
}
