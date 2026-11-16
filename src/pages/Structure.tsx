import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MolViewer from '../components/structure/MolViewer';
import type { ColorScheme, DisplayStyle, ViewerSettings } from '../components/structure/MolViewer';
import { useStructure } from '../components/structure/useStructure';
import type { LoadedStructure } from '../lib/structureApi';
import {
  CONFIDENCE_BANDS,
  FEATURED,
  HEMOGLOBIN_COMPARE,
  findFeatured,
  parseStructureId,
  sourcePageUrl,
} from '../lib/structures';
import type { StructureRef } from '../lib/structures';
import { useAppState } from '../state/AppState';

const DEFAULT_ID = '4HHB';
const COMPARE_ID = 'compare';

const DISPLAY_OPTIONS: { id: DisplayStyle; label: string; hint: string }[] = [
  { id: 'cartoon', label: 'Cartoon', hint: 'Ribbons that trace the backbone of each chain. Best for seeing the overall fold.' },
  { id: 'surface', label: 'Surface', hint: 'The outer skin of the protein, as another molecule would meet it. Colored by chain.' },
  { id: 'stick', label: 'Sticks', hint: 'Every bond between atoms. Detailed, and busy for large proteins.' },
];

const COLOR_OPTIONS: { id: ColorScheme; label: string }[] = [
  { id: 'chain', label: 'By chain' },
  { id: 'spectrum', label: 'Rainbow, start to end of each chain' },
  { id: 'structure', label: 'By shape (helix, sheet, loop)' },
  { id: 'confidence', label: 'By prediction confidence' },
];

function LoadMessage({ state, id }: { state: { status: string; retry?: () => void }; id: string }) {
  if (state.status === 'loading') {
    return (
      <p className="muted" role="status">
        Fetching {id}…
      </p>
    );
  }
  if (state.status === 'not-found') {
    return (
      <div className="card" role="alert">
        <p>
          <strong>No structure found for “{id}”.</strong> Check the ID, or pick one of the featured proteins
          above.
        </p>
      </div>
    );
  }
  return (
    <div className="card" role="alert">
      <p>The structure couldn't be downloaded. The database may be busy, or you may be offline.</p>
      <button type="button" className="button button--ghost button--small" onClick={state.retry}>
        Try again
      </button>
    </div>
  );
}

