import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadState, saveState } from './storage';
import type { AppState, MealItem, ProteinGoalSettings, StageId, Theme, WeightUnit } from './types';

/** Servings are adjusted in halves and kept within a sensible range. */
export const MIN_SERVINGS = 0.5;
export const MAX_SERVINGS = 20;

export function clampServings(servings: number): number {
  if (!Number.isFinite(servings)) return 1;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(servings * 2) / 2));
}

interface AppStateValue {
  state: AppState;
  /** The theme actually shown: the saved choice, or the device setting. */
  theme: Theme;
  toggleTheme: () => void;
  completeStage: (stage: StageId) => void;

  /** Add servings of a food; adds to the existing amount if it is already in the meal. */
  addToMeal: (foodId: string, servings: number) => void;
  setServings: (foodId: string, servings: number) => void;
  removeFromMeal: (foodId: string) => void;
  replaceMeal: (items: MealItem[]) => void;
  clearMeal: () => void;

  setGoal: (change: Partial<ProteinGoalSettings>) => void;
  setUnits: (units: WeightUnit) => void;
  /** Price per serving for compare mode; null removes it. */
  setPrice: (foodId: string, price: number | null) => void;

  /** Whether the My Meal drawer is open. Not saved. */
  mealOpen: boolean;
  setMealOpen: (open: boolean) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return prefersDark;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [mealOpen, setMealOpen] = useState(false);
  const prefersDark = usePrefersDark();
  const theme: Theme = state.theme ?? (prefersDark ? 'dark' : 'light');

  // Persist on every change. saveState swallows storage errors.
  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setState((previous: AppState) => {
      const shown = previous.theme ?? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');
      return { ...previous, theme: shown === 'dark' ? 'light' : 'dark' };
    });
  }, []);

  const completeStage = useCallback((stage: StageId) => {
    setState((previous: AppState) =>
      previous.completedStages.includes(stage)
        ? previous
        : { ...previous, completedStages: [...previous.completedStages, stage] },
    );
  }, []);

  const addToMeal = useCallback((foodId: string, servings: number) => {
    setState((previous: AppState) => {
      const existing = previous.meal.find((item) => item.foodId === foodId);
      const meal = existing
        ? previous.meal.map((item) =>
            item.foodId === foodId ? { ...item, servings: clampServings(item.servings + servings) } : item,
          )
        : [...previous.meal, { foodId, servings: clampServings(servings) }];
      return { ...previous, meal };
    });
  }, []);

  const setServings = useCallback((foodId: string, servings: number) => {
    setState((previous: AppState) => ({
      ...previous,
      meal: previous.meal.map((item) =>
        item.foodId === foodId ? { ...item, servings: clampServings(servings) } : item,
      ),
    }));
  }, []);

  const removeFromMeal = useCallback((foodId: string) => {
    setState((previous: AppState) => ({
      ...previous,
      meal: previous.meal.filter((item) => item.foodId !== foodId),
    }));
  }, []);

  const replaceMeal = useCallback((items: MealItem[]) => {
    setState((previous: AppState) => ({
      ...previous,
      meal: items.map((item) => ({ foodId: item.foodId, servings: clampServings(item.servings) })),
    }));
  }, []);

  const clearMeal = useCallback(() => {
    setState((previous: AppState) => ({ ...previous, meal: [] }));
  }, []);

  const setGoal = useCallback((change: Partial<ProteinGoalSettings>) => {
    setState((previous: AppState) => ({ ...previous, proteinGoal: { ...previous.proteinGoal, ...change } }));
  }, []);

  const setUnits = useCallback((units: WeightUnit) => {
    setState((previous: AppState) => ({ ...previous, units }));
  }, []);

  const setPrice = useCallback((foodId: string, price: number | null) => {
    setState((previous: AppState) => {
      const prices = { ...previous.prices };
      if (price === null || !Number.isFinite(price) || price <= 0) delete prices[foodId];
      else prices[foodId] = price;
      return { ...previous, prices };
    });
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      state,
      theme,
      toggleTheme,
      completeStage,
      addToMeal,
      setServings,
      removeFromMeal,
      replaceMeal,
      clearMeal,
      setGoal,
      setUnits,
      setPrice,
      mealOpen,
      setMealOpen,
    }),
    [
      state,
      theme,
      toggleTheme,
      completeStage,
      addToMeal,
      setServings,
      removeFromMeal,
      replaceMeal,
      clearMeal,
      setGoal,
      setUnits,
      setPrice,
      mealOpen,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}
