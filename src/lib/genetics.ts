/** Transcription, translation and mutation logic for the Cell stage. Pure functions, no UI. */

export const RNA_BASES = ['U', 'C', 'A', 'G'] as const;
export type RnaBase = (typeof RNA_BASES)[number];
export const DNA_BASES = ['A', 'C', 'G', 'T'] as const;
export type DnaBase = (typeof DNA_BASES)[number];

export interface AminoAcidInfo {
  /** One-letter code, e.g. "E". */
  letter: string;
  /** Three-letter code, e.g. "Glu". */
  short: string;
  name: string;
  /** True for the nine amino acids that must come from food. */
  essential: boolean;
}

export const AMINO_ACIDS: Record<string, AminoAcidInfo> = {
  A: { letter: 'A', short: 'Ala', name: 'Alanine', essential: false },
  R: { letter: 'R', short: 'Arg', name: 'Arginine', essential: false },
  N: { letter: 'N', short: 'Asn', name: 'Asparagine', essential: false },
  D: { letter: 'D', short: 'Asp', name: 'Aspartic acid', essential: false },
  C: { letter: 'C', short: 'Cys', name: 'Cysteine', essential: false },
  Q: { letter: 'Q', short: 'Gln', name: 'Glutamine', essential: false },
  E: { letter: 'E', short: 'Glu', name: 'Glutamic acid', essential: false },
  G: { letter: 'G', short: 'Gly', name: 'Glycine', essential: false },
  H: { letter: 'H', short: 'His', name: 'Histidine', essential: true },
  I: { letter: 'I', short: 'Ile', name: 'Isoleucine', essential: true },
  L: { letter: 'L', short: 'Leu', name: 'Leucine', essential: true },
  K: { letter: 'K', short: 'Lys', name: 'Lysine', essential: true },
  M: { letter: 'M', short: 'Met', name: 'Methionine', essential: true },
  F: { letter: 'F', short: 'Phe', name: 'Phenylalanine', essential: true },
  P: { letter: 'P', short: 'Pro', name: 'Proline', essential: false },
  S: { letter: 'S', short: 'Ser', name: 'Serine', essential: false },
  T: { letter: 'T', short: 'Thr', name: 'Threonine', essential: true },
  W: { letter: 'W', short: 'Trp', name: 'Tryptophan', essential: true },
  Y: { letter: 'Y', short: 'Tyr', name: 'Tyrosine', essential: false },
  V: { letter: 'V', short: 'Val', name: 'Valine', essential: true },
};

/**
 * The standard genetic code, written in the usual table order: first base U, C, A, G;
 * within that second base U, C, A, G; within that third base U, C, A, G. "*" is a stop codon.
 */
const CODE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';

export const STOP = '*';

/** mRNA codon (e.g. "GAG") -> one-letter amino acid, or "*" for stop. Undefined if not a codon. */
export function codonToLetter(codon: string): string | undefined {
  if (codon.length !== 3) return undefined;
  const [a, b, c] = [...codon].map((base) => RNA_BASES.indexOf(base as RnaBase));
  if (a < 0 || b < 0 || c < 0) return undefined;
  return CODE[a * 16 + b * 4 + c];
}

/** Every codon with its amino acid, in table order. Used to draw the codon wheel. */
export const ALL_CODONS: { codon: string; letter: string }[] = RNA_BASES.flatMap((a) =>
  RNA_BASES.flatMap((b) => RNA_BASES.map((c) => ({ codon: a + b + c, letter: codonToLetter(a + b + c) as string }))),
);

export const START_CODON = 'AUG';

// ---------- Cleaning input ----------

export interface CleanedDna {
  /** Upper-case A/C/G/T only. */
  sequence: string;
  /** Distinct characters that were not DNA bases (spaces, digits and line breaks are ignored silently). */
  invalid: string[];
}

