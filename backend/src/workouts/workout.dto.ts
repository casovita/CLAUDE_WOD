export type ScoreType = 'Load' | 'Time' | 'Reps' | 'Rounds' | 'Checkbox' | 'Other' | '';
export type RxOrScaled = 'RX' | 'SCALED' | '';

export interface SetDetail {
  load?: number;
  success?: boolean;
  boolean?: number;
  mins?: number;
}

export class WorkoutDto {
  date: string;
  title: string;
  description: string;
  best_result_raw: number | null;
  best_result_display: string;
  score_type: ScoreType;
  barbell_lift: string;
  set_details: SetDetail[];
  notes: string;
  rx_or_scaled: RxOrScaled;
  pr: boolean;
}
