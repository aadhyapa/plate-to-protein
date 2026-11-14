import { NavLink } from 'react-router-dom';
import { STAGES } from '../lib/stages';
import { useAppState } from '../state/AppState';

export default function StageTracker() {
  const { state } = useAppState();

  return (
    <nav className="tracker" aria-label="Journey stages">
      <ol className="tracker__list">
        {STAGES.map((stage, index) => {
          const done = state.completedStages.includes(stage.id);
          return (
            <li key={stage.id} className="tracker__item" data-stage={stage.id}>
              <NavLink
                to={stage.path}
                className={({ isActive }) => `tracker__link${isActive ? ' is-active' : ''}`}
              >
                <span className="tracker__dot" aria-hidden="true">
                  {done ? '✓' : index + 1}
                </span>
                <span className="tracker__label">{stage.label}</span>
                {done && <span className="visually-hidden"> (completed)</span>}
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
