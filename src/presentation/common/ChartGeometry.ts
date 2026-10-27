export interface Point {
    readonly x: number;
    readonly y: number;
}

function niceStep(range: number, count: number): number {
    const rough = range / Math.max(1, count);
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const residual = rough / magnitude;
    const factor = residual > 5 ? 10 : residual > 2.5 ? 5 : residual > 2 ? 2.5 : residual > 1 ? 2 : 1;
    return factor * magnitude;
}

export function niceTicks(minimum: number, maximum: number, count = 4): number[] {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return [];
    const low = Math.min(minimum, maximum);
    let high = Math.max(minimum, maximum);
    if (high === low) high = low === 0 ? 1 : low + Math.abs(low) * 0.1;

    const step = niceStep(high - low, count);
    const first = Math.floor(low / step) * step;
    const last = Math.ceil(high / step) * step;
    const ticks: number[] = [];
    for (let value = first; value <= last + step / 2; value += step) {
        ticks.push(Number(value.toPrecision(12)));
    }
    return ticks;
}

export function monotonePath(points: readonly Point[]): string {
    const [first] = points;
    if (!first) return '';
    if (points.length === 1) return `M${first.x},${first.y}`;

    const slopes = points.slice(1).map((point, index) => {
        const previous = points[index] as Point;
        const dx = point.x - previous.x;
        return dx === 0 ? 0 : (point.y - previous.y) / dx;
    });
    const tangents = points.map((_, index) => {
        if (index === 0) return slopes[0] ?? 0;
        if (index === points.length - 1) return slopes[index - 1] ?? 0;
        const before = slopes[index - 1] ?? 0;
        const after = slopes[index] ?? 0;
        return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
    });

    let path = `M${first.x},${first.y}`;
    for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1] as Point;
        const end = points[index] as Point;
        const third = (end.x - start.x) / 3;
        const startTangent = tangents[index - 1] ?? 0;
        const endTangent = tangents[index] ?? 0;
        path += ` C${start.x + third},${start.y + third * startTangent} ${end.x - third},${end.y - third * endTangent} ${end.x},${end.y}`;
    }
    return path;
}

export function evenlySpacedIndices(length: number, count: number): number[] {
    if (length <= 0) return [];
    if (length <= count) return Array.from({ length }, (_, index) => index);
    return Array.from({ length: count }, (_, index) => Math.round((index * (length - 1)) / (count - 1)));
}
