import type { MuscleId } from '../components/MuscleBody3D';

export type GapStatus = 'neglected' | 'low' | 'good';

export interface MuscleGapEntry {
  id: MuscleId;
  label: string;
  count: number;
  pct: number;
  status: GapStatus;
}

export interface GapData {
  entries: MuscleGapEntry[];
  totalSessions: number;
  timeRangeDays: number | 'all';
}

export const GAP_COLORS: Record<GapStatus, string> = {
  neglected: '#e03131',
  low:       '#f08c00',
  good:      '#2f9e44',
};

export const GAP_EMISSIVE: Record<GapStatus, string> = {
  neglected: '#c92a2a',
  low:       '#e67700',
  good:      '#2b8a3e',
};
