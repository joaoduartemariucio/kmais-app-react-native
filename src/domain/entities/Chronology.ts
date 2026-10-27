export interface Chronological {
    readonly date: Date;
    readonly odometer: number;
}

export function sortedChronologically<Element extends Chronological>(elements: readonly Element[]): Element[] {
    return [...elements].sort((lhs, rhs) => {
        const byDate = lhs.date.getTime() - rhs.date.getTime();
        return byDate === 0 ? lhs.odometer - rhs.odometer : byDate;
    });
}
