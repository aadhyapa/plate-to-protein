import type { Food } from '../../lib/food';
import { formatGrams, proteinPer100Kcal, splitFoodName } from '../../lib/nutrition';
import { useAppState } from '../../state/AppState';

interface Metric {
  id: string;
  title: string;
  unit: string;
  /** null when the value can't be shown (no price entered). */
  value: (food: Food) => number | null;
}

/** Side-by-side bars for 2–3 foods: protein per serving, per 100 kcal and per dollar. */
export default function CompareChart({ foods, onRemove }: { foods: Food[]; onRemove: (food: Food) => void }) {
  const { state, setPrice } = useAppState();

  const metrics: Metric[] = [
    { id: 'serving', title: 'Protein per serving', unit: 'g', value: (food) => food.proteinG },
    { id: 'kcal', title: 'Protein per 100 calories', unit: 'g', value: (food) => proteinPer100Kcal(food) },
    {
      id: 'dollar',
      title: 'Protein per dollar',
      unit: 'g',
      value: (food) => {
        const price = state.prices[food.id];
        return price ? food.proteinG / price : null;
      },
    },
  ];
  const anyPrice = foods.some((food) => state.prices[food.id]);

  return (
    <section className="card compare" aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="card__title">
        Compare foods
      </h2>

      <ul className="compare__foods">
        {foods.map((food, index) => {
          const { title, detail } = splitFoodName(food.name);
          return (
            <li key={food.id} className="compare__food" data-series={index}>
              <span className="compare__swatch" aria-hidden="true" />
              <span className="compare__food-name">
                <strong>{title}</strong>
                {detail && <span className="muted small"> {detail}</span>}
                <span className="muted small"> · per {food.servingLabel}</span>
              </span>
              <button type="button" className="link-button" onClick={() => onRemove(food)} aria-label={`Stop comparing ${title}`}>
                Remove
              </button>
              <label className="compare__price">
                <span className="small">Price per serving ($)</span>
                <input
                  className="input input--small"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="optional"
                  value={state.prices[food.id] ?? ''}
                  onChange={(event) => {
                    const value = Number.parseFloat(event.target.value);
                    setPrice(food.id, Number.isFinite(value) ? value : null);
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>

      {foods.length < 2 ? (
        <p className="muted">Pick one or two more foods with the Compare button to see the charts.</p>
      ) : (
        <div className="compare__charts">
          {metrics.map((metric) => {
            if (metric.id === 'dollar' && !anyPrice) {
              return (
                <div key={metric.id} className="chart">
                  <h3 className="chart__title">{metric.title}</h3>
                  <p className="muted small">Enter a price per serving above to compare protein per dollar.</p>
                </div>
              );
            }
            const values = foods.map((food) => metric.value(food));
            const max = Math.max(...values.map((value) => value ?? 0), 0.0001);
            return (
              <div key={metric.id} className="chart">
                <h3 className="chart__title">{metric.title}</h3>
                <ul className="chart__rows">
                  {foods.map((food, index) => {
                    const value = values[index];
                    return (
                      <li key={food.id} className="chart__row" data-series={index}>
                        <span className="chart__label">{splitFoodName(food.name).title}</span>
                        <span className="chart__track" aria-hidden="true">
                          <span className="chart__bar" style={{ width: `${value === null ? 0 : (value / max) * 100}%` }} />
                        </span>
                        <span className="chart__value">
                          {value === null ? 'no price' : `${formatGrams(value)} ${metric.unit}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <p className="small muted">
        Nutrient values: USDA FoodData Central (SR Legacy). Prices are whatever you enter and stay in this
        browser.
      </p>
    </section>
  );
}