function InfoPanel({ structure }: { structure: LoadedStructure }) {
  const featured = findFeatured(structure.ref);
  const isPrediction = structure.ref.source === 'alphafold';
  const facts: [string, string][] = [];
  if (structure.organism) facts.push(['Organism', structure.organism]);
  if (structure.residueCount) facts.push(['Length', `${structure.residueCount.toLocaleString()} amino acids`]);
  if (structure.chainCount) facts.push(['Chains', String(structure.chainCount)]);
  if (structure.method) {
    facts.push([
      'How we know the shape',
      structure.method.charAt(0) + structure.method.slice(1).toLowerCase().replace('alphafold', 'AlphaFold'),
    ]);
  }
  if (structure.resolution) facts.push(['Resolution', `${structure.resolution.toFixed(2)} Å`]);
  if (structure.meanConfidence) facts.push(['Average confidence', `${Math.round(structure.meanConfidence)} out of 100`]);

  return (
    <section className="card info" aria-labelledby="info-heading">
      <h2 id="info-heading" className="card__title">
        {featured?.name ?? structure.title ?? structure.ref.id}
      </h2>
      {featured && <p>{featured.blurb}</p>}
      {featured?.link && <p className="muted">{featured.link}</p>}
      {structure.title && (
        <p className="small muted">
          {isPrediction ? 'UniProt name' : 'Title in the database'}: {structure.title}
        </p>
      )}
      <dl className="info__facts">
        {facts.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="small">
        Source:{' '}
        <a href={sourcePageUrl(structure.ref)} target="_blank" rel="noreferrer">
          {isPrediction ? `AlphaFold Protein Structure Database, ${structure.ref.id}` : `RCSB Protein Data Bank, entry ${structure.ref.id}`}
        </a>
      </p>
    </section>
  );
}

/** One structure with display controls, an optional guided tour and its details. */
function SingleView({ structureRef }: { structureRef: StructureRef }) {
  const { completeStage } = useAppState();
  const state = useStructure(structureRef);
  const featured = findFeatured(structureRef);
  const isPrediction = structureRef.source === 'alphafold';
  const [settings, setSettings] = useState<ViewerSettings>({
    display: 'cartoon',
    color: isPrediction ? 'confidence' : 'chain',
    spin: false,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const tour = featured?.tour ?? null;
  const step = tour ? tour[stepIndex] : null;

  useEffect(() => {
    if (state.status === 'ready') completeStage('structure');
  }, [state.status, completeStage]);

  if (state.status !== 'ready') return <LoadMessage state={state} id={structureRef.id} />;
  const { structure } = state;
  const name = featured?.name ?? structure.title ?? structureRef.id;
  const displayHint = DISPLAY_OPTIONS.find((option) => option.id === settings.display)?.hint;

  return (
    <div className="viewer-layout">
      <div className="viewer-layout__main">
        <MolViewer structure={structure} settings={settings} step={step} label={`Interactive 3D view of ${name}`} />

        <div className="controls">
          <fieldset className="controls__group">
            <legend>Display</legend>
            <div className="segmented">
              {DISPLAY_OPTIONS.map((option) => (
                <label key={option.id} className="chip">
                  <input
                    type="radio"
                    name="display"
                    checked={settings.display === option.id}
                    onChange={() => setSettings((current: ViewerSettings) => ({ ...current, display: option.id }))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <p className="small muted">{displayHint}</p>
          </fieldset>

          <label className="field controls__group">
            <span className="field__label">Color</span>
            <select
              className="input"
              value={settings.color}
              disabled={settings.display === 'surface'}
              onChange={(event) => setSettings((current: ViewerSettings) => ({ ...current, color: event.target.value as ColorScheme }))}
            >
              {COLOR_OPTIONS.filter((option) => option.id !== 'confidence' || isPrediction).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="chip controls__spin">
            <input
              type="checkbox"
              checked={settings.spin}
              onChange={(event) => setSettings((current: ViewerSettings) => ({ ...current, spin: event.target.checked }))}
            />
            <span>Spin</span>
          </label>
        </div>

        {isPrediction && (
          <div className="card prediction" role="note">
            <p>
              <strong>This shape is a prediction, not a measurement.</strong> AlphaFold is an AI system that
              predicts a protein's shape from its amino acid sequence. Each part gets a confidence score from
              0 to 100. Blue parts are usually close to the real shape; orange parts are uncertain and are
              often flexible regions with no fixed shape.
            </p>
            <ul className="legend">
              {CONFIDENCE_BANDS.map((band) => (
                <li key={band.label}>
                  <span className="legend__swatch" style={{ background: band.color }} aria-hidden="true" />
                  {band.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="viewer-layout__side">
        {tour && step && (
          <section className="card tour" aria-labelledby="tour-heading">
            <p className="card__tag">
              Guided tour · {stepIndex + 1} of {tour.length}
            </p>
            <h2 id="tour-heading" className="card__title">
              {step.title}
            </h2>
            <p aria-live="polite">{step.text}</p>
            <div className="tour__nav">
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => setStepIndex((value: number) => value - 1)}
                disabled={stepIndex === 0}
              >
                ← Back
              </button>
              <button
                type="button"
                className="button button--primary button--small"
                onClick={() => setStepIndex((value: number) => value + 1)}
                disabled={stepIndex === tour.length - 1}
              >
                Next →
              </button>
            </div>
            {structureRef.id === '2HBS' || structureRef.id === '4HHB' ? (
              <Link className="text-link" to={`/structure?protein=${COMPARE_ID}`}>
                Compare normal and sickle hemoglobin side by side
              </Link>
            ) : null}
          </section>
        )}
        <InfoPanel structure={structure} />
      </div>
    </div>
  );
}

const COMPARE_SETTINGS: ViewerSettings = { display: 'cartoon', color: 'chain', spin: false };

/** Normal and sickle hemoglobin next to each other, both zoomed in on position 6 of a beta chain. */
function CompareView() {
  const { completeStage } = useAppState();
  const normal = useStructure(HEMOGLOBIN_COMPARE.normal);
  const sickle = useStructure(HEMOGLOBIN_COMPARE.sickle);

  useEffect(() => {
    if (normal.status === 'ready' && sickle.status === 'ready') completeStage('structure');
  }, [normal.status, sickle.status, completeStage]);

  return (
    <section className="compare-view" aria-labelledby="compare-view-heading">
      <h2 id="compare-view-heading" className="section-title">
        One amino acid apart
      </h2>
      <p>
        Both views are zoomed in on position 6 of a beta chain, marked with yellow spheres. In normal hemoglobin
        it is glutamic acid, which carries a charge and is comfortable in water. In sickle cell hemoglobin it
        is valine, which is not. Everything else in the two proteins is the same.
      </p>
      <div className="compare-view__pair">
        <div>
          <h3 className="compare-view__label">Normal hemoglobin · glutamic acid 6</h3>
          {normal.status === 'ready' ? (
            <MolViewer structure={normal.structure} settings={COMPARE_SETTINGS} step={HEMOGLOBIN_COMPARE.step} label="3D view of normal hemoglobin, zoomed in on glutamic acid at position 6 of a beta chain" />
          ) : (
            <LoadMessage state={normal} id="4HHB" />
          )}
        </div>
        <div>
          <h3 className="compare-view__label">Sickle cell hemoglobin · valine 6</h3>
          {sickle.status === 'ready' ? (
            <MolViewer structure={sickle.structure} settings={COMPARE_SETTINGS} step={HEMOGLOBIN_COMPARE.step} label="3D view of sickle cell hemoglobin, zoomed in on valine at position 6 of a beta chain" />
          ) : (
            <LoadMessage state={sickle} id="2HBS" />
          )}
        </div>
      </div>
      <p className="small">
        Sources:{' '}
        <a href={sourcePageUrl(HEMOGLOBIN_COMPARE.normal)} target="_blank" rel="noreferrer">
          RCSB Protein Data Bank, entry 4HHB
        </a>{' '}
        and{' '}
        <a href={sourcePageUrl(HEMOGLOBIN_COMPARE.sickle)} target="_blank" rel="noreferrer">
          entry 2HBS
        </a>
        . For the full story of how the valine makes hemoglobin clump, take the{' '}
        <Link to="/structure?protein=2HBS">sickle cell hemoglobin tour</Link>.
      </p>
    </section>
  );
}

export default function Structure() {
  const { completeStage } = useAppState();
  const [params, setParams] = useSearchParams();
  const requested = params.get('protein') ?? DEFAULT_ID;
  const comparing = requested === COMPARE_ID;
  const structureRef = comparing ? null : parseStructureId(requested);
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  const open = (id: string) => {
    setParams({ protein: id });
    setSearchError('');
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseStructureId(query);
    if (!parsed) {
      setSearchError('That doesn’t look like a PDB ID (4 characters, such as 4HHB) or a UniProt accession (such as P68871).');
      return;
    }
    open(parsed.id);
  };

  return (
    <div className="structure">
      <header className="stage">
        <p className="eyebrow">Stage 4 of 4 · Structure</p>
        <h1 className="stage__title">See the shape</h1>
        <p className="stage__blurb">
          A chain of amino acids folds into a precise 3D shape, and the shape decides what the protein can do.
          These are real structures, loaded live from the databases scientists use.
        </p>
      </header>

      <section aria-labelledby="featured-heading" className="featured">
        <h2 id="featured-heading" className="section-title">
          Pick a protein
        </h2>
        <ul className="featured__list">
          {FEATURED.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="preset"
                aria-pressed={!comparing && structureRef?.id === item.id}
                onClick={() => open(item.id)}
              >
                <span className="preset__name">{item.name}</span>
                <span className="preset__description">
                  {item.tour ? 'Guided tour · ' : ''}
                  {item.source === 'pdb' ? `PDB ${item.id}` : `AlphaFold ${item.id}`}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="preset" aria-pressed={comparing} onClick={() => open(COMPARE_ID)}>
              <span className="preset__name">Normal vs sickle hemoglobin</span>
              <span className="preset__description">Side by side at position 6</span>
            </button>
          </li>
        </ul>

        <form className="lookup" onSubmit={onSearch}>
          <label className="field">
            <span className="field__label">Or load any structure by PDB ID or UniProt accession</span>
            <span className="field__row">
              <input
                className="input"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. 1TUP or P01308"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
              />
              <button type="submit" className="button button--primary button--small">
                Load
              </button>
            </span>
          </label>
          {searchError && (
            <p className="lookup__error" role="alert">
              {searchError}
            </p>
          )}
        </form>
      </section>

      {comparing ? (
        <CompareView />
      ) : structureRef ? (
        // The key resets display settings and the tour when a different protein is chosen.
        <SingleView key={`${structureRef.source}:${structureRef.id}`} structureRef={structureRef} />
      ) : (
        <div className="card" role="alert">
          <p>
            <strong>“{requested.slice(0, 20)}” isn't a structure ID.</strong> Pick one of the featured proteins
            above.
          </p>
        </div>
      )}

      <p className="small muted">
        Experimental structures come from the RCSB Protein Data Bank (rcsb.org). Predicted structures come from
        the AlphaFold Protein Structure Database (alphafold.ebi.ac.uk), by Google DeepMind and EMBL-EBI. The 3D
        viewer is 3Dmol.js.
      </p>

      <div className="stage__nav">
        <Link className="button button--primary" to="/wrap-up" onClick={() => completeStage('structure')}>
          Next: Wrap-up →
        </Link>
      </div>
    </div>
  );
}
