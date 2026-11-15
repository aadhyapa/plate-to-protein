import { Link } from 'react-router-dom';
import { useFoods } from '../hooks/useFoods';
import { formatGrams, mealTotals, proteinGoal, splitFoodName } from '../lib/nutrition';
import { MAX_SERVINGS, MIN_SERVINGS, useAppState } from '../state/AppState';

/** The meal itself: items, totals and progress to the daily goal. Used in the Plate sidebar and the drawer. */
export default function MealContents({ headingId, onNavigate }: { headingId: string; onNavigate?: () => void }) {
  const { state, setServings, removeFromMeal, clearMeal, completeStage } = useAppState();
  const foods = useFoods(true);
  const goal = proteinGoal(state.proteinGoal.weight, state.units, state.proteinGoal.activity);

  if (foods.status === 'loading') {
    return (
      <div className="meal">
        <h2 id={headingId} className="meal__heading">
          My meal
        </h2>
        <p className="muted" role="status">
          Loading foods…
        </p>
      </div>
    );
  }

  if (foods.status === 'error') {
    return (
      <div className="meal">
        <h2 id={headingId} className="meal__heading">
          My meal
        </h2>
        <p role="alert">The food list didn't load.</p>
        <button type="button" className="button button--ghost" onClick={foods.retry}>
          Try again
        </button>
      </div>
    );
  }

  const { byId } = foods.library;
  const totals = mealTotals(state.meal, byId);
  const percent = goal ? Math.min(100, Math.round((totals.proteinG / goal.grams) * 100)) : 0;

  return (
    <div className="meal">
      <div className="meal__top">
        <h2 id={headingId} className="meal__heading">
          My meal
        </h2>
        {state.meal.length > 0 && (
          <button type="button" className="link-button" onClick={clearMeal}>
            Clear
          </button>
        )}
      </div>

      {state.meal.length === 0 ? (
        <p className="muted">Nothing here yet. Add a food, or start from a preset meal.</p>
      ) : (
        <ul className="meal__list">
          {state.meal.map((item) => {
            const food = byId.get(item.foodId);
            if (!food) return null;
            const { title, detail } = splitFoodName(food.name);
            return (
              <li key={item.foodId} className="meal__item">
                <div className="meal__item-text">
                  <span className="meal__item-name">{title}</span>
                  {detail && <span className="meal__item-detail">{detail}</span>}
                  <span className="meal__item-amount">
                    {formatGrams(item.servings)} × {food.servingLabel} · {formatGrams(food.proteinG * item.servings)} g
                    protein
                  </span>
                </div>
                <div className="stepper" role="group" aria-label={`Servings of ${title}`}>
                  <button
                    type="button"
                    className="stepper__button"
                    onClick={() => setServings(item.foodId, item.servings - 0.5)}
                    disabled={item.servings <= MIN_SERVINGS}
                    aria-label="Half a serving less"
                  >
                    −
                  </button>
                  <span className="stepper__value" aria-live="polite">
                    {formatGrams(item.servings)}
                  </span>
                  <button
                    type="button"
                    className="stepper__button"
                    onClick={() => setServings(item.foodId, item.servings + 0.5)}
                    disabled={item.servings >= MAX_SERVINGS}
                    aria-label="Half a serving more"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="stepper__remove"
                    onClick={() => removeFromMeal(item.foodId)}
                    aria-label={`Remove ${title}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="meal__totals">
        <p className="meal__total">
          <strong>{formatGrams(totals.proteinG)} g</strong> protein
          <span className="muted"> · {Math.round(totals.kcal)} kcal</span>
        </p>
        {goal ? (
          <>
            <div
              className="progress"
              role="progressbar"
              aria-label="Protein toward daily goal"
              aria-valuemin={0}
              aria-valuemax={goal.grams}
              aria-valuenow={Math.min(goal.grams, Math.round(totals.proteinG))}
              aria-valuetext={`${formatGrams(totals.proteinG)} of ${goal.grams} grams`}
            >
              <div className="progress__fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="muted small">
              {percent}% of your {goal.grams} g daily goal
              {totals.proteinG >= goal.grams ? ' — reached' : ''}
            </p>
          </>
        ) : (
          <p className="muted small">Set a daily protein goal on the Plate stage to see your progress.</p>
        )}
      </div>

      {state.meal.length > 0 && (
        <Link
          className="button button--primary meal__cta"
          to="/gut"
          onClick={() => {
            completeStage('plate');
            onNavigate?.();
          }}
        >
          See what happens to this meal →
        </Link>
      )}
    </div>
  );
}