/** Normalize typed or pasted DNA. U is accepted and read as T, so pasted RNA works too. */
export function cleanDna(input: string): CleanedDna {
  const invalid = new Set<string>();
  let sequence = '';
  for (const raw of input.toUpperCase()) {
    if (/[\s\d\-']/.test(raw)) continue;
    const char = raw === 'U' ? 'T' : raw;
    if (DNA_BASES.includes(char as DnaBase)) sequence += char;
    else invalid.add(raw);
  }
  return { sequence, invalid: [...invalid] };
}

// ---------- Transcription ----------

const COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };

/**
 * The template strand, base by base under the coding strand (so it reads 3'→5').
 * RNA polymerase reads this strand to build the mRNA.
 */
export function templateStrand(codingDna: string): string {
  return [...codingDna].map((base) => COMPLEMENT[base] ?? '?').join('');
}

/**
 * Transcribe the coding strand (5'→3') into mRNA.
 * The mRNA is complementary to the template strand, which makes it identical to the
 * coding strand with U in place of T.
 */
export function transcribe(codingDna: string): string {
  return codingDna.replace(/T/g, 'U');
}

// ---------- Translation ----------

/** Index of the first AUG in the mRNA, or -1 if there is none. */
export function findStart(mrna: string): number {
  return mrna.indexOf(START_CODON);
}

export interface TranslatedCodon {
  codon: string;
  /** Position of the codon's first base in the mRNA (0-based). */
  position: number;
  /** One-letter amino acid, or "*" for a stop codon. */
  letter: string;
}

/**
 * Translate mRNA starting at `start` (0-based), three bases at a time.
 * Stops after the first stop codon (which is included in the result) or when fewer
 * than three bases remain.
 */
export function translate(mrna: string, start = 0): TranslatedCodon[] {
  const result: TranslatedCodon[] = [];
  if (start < 0) return result;
  for (let position = start; position + 3 <= mrna.length; position += 3) {
    const codon = mrna.slice(position, position + 3);
    const letter = codonToLetter(codon);
    if (letter === undefined) break;
    result.push({ codon, position, letter });
    if (letter === STOP) break;
  }
  return result;
}

/** The protein as one-letter codes, without the stop. */
export function proteinString(codons: TranslatedCodon[]): string {
  return codons
    .filter((item) => item.letter !== STOP)
    .map((item) => item.letter)
    .join('');
}

export type ReadingStart = 'aug' | 0 | 1 | 2;

/** Where translation begins for a given setting: the first AUG, or a fixed reading frame. */
export function resolveStart(mrna: string, setting: ReadingStart): number {
  return setting === 'aug' ? findStart(mrna) : setting;
}

// ---------- Mutations ----------

export type MutationKind =
  /** The codon changed but still codes for the same amino acid. */
  | 'silent'
  /** One amino acid is replaced by another. */
  | 'missense'
  /** An amino acid codon became a stop codon, cutting the protein short. */
  | 'nonsense'
  /** A stop codon became an amino acid codon, so translation runs on. */
  | 'stop-lost'
  /** The start codon was destroyed, so translation doesn't begin where it did. */
  | 'start-lost'
  /** The changed base is outside the translated region. */
  | 'noncoding'
  /** Nothing changed. */
  | 'none';

export interface MutationResult {
  kind: MutationKind;
  /** 0-based index of the changed base. */
  position: number;
  /** Which codon of the original reading frame was hit (1-based), if any. */
  codonNumber: number | null;
  before: TranslatedCodon | null;
  after: TranslatedCodon | null;
}

/** Replace one base. Returns the original string if the index or base is invalid. */
export function substituteBase(dna: string, index: number, base: string): string {
  if (index < 0 || index >= dna.length || !DNA_BASES.includes(base as DnaBase)) return dna;
  return dna.slice(0, index) + base + dna.slice(index + 1);
}

/**
 * Classify a single-base substitution.
 * `start` is where translation begins in the ORIGINAL sequence (0-based); the mutated
 * sequence is read in the same frame from the same place, so the two can be compared codon by codon.
 */
export function classifyMutation(originalDna: string, mutatedDna: string, start: number): MutationResult {
  const position = [...originalDna].findIndex((base, index) => base !== mutatedDna[index]);
  const none: MutationResult = { kind: 'none', position: -1, codonNumber: null, before: null, after: null };
  if (position < 0 || originalDna.length !== mutatedDna.length) return none;

  const originalCodons = translate(transcribe(originalDna), start);
  const hitIndex = originalCodons.findIndex((item) => position >= item.position && position < item.position + 3);
  if (start < 0 || hitIndex < 0) {
    return { kind: 'noncoding', position, codonNumber: null, before: null, after: null };
  }

  const before = originalCodons[hitIndex];
  const codon = transcribe(mutatedDna).slice(before.position, before.position + 3);
  const after: TranslatedCodon = { codon, position: before.position, letter: codonToLetter(codon) ?? '?' };
  const base = { position, codonNumber: hitIndex + 1, before, after };

  if (hitIndex === 0 && before.codon === START_CODON && after.codon !== START_CODON) {
    return { ...base, kind: 'start-lost' };
  }
  if (before.letter === after.letter) return { ...base, kind: 'silent' };
  if (after.letter === STOP) return { ...base, kind: 'nonsense' };
  if (before.letter === STOP) return { ...base, kind: 'stop-lost' };
  return { ...base, kind: 'missense' };
}

// ---------- Presets ----------

export interface SequencePreset {
  id: string;
  name: string;
  description: string;
  dna: string;
}

/**
 * Start of the human beta-globin (HBB) coding sequence: the start codon plus the first
 * nine amino acids of the finished protein. Amino acids are numbered from the valine
 * after the start methionine (which is removed), so "amino acid 6" is the 7th codon.
 */
export const HBB_DNA = 'ATGGTGCATCTGACTCCTGAGGAGAAGTCT';
/** 0-based index of the A in codon 7 (GAG) that becomes T in sickle cell disease (GAG → GTG). */
export const SICKLE_POSITION = 19;
export const SICKLE_BASE = 'T';

export const SEQUENCE_PRESETS: SequencePreset[] = [
  {
    id: 'hbb',
    name: 'Beta-globin (HBB)',
    description: 'The start of the gene for one of the chains of hemoglobin, the protein that carries oxygen in red blood cells.',
    dna: HBB_DNA,
  },
  {
    id: 'insulin',
    name: 'Insulin B chain',
    description: 'The first ten amino acids of the B chain of human insulin. There is no start codon here because it sits in the middle of a longer gene.',
    dna: 'TTTGTGAACCAACACCTGTGCGGCTCACAC',
  },
  {
    id: 'mini',
    name: 'Mini gene',
    description: 'A made-up six-codon gene with a start and a stop, plus a few extra bases on each side.',
    dna: 'GCATGGCCAAGTTTGGATGGTAACGT',
  },
];
