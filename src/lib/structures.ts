/** Data and pure helpers for the Structure stage. Nothing here touches the network or the 3D viewer. */

export type StructureSource = 'pdb' | 'alphafold';

export interface StructureRef {
  source: StructureSource;
  /** Upper-case PDB ID ("4HHB") or UniProt accession ("P68871"). */
  id: string;
}

const PDB_ID = /^[0-9][A-Z0-9]{3}$/;
/** UniProt accession format, from the UniProt documentation. */
const UNIPROT_ACCESSION = /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2})$/;

/**
 * Work out what someone typed: a 4-character PDB ID, a UniProt accession (shown as an
 * AlphaFold prediction), or neither. Accepts "AF-P68871-F1" style AlphaFold ids too.
 */
export function parseStructureId(input: string): StructureRef | null {
  let text = input.trim().toUpperCase();
  const alphaFold = /^AF-([A-Z0-9]+)-F\d+$/.exec(text);
  if (alphaFold) text = alphaFold[1];
  if (PDB_ID.test(text)) return { source: 'pdb', id: text };
  if (UNIPROT_ACCESSION.test(text)) return { source: 'alphafold', id: text };
  return null;
}

export function sourcePageUrl(ref: StructureRef): string {
  return ref.source === 'pdb'
    ? `https://www.rcsb.org/structure/${ref.id}`
    : `https://alphafold.ebi.ac.uk/entry/${ref.id}`;
}

// ---------- AlphaFold confidence ----------

export interface ConfidenceBand {
  min: number;
  label: string;
  color: string;
}

/** The standard AlphaFold pLDDT bands and colors, highest first. */
export const CONFIDENCE_BANDS: ConfidenceBand[] = [
  { min: 90, label: 'Very high (90–100)', color: '#0053d6' },
  { min: 70, label: 'High (70–90)', color: '#65cbf3' },
  { min: 50, label: 'Low (50–70)', color: '#ffdb13' },
  { min: 0, label: 'Very low (under 50)', color: '#ff7d45' },
];

export function confidenceColor(plddt: number): string {
  return (CONFIDENCE_BANDS.find((band) => plddt >= band.min) ?? CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1]).color;
}

/** Colors for chains, in order. Chosen to stay distinct on light and dark backgrounds. */
export const CHAIN_COLORS = ['#e8590c', '#0c8599', '#7048e8', '#c2255c', '#2f9e44', '#e67700', '#1c7ed6', '#868e96'];

export function chainColor(index: number): string {
  return CHAIN_COLORS[index % CHAIN_COLORS.length];
}

// ---------- Tours ----------

/** An atom selection in 3Dmol.js form, e.g. { chain: ['B', 'D'], resi: 6 }. */
export type Selection = Record<string, string | number | boolean | (string | number)[]>;

export interface Highlight {
  selection: Selection;
  /** Spheres for single residues, sticks for groups such as heme. */
  style: 'sphere' | 'stick';
  color: string;
}

export interface TourStep {
  title: string;
  text: string;
  /** What to zoom in on. Omit to show the whole structure. */
  focus?: Selection;
  highlights?: Highlight[];
}

export interface FeaturedStructure extends StructureRef {
  name: string;
  /** One or two plain sentences on what the protein does. */
  blurb: string;
  /** How it connects to the rest of the journey, if it does. */
  link?: string;
  tour?: TourStep[];
}

const HIGHLIGHT = '#ffd43b';
const HIGHLIGHT_2 = '#ff6b6b';

