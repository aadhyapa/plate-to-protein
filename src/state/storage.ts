import type { ActivityLevel, AppState, MealItem, StageId } from './types';

export const STORAGE_KEY = 'plate-to-cell:v1';

const STAGE_IDS: StageId[] = ['plate', 'gut', 'cell', 'structure', 'wrap-up'];
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'moderate', 'active'];

export function defaultState(): AppState {
  return {
    meal: [],
    proteinGoal: { weight: null, activity: 'sedentary' },
    units: 'kg',
    completedStages: [],
    quizScores: {},
    theme: null,
    prices: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function numberRecord(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(value)) return out;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}

/**
 * Turn whatever was found in storage into a valid AppState.
 * Saved data can be missing, from an older version, or hand-edited, so every
 * field is checked and falls back to its default instead of crashing the app.
 */
export function sanitizeState(raw: unknown): AppState {
  const base = defaultState();
  if (!isRecord(raw)) return base;

  const meal: MealItem[] = Array.isArray(raw.meal)
    ? raw.meal
        .filter(
          (item): item is MealItem =>
            isRecord(item) && typeof item.foodId === 'string' && positiveNumber(item.servings),
        )
        .map((item) => ({ foodId: item.foodId, servings: item.servings }))
    : base.meal;

  const goal = isRecord(raw.proteinGoal) ? raw.proteinGoal : {};
  const completed = Array.isArray(raw.completedStages)
    ? STAGE_IDS.filter((id) => (raw.completedStages as unknown[]).includes(id))
    : base.completedStages;

  return {
    meal,
    proteinGoal: {
      weight: positiveNumber(goal.weight) ? goal.weight : null,
      activity: ACTIVITY_LEVELS.includes(goal.activity as ActivityLevel)
        ? (goal.activity as ActivityLevel)
        : base.proteinGoal.activity,
    },
    units: raw.units === 'lb' ? 'lb' : 'kg',
    completedStages: completed,
    quizScores: numberRecord(raw.quizScores),
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null,
    prices: numberRecord(raw.prices),
  };
}

/** Read saved state. Never throws: private mode or blocked storage just gives defaults. */
export function loadState(): AppState {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? sanitizeState(JSON.parse(text)) : defaultState();
  } catch {
    return defaultState();
  }
}

/** Save state. Returns false if storage is unavailable; the app keeps working in memory. */
export function saveState(state: AppState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
