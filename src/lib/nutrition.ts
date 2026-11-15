import type { ActivityLevel, MealItem, WeightUnit } from '../state/types';
import type { Food } from './food';

/**
 * Adult amino acid requirement pattern, in mg per gram of protein.
 * Source: WHO/FAO/UNU, "Protein and Amino Acid Requirements in Human Nutrition",
 * WHO Technical Report Series 935 (2007).
 * Methionine is scored together with cysteine, and phenylalanine with tyrosine.
 */
export const REFERENCE_PATTERN = {
  histidine: 15,
  isoleucine: 30,
  leucine: 59,
  lysine: 45,
  sulfur: 22,
  aromatic: 38,
  threonine: 23,
  tryptophan: 6,
  valine: 39,
} as const;

export type PatternKey = keyof typeof REFERENCE_PATTERN;
export const PATTERN_KEYS = Object.keys(REFERENCE_PATTERN) as PatternKey[];

export const PATTERN_LABELS: Record<PatternKey, string> = {
  histidine: 'Histidine',
  isoleucine: 'Isoleucine',
  leucine: 'Leucine',
  lysine: 'Lysine',
  sulfur: 'Methionine + cysteine',
  aromatic: 'Phenylalanine + tyrosine',
  threonine: 'Threonine',
  tryptophan: 'Tryptophan',
  valine: 'Valine',
};

export const PATTERN_SOURCE = 'WHO/FAO/UNU (2007), WHO Technical Report Series 935';

/**
 * A food earns the "Complete protein" badge when every essential amino acid reaches
 * at least this fraction of the reference pattern. 0.8 rather than 1.0 so that foods
 * which miss by a small margin in USDA's averages (ground beef, for example) still count.
 */
export const COMPLETE_THRESHOLD = 0.8;

/** Protein and amino acid amounts in the units the pattern is scored in. */
export interface ProteinAmounts {
  proteinG: number;
  /** mg of each pattern entry (pairs already added together). */
  patternMg: Record<PatternKey, number>;
}

export interface MealTotals extends ProteinAmounts {
  kcal: number;
  /** Number of distinct foods found in the data. */
  itemCount: number;
}

function patternMgForFood(food: Food, servings: number): Record<PatternKey, number> {
  const a = food.aminoAcidsMg;
  const p = food.pairedAminoAcidsMg;
  return {
    histidine: a.histidine * servings,
    isoleucine: a.isoleucine * servings,
    leucine: a.leucine * servings,
    lysine: a.lysine * servings,
    sulfur: (a.methionine + p.cystine) * servings,
    aromatic: (a.phenylalanine + p.tyrosine) * servings,
    threonine: a.threonine * servings,
    tryptophan: a.tryptophan * servings,
    valine: a.valine * servings,
  };
}

export function foodAmounts(food: Food, servings = 1): ProteinAmounts {
  return { proteinG: food.proteinG * servings, patternMg: patternMgForFood(food, servings) };
}

/** Add up a meal. Items whose food isn't in the data are skipped. */
export function mealTotals(meal: MealItem[], foodsById: Map<string, Food>): MealTotals {
  const totals: MealTotals = {
    kcal: 0,
    proteinG: 0,
    itemCount: 0,
    patternMg: Object.fromEntries(PATTERN_KEYS.map((key) => [key, 0])) as Record<PatternKey, number>,
  };
  for (const item of meal) {
    const food = foodsById.get(item.foodId);
    if (!food) continue;
    totals.itemCount += 1;
    totals.kcal += food.kcal * item.servings;
    totals.proteinG += food.proteinG * item.servings;
    const mg = patternMgForFood(food, item.servings);
    for (const key of PATTERN_KEYS) totals.patternMg[key] += mg[key];
  }
  return totals;
}

export interface AminoScore {
  key: PatternKey;
  label: string;
  /** mg per gram of protein in the food or meal. */
  mgPerGProtein: number;
  /** mg per gram of protein in the reference pattern. */
  referenceMgPerG: number;
  /** mgPerGProtein / referenceMgPerG. 1 means exactly meeting the pattern. */
  ratio: number;
}

/** Compare a food's or meal's amino acids with the reference pattern, one entry per pattern row. */
export function aminoProfile(amounts: ProteinAmounts): AminoScore[] {
  return PATTERN_KEYS.map((key) => {
    const mgPerGProtein = amounts.proteinG > 0 ? amounts.patternMg[key] / amounts.proteinG : 0;
    return {
      key,
      label: PATTERN_LABELS[key],
      mgPerGProtein,
      referenceMgPerG: REFERENCE_PATTERN[key],
      ratio: mgPerGProtein / REFERENCE_PATTERN[key],
    };
  });
}

