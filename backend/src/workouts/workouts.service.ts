import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { WorkoutDto, ScoreType, RxOrScaled, SetDetail } from './workout.dto';

@Injectable()
export class WorkoutsService {
  parseCSV(csvText: string): WorkoutDto[] {
    let records: string[][];
    try {
      records = parse(csvText, {
        skip_empty_lines: true,
        relax_quotes: true,
        trim: true,
      }) as string[][];
    } catch (e) {
      throw new BadRequestException(`CSV parse error: ${(e as Error).message}`);
    }

    if (records.length < 2) {
      throw new BadRequestException('CSV has no data rows');
    }

    // Skip header row
    return records.slice(1).map((row) => {
      const [
        date,
        title,
        description,
        best_result_raw_str,
        best_result_display,
        score_type,
        barbell_lift,
        set_details_raw,
        notes,
        rx_or_scaled,
        pr,
      ] = row;

      return {
        date: this.parseDate(date ?? ''),
        title: title ?? '',
        description: description ?? '',
        best_result_raw:
          best_result_raw_str != null && best_result_raw_str !== ''
            ? parseFloat(best_result_raw_str)
            : null,
        best_result_display: best_result_display ?? '',
        score_type: (score_type as ScoreType) ?? '',
        barbell_lift: barbell_lift ?? '',
        set_details: this.parseSetDetails(set_details_raw ?? ''),
        notes: notes ?? '',
        rx_or_scaled: (rx_or_scaled as RxOrScaled) ?? '',
        pr: pr?.trim().toUpperCase() === 'PR',
      };
    });
  }

  private parseDate(raw: string): string {
    // mm/dd/yyyy → yyyy-mm-dd
    const parts = raw.split('/');
    if (parts.length !== 3) return raw;
    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  private parseSetDetails(raw: string): SetDetail[] {
    if (!raw || raw.trim() === '') return [];
    try {
      const fixed = raw.replace(/""/g, '"');
      return JSON.parse(fixed) as SetDetail[];
    } catch {
      return [];
    }
  }
}
