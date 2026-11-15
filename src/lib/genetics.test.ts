import { describe, expect, it } from 'vitest';
import {
  ALL_CODONS,
  AMINO_ACIDS,
  HBB_DNA,
  SEQUENCE_PRESETS,
  SICKLE_BASE,
  SICKLE_POSITION,
  classifyMutation,
  cleanDna,
  codonToLetter,
  findStart,
  proteinString,
  resolveStart,
  substituteBase,
  templateStrand,
  transcribe,
  translate,
} from './genetics';

const protein = (dna: string, start = 0) => proteinString(translate(transcribe(dna), start));

describe('the genetic code', () => {
  it('has 64 codons: 61 for amino acids and 3 stops', () => {
    expect(ALL_CODONS.length).toBe(64);
    expect(ALL_CODONS.filter((item) => item.letter === '*').map((item) => item.codon)).toEqual(['UAA', 'UAG', 'UGA']);
    expect(new Set(ALL_CODONS.map((item) => item.letter)).size).toBe(21);
  });
  it('knows well-known codons', () => {
    expect(codonToLetter('AUG')).toBe('M');
    expect(codonToLetter('UGG')).toBe('W');
    expect(codonToLetter('GAG')).toBe('E');
    expect(codonToLetter('GUG')).toBe('V');
    expect(codonToLetter('UUU')).toBe('F');
    expect(codonToLetter('GGG')).toBe('G');
    expect(codonToLetter('ATG')).toBeUndefined();
    expect(codonToLetter('AU')).toBeUndefined();
  });
  it('gives each amino acid the right number of codons', () => {
    const count = (letter: string) => ALL_CODONS.filter((item) => item.letter === letter).length;
    expect([count('L'), count('S'), count('R')]).toEqual([6, 6, 6]);
    expect([count('M'), count('W')]).toEqual([1, 1]);
    expect(count('I')).toBe(3);
  });
  it('marks exactly nine amino acids as essential', () => {
    const essential = Object.values(AMINO_ACIDS).filter((item) => item.essential).map((item) => item.letter).sort();
    expect(essential.join('')).toBe('FHIKLMTVW');
    expect(Object.keys(AMINO_ACIDS).length).toBe(20);
  });
});

describe('cleanDna', () => {
  it('upper-cases and ignores spaces, digits and line breaks', () => {
    expect(cleanDna(" 1 atg gtg\n61 cat 5'-3' ")).toEqual({ sequence: 'ATGGTGCAT', invalid: [] });
  });
  it('reads U as T and reports other characters', () => {
    expect(cleanDna('AUGXNX')).toEqual({ sequence: 'ATG', invalid: ['X', 'N'] });
  });
});

describe('transcription', () => {
  it('swaps T for U on the coding strand', () => {
    expect(transcribe('ATGGTGCAT')).toBe('AUGGUGCAU');
  });
  it('builds the complementary template strand', () => {
    expect(templateStrand('ATGC')).toBe('TACG');
  });
  it('makes mRNA complementary to the template strand', () => {
    const coding = 'ATGGTGCATCTG';
    const pair: Record<string, string> = { A: 'U', T: 'A', C: 'G', G: 'C' };
    const fromTemplate = [...templateStrand(coding)].map((base) => pair[base]).join('');
    expect(fromTemplate).toBe(transcribe(coding));
  });
});

describe('translation', () => {
  it('translates beta-globin', () => {
    expect(protein(HBB_DNA)).toBe('MVHLTPEEKS');
  });
  it('stops at a stop codon and includes it', () => {
    const codons = translate('AUGGCCUAAGGG');
    expect(codons.map((item) => item.letter).join('')).toBe('MA*');
    expect(proteinString(codons)).toBe('MA');
  });
  it('ignores an incomplete final codon', () => {
    expect(protein('ATGGCCA')).toBe('MA');
  });
  it('reads different proteins in different frames', () => {
    const dna = 'GCATGGCCAAGTTTGGATGGTAACGT';
    expect(protein(dna, 0)).toBe('AWPSLDGN');
    expect(protein(dna, 1)).toBe('HGQVWMVT');
    expect(protein(dna, 2)).toBe('MAKFGW');
  });
  it('finds the first AUG', () => {
    expect(findStart('GCAUGGCC')).toBe(2);
    expect(findStart('GCCGCC')).toBe(-1);
    expect(resolveStart('GCAUGGCC', 'aug')).toBe(2);
    expect(resolveStart('GCAUGGCC', 1)).toBe(1);
  });
  it('returns nothing when there is no start', () => {
    expect(translate('GCCGCC', -1)).toEqual([]);
  });
  it('translates every preset as described', () => {
    const byId = Object.fromEntries(SEQUENCE_PRESETS.map((preset) => [preset.id, preset.dna]));
    expect(protein(byId.insulin)).toBe('FVNQHLCGSH');
    expect(protein(byId.mini, findStart(transcribe(byId.mini)))).toBe('MAKFGW');
  });
});

describe('classifyMutation', () => {
  it('classifies the sickle cell mutation as missense: Glu to Val at codon 7', () => {
    const mutated = substituteBase(HBB_DNA, SICKLE_POSITION, SICKLE_BASE);
    expect(mutated.slice(18, 21)).toBe('GTG');
    const result = classifyMutation(HBB_DNA, mutated, 0);
    expect(result.kind).toBe('missense');
    expect(result.codonNumber).toBe(7);
    expect(result.before?.letter).toBe('E');
    expect(result.after?.letter).toBe('V');
    expect(protein(mutated)).toBe('MVHLTPVEKS');
  });
  it('classifies a silent change', () => {
    // GAG -> GAA still codes for glutamic acid.
    const result = classifyMutation(HBB_DNA, substituteBase(HBB_DNA, 20, 'A'), 0);
    expect(result.kind).toBe('silent');
    expect(result.after?.codon).toBe('GAA');
  });
  it('classifies a nonsense change', () => {
    // AAG (Lys, codon 9) -> TAG is a stop.
    const result = classifyMutation(HBB_DNA, substituteBase(HBB_DNA, 24, 'T'), 0);
    expect(result.kind).toBe('nonsense');
    expect(result.codonNumber).toBe(9);
  });
  it('recognises a lost start, a lost stop and non-coding changes', () => {
    const mini = 'GCATGGCCAAGTTTGGATGGTAACGT';
    const start = 2;
    expect(classifyMutation(mini, substituteBase(mini, 3, 'C'), start).kind).toBe('start-lost');
    expect(classifyMutation(mini, substituteBase(mini, 20, 'C'), start).kind).toBe('stop-lost');
    expect(classifyMutation(mini, substituteBase(mini, 0, 'T'), start).kind).toBe('noncoding');
    expect(classifyMutation(mini, substituteBase(mini, 24, 'A'), start).kind).toBe('noncoding');
  });
  it('reports no mutation when nothing changed', () => {
    expect(classifyMutation(HBB_DNA, HBB_DNA, 0).kind).toBe('none');
    expect(substituteBase(HBB_DNA, 99, 'A')).toBe(HBB_DNA);
    expect(substituteBase(HBB_DNA, 0, 'X')).toBe(HBB_DNA);
  });
});
