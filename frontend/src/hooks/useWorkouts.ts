import { useState, useCallback } from 'react';
import type { Workout } from '../types/workout';

const STORAGE_KEY = 'wod_analytics_workouts';

function load(): Workout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Workout[]) : [];
  } catch {
    return [];
  }
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>(load);

  const save = useCallback((data: Workout[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setWorkouts(data);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setWorkouts([]);
  }, []);

  return { workouts, save, clear };
}
