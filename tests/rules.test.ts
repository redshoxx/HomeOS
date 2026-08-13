import { describe, expect, it } from 'vitest';
import { budgetRemaining, daysUntil, isBelowMinimum, nextRecurringDate } from '../src/utils/rules';

describe('HomeOS rules', () => {
  it('calculates budget remaining without going below zero', () => {
    expect(budgetRemaining(1200, 688)).toBe(512);
    expect(budgetRemaining(100, 150)).toBe(0);
  });
  it('detects minimum stock', () => {
    expect(isBelowMinimum(1, 2)).toBe(true);
    expect(isBelowMinimum(2, 2)).toBe(false);
  });
  it('calculates expiry day distance', () => {
    expect(daysUntil('2026-08-14', new Date('2026-08-13T12:00:00Z'))).toBe(1);
  });
  it('calculates weekly recurrence', () => {
    expect(nextRecurringDate('2026-08-13T10:00:00.000Z', 'weekly')).toBe('2026-08-20T10:00:00.000Z');
  });
});