export const FEATURED: FeaturedStructure[] = [
  {
    source: 'pdb',
    id: '4HHB',
    name: 'Hemoglobin',
    blurb: 'Carries oxygen from your lungs to the rest of your body. Red blood cells are packed with it.',
    link: 'The beta-globin gene from the Cell stage codes for two of its four chains.',
    tour: [
      {
        title: 'Four chains, one protein',
        text: 'Hemoglobin is built from four separate chains that fit together: two alpha chains (A and C) and two beta chains (B and D). Each color is one chain. The coils are alpha helices, the most common shape a protein chain folds into.',
      },
      {
        title: 'Four heme groups',
        text: 'Each chain cradles a heme, shown here as sticks. A heme is a flat ring with an iron atom at its centre, and that iron is where an oxygen molecule binds. Four hemes means one hemoglobin can carry four oxygen molecules.',
        highlights: [{ selection: { resn: 'HEM' }, style: 'stick', color: HIGHLIGHT_2 }],
      },
      {
        title: 'Position 6 on the beta chains',
        text: 'The yellow spheres mark amino acid 6 of each beta chain: glutamic acid. It sits on the outside of the protein and carries a negative charge, which helps hemoglobin molecules stay apart in the watery inside of a red blood cell. In sickle cell hemoglobin, this one amino acid is valine instead.',
        focus: { chain: 'B', resi: 6 },
        highlights: [{ selection: { chain: ['B', 'D'], resi: 6 }, style: 'sphere', color: HIGHLIGHT }],
      },
    ],
  },
  {
    source: 'pdb',
    id: '2HBS',
    name: 'Sickle cell hemoglobin',
    blurb: 'Hemoglobin with one amino acid changed: valine instead of glutamic acid at position 6 of the beta chains.',
    link: 'This is the result of the single-base change you can make in the Cell stage’s mutation lab.',
    tour: [
      {
        title: 'Two hemoglobins, side by side',
        text: 'This structure contains two whole hemoglobin molecules, eight chains in all, caught touching each other. Normal hemoglobin molecules don’t stick together like this.',
      },
      {
        title: 'Valine at position 6',
        text: 'The yellow spheres are valine at position 6 of every beta chain. Unlike the glutamic acid it replaces, valine has no charge and avoids water. That leaves a small water-repelling patch on the surface of the protein.',
        highlights: [{ selection: { chain: ['B', 'D', 'F', 'H'], resi: 6 }, style: 'sphere', color: HIGHLIGHT }],
      },
      {
        title: 'A pocket for it to stick to',
        text: 'The red spheres are phenylalanine 85 and leucine 88 on the beta chains, which line a water-repelling pocket. When hemoglobin has released its oxygen, a valine 6 from one molecule can tuck into this pocket on a neighbour. Molecule after molecule joins on, forming stiff fibres that bend red blood cells into a sickle shape.',
        highlights: [
          { selection: { chain: ['B', 'D', 'F', 'H'], resi: 6 }, style: 'sphere', color: HIGHLIGHT },
          { selection: { chain: ['B', 'D', 'F', 'H'], resi: [85, 88] }, style: 'sphere', color: HIGHLIGHT_2 },
        ],
      },
    ],
  },
  {
    source: 'pdb',
    id: '4INS',
    name: 'Insulin',
    blurb: 'The hormone that tells your cells to take up sugar from the blood. This structure is pig insulin, which differs from human insulin by a single amino acid.',
    link: 'The insulin B chain example in the Cell stage codes for the start of the longer chain here.',
    tour: [
      {
        title: 'A small protein with two chains',
        text: 'Insulin is tiny: an A chain of 21 amino acids and a B chain of 30. This structure holds two insulin molecules, so you see four chains.',
      },
      {
        title: 'Held together by sulfur bridges',
        text: 'The yellow sticks are cysteines. Pairs of cysteines link through their sulfur atoms, forming three bridges in each insulin: two tie the A chain to the B chain, and one sits inside the A chain. Without them the two chains would drift apart.',
        highlights: [{ selection: { resn: 'CYS' }, style: 'stick', color: HIGHLIGHT }],
      },
      {
        title: 'Stored around zinc',
        text: 'The red spheres are zinc ions. The body stores insulin as clusters of six molecules gathered around zinc, held by a histidine at position 10 of each B chain (the sticks next to the zinc). The clusters break up into single molecules when insulin is released into the blood.',
        focus: { resn: 'ZN' },
        highlights: [
          { selection: { resn: 'ZN' }, style: 'sphere', color: HIGHLIGHT_2 },
          { selection: { chain: ['B', 'D'], resi: 10 }, style: 'stick', color: HIGHLIGHT },
        ],
      },
    ],
  },
  {
    source: 'pdb',
    id: '4PEP',
    name: 'Pepsin',
    blurb: 'The stomach enzyme that makes the first cuts in the proteins you eat.',
    link: 'You met it in the Gut stage.',
  },
  {
    source: 'pdb',
    id: '2PTN',
    name: 'Trypsin',
    blurb: 'An enzyme from the pancreas that cuts protein chains into short pieces in the small intestine.',
    link: 'Also from the Gut stage.',
  },
  {
    source: 'pdb',
    id: '1OVA',
    name: 'Ovalbumin',
    blurb: 'The main protein in egg white. Cooking unfolds it, which is why egg white turns from clear to solid.',
  },
  {
    source: 'pdb',
    id: '1MBN',
    name: 'Myoglobin',
    blurb: 'Stores oxygen in muscle. It is what makes red meat red.',
  },
  {
    source: 'pdb',
    id: '1CAG',
    name: 'Collagen',
    blurb: 'A short piece of collagen’s triple helix: three chains wound around each other like rope. Collagen is the most abundant protein in your body, and gelatin is made from it.',
  },
  {
    source: 'pdb',
    id: '1EMA',
    name: 'Green fluorescent protein',
    blurb: 'A barrel-shaped jellyfish protein that glows green. Scientists attach it to other proteins to watch them inside living cells.',
  },
  {
    source: 'alphafold',
    id: 'P68871',
    name: 'Beta-globin, predicted by AI',
    blurb: 'The human hemoglobin beta chain as predicted by AlphaFold from its amino acid sequence alone, colored by how confident the prediction is.',
    link: 'Compare it with a beta chain in the measured hemoglobin structure.',
  },
];

export function findFeatured(ref: StructureRef | null): FeaturedStructure | undefined {
  return ref ? FEATURED.find((item) => item.source === ref.source && item.id === ref.id) : undefined;
}

/** Normal and sickle hemoglobin shown side by side, focused on position 6 of a beta chain. */
export const HEMOGLOBIN_COMPARE = {
  normal: { source: 'pdb', id: '4HHB' } as StructureRef,
  sickle: { source: 'pdb', id: '2HBS' } as StructureRef,
  step: {
    title: 'Position 6 of the beta chain',
    text: '',
    focus: { chain: 'B', resi: 6 },
    highlights: [{ selection: { chain: ['B', 'D', 'F', 'H'], resi: 6 }, style: 'sphere', color: HIGHLIGHT }],
  } as TourStep,
};
