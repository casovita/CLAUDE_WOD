import type { Workout, ScoreType, RxOrScaled, SetDetail } from '../types/workout';

function parseDate(raw: string): string {
  // mm/dd/yyyy → yyyy-mm-dd
  const [m, d, y] = raw.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseSetDetails(raw: string): SetDetail[] {
  if (!raw || raw.trim() === '') return [];
  try {
    // SugarWOD doubles up quotes in JSON: {"\"load\"":85} → fix before parsing
    const fixed = raw.replace(/""/g, '"');
    return JSON.parse(fixed) as SetDetail[];
  } catch {
    return [];
  }
}

export function parseCSV(csv: string): Workout[] {
  const lines = csv.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  // Skip header row
  const rows = lines.slice(1);

  return rows.map((row) => {
    // Handle quoted fields containing commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);

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
    ] = fields.map((f) => f.trim());

    return {
      date: parseDate(date),
      title: title ?? '',
      description: description ?? '',
      best_result_raw: best_result_raw_str !== '' && best_result_raw_str != null
        ? parseFloat(best_result_raw_str)
        : null,
      best_result_display: best_result_display ?? '',
      score_type: (score_type as ScoreType) ?? '',
      barbell_lift: barbell_lift ?? '',
      set_details: parseSetDetails(set_details_raw ?? ''),
      notes: notes ?? '',
      rx_or_scaled: (rx_or_scaled as RxOrScaled) ?? '',
      pr: pr?.trim().toUpperCase() === 'PR',
    };
  });
}
