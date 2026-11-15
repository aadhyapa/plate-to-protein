import { templateStrand, transcribe, translate } from '../../lib/genetics';
import type { TranslatedCodon } from '../../lib/genetics';

/** A group of up to three bases shown as one column: a translated codon, or untranslated bases. */
export interface Column {
  /** Index of the column's first base in the sequence (0-based). */
  position: number;
  coding: string;
  template: string;
  mrna: string;
  /** Set for translated codons; null for bases outside the reading frame. */
  codon: TranslatedCodon | null;
  /** 0-based index among translated codons, or -1. */
  codonIndex: number;
}

export interface Layout {
  columns: Column[];
  codons: TranslatedCodon[];
}

/** Split a sequence into columns: untranslated lead-in, codons from `start`, untranslated tail. */
export function buildColumns(dna: string, start: number): Layout {
  const mrna = transcribe(dna);
  const template = templateStrand(dna);
  const codons = start >= 0 ? translate(mrna, start) : [];
  const columns: Column[] = [];

  const push = (from: number, to: number, codon: TranslatedCodon | null, codonIndex: number) => {
    columns.push({
      position: from,
      coding: dna.slice(from, to),
      template: template.slice(from, to),
      mrna: mrna.slice(from, to),
      codon,
      codonIndex,
    });
  };

  const codingStart = codons.length > 0 ? codons[0].position : dna.length;
  const codingEnd = codons.length > 0 ? codons[codons.length - 1].position + 3 : dna.length;

  // Lead-in, chunked so the last chunk sits flush against the first codon.
  const lead = codingStart % 3;
  if (lead > 0) push(0, lead, null, -1);
  for (let i = lead; i < codingStart; i += 3) push(i, i + 3, null, -1);
  codons.forEach((codon, index) => push(codon.position, codon.position + 3, codon, index));
  for (let i = codingEnd; i < dna.length; i += 3) push(i, Math.min(i + 3, dna.length), null, -1);

  return { columns, codons };
}
