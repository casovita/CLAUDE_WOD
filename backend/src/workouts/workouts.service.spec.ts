/**
 * Integration tests for WorkoutsService.parseCSV()
 *
 * Uses real CSV strings (mock data) to verify the full parsing pipeline:
 *   - Date normalisation (mm/dd/yyyy → yyyy-mm-dd)
 *   - Numeric field coercion
 *   - PR flag detection
 *   - Set details JSON parsing (double-quote escaping)
 *   - Error cases (empty CSV, header-only)
 */
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';

// ── CSV helpers ───────────────────────────────────────────────────────────────

const CSV_HEADER =
  'date,title,description,best_result_raw,best_result_display,score_type,barbell_lift,set_details,notes,rx_or_scaled,pr';

function makeRow(fields: {
  date?: string;
  title?: string;
  description?: string;
  best_result_raw?: string;
  best_result_display?: string;
  score_type?: string;
  barbell_lift?: string;
  set_details?: string;
  notes?: string;
  rx_or_scaled?: string;
  pr?: string;
}): string {
  const f = fields;
  return [
    f.date ?? '4/9/2025',
    f.title ?? 'Test Workout',
    f.description ?? '',
    f.best_result_raw ?? '',
    f.best_result_display ?? '',
    f.score_type ?? '',
    f.barbell_lift ?? '',
    f.set_details ?? '',
    f.notes ?? '',
    f.rx_or_scaled ?? '',
    f.pr ?? '',
  ].join(',');
}

