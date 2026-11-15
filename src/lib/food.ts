/** The nine amino acids the body can't make, in the order used across the site. */
export const ESSENTIAL_AMINO_ACIDS = [
  'histidine',
  'isoleucine',
  'leucine',
  'lysine',
  'methionine',
  'phenylalanine',
  'threonine',
  'tryptophan',
  'valine',
] as const;

export type EssentialAminoAcid = (typeof ESSENTIAL_AMINO_ACIDS)[number];

export type DietTag = 'vegetarian' | 'vegan';

/** One food from public/data/foods.json. All nutrient values are per serving. */
export interface Food {
  /** USDA FoodData Central id, so every number can be traced to its source. */
  id: string;
  name: string;
  category: string;
  servingGrams: number;
  /** Household description of the serving, e.g. "1 cup" or "1 large". */
  servingLabel: string;
  kcal: number;
  proteinG: number;
  aminoAcidsMg: Record<EssentialAminoAcid, number>;
  /**
   * Cystine and tyrosine are not essential, but the WHO/FAO/UNU reference pattern
   * scores methionine+cysteine and phenylalanine+tyrosine as pairs, so they are needed
   * to judge a protein fairly.
   */
  pairedAminoAcidsMg: { cystine: number; tyrosine: number };
  /** Estimated from the food's name and category, not from an ingredient list. */
  tags: DietTag[];
}

export interface FoodData {
  source: string;
  notes: string;
  foods: Food[];
}

let cache: Promise<FoodData> | null = null;

/**
 * Load the food list. It is fetched on first use rather than bundled, so pages that
 * don't need it (landing, Cell, Structure) stay fast. A failed load can be retried.
 */
export function loadFoods(): Promise<FoodData> {
  if (!cache) {
    cache = fetch('/data/foods.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load food data (${response.status})`);
        return response.json() as Promise<FoodData>;
      })
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}
