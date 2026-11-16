import type { StructureRef } from './structures';

/** A structure file plus the facts shown in the info panel. Fields are null when the source doesn't give them. */
export interface LoadedStructure {
  ref: StructureRef;
  /** File contents. */
  text: string;
  format: 'pdb' | 'cif';
  title: string | null;
  organism: string | null;
  /** Experimental method, or "Predicted by AlphaFold". */
  method: string | null;
  /** Resolution in ångströms (experimental structures only). */
  resolution: number | null;
  /** Number of amino acids (all chains). */
  residueCount: number | null;
  chainCount: number | null;
  /** Average pLDDT (AlphaFold only). */
  meanConfidence: number | null;
}

export class StructureNotFoundError extends Error {}

async function getJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (response.status === 404 || response.status === 400 || response.status === 422) throw new StructureNotFoundError(url);
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.json();
}

async function getText(url: string): Promise<string | null> {
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.text();
}

async function loadPdb(ref: StructureRef): Promise<LoadedStructure> {
  // The entry record tells us whether the ID exists and supplies the info panel.
  const entry = await getJson(`https://data.rcsb.org/rest/v1/core/entry/${ref.id}`);

  // Most entries have a PDB-format file; very large ones only come as mmCIF.
  let format: 'pdb' | 'cif' = 'pdb';
  let text = await getText(`https://files.rcsb.org/download/${ref.id}.pdb`);
  if (text === null) {
    format = 'cif';
    text = await getText(`https://files.rcsb.org/download/${ref.id}.cif`);
  }
  if (text === null) throw new StructureNotFoundError(ref.id);

  // Organism lives on the polymer entity; it's a nice-to-have, so failures are ignored.
  let organism: string | null = null;
  try {
    const entity = await getJson(`https://data.rcsb.org/rest/v1/core/polymer_entity/${ref.id}/1`);
    organism = entity?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ?? null;
  } catch {
    organism = null;
  }

  const info = entry?.rcsb_entry_info ?? {};
  return {
    ref,
    text,
    format,
    title: entry?.struct?.title ?? null,
    organism,
    method: entry?.exptl?.[0]?.method ?? null,
    resolution: typeof info.resolution_combined?.[0] === 'number' ? info.resolution_combined[0] : null,
    residueCount: typeof info.deposited_polymer_monomer_count === 'number' ? info.deposited_polymer_monomer_count : null,
    chainCount:
      typeof info.deposited_polymer_entity_instance_count === 'number' ? info.deposited_polymer_entity_instance_count : null,
    meanConfidence: null,
  };
}

async function loadAlphaFold(ref: StructureRef): Promise<LoadedStructure> {
  // The API returns the current file URL, so this keeps working when the model version changes.
  const list = await getJson(`https://alphafold.ebi.ac.uk/api/prediction/${ref.id}`);
  const record = Array.isArray(list) ? list[0] : null;
  if (!record?.pdbUrl) throw new StructureNotFoundError(ref.id);
  const text = await getText(record.pdbUrl);
  if (text === null) throw new StructureNotFoundError(ref.id);

  return {
    ref,
    text,
    format: 'pdb',
    title: record.uniprotDescription ?? null,
    organism: record.organismScientificName ?? null,
    method: 'Predicted by AlphaFold',
    resolution: null,
    residueCount: typeof record.uniprotSequence === 'string' ? record.uniprotSequence.length : null,
    chainCount: 1,
    meanConfidence: typeof record.globalMetricValue === 'number' ? record.globalMetricValue : null,
  };
}

const cache = new Map<string, Promise<LoadedStructure>>();

/** Fetch a structure and its details straight from RCSB PDB or the AlphaFold database. Cached per session. */
export function loadStructure(ref: StructureRef): Promise<LoadedStructure> {
  const key = `${ref.source}:${ref.id}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = (ref.source === 'pdb' ? loadPdb(ref) : loadAlphaFold(ref)).catch((error) => {
      cache.delete(key); // allow a retry
      throw error;
    });
    cache.set(key, pending);
  }
  return pending;
}
