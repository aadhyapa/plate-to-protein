import type { MealItem } from '../state/types';
import type { Food } from './food';
import { limitingAminoAcid, mealTotals } from './nutrition';
import type { AminoScore } from './nutrition';

export interface Suggestion {
  food: Food;
  /** The meal's lowest ratio to the reference pattern after adding one serving. */
  newRatio: number;
  /** Which amino acid is limiting after the addition. */
  newLimiting: AminoScore;
}

/**
 * Suggestions come from a short list of familiar, ready-to-eat foods rather than the
 * whole dataset: "add lentils" is more useful advice than "add boiled taro leaves",
 * even when the taro leaves score slightly higher.
 */
const FAMILIAR_FOODS: RegExp[] = [
  // Legumes and soy
  /^Lentils, mature seeds, cooked/,
  /^Beans, (black|kidney, all types|pinto|navy|white), mature seeds, cooked, boiled, without salt/,
  /^Chickpeas .*cooked, boiled, without salt/,
  /^Peas, green, cooked, boiled, drained, without salt/,
  /^Tofu, (firm|extra firm)/,
  /^Tempeh$/,
  /^Edamame, frozen, prepared/,
  /^Soymilk, original and vanilla, unfortified/,
  /^Soybeans, mature cooked, boiled, without salt/,
  /^Peanut butter, smooth style, without salt/,
  // Dairy and eggs
  /^Milk, (whole|nonfat|reduced fat)/,
  /^Yogurt, (Greek, plain|plain, low fat)/,
  /^Egg, whole, cooked, hard-boiled/,
  /^Cheese, (cheddar|mozzarella, part skim milk|cottage, lowfat, 2% milkfat)$/,
  // Meat and fish
  /^Chicken, broilers or fryers, breast, meat only, cooked, roasted/,
  /^Fish, salmon, Atlantic, farmed, cooked/,
  /^Fish, tuna, light, canned in water/,
  /^Turkey, Ground, cooked/,
  // Nuts and seeds
  /^Nuts, (almonds|walnuts, english|cashew nuts, raw|pistachio nuts, raw)$/,
  /^Seeds, (pumpkin and squash seed kernels|sunflower seed kernels|chia seeds), dried$/,
  // Grains and vegetables
  /^Quinoa, cooked/,
  /^Cereals, oats, regular and quick, unenriched, cooked/,
  /^Rice, brown, long-grain, cooked/,
  /^Bread, whole-wheat, commercially prepared/,
  /^Spinach, cooked, boiled, drained, without salt/,
  /^Broccoli, cooked, boiled, drained, without salt/,
  /^Potatoes, baked, flesh, without salt/,
];

export function isFamiliarFood(food: Food): boolean {
  return FAMILIAR_FOODS.some((pattern) => pattern.test(food.name));
}

/** Suggestions respect the diet the meal already follows. */
function mealDiet(meal: MealItem[], foodsById: Map<string, Food>): 'vegan' | 'vegetarian' | 'any' {
  const foods = meal.map((item) => foodsById.get(item.foodId)).filter((food): food is Food => food !== undefined);
  if (foods.length === 0) return 'any';
  if (foods.every((food) => food.tags.includes('vegan'))) return 'vegan';
  if (foods.every((food) => food.tags.includes('vegetarian'))) return 'vegetarian';
  return 'any';
}

/**
 * Recommend up to `count` foods that best raise the meal's limiting amino acid.
 *
 * For each candidate, one serving is added to the meal and the meal is re-scored.
 * Candidates are ranked by how far they lift the lowest ratio toward the pattern, and no
 * two suggestions come from the same food category, so the list offers real choices.
 * Returns nothing if the meal already meets the pattern, or has no protein.
 */
export function suggestFoods(
  meal: MealItem[],
  foods: Food[],
  foodsById: Map<string, Food>,
  count = 3,
): Suggestion[] {
  const before = limitingAminoAcid(mealTotals(meal, foodsById));
  if (!before || before.ratio >= 1) return [];

  const inMeal = new Set(meal.map((item) => item.foodId));
  const diet = mealDiet(meal, foodsById);

  const scored: (Suggestion & { score: number })[] = [];
  for (const food of foods) {
    if (inMeal.has(food.id) || !isFamiliarFood(food)) continue;
    if (diet === 'vegan' && !food.tags.includes('vegan')) continue;
    if (diet === 'vegetarian' && !food.tags.includes('vegetarian')) continue;

    const after = limitingAminoAcid(mealTotals([...meal, { foodId: food.id, servings: 1 }], foodsById));
    if (!after) continue;
    const gain = after.ratio - before.ratio;
    if (gain < 0.03) continue;

    // Improvement only counts up to meeting the pattern; a small calorie penalty breaks ties
    // in favour of lighter additions.
    const usefulGain = Math.min(after.ratio, 1) - before.ratio;
    const score = usefulGain - food.kcal / 3000;
    scored.push({ food, newRatio: after.ratio, newLimiting: after, score });
  }

  scored.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));

  // One suggestion per category, so the list offers real choices (a legume, a dairy food...).
  const picked: Suggestion[] = [];
  const seenCategories = new Set<string>();
  for (const { food, newRatio, newLimiting } of scored) {
    if (seenCategories.has(food.category)) continue;
    seenCategories.add(food.category);
    picked.push({ food, newRatio, newLimiting });
    if (picked.length === count) break;
  }
  return picked;
}
