import { useCallback, useEffect, useState } from 'react';
import { loadFoods } from '../lib/food';
import type { Food, FoodData } from '../lib/food';
import { buildIndex } from '../lib/search';
import type { IndexedFood } from '../lib/search';

export interface FoodLibrary {
  data: FoodData;
  foods: Food[];
  byId: Map<string, Food>;
  index: IndexedFood[];
  categories: string[];
}

export type FoodsState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; library: FoodLibrary };

// Built once and shared by every component that needs the food list.
let library: FoodLibrary | null = null;

function toLibrary(data: FoodData): FoodLibrary {
  return {
    data,
    foods: data.foods,
    byId: new Map(data.foods.map((food) => [food.id, food])),
    index: buildIndex(data.foods),
    categories: [...new Set(data.foods.map((food) => food.category))].sort(),
  };
}

/** Load the food list on demand. `enabled: false` waits (e.g. until the meal has items). */
export function useFoods(enabled = true): FoodsState {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [, setLoadedTick] = useState(0);
  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((count: number) => count + 1);
  }, []);

  useEffect(() => {
    if (!enabled || library) return;
    let cancelled = false;
    loadFoods()
      .then((data) => {
        if (!library) library = toLibrary(data);
        if (!cancelled) setLoadedTick((tick: number) => tick + 1);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  if (library) return { status: 'ready', library };
  if (failed) return { status: 'error', retry };
  return { status: 'loading' };
}
