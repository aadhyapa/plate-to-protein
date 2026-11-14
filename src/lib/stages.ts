import type { StageId } from '../state/types';

export interface Stage {
  id: StageId;
  path: string;
  /** Short name used in the stage tracker. */
  label: string;
  title: string;
  blurb: string;
  /** What this stage will contain; shown until the stage is built. */
  coming: string[];
}

/** The journey, in order. The tracker, routes and "next" buttons all read from this. */
export const STAGES: Stage[] = [
  {
    id: 'plate',
    path: '/plate',
    label: 'Plate',
    title: 'Build your meal',
    blurb: 'Search real foods, see how much protein they hold, and put together the meal that will travel with you.',
    coming: [
      'Food search with vegetarian, vegan and high-protein filters',
      'A meal panel with total protein against your daily goal',
      'A protein goal calculator and side-by-side food comparison',
    ],
  },
  {
    id: 'gut',
    path: '/gut',
    label: 'Gut',
    title: 'Break it down',
    blurb: 'Watch your meal come apart into amino acids, and find out which essential one it is shortest on.',
    coming: [
      'A scroll-through of digestion from mouth to bloodstream',
      "Your meal's essential amino acid profile against the reference pattern",
      'One-tap food suggestions that fix the limiting amino acid',
    ],
  },
  {
    id: 'cell',
    path: '/cell',
    label: 'Cell',
    title: 'Read the recipe',
    blurb: 'Turn DNA into mRNA into a chain of amino acids, one codon at a time, then change a base and see what happens.',
    coming: [
      'A step-by-step transcription and translation simulator',
      'An interactive codon wheel',
      'A mutation lab, including the sickle cell change in beta-globin',
    ],
  },
  {
    id: 'structure',
    path: '/structure',
    label: 'Structure',
    title: 'See the shape',
    blurb: 'Rotate real protein structures in 3D and take guided tours of what their shapes do.',
    coming: [
      'A 3D viewer with cartoon, surface and stick displays',
      'Guided tours of featured proteins',
      'Normal and sickle cell hemoglobin side by side',
    ],
  },
  {
    id: 'wrap-up',
    path: '/wrap-up',
    label: 'Wrap-up',
    title: 'Your protein journey',
    blurb: 'A summary of the meal you built, what you learned about it, and how far you got.',
    coming: [
      'A summary card for your meal and its limiting amino acid',
      'Badges for completed stages and quiz scores',
      'A downloadable image of your journey',
    ],
  },
];

export function stageForPath(pathname: string): Stage | undefined {
  return STAGES.find((stage) => pathname === stage.path || pathname.startsWith(`${stage.path}/`));
}

export function nextStage(id: StageId): Stage | undefined {
  const index = STAGES.findIndex((stage) => stage.id === id);
  return index >= 0 ? STAGES[index + 1] : undefined;
}
