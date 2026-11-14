export default function About() {
  return (
    <article className="stage prose">
      <p className="eyebrow">About</p>
      <h1 className="stage__title">Sources, disclaimer and credits</h1>

      <h2>Disclaimer</h2>
      <p>
        Plate to Cell is an educational project. It is not medical, clinical or personalized dietary
        advice. Nutrient values are averages for typical foods and your needs depend on things this site
        doesn't know about you.
      </p>

      <h2>Data sources</h2>
      <ul>
        <li>
          <strong>Foods and amino acids:</strong>{' '}
          <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">
            USDA FoodData Central
          </a>{' '}
          (public domain).
        </li>
        <li>
          <strong>Amino acid reference pattern and protein requirement:</strong> WHO/FAO/UNU,{' '}
          <cite>Protein and Amino Acid Requirements in Human Nutrition</cite>, WHO Technical Report Series
          935 (2007).
        </li>
        <li>
          <strong>3D structures:</strong>{' '}
          <a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">
            RCSB Protein Data Bank
          </a>{' '}
          and{' '}
          <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer">
            AlphaFold Protein Structure Database
          </a>
          .
        </li>
      </ul>

      <h2>Keep learning</h2>
      <p>
        <a href="https://pdb101.rcsb.org/" target="_blank" rel="noreferrer">
          PDB-101
        </a>{' '}
        has deeper articles on protein structure and the molecules featured here.
      </p>

      <h2>Privacy</h2>
      <p>
        There are no accounts and no server. Your meal, settings and quiz scores are saved only in this
        browser and never leave your device.
      </p>
    </article>
  );
}
