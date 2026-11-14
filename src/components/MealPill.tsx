import { Link } from 'react-router-dom';
import { useAppState } from '../state/AppState';

/**
 * Small "My Meal" pill shown on every stage.
 * For now it links to the Plate stage; it will open the meal panel and show
 * total protein once the food data and meal builder exist (milestones 2–3).
 */
export default function MealPill() {
  const { state } = useAppState();
  const count = state.meal.length;

  return (
    <Link className="meal-pill" to="/plate">
      <span className="meal-pill__title">My meal</span>
      <span className="meal-pill__count">
        {count === 0 ? 'empty' : `${count} ${count === 1 ? 'item' : 'items'}`}
      </span>
    </Link>
  );
}
