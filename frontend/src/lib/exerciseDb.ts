import { useState, useEffect } from 'react';
import type { MuscleId } from '../components/MuscleBody3D';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseRecord {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  images: string[];
  category: string;
}

export interface MuscleMatch {
  primary: MuscleId[];
  secondary: MuscleId[];
  imageUrl: string | null;
  dbName: string | null;
  equipment: string | null;
}

export type StrengthLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';

// ── Muscle name translation (Free-Exercise-DB → app MuscleId) ─────────────────

const DB_MUSCLE_MAP: Record<string, MuscleId> = {
  chest:          'chest',
  shoulders:      'frontDelts',
  'front deltoids': 'frontDelts',
  'middle deltoids': 'frontDelts',
  'rear deltoids':  'rearDelts',
  triceps:        'triceps',
  biceps:         'biceps',
  forearms:       'forearms',
  lats:           'lats',
  traps:          'traps',
  'middle back':  'lats',
  'lower back':   'lowerBack',
  abdominals:     'abs',
  obliques:       'obliques',
  quadriceps:     'quads',
  hamstrings:     'hamstrings',
  glutes:         'glutes',
  calves:         'calves',
  neck:           'traps',
  'hip flexors':  'abs',
  adductors:      'quads',
  abductors:      'glutes',
};

