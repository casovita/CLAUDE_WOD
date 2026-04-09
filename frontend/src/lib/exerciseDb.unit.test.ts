/**
 * Unit tests for exerciseDb internal string helpers.
 *
 * normalise and stripMetadata are the first stage of the DB lookup pipeline.
 * If they regress, every tier-1 and tier-2 match silently breaks, making
 * these the highest-leverage functions to test directly.
 */
import { describe, it, expect } from 'vitest';
import { normalise, stripMetadata } from './exerciseDb';

// ── normalise ─────────────────────────────────────────────────────────────────

describe('normalise', () => {
  it('lowercases the input', () => {
    expect(normalise('Back Squat')).toBe('back squat');
  });

  it('replaces hyphens with spaces', () => {
    expect(normalise('Pull-Up')).toBe('pull up');
  });

  it('replaces other punctuation with spaces', () => {
    expect(normalise('Dips - Chest Version')).toBe('dips chest version');
    expect(normalise('Band Assisted Pull-Up')).toBe('band assisted pull up');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalise('foo   bar')).toBe('foo bar');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalise('  clean  ')).toBe('clean');
  });

  it('preserves digits', () => {
    expect(normalise('3/4 Sit-Up')).toBe('3 4 sit up');
  });

  it('handles an empty string', () => {
    expect(normalise('')).toBe('');
  });

  it('produces the same key used to index DB exercise names', () => {
    // Exercises are stored with normalise(r.name) as key
    expect(normalise('Dips - Chest Version')).toBe('dips chest version');
    expect(normalise('Barbell Full Squat')).toBe('barbell full squat');
  });
});

// ── stripMetadata ─────────────────────────────────────────────────────────────

describe('stripMetadata', () => {
  it('strips "NxN" set notation', () => {
    expect(stripMetadata('Back Squat 3x3')).toBe('back squat');
  });

  it('strips weight with "lbs" suffix', () => {
    expect(stripMetadata('Deadlift 225 lbs')).toBe('deadlift');
  });

  it('strips weight with "kg" suffix', () => {
    expect(stripMetadata('Clean 100kg')).toBe('clean');
  });

  it('strips weight with "#" suffix (lbs shorthand)', () => {
    expect(stripMetadata('Snatch 135#')).toBe('snatch');
  });

  it('strips a bare number', () => {
    expect(stripMetadata('Press 3')).toBe('press');
  });

  it('strips multiple metadata tokens', () => {
    expect(stripMetadata('Back Squat 3x3 @ 225#')).toBe('back squat');
  });

  it('leaves a plain exercise name unchanged', () => {
    expect(stripMetadata('Clean')).toBe('clean');
  });

  it('leaves alphabetic words intact', () => {
    expect(stripMetadata('Barbell Deadlift')).toBe('barbell deadlift');
  });

  it('handles an empty string', () => {
    expect(stripMetadata('')).toBe('');
  });
});
