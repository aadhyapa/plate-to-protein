import { describe, expect, it } from 'vitest';
import { CONFIDENCE_BANDS, FEATURED, chainColor, confidenceColor, findFeatured, parseStructureId, sourcePageUrl } from './structures';

describe('parseStructureId', () => {
  it('recognises PDB ids in any case, with stray spaces', () => {
    expect(parseStructureId(' 4hhb ')).toEqual({ source: 'pdb', id: '4HHB' });
    expect(parseStructureId('1EMA')).toEqual({ source: 'pdb', id: '1EMA' });
  });
  it('recognises UniProt accessions as AlphaFold predictions', () => {
    expect(parseStructureId('P68871')).toEqual({ source: 'alphafold', id: 'P68871' });
    expect(parseStructureId('q8n158')).toEqual({ source: 'alphafold', id: 'Q8N158' });
    expect(parseStructureId('A0A024R161')).toEqual({ source: 'alphafold', id: 'A0A024R161' });
    expect(parseStructureId('AF-P69905-F1')).toEqual({ source: 'alphafold', id: 'P69905' });
  });
  it('rejects everything else', () => {
    for (const bad of ['', 'hemoglobin', 'HHB4', '4HH', '4HHBX', 'P6887', '12345', '../etc', '4HHB?x=1']) {
      expect(parseStructureId(bad)).toBeNull();
    }
  });
});

describe('structure helpers', () => {
  it('links to the source database', () => {
    expect(sourcePageUrl({ source: 'pdb', id: '4HHB' })).toBe('https://www.rcsb.org/structure/4HHB');
    expect(sourcePageUrl({ source: 'alphafold', id: 'P68871' })).toBe('https://alphafold.ebi.ac.uk/entry/P68871');
  });
  it('maps pLDDT to the standard AlphaFold colors', () => {
    expect(confidenceColor(95)).toBe(CONFIDENCE_BANDS[0].color);
    expect(confidenceColor(90)).toBe(CONFIDENCE_BANDS[0].color);
    expect(confidenceColor(89.9)).toBe(CONFIDENCE_BANDS[1].color);
    expect(confidenceColor(60)).toBe(CONFIDENCE_BANDS[2].color);
    expect(confidenceColor(10)).toBe(CONFIDENCE_BANDS[3].color);
    expect(confidenceColor(-1)).toBe(CONFIDENCE_BANDS[3].color);
  });
  it('cycles chain colors', () => {
    expect(chainColor(0)).toBe(chainColor(8));
    expect(chainColor(0) === chainColor(1)).toBe(false);
  });
});

describe('featured structures', () => {
  it('all have valid, unique ids', () => {
    for (const item of FEATURED) expect(parseStructureId(item.id)).toEqual({ source: item.source, id: item.id });
    expect(new Set(FEATURED.map((item) => item.id)).size).toBe(FEATURED.length);
  });
  it('has guided tours for at least two proteins, each with several steps', () => {
    const tours = FEATURED.filter((item) => item.tour);
    expect(tours.length >= 2).toBe(true);
    expect(tours.every((item) => (item.tour?.length ?? 0) >= 3)).toBe(true);
  });
  it('can be looked up', () => {
    expect(findFeatured({ source: 'pdb', id: '2HBS' })?.name).toBe('Sickle cell hemoglobin');
    expect(findFeatured({ source: 'pdb', id: '9XYZ' })).toBeUndefined();
    expect(findFeatured(null)).toBeUndefined();
  });
});
