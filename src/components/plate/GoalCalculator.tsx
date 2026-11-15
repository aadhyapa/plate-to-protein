import { ACTIVITY_OPTIONS, proteinGoal } from '../../lib/nutrition';
import { useAppState } from '../../state/AppState';
import type { ActivityLevel, WeightUnit } from '../../state/types';

/** Daily protein goal from body weight and activity level, with its source shown. */
export default function GoalCalculator() {
  const { state, setGoal, setUnits } = useAppState();
  const { weight, activity } = state.proteinGoal;
  const goal = proteinGoal(weight, state.units, activity);
  const option = ACTIVITY_OPTIONS.find((item) => item.id === activity) ?? ACTIVITY_OPTIONS[0];

  return (
    <section className="card goal" aria-labelledby="goal-heading">
      <h2 id="goal-heading" className="card__title">
        Daily protein goal
      </h2>
      <div className="goal__fields">
        <label className="field">
          <span className="field__label">Body weight</span>
          <span className="field__row">
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min={1}
              max={700}
              step="any"
              value={weight ?? ''}
              placeholder={state.units === 'kg' ? 'e.g. 70' : 'e.g. 154'}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                setGoal({ weight: Number.isFinite(value) && value > 0 ? value : null });
              }}
            />
            <select
              className="input input--unit"
              aria-label="Weight unit"
              value={state.units}
              onChange={(event) => setUnits(event.target.value as WeightUnit)}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </span>
        </label>
        <label className="field">
          <span className="field__label">Activity level</span>
          <select
            className="input"
            value={activity}
            onChange={(event) => setGoal({ activity: event.target.value as ActivityLevel })}
          >
            {ACTIVITY_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="goal__result" aria-live="polite">
        {goal ? (
          <>
            About <strong>{goal.grams} g</strong> of protein a day
            <span className="muted"> ({option.gPerKg} g per kg of body weight)</span>
          </>
        ) : (
          <span className="muted">Enter your weight to see a goal.</span>
        )}
      </p>
      <p className="small muted">
        {option.basis} Source: {option.source}.
      </p>
      <p className="small goal__disclaimer">
        This is a general estimate for healthy adults, not medical advice. Needs differ with age, pregnancy,
        health conditions and more, so check with a doctor or registered dietitian before changing your diet.
      </p>
    </section>
  );
}
