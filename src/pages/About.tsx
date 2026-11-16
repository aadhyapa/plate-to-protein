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
          , SR Legacy release (April 2018), from the U.S. Department of Agriculture, Agricultural
          Research Service. Public domain. Vegetarian and vegan labels are estimated from food names and
          categories, not ingredient lists.
        </li>
        <li>
          <strong>Amino acid reference pattern and protein requirement:</strong> WHO/FAO/UNU,{' '}
          <cite>Protein and Amino Acid Requirements in Human Nutrition</cite>, WHO Technical Report Series
          935 (2007).
        </li>
        <li>
          <strong>Protein goal:</strong> Institute of Medicine, <cite>Dietary Reference Intakes for Energy,
          Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids</cite> (2005); Thomas,
          Erdman &amp; Burke, <cite>Nutrition and Athletic Performance</cite>, J Acad Nutr Diet 116(3), 2016.
        </li>
        <li>
          <strong>Digestion:</strong>{' '}
          <a
            href="https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look"
            target="_blank"
            rel="noreferrer"
          >
            OpenStax, Anatomy and Physiology 2e, section 23.7
          </a>
          .
        </li>
        <li>
          <strong>Complementary proteins:</strong> Melina, Craig &amp; Levin, <cite>Position of the Academy
          of Nutrition and Dietetics: Vegetarian Diets</cite>, J Acad Nutr Diet 116(12), 2016.
        </li>
        <li>
          <strong>Gene sequence:</strong> the beta-globin example is the start of the coding sequence of the
          human HBB gene, NCBI reference sequence NM_000518.
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

      <h2>Built with</h2>
      <p>
        The 3D viewer is{' '}
        <a href="https://3dmol.org/" target="_blank" rel="noreferrer">
          3Dmol.js
        </a>{' '}
        (Rego &amp; Koes, <cite>Bioinformatics</cite> 31(8), 2015).
      </p>

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
