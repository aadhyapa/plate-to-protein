import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Food, FoodData } from './food';
import {
  aminoProfile,
  foodAmounts,
  formatGrams,
  isCompleteProtein,
  limitingAminoAcid,
  mealTotals,
  proteinGoal,
  proteinPer100Kcal,
  splitFoodName,
} from './nutrition';
import { PRESET_MEALS } from './presets';
import { buildIndex, searchFoods, withinOneEdit } from './search';

const data: FoodData = JSON.parse(
  readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8'),
);
const byId = new Map(data.foods.map((food) => [food.id, food]));
const index = buildIndex(data.foods);
const get = (id: string): Food => {
  const food = byId.get(id);
  if (!food) throw new Error(`Missing food ${id}`);
  return food;
};

/** A made-up food that exactly meets the reference pattern, with 10 g protein per serving. */
const exact: Food = {
  id: 'x',
  name: 'Exact',
  category: 'Test',
  servingGrams: 100,
  servingLabel: '100 g',
  kcal: 100,
  proteinG: 10,
  aminoAcidsMg: {
    histidine: 150,
    isoleucine: 300,
    leucine: 590,
    lysine: 450,
    methionine: 120,
    phenylalanine: 200,
    threonine: 230,
    tryptophan: 60,
    valine: 390,
  },
  pairedAminoAcidsMg: { cystine: 100, tyrosine: 180 },
  tags: [],
};

describe('amino acid scoring', () => {
  it('scores a food that exactly meets the pattern as 1.0 everywhere', () => {
    const ratios = aminoProfile(foodAmounts(exact)).map((score) => Math.round(score.ratio * 1000) / 1000);
    expect(ratios).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(isCompleteProtein(exact)).toBe(true);
  });

  it('adds methionine+cystine and phenylalanine+tyrosine as pairs', () => {
    const profile = aminoProfile(foodAmounts(exact));
    expect(profile.find((score) => score.key === 'sulfur')?.mgPerGProtein).toBe(22);
    expect(profile.find((score) => score.key === 'aromatic')?.mgPerGProtein).toBe(38);
  });

  it('finds the limiting amino acid', () => {
    const lowLysine: Food = { ...exact, aminoAcidsMg: { ...exact.aminoAcidsMg, lysine: 225 } };
    const limiting = limitingAminoAcid(foodAmounts(lowLysine));
    expect(limiting?.key).toBe('lysine');
    expect(limiting?.ratio).toBe(0.5);
    expect(isCompleteProtein(lowLysine)).toBe(false);
  });

  it('uses an 80% threshold for the complete badge', () => {
    const at80: Food = { ...exact, aminoAcidsMg: { ...exact.aminoAcidsMg, lysine: 360 } };
    const at79: Food = { ...exact, aminoAcidsMg: { ...exact.aminoAcidsMg, lysine: 355 } };
    expect(isCompleteProtein(at80)).toBe(true);
    expect(isCompleteProtein(at79)).toBe(false);
  });

  it('agrees with what is known about real foods', () => {
    expect(isCompleteProtein(get('172187'))).toBe(true); // egg
    expect(isCompleteProtein(get('171477'))).toBe(true); // chicken breast
    expect(isCompleteProtein(get('169737'))).toBe(false); // pasta
    expect(limitingAminoAcid(foodAmounts(get('169737')))?.key).toBe('lysine');
    expect(limitingAminoAcid(foodAmounts(get('169757')))?.key).toBe('lysine'); // white rice
  });

  it('has no limiting amino acid when there is no protein', () => {
    expect(limitingAminoAcid({ ...foodAmounts(exact), proteinG: 0 })).toBeNull();
  });
});

describe('mealTotals', () => {
  it('multiplies by servings and skips unknown foods', () => {
    const foods = new Map([[exact.id, exact]]);
    const totals = mealTotals(
      [
        { foodId: 'x', servings: 1.5 },
        { foodId: 'gone', servings: 3 },
      ],
      foods,
    );
    expect(totals.itemCount).toBe(1);
    expect(totals.proteinG).toBe(15);
    expect(totals.kcal).toBe(150);
    expect(totals.patternMg.lysine).toBe(675);
    expect(totals.patternMg.sulfur).toBe(330);
  });

  it('shows rice and beans complementing each other', () => {
    const rice = limitingAminoAcid(foodAmounts(get('169757')));
    const together = limitingAminoAcid(
      mealTotals(
        [
          { foodId: '169757', servings: 1 },
          { foodId: '173735', servings: 1 },
        ],
        byId,
      ),
    );
    expect((together?.ratio ?? 0) > (rice?.ratio ?? 1)).toBe(true);
    expect((together?.ratio ?? 0) >= 1).toBe(true);
  });
});

