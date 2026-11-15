import { useState } from 'react';
import type { Food } from '../../lib/food';
import {
  COMPLETE_THRESHOLD,
  foodAmounts,
  formatGrams,
  limitingAminoAcid,
  splitFoodName,
} from '../../lib/nutrition';
import { MAX_SERVINGS, MIN_SERVINGS, clampServings, useAppState } from '../../state/AppState';

interface FoodCardProps {
  food: Food;
  comparing: boolean;
  /** False when three foods are already being compared. */
  canCompare: boolean;
  onToggleCompare: (food: Food) => void;
}

export default function FoodCard({ food, comparing, canCompare, onToggleCompare }: FoodCardProps) {
  const { state, addToMeal } = useAppState();
  const [servings, setServings] = useState(1);
  const { title, detail } = splitFoodName(food.name);
  const limiting = limitingAminoAcid(foodAmounts(food));
  const complete = limiting !== null && limiting.ratio >= COMPLETE_THRESHOLD;
  const inMeal = state.meal.find((item) => item.foodId === food.id);

  return (
    <li className="food">
      <div className="food__head">
        <h3 className="food__name">{title}</h3>
        {detail && <p className="food__detail">{detail}</p>}
      </div>

      <dl className="food__facts">
        <div>
          <dt>Protein</dt>
          <dd>{formatGrams(food.proteinG)} g</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{food.kcal}</dd>
        </div>
        <div>
          <dt>Serving</dt>
          <dd>
            {food.servingLabel}
            {food.servingLabel !== `${food.servingGrams} g` && ` (${formatGrams(food.servingGrams)} g)`}
          </dd>
        </div>
      </dl>

      <p className="food__badges">
        {complete ? (
          <span className="badge badge--complete" title="At least 80% of the WHO/FAO/UNU reference pattern for every essential amino acid">
            Complete protein
          </span>
        ) : (
          limiting && (
            <span className="badge">
              Low in {limiting.label.toLowerCase()} ({Math.round(limiting.ratio * 100)}%)
            </span>
          )
        )}
        {food.tags.includes('vegan') ? (
          <span className="badge">Vegan</span>
        ) : (
          food.tags.includes('vegetarian') && <span className="badge">Vegetarian</span>
        )}
      </p>

      <div className="food__actions">
        <div className="stepper" role="group" aria-label={`Servings of ${title} to add`}>
          <button
            type="button"
            className="stepper__button"
            onClick={() => setServings((value: number) => clampServings(value - 0.5))}
            disabled={servings <= MIN_SERVINGS}
            aria-label="Half a serving less"
          >
            −
          </button>
          <span className="stepper__value" aria-live="polite">
            {formatGrams(servings)}
          </span>
          <button
            type="button"
            className="stepper__button"
            onClick={() => setServings((value: number) => clampServings(value + 0.5))}
            disabled={servings >= MAX_SERVINGS}
            aria-label="Half a serving more"
          >
            +
          </button>
        </div>
        <button type="button" className="button button--primary button--small" onClick={() => addToMeal(food.id, servings)}>
          Add to meal
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          aria-pressed={comparing}
          disabled={!comparing && !canCompare}
          onClick={() => onToggleCompare(food)}
        >
          {comparing ? 'Comparing ✓' : 'Compare'}
        </button>
      </div>
      {inMeal && (
        <p className="food__in-meal small" role="status">
          In your meal: {formatGrams(inMeal.servings)} {inMeal.servings === 1 ? 'serving' : 'servings'}
        </p>
      )}
    </li>
  );
}
