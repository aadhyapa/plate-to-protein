import { Link } from 'react-router-dom';
import { STAGES } from '../lib/stages';

const PREVIEW_NOTES: Record<string, string> = {
  plate: 'Pick foods and see their protein.',
  gut: 'Digest them into amino acids.',
  cell: 'Translate DNA into a new protein.',
  structure: 'Explore the finished shape in 3D.',
};

export default function Landing() {
  const journey = STAGES.filter((stage) => stage.id !== 'wrap-up');

  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">An interactive journey in four stages</p>
        <h1 className="hero__title">Follow a protein from your plate to your cells.</h1>
        <p className="hero__lede">
          Build a meal, then follow it: through digestion into amino acids, into a cell where DNA is read
          to build new proteins, and on to real protein structures you can turn in 3D.
        </p>
        <div className="hero__actions">
          <Link className="button button--primary" to="/plate">
            Start with a meal
          </Link>
          <Link className="text-link" to="/structure">
            Skip to the 3D explorer
          </Link>
        </div>
      </section>

      <section aria-labelledby="preview-heading">
        <h2 id="preview-heading" className="visually-hidden">
          The four stages
        </h2>
        <ol className="preview">
          {journey.map((stage, index) => (
            <li key={stage.id} className="preview__card" data-stage={stage.id} style={{ animationDelay: `${index * 2}s` }}>
              <span className="preview__beads" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="preview__step">Stage {index + 1}</span>
              <Link className="preview__name" to={stage.path}>
                {stage.label}
              </Link>
              <span className="preview__note">{PREVIEW_NOTES[stage.id]}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
