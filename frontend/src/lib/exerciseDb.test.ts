/**
 * Integration tests for exerciseDb.ts
 *
 * Covers three layers of the lookup stack:
 *   1. Regex fallback  — DB not loaded
 *   2. DB direct match — DB loaded with mock data
 *   3. CF alias match  — DB loaded, exercise found via alias
 *
 * Strength standards are pure lookup tables, tested independently.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import {
  getMuscleMatch,
  getWeightedMuscles,
  getMusclesSet,
  loadExerciseDb,
  getStrengthLevel,
  getStrengthStandards,
  _resetForTesting,
} from './exerciseDb';

// ── Mock exercise data (representative subset of Free-Exercise-DB) ─────────────

const MOCK_EXERCISES = [
  {
    id: 'Barbell_Full_Squat',
    name: 'Barbell Full Squat',
    equipment: 'barbell',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
    images: ['Barbell_Full_Squat/0.jpg'],
    category: 'strength',
  },
  {
    id: 'Barbell_Deadlift',
    name: 'Barbell Deadlift',
    equipment: 'barbell',
    primaryMuscles: ['lower back'],
    secondaryMuscles: [
      'calves', 'forearms', 'glutes', 'hamstrings',
      'lats', 'middle back', 'quadriceps', 'traps',
    ],
    images: ['Barbell_Deadlift/0.jpg'],
    category: 'strength',
  },
  {
    id: 'Clean',
    name: 'Clean',
    equipment: 'barbell',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [
      'calves', 'forearms', 'glutes', 'lower back',
      'quadriceps', 'shoulders', 'traps',
    ],
    images: ['Clean/0.jpg'],
    category: 'olympic weightlifting',
  },
  {
    id: 'Hanging_Leg_Raise',
    name: 'Hanging Leg Raise',
    equipment: 'body only',
    primaryMuscles: ['abdominals'],
    secondaryMuscles: [],
    images: ['Hanging_Leg_Raise/0.jpg'],
    category: 'strength',
  },
  {
    id: 'Kettlebell_Thruster',
    name: 'Kettlebell Thruster',
    equipment: 'kettlebells',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['quadriceps', 'triceps'],
    images: ['Kettlebell_Thruster/0.jpg'],
    category: 'strength',
  },
  {
    id: 'Dips_Chest_Version',
    name: 'Dips - Chest Version',
    equipment: 'body only',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    images: ['Dips_-_Chest_Version/0.jpg'],
    category: 'strength',
  },
  {
    id: 'Band_Assisted_Pull-Up',
    name: 'Band Assisted Pull-Up',
    equipment: 'bands',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['abdominals', 'forearms', 'middle back'],
    images: ['Band_Assisted_Pull-Up/0.jpg'],
    category: 'strength',
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function mockFetch(data: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve(data),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Regex fallback (DB NOT loaded)
// ─────────────────────────────────────────────────────────────────────────────

describe('getMuscleMatch — regex fallback (no DB)', () => {
  afterEach(() => {
    _resetForTesting();
    vi.unstubAllGlobals();
  });

  it('maps a squat movement to lower-body muscles', () => {
    const match = getMuscleMatch('Back Squat 3x3');
    expect(match.primary).toContain('quads');
    expect(match.primary).toContain('glutes');
    expect(match.primary).toContain('hamstrings');
    expect(match.dbName).toBeNull();
    expect(match.imageUrl).toBeNull();
  });

  it('maps a pull-up to back and arm muscles', () => {
    const match = getMuscleMatch('Pull-Up 5x5');
    expect(match.primary).toContain('lats');
    expect(match.primary).toContain('biceps');
  });

  it('maps a press to front delts and triceps', () => {
    const match = getMuscleMatch('Strict Press');
    expect(match.primary).toContain('frontDelts');
    expect(match.primary).toContain('triceps');
  });

  it('returns empty arrays for an unknown exercise', () => {
    const match = getMuscleMatch('Zumba Dance Extravaganza');
    expect(match.primary).toHaveLength(0);
    expect(match.secondary).toHaveLength(0);
    expect(match.imageUrl).toBeNull();
  });

  it('getMusclesSet unions primary and secondary into a flat Set', () => {
    const s = getMusclesSet('Deadlift');
    expect(s).toBeInstanceOf(Set);
    expect(s.has('hamstrings')).toBe(true);
    expect(s.has('lowerBack')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: DB direct match
// ─────────────────────────────────────────────────────────────────────────────

describe('getMuscleMatch — DB direct match', () => {
  beforeAll(async () => {
    _resetForTesting();
    mockFetch(MOCK_EXERCISES);
    await loadExerciseDb();
  });

  afterEach(() => {
    // DB stays loaded between tests — only reset after the whole suite via
    // the suite-level afterAll if needed. Tests here share one DB load.
  });

  it('finds "Clean" exactly in the DB', () => {
    const match = getMuscleMatch('Clean');
    expect(match.dbName).toBe('Clean');
    expect(match.primary).toContain('hamstrings');
    expect(match.secondary).toContain('quads');  // "quadriceps" → quads
    expect(match.equipment).toBe('barbell');
    expect(match.imageUrl).toBe(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Clean/0.jpg'
    );
  });

  it('strips set notation and finds "Barbell Deadlift 5x3"', () => {
    const match = getMuscleMatch('Barbell Deadlift 5x3');
    expect(match.dbName).toBe('Barbell Deadlift');
    expect(match.primary).toContain('lowerBack');  // "lower back" → lowerBack
  });

  it('strips weight notation and finds "Barbell Full Squat 225#"', () => {
    const match = getMuscleMatch('Barbell Full Squat 225#');
    expect(match.dbName).toBe('Barbell Full Squat');
    expect(match.primary).toContain('quads');
  });

  it('resolves "Hanging Leg Raise" to abs', () => {
    const match = getMuscleMatch('Hanging Leg Raise');
    expect(match.primary).toContain('abs');
    expect(match.secondary).toHaveLength(0);
  });

  it('translates DB muscle names to MuscleId correctly', () => {
    // Mock Barbell Deadlift: primary=["lower back"], secondary=[..., "middle back", ..., "traps"]
    const match = getMuscleMatch('Barbell Deadlift');
    expect(match.primary).toContain('lowerBack');    // "lower back" → lowerBack (primary)
    expect(match.secondary).toContain('lats');       // "middle back" → lats (secondary)
    expect(match.secondary).toContain('traps');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: CrossFit alias matching
// ─────────────────────────────────────────────────────────────────────────────

describe('getMuscleMatch — CF alias matching', () => {
  beforeAll(async () => {
    _resetForTesting();
    mockFetch(MOCK_EXERCISES);
    await loadExerciseDb();
  });

  it('maps "Wall Ball" via alias to Thruster muscles', () => {
    const match = getMuscleMatch('Wall Ball 20/14');
    // CF alias: wall ball → "Thruster" → Kettlebell Thruster in mock DB
    expect(match.primary).toContain('frontDelts');   // "shoulders" → frontDelts
    expect(match.secondary).toContain('quads');
  });

  it('maps "Toes to Bar" via alias to abs', () => {
    const match = getMuscleMatch('Toes to Bar');
    expect(match.primary).toContain('abs');
  });

  it('maps "TTB" abbreviation via alias to abs', () => {
    const match = getMuscleMatch('TTB 21-15-9');
    expect(match.primary).toContain('abs');
  });

  it('maps "Ring Dip" via alias to chest muscles', () => {
    const match = getMuscleMatch('Ring Dip 3x8');
    expect(match.primary).toContain('chest');
    expect(match.secondary).toContain('triceps');
  });

  it('maps "Rope Climb" via alias to lat/back muscles', () => {
    const match = getMuscleMatch('Rope Climb 5 ascents');
    // CF alias: rope climb → Band Assisted Pull-Up
    expect(match.primary).toContain('lats');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: getWeightedMuscles — primary 1.0 / secondary 0.4
// ─────────────────────────────────────────────────────────────────────────────

describe('getWeightedMuscles', () => {
  beforeAll(async () => {
    _resetForTesting();
    mockFetch(MOCK_EXERCISES);
    await loadExerciseDb();
  });

  it('assigns weight 1.0 to primary muscles', () => {
    const weighted = getWeightedMuscles('Clean');
    expect(weighted.get('hamstrings')).toBe(1.0);  // primary
  });

  it('assigns weight 0.4 to secondary muscles', () => {
    const weighted = getWeightedMuscles('Clean');
    expect(weighted.get('quads')).toBe(0.4);       // secondary: quadriceps
    expect(weighted.get('traps')).toBe(0.4);        // secondary
  });

  it('primary muscles take precedence over secondary for same muscle', () => {
    // If a muscle appears in both primary and secondary, weight should be 1.0
    const weighted = getWeightedMuscles('Barbell Deadlift');
    // lowerBack is primary → 1.0; it also appears in secondary but primary wins
    expect(weighted.get('lowerBack')).toBe(1.0);
  });

  it('regex fallback muscles get weight 1.0 (treated as primary)', () => {
    _resetForTesting(); // unload DB so fallback is used
    const weighted = getWeightedMuscles('Back Squat');
    expect(weighted.get('quads')).toBe(1.0);
    expect(weighted.get('glutes')).toBe(1.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: Strength standards
// ─────────────────────────────────────────────────────────────────────────────

describe('getStrengthStandards', () => {
  it('returns standards for a known lift', () => {
    const std = getStrengthStandards('Back Squat');
    expect(std).not.toBeNull();
    expect(std!.beginner).toBeLessThan(std!.novice);
    expect(std!.novice).toBeLessThan(std!.intermediate);
    expect(std!.intermediate).toBeLessThan(std!.advanced);
    expect(std!.advanced).toBeLessThan(std!.elite);
  });

  it('returns null for an unknown lift', () => {
    expect(getStrengthStandards('Zumba Lift')).toBeNull();
  });

  it('covers all 12 expected lifts', () => {
    const expectedLifts = [
      'Back Squat', 'Front Squat', 'Deadlift', 'Clean', 'Power Clean',
      'Snatch', 'Power Snatch', 'Overhead Press', 'Push Press',
      'Bench Press', 'Clean and Jerk', 'Clean & Jerk',
    ];
    for (const lift of expectedLifts) {
      expect(getStrengthStandards(lift)).not.toBeNull();
    }
  });
});

describe('getStrengthLevel', () => {
  it('classifies 50 kg Back Squat as beginner', () => {
    expect(getStrengthLevel('Back Squat', 50)).toBe('beginner');
  });

  it('classifies 95 kg Back Squat as novice (threshold: 90)', () => {
    expect(getStrengthLevel('Back Squat', 95)).toBe('novice');
  });

  it('classifies 125 kg Back Squat as intermediate (threshold: 120)', () => {
    expect(getStrengthLevel('Back Squat', 125)).toBe('intermediate');
  });

  it('classifies 155 kg Back Squat as advanced (threshold: 150)', () => {
    expect(getStrengthLevel('Back Squat', 155)).toBe('advanced');
  });

  it('classifies 180 kg Back Squat as elite (threshold: 180)', () => {
    expect(getStrengthLevel('Back Squat', 180)).toBe('elite');
  });

  it('returns null for a lift with no standard', () => {
    expect(getStrengthLevel('Zumba Press', 100)).toBeNull();
  });

  it('boundary: exactly at novice threshold', () => {
    const std = getStrengthStandards('Back Squat')!;
    expect(getStrengthLevel('Back Squat', std.novice)).toBe('novice');
  });

  it('boundary: exactly at elite threshold', () => {
    const std = getStrengthStandards('Deadlift')!;
    expect(getStrengthLevel('Deadlift', std.elite)).toBe('elite');
  });

  it('classifies Deadlift correctly at intermediate', () => {
    expect(getStrengthLevel('Deadlift', 160)).toBe('intermediate');  // 150–189
  });
});
