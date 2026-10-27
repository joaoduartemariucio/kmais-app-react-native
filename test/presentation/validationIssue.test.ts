import {
    blocksSaving,
    isBlocking,
    issueId,
    issueMessage,
    Issues,
    odometerIssues,
    type ValidationIssue
} from '@/presentation/common/ValidationIssue';

import { day, sample } from '../calculations/fixtures';

const readings = [sample(0, 1_000), sample(20, 2_000)];

describe('Validation issues', () => {
    test('a missing odometer is required', () => {
        expect(odometerIssues(null, day(10), readings)).toEqual([Issues.odometerRequired]);
    });

    test('an odometer between its neighbors has no issue', () => {
        expect(odometerIssues(1_500, day(10), readings)).toEqual([]);
    });

    test('an odometer not above the previous reading warns', () => {
        const issues = odometerIssues(1_000, day(10), readings);

        expect(issues).toEqual([Issues.odometerNotAfterPrevious(1_000)]);
        expect(blocksSaving(issues)).toBe(false);
    });

    test('an odometer not below the next reading warns', () => {
        const issues = odometerIssues(2_000, day(10), readings);

        expect(issues).toEqual([Issues.odometerNotBeforeNext(2_000)]);
        expect(blocksSaving(issues)).toBe(false);
    });

    test('only the odometer order is a warning; everything else blocks saving', () => {
        const warnings = [Issues.odometerNotAfterPrevious(1), Issues.odometerNotBeforeNext(1)];
        const errors = [
            Issues.nameRequired,
            Issues.odometerRequired,
            Issues.litersRequired,
            Issues.litersNotPositive,
            Issues.priceRequired,
            Issues.priceNotPositive,
            Issues.costNegative,
            Issues.ruleWithoutInterval
        ];

        expect(warnings.some(isBlocking)).toBe(false);
        expect(errors.every(isBlocking)).toBe(true);
        expect(blocksSaving([...warnings, Issues.nameRequired])).toBe(true);
    });

    test('every issue has a message and its own id', () => {
        const issues: ValidationIssue[] = [
            Issues.nameRequired,
            Issues.odometerRequired,
            Issues.odometerNotAfterPrevious(1_000),
            Issues.odometerNotBeforeNext(2_000),
            Issues.litersRequired,
            Issues.litersNotPositive,
            Issues.priceRequired,
            Issues.priceNotPositive,
            Issues.costNegative,
            Issues.ruleWithoutInterval
        ];

        for (const issue of issues) {
            expect(issueMessage(issue)).not.toBe('');
        }
        expect(new Set(issues.map(issueMessage)).size).toBe(issues.length);
        expect(new Set(issues.map(issueId)).size).toBe(issues.length);
        expect(issueMessage(Issues.odometerNotBeforeNext(2_000))).toContain('2,000 km');
    });
});
