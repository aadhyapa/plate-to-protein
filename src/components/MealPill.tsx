import { useFoods } from '../hooks/useFoods';
import { formatGrams, mealTotals } from '../lib/nutrition';
import { useAppState } from '../state/AppState';

/** Small "My Meal" pill shown on every stage. Opens the meal drawer. */
export default function MealPill() {
  const { state, setMealOpen } = useAppState();
  const count = state.meal.length;
  // Only fetch the food list for the pill when there is something to total.
  const foods = useFoods(count > 0);
  const protein = foods.status === 'ready' ? mealTotals(state.meal, foods.library.byId).proteinG : null;

  return (
    <button type="button" className="meal-pill" onClick={() => setMealOpen(true)} aria-haspopup="dialog">
      <span className="meal-pill__title">My meal</span>
      <span className="meal-pill__count">
        {count === 0
          ? 'empty'
          : `${count} ${count === 1 ? 'item' : 'items'}${protein !== null ? ` · ${formatGrams(protein)} g protein` : ''}`}
      </span>
    </button>
  );
}
