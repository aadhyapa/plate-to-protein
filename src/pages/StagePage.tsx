import { Link } from 'react-router-dom';
import { STAGES, nextStage } from '../lib/stages';
import type { Stage } from '../lib/stages';

/** Placeholder shown for a stage until its milestone is built. */
export default function StagePage({ stage }: { stage: Stage }) {
  const next = nextStage(stage.id);
  const journeyLength = STAGES.length - 1; // Wrap-up is not a numbered stage.
  const position = STAGES.findIndex((item) => item.id === stage.id) + 1;

  return (
    <article className="stage">
      <p className="eyebrow">
        {stage.id === 'wrap-up' ? 'Wrap-up' : `Stage ${position} of ${journeyLength} · ${stage.label}`}
      </p>
      <h1 className="stage__title">{stage.title}</h1>
      <p className="stage__blurb">{stage.blurb}</p>

      <section className="card" aria-labelledby="coming-heading">
        <p className="card__tag">In progress</p>
        <h2 id="coming-heading" className="card__title">
          What this stage will have
        </h2>
        <ul className="card__list">
          {stage.coming.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="stage__nav">
        {next ? (
          <Link className="button button--primary" to={next.path}>
            Next: {next.label} →
          </Link>
        ) : (
          <Link className="button button--primary" to="/">
            Back to the start
          </Link>
        )}
      </div>
    </article>
  );
}
