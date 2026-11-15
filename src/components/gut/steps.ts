export interface TapPoint {
  question: string;
  answer: string;
}

export interface DigestionStep {
  id: 'mouth' | 'stomach' | 'intestine' | 'blood';
  organ: string;
  title: string;
  body: string;
  /** One line describing what the bead chains are showing at this step. */
  beadNote: string;
  taps: TapPoint[];
}

/** Content for the digestion walkthrough. Source: OpenStax Anatomy and Physiology 2e, section 23.7. */
export const DIGESTION_STEPS: DigestionStep[] = [
  {
    id: 'mouth',
    organ: 'Mouth',
    title: 'Chewing breaks food into pieces',
    body: 'Your teeth grind the meal into small pieces and saliva moistens it. The proteins inside are still whole: long chains of amino acids folded into tight shapes. No protein is chemically digested here.',
    beadNote: 'Each chain is one protein, folded up tight.',
    taps: [
      {
        question: 'Does saliva digest protein?',
        answer:
          'No. Saliva has an enzyme that starts on starch, but nothing that cuts protein. Chewing just gives the stomach more surface to work on.',
      },
    ],
  },
  {
    id: 'stomach',
    organ: 'Stomach',
    title: 'Acid unfolds proteins and pepsin makes the first cuts',
    body: 'Stomach acid unfolds the tightly folded protein chains. That exposes the links between amino acids to pepsin, an enzyme that cuts the long chains into shorter ones called polypeptides.',
    beadNote: 'The chains unfold and are cut into shorter lengths.',
    taps: [
      {
        question: 'What does unfolding do?',
        answer:
          'A folded protein hides most of its chain inside. Acid loosens the folds without breaking the chain itself, a change called denaturation. Cooking an egg white does something similar with heat.',
      },
      {
        question: "Why doesn't the stomach digest itself?",
        answer:
          'A layer of mucus protects the stomach lining, and pepsin is released in an inactive form that only switches on once it meets acid.',
      },
    ],
  },
  {
    id: 'intestine',
    organ: 'Small intestine',
    title: 'Enzymes finish the job and amino acids are absorbed',
    body: 'The pancreas sends in more enzymes, including trypsin and chymotrypsin, which cut the polypeptides into short pieces. Enzymes on the intestinal wall trim those down to single amino acids and pieces two or three amino acids long, and the cells lining the intestine absorb them.',
    beadNote: 'Short pieces become single amino acids.',
    taps: [
      {
        question: 'Are whole proteins absorbed?',
        answer:
          "Almost never in adults. That is why the proteins you eat don't become your proteins directly: they are taken apart into amino acids first.",
      },
      {
        question: 'How does so much get absorbed?',
        answer:
          'The lining of the small intestine is folded into tiny finger-like villi, which are themselves covered in even smaller folds. Together they give it an enormous surface for absorbing nutrients.',
      },
    ],
  },
  {
    id: 'blood',
    organ: 'Bloodstream',
    title: 'Amino acids travel to your cells',
    body: 'The absorbed amino acids enter the blood and go first to the liver, then on to cells all over the body. Each cell takes up amino acids and joins them in a new order to build its own proteins. That is the next stage.',
    beadNote: 'Free amino acids, ready to be reused.',
    taps: [
      {
        question: 'Which amino acids have to come from food?',
        answer:
          'Nine of them, called essential amino acids, because the body cannot make them: histidine, isoleucine, leucine, lysine, methionine, phenylalanine, threonine, tryptophan and valine.',
      },
    ],
  },
];

export const DIGESTION_SOURCE = {
  label: 'OpenStax, Anatomy and Physiology 2e, section 23.7: Chemical Digestion and Absorption',
  url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look',
};
