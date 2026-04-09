/**
 * Unit tests for StrengthPage pure functions.
 *
 * epley1RM is the Epley one-rep-max estimation formula used to normalise
 * multi-rep performances to a comparable single-rep equivalent. Errors here
 * would silently skew all est-1RM chart data.
 */
import { describe, it, expect } from 'vitest';
import { epley1RM } from './StrengthPage';

describe('epley1RM', () => {
  it('returns load unchanged for a single rep', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(225, 1)).toBe(225);
  });

  it('estimates correctly for 5 reps', () => {
    // 100 * (1 + 5/30) = 100 * 1.1667 = 116.67 → rounds to 117
    expect(epley1RM(100, 5)).toBe(117);
  });

  it('estimates correctly for 10 reps', () => {
    // 100 * (1 + 10/30) = 100 * 1.333 → rounds to 133
    expect(epley1RM(100, 10)).toBe(133);
  });

  it('estimates correctly for 3 reps', () => {
    // 100 * (1 + 3/30) = 100 * 1.1 = 110
    expect(epley1RM(100, 3)).toBe(110);
  });

  it('is monotonically increasing: higher load → higher estimated 1RM', () => {
    // Math.round means result is not exactly proportional, but ordering holds
    expect(epley1RM(200, 5)).toBeGreaterThan(epley1RM(100, 5));
    expect(epley1RM(150, 5)).toBeGreaterThan(epley1RM(100, 5));
  });

  it('always returns an integer (Math.round)', () => {
    expect(Number.isInteger(epley1RM(85, 7))).toBe(true);
    expect(Number.isInteger(epley1RM(132, 4))).toBe(true);
  });

  it('handles a heavy single correctly', () => {
    expect(epley1RM(180, 1)).toBe(180);
  });
});
