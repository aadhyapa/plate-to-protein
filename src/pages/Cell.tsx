import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import CodonWheel, { describeCodon } from '../components/cell/CodonWheel';
import MutationLab from '../components/cell/MutationLab';
import Simulator from '../components/cell/Simulator';
import { useFoods } from '../hooks/useFoods';
import {
  RNA_BASES,
  SEQUENCE_PRESETS,
  cleanDna,
  findStart,
  resolveStart,
  transcribe,
} from '../lib/genetics';
import type { ReadingStart } from '../lib/genetics';
import { formatGrams, mealTotals } from '../lib/nutrition';
import { useAppState } from '../state/AppState';

const MAX_BASES = 150;
const DEFAULT_PRESET = SEQUENCE_PRESETS[0];

export default function Cell() {
  const { state, completeStage } = useAppState();
  const foods = useFoods(state.meal.length > 0);
  const mealProtein = foods.status === 'ready' ? mealTotals(state.meal, foods.library.byId).proteinG : 0;

  const [input, setInput] = useState(DEFAULT_PRESET.dna);
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [reading, setReading] = useState<ReadingStart>('aug');
  const [wheelCodon, setWheelCodon] = useState<string | null>(null);

  const cleaned = cleanDna(input);
  const tooLong = cleaned.sequence.length > MAX_BASES;
  const dna = cleaned.sequence.slice(0, MAX_BASES);
  const mrna = transcribe(dna);
  const hasAug = findStart(mrna) >= 0;
  const start = resolveStart(mrna, reading);
  const preset = SEQUENCE_PRESETS.find((item) => item.id === presetId) ?? null;

  const loadSequence = (text: string, id: string | null) => {
    setInput(text);
    setPresetId(id);
    // Read from the start codon when there is one; otherwise from the first base.
    setReading(findStart(transcribe(cleanDna(text).sequence)) >= 0 ? 'aug' : 0);
    setWheelCodon(null);
  };

  const onCodon = useCallback((codon: string | null) => {
    if (codon) setWheelCodon(codon);
  }, []);
  const onFinished = useCallback(() => completeStage('cell'), [completeStage]);

  // The simulator and lab restart whenever the sequence or reading frame changes.
  const runKey = `${dna}|${start}`;
  const lookup = wheelCodon ?? 'AUG';

  return (
    <div className="cell">
      <header className="stage">
        <p className="eyebrow">Stage 3 of 4 · Cell</p>
        <h1 className="stage__title">Read the recipe</h1>
        <p className="stage__blurb">
          Your cells don't reuse the proteins you eat. They take the amino acids from digestion and join them
          in a new order, following instructions written in DNA.
        </p>
      </header>

      <div className="card cell__link" role="note">
        {mealProtein > 0 ? (
          <p>
            <strong>From your meal:</strong> about {formatGrams(mealProtein)} g of protein, broken down into
            amino acids in the <Link to="/gut">Gut stage</Link>. Those amino acids are the building blocks used
            here.
          </p>
        ) : (
          <p>
            The amino acids absorbed in the <Link to="/gut">Gut stage</Link> are the building blocks used
            here. <Link to="/plate">Build a meal</Link> to follow your own.
          </p>
        )}
      </div>

      <section aria-labelledby="sequence-heading" className="sequence">
        <h2 id="sequence-heading" className="section-title">
          Choose a gene
        </h2>
        <div className="sequence__presets" role="group" aria-label="Example sequences">
          {SEQUENCE_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="button button--ghost button--small"
              aria-pressed={presetId === item.id}
              onClick={() => loadSequence(item.dna, item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {preset && <p className="muted">{preset.description}</p>}

        <label className="field">
          <span className="field__label">DNA coding strand, 5′ to 3′ (letters A, C, G and T)</span>
          <textarea
            className="input sequence__input"
            rows={3}
            spellCheck={false}
            autoCapitalize="characters"
            autoComplete="off"
            value={input}
            onChange={(event) => loadSequence(event.target.value, null)}
          />
        </label>
        <div className="sequence__messages" role="status">
          {cleaned.invalid.length > 0 && (
            <p>
              Ignored {cleaned.invalid.length === 1 ? 'a character that isn’t' : 'characters that aren’t'} a DNA
              base: {cleaned.invalid.join(' ')}
            </p>
          )}
          {tooLong && <p>Only the first {MAX_BASES} bases are used.</p>}
          {dna.length < 3 && <p>Enter at least three bases, or pick an example above.</p>}
        </div>

        <label className="field sequence__reading">
          <span className="field__label">Start reading at</span>
          <select
            className="input"
            value={String(reading)}
            onChange={(event) => setReading(event.target.value === 'aug' ? 'aug' : (Number(event.target.value) as 0 | 1 | 2))}
          >
            <option value="aug">The first start codon (AUG)</option>
            <option value="0">Base 1 (reading frame 1)</option>
            <option value="1">Base 2 (reading frame 2)</option>
            <option value="2">Base 3 (reading frame 3)</option>
          </select>
        </label>
        {reading === 'aug' && !hasAug && dna.length >= 3 && (
          <p role="status">
            This sequence has no start codon (AUG), so nothing would be translated. Choose a reading frame to
            translate it anyway.
          </p>
        )}
        <p className="small muted">
          The same bases spell different proteins depending on where reading starts. Try the other reading
          frames to see.
        </p>
      </section>

      {dna.length >= 3 && (
        <>
          <section aria-labelledby="sim-heading" className="cell__section">
            <h2 id="sim-heading" className="section-title">
              DNA → mRNA → protein
            </h2>
            <Simulator key={runKey} dna={dna} start={start} onCodon={onCodon} onFinished={onFinished} />
          </section>

          <section aria-labelledby="wheel-heading" className="cell__section">
            <h2 id="wheel-heading" className="section-title">
              The codon wheel
            </h2>
            <div className="wheel-layout">
              <CodonWheel active={wheelCodon} onSelect={setWheelCodon} />
              <div className="wheel-side">
                <p>
                  Read from the centre outwards: first base, second base, third base. The rim shows the amino
                  acid. The wheel follows the simulator, or you can look up any codon.
                </p>
                <div className="wheel-lookup" role="group" aria-label="Look up a codon">
                  {[0, 1, 2].map((slot) => (
                    <label key={slot} className="field">
                      <span className="field__label">{['First', 'Second', 'Third'][slot]} base</span>
                      <select
                        className="input"
                        value={lookup[slot]}
                        onChange={(event) =>
                          setWheelCodon(lookup.slice(0, slot) + event.target.value + lookup.slice(slot + 1))
                        }
                      >
                        {RNA_BASES.map((base) => (
                          <option key={base} value={base}>
                            {base}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="wheel-readout" role="status">
                  {wheelCodon ? describeCodon(wheelCodon) : 'Step through the simulator or pick a codon to see what it codes for.'}
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="lab-heading" className="cell__section">
            <h2 id="lab-heading" className="section-title">
              Mutation lab
            </h2>
            <MutationLab key={runKey} dna={dna} start={start} />
          </section>
        </>
      )}

      <p className="small muted">
        The genetic code shown is the standard code used by human cells. The beta-globin sequence is the start
        of the coding sequence of the human HBB gene (NCBI reference sequence NM_000518); the sickle cell change
        is the single-base substitution A → T in its seventh codon.
      </p>

      <div className="stage__nav">
        <Link className="button button--primary" to="/structure" onClick={() => completeStage('cell')}>
          Next: Structure →
        </Link>
      </div>
    </div>
  );
}
