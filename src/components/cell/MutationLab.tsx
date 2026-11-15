import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AMINO_ACIDS,
  DNA_BASES,
  HBB_DNA,
  SICKLE_BASE,
  SICKLE_POSITION,
  STOP,
  classifyMutation,
  substituteBase,
  transcribe,
  translate,
} from '../../lib/genetics';
import type { MutationResult, TranslatedCodon } from '../../lib/genetics';
import { buildColumns } from './columns';

const KIND_LABEL: Record<string, string> = {
  silent: 'Silent mutation',
  missense: 'Missense mutation',
  nonsense: 'Nonsense mutation',
  'stop-lost': 'Stop codon lost',
  'start-lost': 'Start codon lost',
  noncoding: 'Outside the translated region',
};

const aminoName = (codon: TranslatedCodon | null) =>
  codon && codon.letter !== STOP ? AMINO_ACIDS[codon.letter]?.name.toLowerCase() ?? '' : '';

function explain(result: MutationResult): string {
  const { before, after, codonNumber } = result;
  switch (result.kind) {
    case 'silent':
      return `Codon ${codonNumber} changed from ${before?.codon} to ${after?.codon}, but both code for ${aminoName(before) || 'stop'}. The protein is exactly the same.`;
    case 'missense':
      return `Codon ${codonNumber} changed from ${before?.codon} to ${after?.codon}, so ${aminoName(before)} is replaced by ${aminoName(after)}. One amino acid in the protein is different.`;
    case 'nonsense':
      return `Codon ${codonNumber} changed from ${before?.codon} to ${after?.codon}, a stop codon. The ribosome stops early and the protein is cut short after ${(codonNumber ?? 1) - 1} amino acids.`;
    case 'stop-lost':
      return `The stop codon ${before?.codon} now reads ${after?.codon}, which codes for ${aminoName(after)}. The ribosome keeps going past the normal end of the protein.`;
    case 'start-lost':
      return `The start codon AUG now reads ${after?.codon}. Without its start signal, the ribosome doesn't begin making this protein here.`;
    case 'noncoding':
      return 'This base is outside the part of the sequence that gets translated, so the protein is unchanged.';
    default:
      return '';
  }
}

function Residues({ codons, changedIndex }: { codons: TranslatedCodon[]; changedIndex: number }) {
  const chain = codons.filter((codon) => codon.letter !== STOP);
  if (chain.length === 0) return <p className="muted small">No protein is made.</p>;
  return (
    <ol className="residues residues--compact">
      {chain.map((codon, index) => {
        const info = AMINO_ACIDS[codon.letter];
        return (
          <li key={codon.position} className={`residue${index === changedIndex ? ' residue--changed' : ''}`} title={info.name}>
            <span className="residue__short">{info.short}</span>
            <span className="residue__number">{index + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface MutationLabProps {
  dna: string;
  /** Where translation starts in the original sequence, or -1. */
  start: number;
}

/** Click a base to change it and see what the change does to the protein. One change at a time. */
export default function MutationLab({ dna, start }: MutationLabProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [mutated, setMutated] = useState(dna);

  const result = classifyMutation(dna, mutated, start);
  const changed = result.kind !== 'none';
  const { columns } = buildColumns(mutated, start);
  const originalCodons = start >= 0 ? translate(transcribe(dna), start) : [];
  // After losing the start codon nothing is made from this start site.
  const mutatedCodons = start >= 0 && result.kind !== 'start-lost' ? translate(transcribe(mutated), start) : [];
  const changedIndex = result.kind === 'missense' && result.codonNumber ? result.codonNumber - 1 : -1;

  const isHbb = dna === HBB_DNA && start === 0;
  const isSickle = isHbb && mutated === substituteBase(HBB_DNA, SICKLE_POSITION, SICKLE_BASE);

  const apply = (index: number, base: string) => {
    setMutated(substituteBase(dna, index, base));
    setSelected(null);
  };

  return (
    <div className="lab">
      <p>
        Tap any base in the coding strand to change it. Only one base is changed at a time, so you can see
        exactly what each change does.
      </p>

      <div className="lab__actions">
        {isHbb && (
          <button type="button" className="button button--primary button--small" onClick={() => apply(SICKLE_POSITION, SICKLE_BASE)}>
            Make the sickle cell mutation
          </button>
        )}
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => {
            setMutated(dna);
            setSelected(null);
          }}
          disabled={!changed}
        >
          Undo the change
        </button>
      </div>

      <ol className="columns columns--lab" aria-label="Coding strand. Choose a base to change it.">
        {columns.map((column) => (
          <li key={column.position} className={`column${column.codon ? '' : ' column--untranslated'}`}>
            <span className="column__row column__row--coding column__row--buttons">
              {[...column.coding].map((base, offset) => {
                const index = column.position + offset;
                const isChanged = result.position === index;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`base${selected === index ? ' is-selected' : ''}${isChanged ? ' is-changed' : ''}`}
                    aria-pressed={selected === index}
                    aria-label={`Base ${index + 1}: ${base}${isChanged ? `, changed from ${dna[index]}` : ''}`}
                    onClick={() => setSelected(selected === index ? null : index)}
                  >
                    {base}
                  </button>
                );
              })}
            </span>
            <span className="column__row column__row--amino">
              {column.codon ? (column.codon.letter === STOP ? 'Stop' : AMINO_ACIDS[column.codon.letter].short) : '·'}
            </span>
          </li>
        ))}
      </ol>

      {selected !== null && (
        <div className="lab__picker" role="group" aria-label={`Change base ${selected + 1}`}>
          <span>
            Change base {selected + 1} (<strong>{dna[selected]}</strong>) to:
          </span>
          {DNA_BASES.filter((base) => base !== dna[selected]).map((base) => (
            <button key={base} type="button" className="base base--choice" onClick={() => apply(selected, base)}>
              {base}
            </button>
          ))}
        </div>
      )}

      <div className="lab__result" role="status">
        {changed ? (
          <>
            <p className="lab__kind" data-kind={result.kind}>
              {KIND_LABEL[result.kind]}
            </p>
            <p>
              Base {result.position + 1}: {dna[result.position]} → {mutated[result.position]}. {explain(result)}
            </p>
            {isSickle && (
              <p>
                <strong>This is the change that causes sickle cell disease.</strong> Hemoglobin's amino acids
                are numbered from the valine after the start methionine, which is removed from the finished
                protein, so this is known as amino acid 6: glutamic acid → valine.
              </p>
            )}
          </>
        ) : (
          <p className="muted">No change yet.</p>
        )}
      </div>

      <div className="lab__compare">
        <div>
          <h3 className="chain-out__title">Original protein</h3>
          <Residues codons={originalCodons} changedIndex={changedIndex} />
        </div>
        <div>
          <h3 className="chain-out__title">After the change</h3>
          <Residues codons={mutatedCodons} changedIndex={changedIndex} />
        </div>
      </div>

      {isSickle && (
        <Link className="button button--primary" to="/structure?protein=2HBS">
          See sickle cell hemoglobin in 3D →
        </Link>
      )}
    </div>
  );
}
