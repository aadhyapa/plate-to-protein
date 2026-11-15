import type { Food } from '../../lib/food';
import { formatGrams, splitFoodName } from '../../lib/nutrition';
import type { AminoScore } from '../../lib/nutrition';
import type { Suggestion } from '../../lib/suggest';

interface FixItProps {
  limiting: AminoScore;
  suggestions: Suggestion[];
  onAdd: (food: Food) => void;
}

/** One-tap additions that raise the meal's limiting amino acid. */
export default function FixIt({ limiting, suggestions, onAdd }: FixItProps) {
  const name = limiting.label.toLowerCase();
  return (
    <section className="card fixit" aria-labelledby="fixit-heading">
      <h2 id="fixit-heading" className="card__title">
        Fix it
      </h2>
      <p>
        This meal is lowest in <strong>{name}</strong>, at {Math.round(limiting.ratio * 100)}% of the reference
        pattern.{' '}
        {suggestions.length > 0
          ? 'Adding one serving of any of these would lift it:'
          : 'None of the everyday foods on our suggestion list would raise it much. Try adding a different protein food on the Plate stage.'}
      </p>
      <ul className="fixit__list">
        {suggestions.map(({ food, newRatio, newLimiting }) => {
          const { title, detail } = splitFoodName(food.name);
          return (
            <li key={food.id} className="fixit__item">
              <div>
                <p className="fixit__name">{title}</p>
                <p className="small muted">
                  {detail && `${detail} · `}
                  {food.servingLabel} · {formatGrams(food.proteinG)} g protein · {food.kcal} kcal
                </p>
                <p className="small">
                  Lowest amino acid would be {newLimiting.label.toLowerCase()} at{' '}
                  <strong>{Math.round(newRatio * 100)}%</strong>
                </p>
              </div>
              <button type="button" className="button button--primary button--small" onClick={() => onAdd(food)}>
                Add to meal
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
