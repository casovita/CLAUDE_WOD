/**
 * Unit tests for HeatmapPage pure functions.
 *
 * coverageStatus drives the gap analysis colour coding (red / orange / green).
 * getHeatColor drives the calendar heatmap cell colours.
 * Both are threshold-based, so boundary values are the critical cases.
 */
import { describe, it, expect } from 'vitest';
import { coverageStatus, getHeatColor } from './HeatmapPage';

// ── coverageStatus ────────────────────────────────────────────────────────────

describe('coverageStatus', () => {
  it('returns "neglected" below 10%', () => {
    expect(coverageStatus(0)).toBe('neglected');
    expect(coverageStatus(5)).toBe('neglected');
    expect(coverageStatus(9.9)).toBe('neglected');
  });

  it('returns "neglected" at exactly 0%', () => {
    expect(coverageStatus(0)).toBe('neglected');
  });

  it('returns "low" from 10% up to (not including) 25%', () => {
    expect(coverageStatus(10)).toBe('low');
    expect(coverageStatus(15)).toBe('low');
    expect(coverageStatus(24.9)).toBe('low');
  });

  it('returns "good" at 25% and above', () => {
    expect(coverageStatus(25)).toBe('good');
    expect(coverageStatus(50)).toBe('good');
    expect(coverageStatus(100)).toBe('good');
  });

  // Boundary: exactly at each threshold
  it('boundary at 10% is "low" (not neglected)', () => {
    expect(coverageStatus(10)).toBe('low');
  });

  it('boundary at 25% is "good" (not low)', () => {
    expect(coverageStatus(25)).toBe('good');
  });
});

// ── getHeatColor ──────────────────────────────────────────────────────────────

describe('getHeatColor', () => {
  it('returns empty-cell grey for count=0 in dark mode', () => {
    expect(getHeatColor(0, 10, true)).toBe('#2c2e33');
  });

  it('returns empty-cell light grey for count=0 in light mode', () => {
    expect(getHeatColor(0, 10, false)).toBe('#e9ecef');
  });

  it('returns lightest purple (t<0.25) for a low count', () => {
    // count=1, max=10 → t=0.1 < 0.25
    expect(getHeatColor(1, 10, true)).toBe('#9775fa');
  });

  it('returns mid purple (t<0.5) for a medium-low count', () => {
    // count=3, max=10 → t=0.3 — in [0.25, 0.5)
    expect(getHeatColor(3, 10, true)).toBe('#7950f2');
  });

  it('returns dark purple (t<0.75) for a medium-high count', () => {
    // count=6, max=10 → t=0.6 — in [0.5, 0.75)
    expect(getHeatColor(6, 10, true)).toBe('#6741d9');
  });

  it('returns darkest purple (t>=0.75) for a high count', () => {
    // count=8, max=10 → t=0.8 ≥ 0.75
    expect(getHeatColor(8, 10, true)).toBe('#5f3dc4');
  });

  it('returns darkest purple when count equals max', () => {
    expect(getHeatColor(10, 10, false)).toBe('#5f3dc4');
  });

  it('clamps t to 1 when count exceeds max', () => {
    // Should not throw and should return darkest colour
    expect(getHeatColor(20, 10, false)).toBe('#5f3dc4');
  });

  it('handles max=0 without dividing by zero (uses Math.max(max,1))', () => {
    expect(() => getHeatColor(0, 0, false)).not.toThrow();
    expect(getHeatColor(0, 0, false)).toBe('#e9ecef');
  });

  it('is theme-independent for non-zero counts', () => {
    // Colour bands don't vary by theme — only zero-count cells do
    expect(getHeatColor(5, 10, true)).toBe(getHeatColor(5, 10, false));
  });
});