function dbMusclesToIds(names: string[]): MuscleId[] {
  const seen = new Set<MuscleId>();
  const result: MuscleId[] = [];
  for (const n of names) {
    const id = DB_MUSCLE_MAP[n.toLowerCase()];
    if (id && !seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
}

// ── CrossFit-specific aliases → DB exercise name ──────────────────────────────

const CF_ALIASES: [RegExp, string][] = [
  [/wall\s*ball/i,                       'Thruster'],
  [/burpee/i,                            'Burpees'],
  [/rope\s*climb/i,                      'Band Assisted Pull-Up'],
  [/toes.{0,8}bar|ttb\b/i,             'Hanging Leg Raise'],
  [/kipping\s*pull/i,                    'Band Assisted Pull-Up'],
  [/assault\s*bike|echo\s*bike|air\s*bike/i, 'Bicycling, Stationary'],
  [/ski\s*erg/i,                         'Rowing, Stationary'],
  [/ghd\s*sit.?up/i,                    'Jackknife Sit-Up'],
  [/double.under/i,                      'Jump Rope'],
  [/turkish\s*get.?up/i,                'Kettlebell Turkish Get-Up'],
  [/pistol\s*squat|single.leg\s*squat/i, 'Single Leg Squat'],
  [/ring\s*dip/i,                        'Dips - Chest Version'],
  [/box\s*step/i,                        'Box Squat'],
  [/db\s*snatch|dumbbell\s*snatch/i,    'Dumbbell Snatch'],
  [/ring\s*muscle.?up|bar\s*muscle.?up/i, 'Muscle Up'],
  [/hspu|handstand\s*push.?up/i,        'Handstand Push-Up'],
  [/sumo\s*deadlift/i,                   'Sumo Deadlift'],
  [/rdl|romanian/i,                      'Romanian Deadlift'],
];

// ── Regex fallback rules (legacy — covers CrossFit movements not in the DB) ───

const MUSCLE_RULES: [RegExp, MuscleId[]][] = [
  [/squat/i,                            ['quads', 'glutes', 'hamstrings', 'abs']],
  [/deadlift/i,                         ['hamstrings', 'glutes', 'lowerBack', 'traps']],
  [/bench\s*press/i,                    ['chest', 'frontDelts', 'triceps']],
  [/overhead press|shoulder press|strict press/i, ['frontDelts', 'triceps', 'abs']],
  [/push\s*press/i,                     ['frontDelts', 'triceps', 'quads', 'abs']],
  [/clean/i,                            ['quads', 'glutes', 'hamstrings', 'traps', 'lats', 'abs']],
  [/snatch/i,                           ['quads', 'glutes', 'hamstrings', 'traps', 'lats', 'frontDelts', 'abs']],
  [/jerk/i,                             ['frontDelts', 'triceps', 'quads', 'abs']],
  [/pull.?up|chin.?up/i,                ['lats', 'biceps', 'rearDelts', 'forearms']],
  [/row/i,                              ['lats', 'rearDelts', 'biceps', 'traps']],
  [/thruster/i,                         ['quads', 'glutes', 'frontDelts', 'triceps', 'abs']],
  [/lunge/i,                            ['quads', 'glutes', 'hamstrings']],
  [/push.?up/i,                         ['chest', 'triceps', 'frontDelts']],
  [/dip/i,                              ['chest', 'triceps', 'frontDelts']],
  [/curl/i,                             ['biceps', 'forearms']],
  [/tricep/i,                           ['triceps']],
  [/box\s*jump/i,                       ['quads', 'glutes', 'calves']],
  [/kettlebell|swing/i,                 ['glutes', 'hamstrings', 'lowerBack', 'abs']],
  [/farmers?\s*(carry|walk)/i,          ['forearms', 'traps']],
  [/handstand/i,                        ['frontDelts', 'triceps', 'abs']],
  [/muscle.?up/i,                       ['chest', 'lats', 'triceps', 'biceps']],
  [/run|sprint/i,                       ['quads', 'hamstrings', 'calves', 'glutes']],
  [/press/i,                            ['frontDelts', 'triceps']],
];

// ── DB loading — module-level singleton ───────────────────────────────────────

let dbCache: ExerciseRecord[] | null = null;
let dbIndex: Map<string, ExerciseRecord> | null = null;
let dbLoadPromise: Promise<void> | null = null;

function buildIndex(records: ExerciseRecord[]): void {
  dbIndex = new Map();
  for (const r of records) {
    dbIndex.set(normalise(r.name), r);
  }
}

export function loadExerciseDb(): Promise<void> {
  if (dbCache) return Promise.resolve();
  if (!dbLoadPromise) {
    dbLoadPromise = fetch('/data/exercises.json')
      .then((r) => r.json() as Promise<ExerciseRecord[]>)
      .then((data) => {
        dbCache = data;
        buildIndex(data);
      })
      .catch(() => {
        dbLoadPromise = null; // allow retry on next call
      });
  }
  return dbLoadPromise!;
}

/** Reset module-level cache — only for use in tests. */
export function _resetForTesting(): void {
  dbCache = null;
  dbIndex = null;
  dbLoadPromise = null;
}

/** React hook — returns true once the exercise DB has loaded. */
export function useExerciseDb(): boolean {
  const [loaded, setLoaded] = useState(dbCache !== null);
  useEffect(() => {
    if (!loaded) {
      loadExerciseDb().then(() => setLoaded(true)).catch(() => {});
    }
  }, [loaded]);
  return loaded;
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip common set/weight notation so "Back Squat 3x3 @ 225#" → "back squat" */
function stripMetadata(title: string): string {
  return normalise(title)
    .replace(/\b\d+\s*x\s*\d+\b/g, '')   // "3x3"
    .replace(/\b\d+\s*(lbs?|kg|#)\b/g, '') // "225 lbs"
    .replace(/\b\d+\b/g, '')               // remaining numbers
    .replace(/\s+/g, ' ')
    .trim();
}

function findInIndex(query: string): ExerciseRecord | null {
  if (!dbIndex) return null;
  // Exact match
  const exact = dbIndex.get(query);
  if (exact) return exact;
  // The query is contained in a DB name (e.g. "squat" matches "barbell squat")
  for (const [key, rec] of dbIndex) {
    if (key.includes(query) && query.length >= 5) return rec;
  }
  // A DB name is fully contained in the query (e.g. "barbell back squat 3x3" contains "back squat")
  for (const [key, rec] of dbIndex) {
    if (query.includes(key) && key.length >= 6) return rec;
  }
  return null;
}

function findDbRecord(title: string): ExerciseRecord | null {
  if (!dbIndex) return null;

  // Tier 1: direct match on stripped title
  const stripped = stripMetadata(title);
  const direct = findInIndex(stripped);
  if (direct) return direct;

  // Tier 2: CF-specific aliases
  for (const [re, alias] of CF_ALIASES) {
    if (re.test(title)) {
      const aliasNorm = normalise(alias);
      const aliasMatch = findInIndex(aliasNorm);
      if (aliasMatch) return aliasMatch;
    }
  }

  return null;
}

const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

// ── Public API ────────────────────────────────────────────────────────────────

/** Full match result — primary/secondary muscles, image URL, equipment. */
export function getMuscleMatch(title: string): MuscleMatch {
  const rec = findDbRecord(title);
  if (rec) {
    return {
      primary: dbMusclesToIds(rec.primaryMuscles),
      secondary: dbMusclesToIds(rec.secondaryMuscles),
      imageUrl: rec.images.length > 0 ? `${IMAGE_BASE}${rec.images[0]}` : null,
      dbName: rec.name,
      equipment: rec.equipment,
    };
  }

  // Tier 3: regex fallback — all matched muscles become "primary"
  const seen = new Set<MuscleId>();
  const primary: MuscleId[] = [];
  for (const [re, muscles] of MUSCLE_RULES) {
    if (re.test(title)) {
      for (const m of muscles) {
        if (!seen.has(m)) { seen.add(m); primary.push(m); }
      }
    }
  }
  return { primary, secondary: [], imageUrl: null, dbName: null, equipment: null };
}

/**
 * Returns a weighted muscle map: primary muscles get weight 1.0, secondary 0.4.
 * Use this instead of a flat Set to get more accurate gap analysis.
 */
export function getWeightedMuscles(title: string): Map<MuscleId, number> {
  const match = getMuscleMatch(title);
  const result = new Map<MuscleId, number>();
  for (const m of match.primary) result.set(m, 1.0);
  for (const m of match.secondary) {
    if (!result.has(m)) result.set(m, 0.4);
  }
  return result;
}

/** Simple Set<MuscleId> — all muscles (primary + secondary) combined. */
export function getMusclesSet(title: string): Set<MuscleId> {
  const match = getMuscleMatch(title);
  return new Set([...match.primary, ...match.secondary]);
}

// ── Strength standards ────────────────────────────────────────────────────────

interface StrengthStandard {
  beginner: number;
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

// kg-based standards for a typical adult male CrossFit athlete
const STRENGTH_STANDARDS: Record<string, StrengthStandard> = {
  'Back Squat':     { beginner: 60,  novice: 90,  intermediate: 120, advanced: 150, elite: 180 },
  'Front Squat':    { beginner: 45,  novice: 70,  intermediate: 100, advanced: 125, elite: 150 },
  'Deadlift':       { beginner: 80,  novice: 115, intermediate: 150, advanced: 190, elite: 230 },
  'Clean':          { beginner: 50,  novice: 75,  intermediate: 100, advanced: 130, elite: 160 },
  'Power Clean':    { beginner: 45,  novice: 70,  intermediate: 95,  advanced: 120, elite: 145 },
  'Snatch':         { beginner: 35,  novice: 55,  intermediate: 75,  advanced: 100, elite: 125 },
  'Power Snatch':   { beginner: 30,  novice: 50,  intermediate: 68,  advanced: 90,  elite: 112 },
  'Overhead Press': { beginner: 35,  novice: 50,  intermediate: 70,  advanced: 90,  elite: 110 },
  'Push Press':     { beginner: 45,  novice: 65,  intermediate: 85,  advanced: 110, elite: 135 },
  'Bench Press':    { beginner: 55,  novice: 80,  intermediate: 110, advanced: 140, elite: 170 },
  'Clean and Jerk': { beginner: 50,  novice: 75,  intermediate: 102, advanced: 130, elite: 160 },
  'Clean & Jerk':   { beginner: 50,  novice: 75,  intermediate: 102, advanced: 130, elite: 160 },
};

export function getStrengthStandards(lift: string): StrengthStandard | null {
  return STRENGTH_STANDARDS[lift] ?? null;
}

export function getStrengthLevel(lift: string, load: number): StrengthLevel | null {
  const std = STRENGTH_STANDARDS[lift];
  if (!std) return null;
  if (load >= std.elite)        return 'elite';
  if (load >= std.advanced)     return 'advanced';
  if (load >= std.intermediate) return 'intermediate';
  if (load >= std.novice)       return 'novice';
  return 'beginner';
}
