import type { Chronological } from './Chronology';

export interface OdometerSample extends Chronological {
    readonly date: Date;
    readonly odometer: number;
}
