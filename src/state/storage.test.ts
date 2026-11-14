import { describe, expect, it } from 'vitest';
import { defaultState, sanitizeState } from './storage';

describe('sanitizeState', () => {
  it('returns defaults for missing or malformed data', () => {
    expect(sanitizeState(null)).toEqual(defaultState());
    expect(sanitizeState('nope')).toEqual(defaultState());
    expect(sanitizeState([1, 2, 3])).toEqual(defaultState());
  });

  it('keeps valid fields', () => {
    const state = sanitizeState({
      meal: [{ foodId: 'lentils', servings: 1.5 }],
      proteinGoal: { weight: 60, activity: 'active' },
      units: 'lb',
      completedStages: ['gut', 'plate'],
      quizScores: { gut: 2 },
      theme: 'dark',
      prices: { lentils: 0.4 },
    });
    expect(state.meal).toEqual([{ foodId: 'lentils', servings: 1.5 }]);
    expect(state.proteinGoal).toEqual({ weight: 60, activity: 'active' });
    expect(state.units).toBe('lb');
    // Stored in journey order regardless of the order saved.
    expect(state.completedStages).toEqual(['plate', 'gut']);
    expect(state.quizScores).toEqual({ gut: 2 });
    expect(state.theme).toBe('dark');
    expect(state.prices).toEqual({ lentils: 0.4 });
  });

  it('drops invalid pieces without losing the rest', () => {
    const state = sanitizeState({
      meal: [{ foodId: 'rice', servings: 0 }, { foodId: 42, servings: 1 }, { foodId: 'egg', servings: 2 }],
      proteinGoal: { weight: -5, activity: 'superhuman' },
      units: 'stone',
      completedStages: ['plate', 'moon'],
      quizScores: { gut: 'three' },
      theme: 'sepia',
    });
    expect(state.meal).toEqual([{ foodId: 'egg', servings: 2 }]);
    expect(state.proteinGoal).toEqual({ weight: null, activity: 'sedentary' });
    expect(state.units).toBe('kg');
    expect(state.completedStages).toEqual(['plate']);
    expect(state.quizScores).toEqual({});
    expect(state.theme).toBeNull();
  });
});
