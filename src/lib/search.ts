import type { Food } from './food';
import { HIGH_PROTEIN_PER_100_KCAL, proteinPer100Kcal } from './nutrition';

export interface FoodFilters {
  vegetarian: boolean;
  vegan: boolean;
  highProtein: boolean;
  /** Empty string means every category. */
  category: string;
}

export const NO_FILTERS: FoodFilters = { vegetarian: false, vegan: false, highProtein: false, category: '' };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

/** True if the two words differ by at most one insertion, deletion, substitution or swap. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const restA = a.slice(i);
  const restB = b.slice(i);
  return (
    restA.slice(1) === restB.slice(1) || // substitution
    restA.slice(1) === restB || // deletion from a
    restA === restB.slice(1) || // insertion into a
    (restA.length > 1 && restB.length > 1 && restA[0] === restB[1] && restA[1] === restB[0] && restA.slice(2) === restB.slice(2)) // swap
  );
}

/**
 * How well one query word matches a food's words. 0 means no match.
 * Earlier words score higher, because USDA names lead with the food itself.
 */
function tokenScore(token: string, words: string[]): number {
  let best = 0;
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const position = Math.max(0, 6 - index); // bonus for appearing early in the name
    let score = 0;
    if (word === token) score = 100;
    else if (word.startsWith(token)) score = 80;
    // Plurals and simple typos: "almond" ~ "almonds", "brocoli" ~ "broccoli".
    else if (token.length >= 4 && withinOneEdit(token, word)) score = 60;
    else if (token.length >= 5 && word.length > token.length && withinOneEdit(token, word.slice(0, token.length))) score = 50;
    else if (token.length >= 3 && word.includes(token)) score = 40;
    if (score > 0) best = Math.max(best, score + position);
  }
  return best;
}

const DRY_STAPLE_CATEGORIES = new Set(['Legumes', 'Grains & pasta']);

function isUncookedStaple(food: Food): boolean {
  return DRY_STAPLE_CATEGORIES.has(food.category) && /\b(raw|dry|uncooked|unprepared)\b/i.test(food.name);
}

/** Search index entry: precomputed words so typing stays fast with ~1,200 foods. */
export interface IndexedFood {
  food: Food;
  words: string[];
}

export function buildIndex(foods: Food[]): IndexedFood[] {
  return foods.map((food) => ({ food, words: normalize(`${food.name} ${food.category}`).split(' ') }));
}

export function passesFilters(food: Food, filters: FoodFilters): boolean {
  if (filters.vegan && !food.tags.includes('vegan')) return false;
  if (filters.vegetarian && !food.tags.includes('vegetarian')) return false;
  if (filters.highProtein && proteinPer100Kcal(food) < HIGH_PROTEIN_PER_100_KCAL) return false;
  if (filters.category && food.category !== filters.category) return false;
  return true;
}

/**
 * Fuzzy food search. Every word in the query must match somewhere in the food's name
 * or category; results are ordered best match first, shorter (plainer) names breaking ties.
 * With an empty query, returns all foods that pass the filters, highest protein first.
 */
export function searchFoods(index: IndexedFood[], query: string, filters: FoodFilters = NO_FILTERS): Food[] {
  const tokens = normalize(query).split(' ').filter(Boolean);
  const candidates = index.filter((entry) => passesFilters(entry.food, filters));

  if (tokens.length === 0) {
    return candidates.map((entry) => entry.food).sort((a, b) => b.proteinG - a.proteinG || a.name.localeCompare(b.name));
  }

  const scored: { food: Food; score: number }[] = [];
  for (const entry of candidates) {
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const score = tokenScore(token, entry.words);
      if (score === 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    // Dry beans, lentils, rice and pasta are listed both uncooked and cooked. Show the
    // cooked version first: it is what ends up on the plate.
    if (matchedAll) scored.push({ food: entry.food, score: total - (isUncookedStaple(entry.food) ? 15 : 0) });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length || a.food.name.localeCompare(b.food.name))
    .map((item) => item.food);
}