describe('proteinGoal', () => {
  it('uses 0.8 g per kg for the baseline', () => {
    expect(proteinGoal(70, 'kg', 'sedentary')?.grams).toBe(56);
  });
  it('converts pounds', () => {
    expect(proteinGoal(154, 'lb', 'sedentary')?.grams).toBe(56);
  });
  it('raises the goal with activity', () => {
    expect(proteinGoal(70, 'kg', 'moderate')?.grams).toBe(84);
    expect(proteinGoal(70, 'kg', 'active')?.grams).toBe(112);
  });
  it('returns null without a valid weight', () => {
    expect(proteinGoal(null, 'kg', 'sedentary')).toBeNull();
    expect(proteinGoal(0, 'kg', 'sedentary')).toBeNull();
    expect(proteinGoal(Number.NaN, 'kg', 'sedentary')).toBeNull();
  });
});

describe('display helpers', () => {
  it('splits USDA names into title and detail', () => {
    expect(splitFoodName('Lentils, mature seeds, cooked, boiled, without salt')).toEqual({
      title: 'Lentils',
      detail: 'mature seeds, cooked, boiled, without salt',
    });
    expect(splitFoodName('Nuts, almonds')).toEqual({ title: 'Almonds', detail: '' });
    expect(splitFoodName('Cheese, cheddar')).toEqual({ title: 'Cheddar cheese', detail: '' });
    expect(splitFoodName('Tempeh')).toEqual({ title: 'Tempeh', detail: '' });
  });
  it('formats grams', () => {
    expect(formatGrams(12.345)).toBe('12.3');
    expect(formatGrams(12)).toBe('12');
    expect(formatGrams(0.04)).toBe('0');
  });
  it('computes protein per 100 kcal', () => {
    expect(proteinPer100Kcal(exact)).toBe(10);
    expect(proteinPer100Kcal({ ...exact, kcal: 0 })).toBe(0);
  });
});

describe('searchFoods', () => {
  const names = (query: string, filters = {}) =>
    searchFoods(index, query, { vegetarian: false, vegan: false, highProtein: false, category: '', ...filters }).map(
      (food) => food.name,
    );

  it('finds foods by name, best match first', () => {
    expect(names('lentils')[0].startsWith('Lentils')).toBe(true);
    expect(names('tempeh')[0]).toBe('Tempeh');
  });
  it('lists cooked beans and grains before their uncooked versions', () => {
    expect(names('lentils')[0]).toBe('Lentils, mature seeds, cooked, boiled, without salt');
    expect(/cooked/.test(names('quinoa')[0])).toBe(true);
  });
  it('requires every word to match', () => {
    const results = names('chicken breast roasted');
    expect(results.length > 0).toBe(true);
    expect(results.every((name) => /chicken/i.test(name) && /breast/i.test(name))).toBe(true);
  });
  it('tolerates typos and singular/plural', () => {
    expect(names('brocoli').some((name) => name.startsWith('Broccoli'))).toBe(true);
    expect(names('almond').some((name) => name === 'Nuts, almonds')).toBe(true);
    expect(names('banana').some((name) => name.startsWith('Bananas'))).toBe(true);
  });
  it('applies filters', () => {
    expect(names('', { vegan: true }).length).toBe(data.foods.filter((food) => food.tags.includes('vegan')).length);
    expect(names('milk', { vegan: true }).every((name) => !/^Milk,/.test(name))).toBe(true);
    expect(names('', { category: 'Legumes' }).length > 50).toBe(true);
    expect(searchFoods(index, '', { vegetarian: false, vegan: false, highProtein: true, category: '' }).every((food) => proteinPer100Kcal(food) >= 10)).toBe(true);
  });
  it('returns nothing for nonsense', () => {
    expect(names('zzzzqqq')).toEqual([]);
  });
  it('checks single edits', () => {
    expect(withinOneEdit('brocoli', 'broccoli')).toBe(true);
    expect(withinOneEdit('almond', 'almonds')).toBe(true);
    expect(withinOneEdit('lentils', 'lentlis')).toBe(true);
    expect(withinOneEdit('rice', 'beans')).toBe(false);
  });
});

describe('preset meals', () => {
  it('only uses foods that exist in the data', () => {
    const missing = PRESET_MEALS.flatMap((preset) => preset.items).filter((item) => !byId.has(item.foodId));
    expect(missing).toEqual([]);
  });
});