/** The amino acid furthest below the pattern (lowest ratio), or null if there is no protein. */
export function limitingAminoAcid(amounts: ProteinAmounts): AminoScore | null {
  if (!(amounts.proteinG > 0)) return null;
  return aminoProfile(amounts).reduce((lowest, score) => (score.ratio < lowest.ratio ? score : lowest));
}

export function isCompleteProtein(food: Food, threshold = COMPLETE_THRESHOLD): boolean {
  const limiting = limitingAminoAcid(foodAmounts(food));
  return limiting !== null && limiting.ratio >= threshold;
}

/** Grams of protein per 100 kcal. Used for the "high protein" filter and compare mode. */
export function proteinPer100Kcal(food: Food): number {
  return food.kcal > 0 ? (food.proteinG / food.kcal) * 100 : 0;
}

/** Foods at or above this many grams of protein per 100 kcal pass the "high protein" filter. */
export const HIGH_PROTEIN_PER_100_KCAL = 10;

// ---------- Protein goal ----------

export const KG_PER_LB = 0.45359237;

export interface ActivityOption {
  id: ActivityLevel;
  label: string;
  /** Grams of protein per kg of body weight per day used for the goal. */
  gPerKg: number;
  /** One line explaining where the number comes from. */
  basis: string;
  source: string;
}

const RDA_SOURCE =
  'Institute of Medicine, Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids (2005)';
const ATHLETE_SOURCE =
  'Thomas, Erdman & Burke, "Nutrition and Athletic Performance", joint position of the Academy of Nutrition and Dietetics, Dietitians of Canada and the American College of Sports Medicine, J Acad Nutr Diet 116(3), 2016';

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'sedentary',
    label: 'Mostly inactive',
    gPerKg: 0.8,
    basis: 'The adult Recommended Dietary Allowance: 0.8 g per kg of body weight a day.',
    source: RDA_SOURCE,
  },
  {
    id: 'moderate',
    label: 'Exercise a few times a week',
    gPerKg: 1.2,
    basis: 'The low end of the 1.2–2.0 g per kg range recommended for people who train.',
    source: ATHLETE_SOURCE,
  },
  {
    id: 'active',
    label: 'Train hard most days',
    gPerKg: 1.6,
    basis: 'The middle of the 1.2–2.0 g per kg range recommended for people who train.',
    source: ATHLETE_SOURCE,
  },
];

export interface ProteinGoal {
  grams: number;
  option: ActivityOption;
}

/** Daily protein goal in grams, or null until a valid weight is entered. */
export function proteinGoal(weight: number | null, unit: WeightUnit, activity: ActivityLevel): ProteinGoal | null {
  if (weight === null || !Number.isFinite(weight) || weight <= 0) return null;
  const option = ACTIVITY_OPTIONS.find((item) => item.id === activity) ?? ACTIVITY_OPTIONS[0];
  const kg = unit === 'lb' ? weight * KG_PER_LB : weight;
  return { grams: Math.round(kg * option.gPerKg), option };
}

// ---------- Display helpers ----------

/** First parts of a USDA name that are a group, not the food itself ("Nuts, almonds"). */
const GROUP_WORDS = new Set([
  'nuts', 'seeds', 'fish', 'cereals', 'fast foods', 'snacks', 'crustaceans', 'mollusks', 'cheese', 'milk',
  'bread', 'beans', 'rice', 'peas', 'game meat', 'babyfood', 'soup', 'candies', 'cookies', 'crackers',
  'beverages', 'pasta', 'noodles', 'squash', 'peppers', 'mushrooms', 'lettuce', 'cabbage', 'onions',
]);

/**
 * Split a USDA name into a short title and the remaining detail:
 * "Chicken, broilers or fryers, breast, meat only, cooked, roasted"
 *   -> title "Chicken", detail "broilers or fryers, breast, meat only, cooked, roasted"
 * "Nuts, almonds" -> title "Almonds", detail "".
 */
export function splitFoodName(name: string): { title: string; detail: string } {
  const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { title: name, detail: '' };
  let titleParts = 1;
  let title = parts[0];
  if (parts.length > 1 && GROUP_WORDS.has(parts[0].toLowerCase())) {
    titleParts = 2;
    // "Nuts, almonds" -> "Almonds"; "Cheese, cheddar" -> "Cheddar cheese"; "Bread, rye" -> "Rye bread".
    const group = parts[0].toLowerCase();
    const flip = ['cheese', 'milk', 'bread', 'beans', 'rice', 'peas', 'pasta', 'noodles', 'squash', 'peppers', 'mushrooms', 'lettuce', 'cabbage', 'onions'];
    title = flip.includes(group) ? `${parts[1]} ${group}` : parts[1];
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  return { title, detail: parts.slice(titleParts).join(', ') };
}

/** 12.345 -> "12.3", 12 -> "12". */
export function formatGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
