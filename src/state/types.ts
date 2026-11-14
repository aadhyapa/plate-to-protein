export type Theme = 'light' | 'dark';
export type StageId = 'plate' | 'gut' | 'cell' | 'structure' | 'wrap-up';
export type WeightUnit = 'kg' | 'lb';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active';

export interface MealItem {
  foodId: string;
  servings: number;
}

export interface ProteinGoalSettings {
  /** Body weight in the user's chosen unit; null until they enter one. */
  weight: number | null;
  activity: ActivityLevel;
}

/** Everything that is saved in the browser. Nothing here ever leaves the device. */
export interface AppState {
  meal: MealItem[];
  proteinGoal: ProteinGoalSettings;
  units: WeightUnit;
  completedStages: StageId[];
  /** Quiz id -> best score. */
  quizScores: Record<string, number>;
  /** null means "follow the device setting". */
  theme: Theme | null;
  /** Optional user-entered price per serving, keyed by food id. */
  prices: Record<string, number>;
}
