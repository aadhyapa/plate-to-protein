import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ESSENTIAL_AMINO_ACIDS } from './food';
import type { FoodData } from './food';

// Checks the generated file itself, so a bad rebuild of the data fails the tests.
const data: FoodData = JSON.parse(
  readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8'),
);
const { foods } = data;

describe('foods.json', () => {
  it('has a sensible number of foods with unique ids', () => {
    expect(foods.length >= 500 && foods.length <= 1500).toBe(true);
    expect(new Set(foods.map((food) => food.id)).size).toBe(foods.length);
  });

  it('credits USDA FoodData Central', () => {
    expect(data.source.includes('FoodData Central')).toBe(true);
  });

  it('gives every food complete, plausible numbers', () => {
    const problems: string[] = [];
    for (const food of foods) {
      const aminoMg =
        ESSENTIAL_AMINO_ACIDS.reduce((sum, key) => sum + food.aminoAcidsMg[key], 0) +
        food.pairedAminoAcidsMg.cystine +
        food.pairedAminoAcidsMg.tyrosine;
      const ok =
        food.name.length > 0 &&
        food.category.length > 0 &&
        food.servingLabel.length > 0 &&
        food.servingGrams > 0 &&
        food.kcal >= 0 &&
        food.proteinG > 0 &&
        ESSENTIAL_AMINO_ACIDS.every((key) => food.aminoAcidsMg[key] >= 0) &&
        // Amino acids are part of the protein, so they can't outweigh it (10% slack for rounding).
        aminoMg <= food.proteinG * 1000 * 1.1 + 5 &&
        food.tags.every((tag) => tag === 'vegetarian' || tag === 'vegan') &&
        (!food.tags.includes('vegan') || food.tags.includes('vegetarian'));
      if (!ok) problems.push(food.name);
    }
    expect(problems).toEqual([]);
  });

  it('includes everyday staples', () => {
    const names = foods.map((food) => food.name);
    for (const start of ['Egg, whole', 'Milk, whole', 'Rice, white', 'Lentils', 'Bread, whole-wheat', 'Tofu', 'Bananas']) {
      expect(names.some((name) => name.startsWith(start))).toBe(true);
    }
  });

  it('never tags meat, fish or dairy as vegan', () => {
    const animalCategories = ['Dairy & eggs', 'Poultry', 'Pork', 'Beef', 'Fish & shellfish', 'Lamb & game', 'Sausages & deli meats'];
    const wrong = foods.filter((food) => animalCategories.includes(food.category) && food.tags.includes('vegan'));
    expect(wrong.map((food) => food.name)).toEqual([]);
  });
});
