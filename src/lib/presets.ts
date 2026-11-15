import type { MealItem } from '../state/types';

export interface PresetMeal {
  id: string;
  name: string;
  description: string;
  items: MealItem[];
}

/** Ready-made meals so first-time visitors have something to try. Ids are USDA FDC ids. */
export const PRESET_MEALS: PresetMeal[] = [
  {
    id: 'breakfast',
    name: 'Breakfast',
    description: 'Scrambled eggs, whole-wheat toast, milk and a banana',
    items: [
      { foodId: '172187', servings: 2 }, // Egg, whole, cooked, scrambled
      { foodId: '172689', servings: 2 }, // Bread, whole-wheat, toasted
      { foodId: '172217', servings: 1 }, // Milk, whole
      { foodId: '173944', servings: 1 }, // Bananas, raw
    ],
  },
  {
    id: 'vegan-day',
    name: 'Vegan day',
    description: 'Oatmeal with peanut butter, lentils and brown rice, tofu and broccoli, almonds',
    items: [
      { foodId: '173905', servings: 1 }, // Oats, cooked
      { foodId: '172470', servings: 1 }, // Peanut butter
      { foodId: '172421', servings: 1 }, // Lentils, cooked
      { foodId: '169704', servings: 1 }, // Rice, brown, cooked
      { foodId: '172448', servings: 1 }, // Tofu, firm
      { foodId: '169967', servings: 1 }, // Broccoli, cooked
      { foodId: '170567', servings: 1 }, // Almonds
    ],
  },
  {
    id: 'rice-and-beans',
    name: 'Rice and beans',
    description: 'White rice with black beans: a classic complementary pair',
    items: [
      { foodId: '169757', servings: 1 }, // Rice, white, cooked
      { foodId: '173735', servings: 1 }, // Beans, black, cooked
    ],
  },
  {
    id: 'chicken-dinner',
    name: 'Chicken dinner',
    description: 'Roasted chicken breast, baked potato and spinach',
    items: [
      { foodId: '171477', servings: 1 }, // Chicken breast, roasted
      { foodId: '170033', servings: 2 }, // Potatoes, baked
      { foodId: '168463', servings: 1 }, // Spinach, cooked
    ],
  },
  {
    id: 'pasta-only',
    name: 'Just pasta',
    description: 'Two cups of plain pasta: plenty of calories, short on lysine',
    items: [{ foodId: '169737', servings: 2 }], // Pasta, cooked
  },
];
