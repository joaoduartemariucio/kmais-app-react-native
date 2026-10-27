import { Odometer } from '@/domain/calculations/Odometer';
import type { OdometerSample } from '@/domain/entities/OdometerSample';

import { t } from '../i18n/i18n';
import { formattedKilometers } from './FormatStyles';

export type ValidationIssue =
    | { readonly type: 'nameRequired' }
    | { readonly type: 'odometerRequired' }
    | { readonly type: 'odometerNotAfterPrevious'; readonly previous: number }
    | { readonly type: 'odometerNotBeforeNext'; readonly next: number }
    | { readonly type: 'litersRequired' }
    | { readonly type: 'litersNotPositive' }
    | { readonly type: 'priceRequired' }
    | { readonly type: 'priceNotPositive' }
    | { readonly type: 'costNegative' }
    | { readonly type: 'ruleWithoutInterval' };

export const Issues = {
    nameRequired: { type: 'nameRequired' } as ValidationIssue,
    odometerRequired: { type: 'odometerRequired' } as ValidationIssue,
    odometerNotAfterPrevious: (previous: number): ValidationIssue => ({ type: 'odometerNotAfterPrevious', previous }),
    odometerNotBeforeNext: (next: number): ValidationIssue => ({ type: 'odometerNotBeforeNext', next }),
    litersRequired: { type: 'litersRequired' } as ValidationIssue,
    litersNotPositive: { type: 'litersNotPositive' } as ValidationIssue,
    priceRequired: { type: 'priceRequired' } as ValidationIssue,
    priceNotPositive: { type: 'priceNotPositive' } as ValidationIssue,
    costNegative: { type: 'costNegative' } as ValidationIssue,
    ruleWithoutInterval: { type: 'ruleWithoutInterval' } as ValidationIssue
};

export function issueId(issue: ValidationIssue): string {
    switch (issue.type) {
        case 'odometerNotAfterPrevious':
            return `${issue.type}-${issue.previous}`;
        case 'odometerNotBeforeNext':
            return `${issue.type}-${issue.next}`;
        default:
            return issue.type;
    }
}

export function isBlocking(issue: ValidationIssue): boolean {
    return issue.type !== 'odometerNotAfterPrevious' && issue.type !== 'odometerNotBeforeNext';
}

export function blocksSaving(issues: readonly ValidationIssue[]): boolean {
    return issues.some(isBlocking);
}

export function issueMessage(issue: ValidationIssue): string {
    switch (issue.type) {
        case 'nameRequired':
            return t('Give the vehicle a name.');
        case 'odometerRequired':
            return t('Enter the odometer reading.');
        case 'odometerNotAfterPrevious':
            return t("The previous record has {{distance}}. Saving this changes the vehicle's history.", {
                distance: formattedKilometers(issue.previous)
            });
        case 'odometerNotBeforeNext':
            return t("The next record has {{distance}}. Saving this changes the vehicle's history.", {
                distance: formattedKilometers(issue.next)
            });
        case 'litersRequired':
            return t('Enter how many liters you filled.');
        case 'litersNotPositive':
            return t('Liters must be greater than zero.');
        case 'priceRequired':
            return t('Enter the price per liter.');
        case 'priceNotPositive':
            return t('Price must be greater than zero.');
        case 'costNegative':
            return t('Cost cannot be negative.');
        case 'ruleWithoutInterval':
            return t('A reminder needs a distance or a time interval.');
    }
}

export function odometerIssues(
    odometer: number | null,
    date: Date,
    otherReadings: readonly OdometerSample[]
): ValidationIssue[] {
    if (odometer === null) return [Issues.odometerRequired];

    const neighbors = Odometer.neighbors(date, otherReadings);
    const issues: ValidationIssue[] = [];
    if (neighbors.previous !== null && odometer <= neighbors.previous) {
        issues.push(Issues.odometerNotAfterPrevious(neighbors.previous));
    }
    if (neighbors.next !== null && odometer >= neighbors.next) {
        issues.push(Issues.odometerNotBeforeNext(neighbors.next));
    }
    return issues;
}