function csv(...rows: string[]): string {
  return [CSV_HEADER, ...rows].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WorkoutsService],
    }).compile();
    service = module.get<WorkoutsService>(WorkoutsService);
  });

  // ── Basic parsing ───────────────────────────────────────────────────────────

  describe('parseCSV — basic parsing', () => {
    it('parses a single data row into one WorkoutDto', () => {
      const result = service.parseCSV(
        csv(makeRow({ title: 'Back Squat', score_type: 'Load' }))
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Back Squat');
      expect(result[0].score_type).toBe('Load');
    });

    it('parses multiple rows into corresponding WorkoutDtos', () => {
      const result = service.parseCSV(
        csv(
          makeRow({ title: 'Back Squat', date: '1/10/2025' }),
          makeRow({ title: 'Deadlift',   date: '1/12/2025' }),
          makeRow({ title: 'Clean',       date: '1/14/2025' }),
        )
      );
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.title)).toEqual(['Back Squat', 'Deadlift', 'Clean']);
    });

    it('populates all top-level fields from the row', () => {
      const result = service.parseCSV(
        csv(makeRow({
          title: 'Fran',
          description: '21-15-9 Thrusters/Pull-ups',
          best_result_display: '3:45',
          score_type: 'Time',
          notes: 'Felt strong',
          rx_or_scaled: 'RX',
        }))
      );
      const w = result[0];
      expect(w.description).toBe('21-15-9 Thrusters/Pull-ups');
      expect(w.best_result_display).toBe('3:45');
      expect(w.score_type).toBe('Time');
      expect(w.notes).toBe('Felt strong');
      expect(w.rx_or_scaled).toBe('RX');
    });
  });

  // ── Date parsing ────────────────────────────────────────────────────────────

  describe('parseCSV — date normalisation', () => {
    it('converts mm/dd/yyyy to yyyy-mm-dd', () => {
      const result = service.parseCSV(csv(makeRow({ date: '4/9/2025' })));
      expect(result[0].date).toBe('2025-04-09');
    });

    it('zero-pads single-digit month and day', () => {
      const result = service.parseCSV(csv(makeRow({ date: '1/7/2024' })));
      expect(result[0].date).toBe('2024-01-07');
    });

    it('handles two-digit month and day', () => {
      const result = service.parseCSV(csv(makeRow({ date: '12/31/2023' })));
      expect(result[0].date).toBe('2023-12-31');
    });

    it('returns the raw value unchanged when format is unrecognised', () => {
      const result = service.parseCSV(csv(makeRow({ date: 'not-a-date' })));
      expect(result[0].date).toBe('not-a-date');
    });
  });

  // ── Numeric fields ──────────────────────────────────────────────────────────

  describe('parseCSV — numeric field coercion', () => {
    it('parses integer best_result_raw', () => {
      const result = service.parseCSV(csv(makeRow({ best_result_raw: '185' })));
      expect(result[0].best_result_raw).toBe(185);
    });

    it('parses decimal best_result_raw', () => {
      const result = service.parseCSV(csv(makeRow({ best_result_raw: '92.5' })));
      expect(result[0].best_result_raw).toBe(92.5);
    });

    it('sets best_result_raw to null when field is empty', () => {
      const result = service.parseCSV(csv(makeRow({ best_result_raw: '' })));
      expect(result[0].best_result_raw).toBeNull();
    });

    it('throws when a row has fewer columns than the header (csv-parse strict)', () => {
      // csv-parse enforces column count by default
      expect(() => service.parseCSV(`${CSV_HEADER}\n4/9/2025,Tabata`)).toThrow(
        BadRequestException,
      );
    });
  });

  // ── PR flag ─────────────────────────────────────────────────────────────────

  describe('parseCSV — PR flag parsing', () => {
    it('marks pr=true for uppercase "PR"', () => {
      const result = service.parseCSV(csv(makeRow({ pr: 'PR' })));
      expect(result[0].pr).toBe(true);
    });

    it('marks pr=true for lowercase "pr"', () => {
      const result = service.parseCSV(csv(makeRow({ pr: 'pr' })));
      expect(result[0].pr).toBe(true);
    });

    it('marks pr=true for mixed case "Pr" (trim+uppercase)', () => {
      const result = service.parseCSV(csv(makeRow({ pr: 'Pr' })));
      expect(result[0].pr).toBe(true);
    });

    it('marks pr=false for empty string', () => {
      const result = service.parseCSV(csv(makeRow({ pr: '' })));
      expect(result[0].pr).toBe(false);
    });

    it('marks pr=false for any non-PR value', () => {
      const result = service.parseCSV(csv(makeRow({ pr: 'No' })));
      expect(result[0].pr).toBe(false);
    });
  });

  // ── Set details ─────────────────────────────────────────────────────────────

  describe('parseCSV — set details parsing', () => {
    it('parses a JSON array of load objects', () => {
      // CSV quoting: wrap in outer quotes and double-escape inner quotes
      const setDetails = JSON.stringify([{ load: 100 }, { load: 110 }, { load: 120 }]);
      const csvField = `"${setDetails.replace(/"/g, '""')}"`;
      const result = service.parseCSV(csv(makeRow({ set_details: csvField })));
      expect(result[0].set_details).toHaveLength(3);
      expect(result[0].set_details[2].load).toBe(120);
    });

    it('handles SugarWOD double-escaped quotes', () => {
      // SugarWOD exports JSON with "" instead of "
      const escaped = '[{""load"":85,""success"":true}]';
      const result = service.parseCSV(csv(makeRow({ set_details: `"${escaped}"` })));
      expect(result[0].set_details[0].load).toBe(85);
      expect(result[0].set_details[0].success).toBe(true);
    });

    it('returns empty array when set_details is empty', () => {
      const result = service.parseCSV(csv(makeRow({ set_details: '' })));
      expect(result[0].set_details).toEqual([]);
    });

    it('returns empty array for invalid JSON (graceful degradation)', () => {
      const result = service.parseCSV(csv(makeRow({ set_details: '"not json at all"' })));
      expect(result[0].set_details).toEqual([]);
    });

    it('parses time-based set details with mins field', () => {
      const setDetails = JSON.stringify([{ mins: 3.75 }]);
      const csvField = `"${setDetails.replace(/"/g, '""')}"`;
      const result = service.parseCSV(csv(makeRow({ set_details: csvField })));
      expect(result[0].set_details[0].mins).toBe(3.75);
    });
  });

  // ── Error cases ─────────────────────────────────────────────────────────────

  describe('parseCSV — error handling', () => {
    it('throws BadRequestException for an empty string', () => {
      expect(() => service.parseCSV('')).toThrow(BadRequestException);
    });

    it('throws BadRequestException for header-only CSV (no data rows)', () => {
      expect(() => service.parseCSV(CSV_HEADER)).toThrow(BadRequestException);
    });

    it('throws BadRequestException with message containing "no data rows"', () => {
      expect(() => service.parseCSV(CSV_HEADER)).toThrow(/no data rows/i);
    });

    it('throws BadRequestException for completely invalid CSV input', () => {
      // Unmatched quotes cause csv-parse to error
      expect(() => service.parseCSV('"unclosed quote')).toThrow(BadRequestException);
    });
  });

  // ── Full realistic workout ──────────────────────────────────────────────────

  describe('parseCSV — realistic workout CSV', () => {
    it('parses a real-world Back Squat session row correctly', () => {
      const setDetailsJson = '[{"load":100,"success":true},{"load":110,"success":true},{"load":120,"success":false}]';
      const rawCsv = [
        CSV_HEADER,
        `4/9/2025,"Back Squat 3x3","Work up to heavy triple",120,"120 kg",Load,Back Squat,"${setDetailsJson.replace(/"/g, '""')}","Left knee felt good",RX,PR`,
      ].join('\n');

      const result = service.parseCSV(rawCsv);
      expect(result).toHaveLength(1);
      const w = result[0];

      expect(w.date).toBe('2025-04-09');
      expect(w.title).toBe('Back Squat 3x3');
      expect(w.description).toBe('Work up to heavy triple');
      expect(w.best_result_raw).toBe(120);
      expect(w.best_result_display).toBe('120 kg');
      expect(w.score_type).toBe('Load');
      expect(w.barbell_lift).toBe('Back Squat');
      expect(w.set_details).toHaveLength(3);
      expect(w.set_details[1].load).toBe(110);
      expect(w.notes).toBe('Left knee felt good');
      expect(w.rx_or_scaled).toBe('RX');
      expect(w.pr).toBe(true);
    });

    it('parses a conditioning WOD (Time score) correctly', () => {
      const rawCsv = [
        CSV_HEADER,
        `6/15/2025,Fran,"21-15-9 Thrusters + Pull-ups",225,"3:45",Time,,,"First sub-4 minute Fran",RX,PR`,
      ].join('\n');

      const result = service.parseCSV(rawCsv);
      const w = result[0];

      expect(w.title).toBe('Fran');
      expect(w.score_type).toBe('Time');
      expect(w.best_result_raw).toBe(225);
      expect(w.best_result_display).toBe('3:45');
      expect(w.barbell_lift).toBe('');
      expect(w.set_details).toEqual([]);
      expect(w.pr).toBe(true);
    });
  });
});
