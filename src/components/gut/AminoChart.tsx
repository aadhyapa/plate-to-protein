import { PATTERN_SOURCE } from '../../lib/nutrition';
import type { AminoScore } from '../../lib/nutrition';

/** Bars are drawn on a 0–200% scale so the 100% reference line sits in the middle. */
const SCALE_MAX = 2;

interface AminoChartProps {
  profile: AminoScore[];
  /** The lowest-scoring amino acid, if it is below the pattern. */
  limiting: AminoScore | null;
}

/** The meal's nine essential amino acids against the WHO/FAO/UNU reference pattern. */
export default function AminoChart({ profile, limiting }: AminoChartProps) {
  return (
    <div className="amino">
      <div className="amino__scale" aria-hidden="true">
        <span>0%</span>
        <span>100% = reference pattern</span>
        <span>200%+</span>
      </div>
      <ul className="amino__rows">
        {profile.map((score) => {
          const percent = Math.round(score.ratio * 100);
          const isLimiting = limiting?.key === score.key;
          const below = score.ratio < 1;
          return (
            <li key={score.key} className={`amino__row${below ? ' is-below' : ''}${isLimiting ? ' is-limiting' : ''}`}>
              <span className="amino__label">
                {score.label}
                {isLimiting && <span className="badge badge--limiting">Limiting</span>}
              </span>
              <span className="amino__track" aria-hidden="true">
                <span className="amino__bar" style={{ width: `${(Math.min(score.ratio, SCALE_MAX) / SCALE_MAX) * 100}%` }} />
                <span className="amino__line" />
              </span>
              <span className="amino__value">
                <strong>{percent}%</strong>
                <span className="small muted">
                  {' '}
                  {Math.round(score.mgPerGProtein)} of {score.referenceMgPerG} mg/g
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="small muted">
        Each bar shows milligrams of that amino acid per gram of protein in the meal, as a percentage of what
        the reference pattern calls for. Reference pattern: {PATTERN_SOURCE}. Food values: USDA FoodData
        Central (SR Legacy).
      </p>
    </div>
  );
}
