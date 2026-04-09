/**
 * Unit tests for WorkoutsService private helper methods.
 *
 * parseDate and parseSetDetails are tested here in isolation — without
 * constructing a full CSV row — so failures point directly to the broken
 * function rather than somewhere in the parsing pipeline.
 *
 * Private methods are accessed via (service as any) to avoid changing the
 * production API.
 */
import { Test } from '@nestjs/testing';
import { WorkoutsService } from './workouts.service';

describe('WorkoutsService — private helpers', () => {
  let service: WorkoutsService;
  // Typed accessor so every call is one line
  let svc: { parseDate(r: string): string; parseSetDetails(r: string): unknown[] };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WorkoutsService],
    }).compile();
    service = module.get<WorkoutsService>(WorkoutsService);
    svc = service as unknown as typeof svc;
  });

  // ── parseDate ────────────────────────────────────────────────────────────────

  describe('parseDate', () => {
    it('converts mm/dd/yyyy to yyyy-mm-dd', () => {
      expect(svc.parseDate('4/9/2025')).toBe('2025-04-09');
    });

    it('zero-pads single-digit month', () => {
      expect(svc.parseDate('1/15/2024')).toBe('2024-01-15');
    });

    it('zero-pads single-digit day', () => {
      expect(svc.parseDate('12/7/2023')).toBe('2023-12-07');
    });

    it('handles two-digit month and day without extra padding', () => {
      expect(svc.parseDate('12/31/2022')).toBe('2022-12-31');
    });

    it('returns the raw value unchanged when not in mm/dd/yyyy format', () => {
      expect(svc.parseDate('2025-04-09')).toBe('2025-04-09');
      expect(svc.parseDate('not-a-date')).toBe('not-a-date');
      expect(svc.parseDate('')).toBe('');
    });

    it('returns the raw value when there are too many or too few slashes', () => {
      expect(svc.parseDate('4/9')).toBe('4/9');
      expect(svc.parseDate('4/9/2025/extra')).toBe('4/9/2025/extra');
    });
  });

  // ── parseSetDetails ──────────────────────────────────────────────────────────

  describe('parseSetDetails', () => {
    it('parses a valid JSON array of load objects', () => {
      const input = '[{"load":100},{"load":120}]';
      const result = svc.parseSetDetails(input);
      expect(result).toEqual([{ load: 100 }, { load: 120 }]);
    });

    it('parses objects with multiple fields', () => {
      const input = '[{"load":85,"success":true}]';
      const result = svc.parseSetDetails(input);
      expect(result[0]).toEqual({ load: 85, success: true });
    });

    it('parses time-based sets (mins field)', () => {
      const input = '[{"mins":3.75}]';
      expect(svc.parseSetDetails(input)).toEqual([{ mins: 3.75 }]);
    });

    it('unescapes SugarWOD double-quote encoding', () => {
      // SugarWOD exports JSON with "" instead of "
      const input = '[{""load"":90,""success"":true}]';
      const result = svc.parseSetDetails(input);
      expect(result[0]).toEqual({ load: 90, success: true });
    });

    it('returns empty array for empty string', () => {
      expect(svc.parseSetDetails('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      expect(svc.parseSetDetails('   ')).toEqual([]);
    });

    it('returns empty array for invalid JSON (graceful degradation)', () => {
      expect(svc.parseSetDetails('not json')).toEqual([]);
      expect(svc.parseSetDetails('{broken')).toEqual([]);
      // Note: valid JSON that is not an array (e.g. '"string"', '42') is
      // passed through by JSON.parse — the implementation trusts the input
      // is always an array when valid JSON is present.
    });

    it('parses an empty JSON array', () => {
      expect(svc.parseSetDetails('[]')).toEqual([]);
    });

    it('handles a single-element array', () => {
      const result = svc.parseSetDetails('[{"load":142}]');
      expect(result).toHaveLength(1);
      expect((result[0] as { load: number }).load).toBe(142);
    });
  });
});
