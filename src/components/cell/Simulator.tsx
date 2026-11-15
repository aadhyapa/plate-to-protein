import { useEffect, useState } from 'react';
import { AMINO_ACIDS, STOP } from '../../lib/genetics';
import { buildColumns } from './columns';

const STEP_MS = 1100;

interface SimulatorProps {
  dna: string;
  /** Where translation starts (0-based), or -1 if there is no start codon. */
  start: number;
  /** Called with the codon being read, or null when no codon is active. */
  onCodon: (codon: string | null) => void;
  onFinished: () => void;
}

/**
 * Step-by-step DNA → mRNA → protein.
 * step 0: DNA only. step 1: mRNA transcribed. step 1 + n: n codons translated.
 */
export default function Simulator({ dna, start, onCodon, onFinished }: SimulatorProps) {
  const { columns, codons } = buildColumns(dna, start);
  const lastStep = codons.length + 1;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const translated = Math.max(0, step - 1);
  const current = translated > 0 ? codons[translated - 1] : null;
  const currentCodon = current?.codon ?? null;

  // Advance automatically while playing.
  useEffect(() => {
    if (!playing) return;
    if (step >= lastStep) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((value: number) => value + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, lastStep]);

  useEffect(() => {
    onCodon(currentCodon);
  }, [currentCodon, onCodon]);

  useEffect(() => {
    if (step === lastStep && codons.length > 0) onFinished();
  }, [step, lastStep, codons.length, onFinished]);

  let status: string;
  if (step === 0) {
    status = 'This is the gene: two strands of DNA. Press Step or Play to copy it into mRNA.';
  } else if (step === 1) {
    status =
      'Transcription: the cell builds mRNA by pairing bases against the template strand. The mRNA matches the coding strand, with U in place of T.' +
      (codons.length === 0 ? ' There is no start codon (AUG) to begin translation from.' : ' Next, the ribosome reads it three bases at a time.');
  } else if (current && current.letter === STOP) {
    status = `Codon ${translated}: ${current.codon} is a stop codon. The ribosome lets go and the protein is finished.`;
  } else if (current) {
    const info = AMINO_ACIDS[current.letter];
    status = `Codon ${translated}: ${current.codon} codes for ${info.name.toLowerCase()} (${info.short})${
      translated === 1 && current.codon === 'AUG' ? ', which is also the start signal' : ''
    }.${step === lastStep ? ' That is the end of this sequence.' : ''}`;
  } else {
    status = '';
  }

  const chain = codons.slice(0, translated).filter((codon) => codon.letter !== STOP);

  return (
    <div className="sim">
      <div className="sim__controls">
        <button
          type="button"
          className="button button--primary button--small"
          onClick={() => {
            if (step >= lastStep) setStep(0);
            setPlaying((value: boolean) => !value);
          }}
        >
          {playing ? 'Pause' : step >= lastStep ? 'Play again' : 'Play'}
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => {
            setPlaying(false);
            setStep((value: number) => Math.min(lastStep, value + 1));
          }}
          disabled={step >= lastStep}
        >
          Step
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          disabled={step === 0}
        >
          Reset
        </button>
        <span className="small muted">
          Step {step} of {lastStep}
        </span>
      </div>

      <p className="sim__status" role="status">
        {status}
      </p>

      <ul className="strand-key small" aria-hidden="true">
        <li><span className="strand-key__swatch strand-key__swatch--coding" /> DNA coding strand</li>
        <li><span className="strand-key__swatch strand-key__swatch--template" /> DNA template strand</li>
        <li><span className="strand-key__swatch strand-key__swatch--mrna" /> mRNA</li>
        <li><span className="strand-key__swatch strand-key__swatch--amino" /> amino acid</li>
      </ul>

      <ol className="columns" aria-label="The sequence in groups of three bases">
        {columns.map((column) => {
          const done = column.codonIndex >= 0 && column.codonIndex < translated;
          const isCurrent = column.codonIndex >= 0 && column.codonIndex === translated - 1;
          const info = column.codon && column.codon.letter !== STOP ? AMINO_ACIDS[column.codon.letter] : null;
          return (
            <li
              key={column.position}
              className={`column${column.codon ? '' : ' column--untranslated'}${isCurrent ? ' is-current' : ''}`}
            >
              <span className="column__row column__row--coding">{column.coding}</span>
              <span className="column__row column__row--template">{column.template}</span>
              <span className={`column__row column__row--mrna${step >= 1 ? '' : ' is-hidden'}`}>{column.mrna}</span>
              <span className={`column__row column__row--amino${done ? '' : ' is-hidden'}`}>
                {column.codon ? (column.codon.letter === STOP ? 'Stop' : info?.short) : '·'}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="chain-out">
        <h3 className="chain-out__title">Protein so far</h3>
        {chain.length === 0 ? (
          <p className="muted small">No amino acids joined yet.</p>
        ) : (
          <ol className="residues">
            {chain.map((codon, index) => {
              const info = AMINO_ACIDS[codon.letter];
              return (
                <li key={codon.position} className={`residue${info.essential ? ' residue--essential' : ''}`} title={info.name}>
                  <span className="residue__short">{info.short}</span>
                  <span className="residue__number">{index + 1}</span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="small muted">
          <span className="residue residue--essential residue--key" aria-hidden="true" /> Ringed amino acids are
          essential: your cells can't make them, so every one of them came from food.
        </p>
      </div>
    </div>
  );
}
